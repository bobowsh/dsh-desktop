// lib/convert/pi.mjs — Pi Coding Agent 会话 JSONL → DSH 会话（纯函数）

import {
  SESSION_FORMAT_VERSION,
  applyBudgetTrim,
  mintSessionId,
  parseTime,
  synthesizeSession,
} from './core.mjs'

// Pi Coding Agent 会话 JSONL → DSH 会话。
//
// 存储：~/.pi/agent/sessions/--<cwd>--/<timestamp>_<uuid>.jsonl（cwd 的 / \ :
// 替换为 -）。首行是 session 头（type:"session"，version/id/timestamp/cwd），
// 其余条目经 id/parentId 组成树（v1 线性无 id → 顺序链；v2/v3 树形）。
// 条目类型：message（内嵌 AgentMessage）、model_change、thinking_level_change、
// compaction、branch_summary、custom、custom_message、label、session_info。
// 与 Claude/Codex 的线性格式不同：
//   - 树形分支：只重建活动分支（末条目沿 parentId 走到根），旁支条目丢弃；
//   - toolCall 块用 `arguments`（对象，非 input），thinking 块为 {type:"thinking"}；
//   - toolResult 是独立条目（role:"toolResult"，toolCallId 配对）→ 挂回声明调用的 step；
//   - bashExecution / custom / branchSummary / compactionSummary 在 Pi 侧是注入进
//     上下文的 user 消息（convertToLlm），这里用 Pi 自身的文本格式降级为文本块
//     挂到相邻 assistant 步骤（DSH 无独立消息角色可挂，保证 wire 合法）；
//   - compaction 默认尊重（只导最后一次摘要 + retainedTail/保留范围 + 尾部），
//     fullHistory:true 导全量；branch_summary/compaction 摘要 → reasoning 块。
export function convertPiJsonl(raw, args = {}) {
  const recs = []
  let skipped = 0
  for (const line of raw.split('\n')) {
    const t = line.trim()
    if (!t) continue
    try { recs.push(JSON.parse(t)) } catch (_) { skipped++ }
  }

  // 首行 session 头：源会话 id / 创建时间 / cwd。无头行 = 非 Pi 会话文件 → 跳过。
  const header = recs.find((r) => r && typeof r === 'object' && r.type === 'session') || null
  if (!header) {
    return {
      meta: null, events: [], turns: [], title: undefined, messages: 0, toolCalls: 0,
      skipped: 1, records: recs.length,
      skipReason: 'not a Pi Coding Agent session (no session header)',
    }
  }

  // 树条目：v2/v3 用 id/parentId；v1 线性无 id → 顺序链（parentId 缺省取前一条）。
  const entries = []
  for (const rec of recs) {
    if (!rec || typeof rec !== 'object' || rec.type === 'session') continue
    const id = typeof rec.id === 'string' && rec.id ? rec.id : 'e' + entries.length
    const parentId = typeof rec.parentId === 'string' ? rec.parentId
      : (entries.length > 0 ? entries[entries.length - 1].id : null)
    entries.push({ ...rec, _id: id, _parentId: parentId })
  }

  // 活动分支：末条目即当前叶，沿 parentId 走到根（visited 防环），再反转为时间序。
  const byId = new Map(entries.map((e) => [e._id, e]))
  const path = []
  {
    let cur = entries.length > 0 ? entries[entries.length - 1] : null
    const seen = new Set()
    while (cur) {
      if (seen.has(cur._id)) break
      seen.add(cur._id)
      path.push(cur)
      if (cur._parentId === null || cur._parentId === undefined) break
      cur = byId.get(cur._parentId) || null
    }
  }
  path.reverse()

  // 尊重上下文压缩（默认）：只保留活动路径上离叶最近的 compaction 的摘要 + 保留
  // 内容 + 其后的条目，压缩掉的前段折叠进摘要；fullHistory:true 时全量导入
  // （compaction 条目本身仍映射为摘要 reasoning）。retainedTail 是自带检查点的
  // 物化消息（现代格式）；legacy 用 firstKeptEntryId 划定保留条目范围。
  let active = path
  if (args.fullHistory !== true) {
    let compactionIdx = -1
    for (let i = path.length - 1; i >= 0; i--) {
      if (path[i].type === 'compaction') { compactionIdx = i; break }
    }
    if (compactionIdx >= 0) {
      const c = path[compactionIdx]
      const kept = [{ _summary: typeof c.summary === 'string' ? c.summary : '' }]
      if (Array.isArray(c.retainedTail)) {
        for (const m of c.retainedTail) kept.push({ _message: m })
      } else if (typeof c.firstKeptEntryId === 'string') {
        const from = path.findIndex((e) => e._id === c.firstKeptEntryId)
        if (from >= 0) kept.push(...path.slice(from, compactionIdx))
      }
      kept.push(...path.slice(compactionIdx + 1))
      active = kept
    }
  }

  const turns = []
  let cur = null
  let model = null
  let lastModelChange = null
  let title
  // callId → 它所属的 step：toolResult 条目晚于其声明调用到达，按 callId 挂回
  // 声明 step（挂最近一步会让投影出的消息里带 tool_calls 的 assistant 后面紧跟
  // 另一条 assistant，违反 wire 规则）
  const callSteps = new Map()
  let droppedToolResults = 0
  let droppedBash = 0
  // 摘要/注入类内容（compaction / branch_summary / branchSummary / compactionSummary
  // / custom_message）：前置到下一个 assistant 步骤（摘要作 reasoning、注入作 text）
  const pendingBlocks = []

  const processMessage = (m) => {
    if (!m || typeof m !== 'object') return
    if (m.role === 'user') {
      const prompt = piUserText(m.content)
      if (prompt) {
        cur = { prompt, steps: [] }
        turns.push(cur)
      }
    } else if (m.role === 'assistant') {
      // retainedTail 可能以 assistant 开头（无 user）：开空 prompt 轮次兜底
      if (!cur) {
        cur = { prompt: '', steps: [] }
        turns.push(cur)
      }
      const step = { content: [], toolCalls: [], toolResults: [] }
      const pending = pendingBlocks.splice(0)
      if (pending.length > 0) step.content.unshift(...pending)
      if (typeof m.model === 'string' && m.model) step.model = m.model
      if (!model && typeof m.model === 'string' && m.model) model = m.model
      for (const block of Array.isArray(m.content) ? m.content : []) {
        if (!block || typeof block !== 'object') continue
        if (block.type === 'text' && typeof block.text === 'string') {
          step.content.push({ type: 'text', text: block.text })
        } else if (block.type === 'thinking' && typeof block.thinking === 'string') {
          step.content.push({ type: 'reasoning', text: block.thinking })
        } else if (block.type === 'image') {
          step.content.push({ type: 'text', text: '[image: ' + (typeof block.mimeType === 'string' ? block.mimeType : 'image') + ']' })
        } else if (block.type === 'toolCall') {
          const mapped = piToolCall(block, turns.length, cur.steps.length + 1)
          step.content.push({ type: 'tool-call', ...mapped })
          step.toolCalls.push(mapped)
        }
      }
      cur.steps.push(step)
      for (const tc of step.toolCalls) callSteps.set(tc.id, step)
    } else if (m.role === 'toolResult') {
      const step = callSteps.get(String(m.toolCallId))
      if (!step) { droppedToolResults++; return }
      const inner = (Array.isArray(m.content) ? m.content : [])
        .map(piContentBlock)
        .filter(Boolean)
      step.toolResults.push({
        toolCallId: m.toolCallId,
        content: inner,
        isError: m.isError === true,
      })
    } else if (m.role === 'bashExecution') {
      if (m.excludeFromContext === true) return
      // 用户 bash REPL 活动在 Pi 侧是注入的 user 消息 → 用 Pi 自身文本格式降级
      // 为当前轮最后一步的文本块（无独立消息角色可挂，保证 wire 合法）
      if (!cur) { droppedBash++; return }
      const step = cur.steps.length > 0 ? cur.steps[cur.steps.length - 1] : null
      if (step) step.content.push({ type: 'text', text: piBashText(m) })
      else droppedBash++
    } else if (m.role === 'branchSummary' || m.role === 'compactionSummary') {
      // Pi 侧这两个角色是注入 user 消息（带固定前缀）→ reasoning 块（内容一致）
      if (typeof m.summary === 'string' && m.summary.trim()) {
        pendingBlocks.push({
          type: 'reasoning',
          text: (m.role === 'branchSummary' ? PI_BRANCH_SUMMARY_PREFIX : PI_COMPACTION_SUMMARY_PREFIX)
            + m.summary.trim() + PI_SUMMARY_SUFFIX,
        })
      }
    } else if (m.role === 'custom') {
      // 扩展注入消息（Pi 侧是 user 消息）→ 前置文本块（无独立消息角色可挂）
      for (const b of piCustomBlocks(m.content)) pendingBlocks.push(b)
    }
    // 未知 role 跳过
  }

  for (const item of active) {
    if (item && typeof item === 'object' && Object.prototype.hasOwnProperty.call(item, '_summary')) {
      if (typeof item._summary === 'string' && item._summary.trim()) {
        pendingBlocks.push({ type: 'reasoning', text: PI_COMPACTION_SUMMARY_PREFIX + item._summary.trim() + PI_SUMMARY_SUFFIX })
      }
      continue
    }
    if (item && typeof item === 'object' && item._message) {
      processMessage(item._message)
      continue
    }
    if (!item || typeof item !== 'object') continue
    if (item.type === 'compaction') {
      if (typeof item.summary === 'string' && item.summary.trim()) {
        pendingBlocks.push({ type: 'reasoning', text: PI_COMPACTION_SUMMARY_PREFIX + item.summary.trim() + PI_SUMMARY_SUFFIX })
      }
    } else if (item.type === 'branch_summary') {
      if (typeof item.summary === 'string' && item.summary.trim()) {
        pendingBlocks.push({ type: 'reasoning', text: PI_BRANCH_SUMMARY_PREFIX + item.summary.trim() + PI_SUMMARY_SUFFIX })
      }
    } else if (item.type === 'session_info') {
      if (typeof item.name === 'string' && item.name.trim()) title = item.name.trim()
    } else if (item.type === 'model_change') {
      if (typeof item.modelId === 'string' && item.modelId) lastModelChange = item.modelId
    } else if (item.type === 'message') {
      processMessage(item.message)
    } else if (item.type === 'custom_message') {
      // 扩展注入条目（参与上下文）：降级为前置文本块
      for (const b of piCustomBlocks(item.content)) pendingBlocks.push(b)
    }
    // label / custom / thinking_level_change 不进入对话内容 → 跳过
  }

  // 无任何可挂接步骤的残留摘要/注入（文件尾）→ 丢弃，不产生空事件
  if (pendingBlocks.length > 0 && turns.length > 0) {
    const steps = turns.flatMap((t) => t.steps)
    const last = steps.length > 0 ? steps[steps.length - 1] : null
    if (last) last.content.unshift(...pendingBlocks.splice(0))
  }

  if (turns.length === 0) {
    return { meta: null, events: [], turns: [], title: undefined, messages: 0, toolCalls: 0, skipped: 1, records: recs.length }
  }

  const sourceId = typeof header.id === 'string' && header.id ? header.id : args.piId
  const finalId = args.sessionId || mintSessionId(sourceId)
  const meta = { version: SESSION_FORMAT_VERSION, id: finalId, createdAt: parseTime(header.timestamp) }
  if (sourceId) meta.sourceId = sourceId
  if (typeof header.cwd === 'string' && header.cwd) meta.cwd = header.cwd

  const { turns: seedTurns, trimmed } = applyBudgetTrim(turns, args.budget)
  const out = synthesizeSession({
    meta,
    turns: seedTurns,
    title,
    provider: 'pi-coding-agent',
    model: lastModelChange || model,
    skipped,
    records: recs.length,
    imported: { sourcePath: args.sourcePath },
  })
  return {
    ...out,
    droppedToolResults,
    ...(droppedBash > 0 ? { droppedBash } : {}),
    ...(trimmed ? { trimmed } : {}),
  }
}

// 用户消息内容 → 提问文本：string 原样；块数组取 text（image 降级为占位符）。
function piUserText(content) {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  const texts = []
  for (const block of content) {
    if (!block || typeof block !== 'object') continue
    if (block.type === 'text' && typeof block.text === 'string' && block.text.trim()) texts.push(block.text.trim())
    else if (block.type === 'image') texts.push('[image: ' + (typeof block.mimeType === 'string' ? block.mimeType : 'image') + ']')
  }
  return texts.join('\n')
}

// 工具结果 / 普通内容块 → DSH 内容块：text→text、image→占位文本；其余返回 null。
function piContentBlock(block) {
  if (!block || typeof block !== 'object') return null
  if (block.type === 'text' && typeof block.text === 'string') return { type: 'text', text: block.text }
  if (block.type === 'image') return { type: 'text', text: '[image: ' + (typeof block.mimeType === 'string' ? block.mimeType : 'image') + ']' }
  return null
}

// toolCall 块 → tool/call 映射：arguments 是对象（Pi 格式），序列化为标准 JSON；
// 已是字符串（扩展注入）原样保留。id/name 缺失时给稳定兜底值。
function piToolCall(block, turnNum, stepNum) {
  const id = typeof block.id === 'string' && block.id ? block.id : 'pi-' + turnNum + '-' + stepNum
  return {
    id,
    name: typeof block.name === 'string' && block.name ? block.name : 'unknown',
    arguments: typeof block.arguments === 'string' ? block.arguments : JSON.stringify(block.arguments ?? {}),
  }
}

// 扩展注入内容（string 或块数组）→ 前置文本块；image 降级为占位符。
function piCustomBlocks(content) {
  if (typeof content === 'string') return content.trim() ? [{ type: 'text', text: content.trim() }] : []
  if (!Array.isArray(content)) return []
  const blocks = []
  for (const block of content) {
    if (!block || typeof block !== 'object') continue
    if (block.type === 'text' && typeof block.text === 'string' && block.text.trim()) {
      blocks.push({ type: 'text', text: block.text.trim() })
    } else if (block.type === 'image') {
      blocks.push({ type: 'text', text: '[image: ' + (typeof block.mimeType === 'string' ? block.mimeType : 'image') + ']' })
    }
  }
  return blocks
}

// Pi 自身 convertToLlm 里 compaction / branch summary 注入 user 消息的固定前后缀
// （messages.ts），导入时按同样措辞重建，模型看到的内容与 Pi 侧一致。
const PI_COMPACTION_SUMMARY_PREFIX = 'The conversation history before this point was compacted into the following summary:\n\n<summary>\n'
const PI_BRANCH_SUMMARY_PREFIX = 'The following is a summary of a branch that this conversation came back from:\n\n<summary>\n'
const PI_SUMMARY_SUFFIX = '\n</summary>'

// Pi 自身 convertToLlm 的 bashExecution → user 文本格式（bashExecutionToText）。
function piBashText(m) {
  let text = 'Ran `' + (typeof m.command === 'string' ? m.command : '') + '`\n'
  if (typeof m.output === 'string' && m.output) text += '```\n' + m.output + '\n```'
  else text += '(no output)'
  if (m.cancelled === true) text += '\n\n(command cancelled)'
  else if (m.exitCode !== null && m.exitCode !== undefined && m.exitCode !== 0) text += '\n\nCommand exited with code ' + m.exitCode
  if (m.truncated === true && typeof m.fullOutputPath === 'string') text += '\n\n[Output truncated. Full output: ' + m.fullOutputPath + ']'
  return text
}
