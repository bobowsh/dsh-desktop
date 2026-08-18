// lib/convert/chatgpt.mjs — ChatGPT 网页导出 conversations.json → DSH 会话（纯函数）

import {
  SESSION_FORMAT_VERSION,
  applyBudgetTrim,
  mintSessionId,
  parseTime,
  synthesizeSession,
} from './core.mjs'

// ChatGPT 网页导出 conversations.json → 每个会话（或每个分支）一个 DSH 会话。
//
// 与 Claude/Codex 不同：顶层是 JSON 数组（一文件多会话），每个会话对象含
// `mapping`（DAG：nodeId → { id, message, parent, children }）。时间戳是 Unix 秒。
// 无 cwd 字段（ChatGPT 是聊天，无工作目录）→ 不归组工作区。
//
// REQ-19 分支还原：`branch: 'main'`（默认）沿 active branch（children 最后一个）
// 从 root 遍历得到主线程；`branch: 'all'` 枚举全部 root→leaf 路径，每条路径一个
// 会话（主线程 = 最后 child 链，与默认一致；分支会话 sourceId 带 -branch- 尾缀
// 保证 registry 幂等键互不覆盖）。REQ-19 工具参数结构化：assistant 内容里形如
// `{tool_name, tool_call_id, args}` 的 JSON part 还原为 tool/call（参数保持结构化
// JSON 字符串），后续 tool 角色消息按 FIFO 配对为 tool/result（ChatGPT 导出无
// tool_call_id 字段，位置配对 + synthesizeSession 的 sourceEventSeqs 关联）。
export function convertChatgptJson(raw, args = {}) {
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    // 整个文件不是合法 JSON：跳过，不产生会话（整文件无行概念，行号明细保持空）
    return { conversations: [], skipped: 1, records: 0, skippedLines: [], secrets: [] }
  }
  if (!Array.isArray(parsed)) {
    return { conversations: [], skipped: 1, records: 0, skippedLines: [], secrets: [] }
  }

  const conversations = []
  let skipped = 0
  for (const conv of parsed) {
    if (!conv || typeof conv !== 'object') { skipped++; continue }
    const out = convertChatgptConversation(conv, args)
    if (out && out.length > 0) conversations.push(...out)
    else skipped++
  }
  return { conversations, skipped, records: parsed.length, skippedLines: [], secrets: [] }
}

// 每个会话对象 → 会话数组（main = 1 个；all = 每分支 1 个）。
function convertChatgptConversation(conv, args) {
  const mapping = conv.mapping || {}
  const nodes = Object.values(mapping).filter((n) => n && typeof n === 'object')

  // 找 root：parent 不存在于 mapping 且带 message；遍历沿最后一个 child
  let root = null
  for (const n of nodes) {
    if (n.message && !(n.parent && mapping[n.parent])) { root = n; break }
  }
  if (!root) return null

  const title = typeof conv.title === 'string' && conv.title.trim() ? conv.title.trim() : null
  const createdAt = parseTime(conv.create_time)
  const branch = args.branch === 'all' ? 'all' : 'main'
  const threads = branch === 'all' ? allBranchThreads(root, mapping) : [mainThread(root, mapping)]
  // all 模式下主会话 = 与主线程（最后 child 链）同叶子的路径；其余为分支会话
  const mainLeafId = branch === 'all' ? (() => {
    const t = mainThread(root, mapping)
    return t.length > 0 ? t[t.length - 1].id : null
  })() : null

  const out = []
  for (const thread of threads) {
    const turns = buildTurns(thread)
    // 无用户回合（如只有 system 注入的会话）不产生空会话
    if (turns.length === 0) continue
    const leaf = thread[thread.length - 1]
    const isMain = branch === 'main' || (mainLeafId !== null && leaf && leaf.id === mainLeafId)
    const branchTag = isMain ? '' : '-' + String(leaf?.id || 'branch')
      .replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 16)
    const sourceId = String(conv.id || '') + branchTag
    const sessionId = args.sessionId && isMain ? args.sessionId : mintSessionId(sourceId)
    const meta = { version: SESSION_FORMAT_VERSION, id: sessionId, createdAt }
    if (sourceId) meta.sourceId = sourceId
    // 分支会话标题带分支标记（区分同会话多分支）
    const sessionTitle = !isMain && title ? title + '（分支 ' + branchTag.slice(1) + '）' : title
    const { turns: seedTurns, trimmed } = applyBudgetTrim(turns, args.budget)
    const syn = synthesizeSession({ meta, turns: seedTurns, title: sessionTitle, provider: 'chatgpt', model: 'chatgpt', skipped: 0, records: thread.length, imported: { sourcePath: args.sourcePath } })
    out.push(trimmed ? { ...syn, trimmed } : syn)
  }
  return out
}

// 主线程：root 沿最后一个 child 走到底（占位节点穿透，不中断链）。
function mainThread(root, mapping) {
  const thread = []
  const seen = new Set()
  let node = root
  while (node && !seen.has(node.id)) {
    seen.add(node.id)
    if (node.message) thread.push(node)
    const kids = (node.children || []).map((id) => mapping[id]).filter((n) => n && typeof n === 'object')
    node = kids.length > 0 ? kids[kids.length - 1] : null
  }
  return thread
}

// 全部分支：DFS root→leaf 路径（leaf = 无任何 child；占位节点穿透）。
function allBranchThreads(root, mapping) {
  const paths = []
  const dfs = (node, path) => {
    const kids = (node.children || []).map((id) => mapping[id]).filter((n) => n && typeof n === 'object')
    const next = [...path, node]
    if (kids.length === 0) {
      paths.push(next)
      return
    }
    const msgKids = kids.filter((n) => n.message)
    for (const kid of (msgKids.length > 0 ? msgKids : kids)) {
      if (next.some((n) => n.id === kid.id)) continue // 环保护
      dfs(kid, next)
    }
  }
  dfs(root, [])
  return paths
}

// 提取 ChatGPT 消息正文：content.parts 数组（字符串或 {text} 对象）。
function chatgptMessageParts(msg) {
  if (!msg || !msg.content || typeof msg.content !== 'object') return []
  return Array.isArray(msg.content.parts) ? msg.content.parts : []
}

function chatgptMessageText(msg) {
  const texts = []
  for (const p of chatgptMessageParts(msg)) {
    if (typeof p === 'string') texts.push(p)
    else if (p && typeof p === 'object' && typeof p.text === 'string') texts.push(p.text)
  }
  return texts.join('\n').trim()
}

// part → 工具调用载体对象（非载体返回 undefined）。ChatGPT 导出形状：part 为 JSON
// 字符串（或对象），含 tool_name / tool_call_id / args；个别导出用 name 而非
// tool_name，args 可能包在 action / metadata 里。
function toolCallCarrier(p) {
  let obj = p
  if (typeof p === 'string') {
    const trimmed = p.trim()
    if (!/^[{[]/.test(trimmed)) return undefined
    try {
      obj = JSON.parse(trimmed)
    } catch {
      return undefined
    }
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return undefined
  const carrier = obj.action && typeof obj.action === 'object' ? obj.action : obj
  const callId = typeof carrier.tool_call_id === 'string' ? carrier.tool_call_id
    : typeof carrier.id === 'string' ? carrier.id
      : undefined
  const name = typeof carrier.tool_name === 'string' ? carrier.tool_name
    : typeof carrier.name === 'string' ? carrier.name
      : undefined
  return callId && name ? carrier : undefined
}

// REQ-19：assistant 内容里的工具调用 part → [{ callId, name, args }]。
function extractToolCalls(msg) {
  const calls = []
  for (const p of chatgptMessageParts(msg)) {
    const carrier = toolCallCarrier(p)
    if (!carrier) continue
    calls.push({ callId: carrier.tool_call_id ?? carrier.id, name: carrier.tool_name ?? carrier.name, args: carrier.args ?? {} })
  }
  return calls
}

// 线程 → turns（含 REQ-19 工具调用结构化：tool/call + tool/result 配对）。
function buildTurns(thread) {
  const turns = []
  let cur = null
  let lastStep = null
  // 未配对调用队列：ChatGPT 导出的 tool 消息无 tool_call_id 字段，按 FIFO 位置配对
  const pendingCalls = []
  for (const n of thread) {
    const msg = n.message
    const role = msg && msg.author ? msg.author.role : null
    if (role === 'user') {
      const text = chatgptMessageText(msg)
      if (text) {
        cur = { prompt: text, steps: [] }
        turns.push(cur)
        lastStep = null
      }
    } else if (role === 'assistant' && cur) {
      const step = { content: [], toolCalls: [], toolResults: [] }
      // 文本 parts（排除工具调用载体 part，避免 JSON 字符串重复进正文）
      const texts = []
      for (const p of chatgptMessageParts(msg)) {
        if (toolCallCarrier(p)) continue
        if (typeof p === 'string') texts.push(p)
        else if (p && typeof p === 'object' && typeof p.text === 'string') texts.push(p.text)
      }
      if (texts.length > 0) step.content.push({ type: 'text', text: texts.join('\n') })
      for (const tc of extractToolCalls(msg)) {
        const block = {
          type: 'tool-call',
          id: tc.callId,
          name: tc.name,
          // 参数结构化：args 保持 JSON 字符串（与 Claude/Codex 语义一致）
          arguments: typeof tc.args === 'string' ? tc.args : JSON.stringify(tc.args ?? {}),
        }
        step.content.push(block)
        step.toolCalls.push(block)
        pendingCalls.push(tc.callId)
      }
      cur.steps.push(step)
      lastStep = step
    } else if (role === 'tool' && cur) {
      // 工具消息：文本结果按 FIFO 挂到最近未配对调用（挂 tool/result 而非文本块，
      // 配对不变量由 synthesizeSession 兜底；旧行为「按文本挂最近一步」由 README
      // 契约更新为 REQ-19 结构化还原）
      const text = chatgptMessageText(msg)
      const callId = pendingCalls.shift()
      if (callId && lastStep) {
        lastStep.toolResults.push({
          toolCallId: callId,
          content: text ? [{ type: 'text', text }] : [],
          isError: false,
        })
      } else if (text) {
        // 无配对调用（孤儿结果）：按文本挂最近一步，不丢可见信息
        lastStep.content.push({ type: 'text', text })
      }
    }
    // system 与占位节点跳过
  }
  return turns
}
