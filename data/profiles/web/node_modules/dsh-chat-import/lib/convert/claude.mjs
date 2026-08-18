// lib/convert/claude.mjs — Claude Code transcript JSONL → DSH 会话（纯函数）

import {
  SESSION_FORMAT_VERSION,
  applyBudgetTrim,
  mapContentBlock,
  mintSessionId,
  parseJsonlLines,
  parseTime,
  synthesizeSession,
} from './core.mjs'

// REQ-27 标题归一统一规则：去首尾空白、折叠内部空白；超 80 字符截断加省略号；
// 空白返回空串。core.mjs 属禁改面，各源按文件内联同款（改规则需逐源同步，
// 现共 9 处内联：claude/codex/cursor/gemini/reasonix/grokbuild/hermes/openclaw/kimi）。
const TITLE_MAX_LEN = 80
const TITLE_ELLIPSIS = '…'
function normalizeTitle(text) {
  const t = String(text ?? '').trim().replace(/\s+/g, ' ')
  if (!t) return ''
  return t.length <= TITLE_MAX_LEN ? t : t.slice(0, TITLE_MAX_LEN - TITLE_ELLIPSIS.length) + TITLE_ELLIPSIS
}

// 逐行解析 JSONL：直连人类提问（type==='user' 且 content 为字符串）开新轮；每条
// assistant 消息 = 一步。Claude 源格式把多条连续 assistant（各带 tool_use）与后置的
// tool_result 分开（assistant[callA] assistant[callB] user[resultA] user[resultB]）；
// tool_result 按 tool_use_id 挂到 call 所属 step（而非最近一步），保证投影出的 LLM
// 消息里每条 tool 消息紧邻其 tool_calls 的 assistant（wire 规则：中间不能插 assistant）。
export function convertClaudeJsonl(raw, args = {}) {
  // REQ-26：逐行解析带行号明细（畸形行计数不设限，明细封顶 200）+ secrets 位置
  let { recs, skipped, skippedLines, secrets } = parseJsonlLines(raw)

  let sourceId = null
  let title = null
  let customTitle = null
  let cwd = null
  let cwdHint = null
  let createdAt = null
  let model = null

  // REQ-22 compacted 摘要导入：只导「最后一次压缩摘要 + 尾部」。Claude Code 的
  // summary 记录是压缩载体（summary 文本 + title）；摘要作 reasoning 块前置到
  // 首个保留轮，尾部记录正常导入。无 summary 记录时按全量（compacted 不生效）。
  // 放在变量声明之后（customTitle 需先声明），记录切片在正式循环之前。
  let compactReasoning = null
  let compacted = false
  if (args.compacted === true) {
    let lastSummaryIdx = -1
    let lastSummaryText = null
    for (let i = 0; i < recs.length; i++) {
      const r = recs[i]
      if (r && typeof r === 'object' && r.type === 'summary') {
        lastSummaryIdx = i
        const v = (typeof r.summary === 'string' && r.summary.trim()) ? r.summary.trim()
          : (typeof r.title === 'string' && r.title.trim()) ? r.title.trim()
            : null
        if (v !== null) lastSummaryText = v
      }
    }
    if (lastSummaryIdx >= 0 && lastSummaryText) {
      compactReasoning = lastSummaryText
      compacted = true
      // 压缩摘要即自定义标题载体（compacted 会话标题取摘要文本）
      if (customTitle === null && typeof recs[lastSummaryIdx].title === 'string' && recs[lastSummaryIdx].title.trim()) {
        customTitle = recs[lastSummaryIdx].title.trim()
      }
      recs = recs.slice(lastSummaryIdx + 1)
    }
  }

  const turns = []
  let cur = null
  // callId → 它所属的 step：Claude 的 tool_result 全部后置（在连续 assistant 之后
  // 到达），必须按 callId 挂回 call 所在 step；挂最近一步会让投影出的消息里带
  // tool_calls 的 assistant 后面紧跟另一条 assistant，违反 wire 规则
  const callSteps = new Map()
  // 丢弃的孤儿 tool_result 计数（transcript 里没有对应 tool_use）
  let droppedToolResults = 0
  // REQ-26：permission 类记录（工具授权提示）只计数，不进入对话
  let permissionCount = 0

  for (const rec of recs) {
    if (rec && typeof rec.sessionId === 'string' && !sourceId) sourceId = rec.sessionId
    if (rec && typeof rec.cwd === 'string' && !cwd) cwd = rec.cwd
    if (rec && typeof rec.timestamp === 'string' && createdAt === null) createdAt = parseTime(rec.timestamp)
    if (rec && rec.type === 'ai-title' && typeof rec.aiTitle === 'string' && !title) title = rec.aiTitle
    if (rec && rec.type === 'permission') { permissionCount++ }
    // REQ-27 custom-title（优先于 ai-title）：Claude 的会话标题载体是 summary 记录的
    // summary/title 字段（重命名/自定义标题）。后到者胜（最近一次重命名/压缩 = 当前
    // 标题）。首行记录类型是 mode（非 summary）——见 export/claude.mjs 的布局校验。
    if (rec && rec.type === 'summary') {
      const v = (typeof rec.summary === 'string' && rec.summary.trim()) ? rec.summary
        : (typeof rec.title === 'string' && rec.title.trim()) ? rec.title
        : null
      if (v !== null) customTitle = v
    }
    const recModel = rec ? (rec.message?.model ?? rec.model) : undefined
    if (typeof recModel === 'string' && !model) model = recModel

    if (rec && rec.type === 'user' && rec.message && typeof rec.message.content === 'string') {
      // 直连人类提问 → 新轮
      cur = { prompt: rec.message.content, steps: [] }
      turns.push(cur)
    } else if (rec && rec.type === 'assistant' && cur) {
      // 一条 assistant 消息 = 一步
      const step = { content: [], toolCalls: [], toolResults: [] }
      if (Array.isArray(rec.message?.content)) {
        for (const block of rec.message.content) {
          const mapped = mapContentBlock(block)
          if (!mapped) continue
          if (mapped.type === 'tool-call') {
            step.content.push(mapped)   // 助手内容里的 tool-call block
            step.toolCalls.push(mapped) // 同时作为 tool/call 事件
          } else {
            step.content.push(mapped)   // text / reasoning block
          }
        }
      } else if (typeof rec.message?.content === 'string') {
        step.content.push({ type: 'text', text: rec.message.content })
      }
      cur.steps.push(step)
      for (const tc of step.toolCalls) callSteps.set(tc.id, step)
    } else if (rec && rec.type === 'user' && Array.isArray(rec.message?.content)) {
      // 工具结果：按 tool_use_id 挂到 call 所属 step。Claude 的 tool_result 在所有
      // assistant（各带 tool_use）之后到达；挂最近一步会让带 tool_calls 的 assistant
      // 后面紧跟另一条 assistant，投影出的 LLM 消息违反 wire 规则。查不到对应调用
      // （如 transcript 从中途开始）的孤儿结果直接丢弃并计数：挂 lastStep 会投影出
      // 无 call 的孤儿 tool 消息，同样被模型 API 拒绝。
      for (const block of rec.message.content) {
        if (block && block.type === 'tool_result') {
          const step = callSteps.get(block.tool_use_id)
          if (!step) { droppedToolResults++; continue }
          const inner = (Array.isArray(block.content) ? block.content : [])
            .map(mapContentBlock)
            .filter(Boolean)
          step.toolResults.push({
            toolCallId: block.tool_use_id,
            content: inner,
            isError: block.is_error === true,
          })
        }
      }
    }
  }

  // 同一步内多个结果按 call 顺序对齐：Claude 的 tool_result 块可能乱序返回
  // （并行工具），按该 step 的 toolCalls 顺序稳定排序，保证投影出的 tool 消息
  // 与 assistant 的 tool_calls 一一对应、顺序一致。
  for (const t of turns) {
    for (const s of t.steps) {
      if (s.toolResults.length < 2 || s.toolCalls.length === 0) continue
      const order = new Map(s.toolCalls.map((c, i) => [c.id, i]))
      s.toolResults.sort((a, b) => {
        const ia = order.get(a.toolCallId)
        const ib = order.get(b.toolCallId)
        return (ia === undefined ? s.toolCalls.length : ia) - (ib === undefined ? s.toolCalls.length : ib)
      })
    }
  }

  // 只有主 transcript（文件名 = <sessionId>.jsonl）是独立会话。Claude Code 项目目录里
  // `<sessionId>/subagents/**` 的辅助 transcript（agent-*.jsonl 等）记录携带父 sessionId，
  // 若按它建会话会与主 transcript 撞 id：先扫描到的文件占会话、主内容被幂等跳过而丢失。
  // 文件名与记录 sessionId 不一致的一律跳过并给原因（单文件/目录模式一致）。
  const fileStem = typeof args.fileStem === 'string' ? args.fileStem : null
  if (fileStem && sourceId && fileStem !== sourceId) {
    return {
      meta: null, events: [], turns: [], title: null, messages: 0, toolCalls: 0,
      skipped: 0, records: recs.length, droppedToolResults: 0,
      skippedLines: [], secrets: [], permissionCount: 0,
      skipReason: 'auxiliary transcript (file "' + fileStem + '" does not match sessionId "' + sourceId + '"); only the main <sessionId>.jsonl becomes a session',
    }
  }

  const sessionId = args.sessionId || mintSessionId(sourceId)
  const meta = { version: SESSION_FORMAT_VERSION, id: sessionId, createdAt: createdAt ?? Date.now() }
  if (sourceId) meta.sourceId = sourceId
  // REQ-39：转录无 cwd 记录时输出 cwdHint（会话目录名 = Claude 项目 slug，含 '--'
  // 分隔标记才提示），index 层经 ~/.claude.json 权威映射 / slug 解码回填 meta.cwd
  if (!cwd && typeof args.sourcePath === 'string' && args.sourcePath.includes('--')) {
    const dirSegs = String(args.sourcePath).replace(/[\\/]+$/, '').split(/[\\/]/)
    const slugDir = dirSegs[dirSegs.length - 2] || ''
    if (slugDir.includes('--')) cwdHint = slugDir
  }
  if (cwd) meta.cwd = cwd

  // REQ-22 compacted：摘要 reasoning 块前置到首个保留轮的 assistant 步骤（opencode
  // compaction 同款模式）；尾部为空（摘要后无新内容）不产生空会话。
  if (compactReasoning && turns.length > 0) {
    const first = turns[0]
    if (first.steps.length === 0) {
      first.steps.push({ content: [], toolCalls: [], toolResults: [] })
    }
    first.steps[0].content.unshift({ type: 'reasoning', text: compactReasoning })
  }

  // REQ-27 标题选取：custom-title > ai-title > 首问兜底。显式标题（custom/ai，归一后
  // 非空）钉 session/title 事件；纯首问兜底只回填 out.title——DSH 对无标题事件会话
  // 自动回退首条 user 文本（core.mjs「钉住，避免自动回退标题覆盖」），钉住结果相同
  // 且不改变既有事件契约。
  const explicitTitle = customTitle || (title && title.trim() ? title : null)
  const finalTitle = normalizeTitle(explicitTitle || (turns.length > 0 ? turns[0].prompt : ''))
  const { turns: seedTurns, trimmed } = applyBudgetTrim(turns, args.budget)
  const syn = synthesizeSession({ meta, turns: seedTurns, title: explicitTitle ? finalTitle : undefined, provider: 'claude-code', model, skipped, records: recs.length, skippedLines, secrets, permissionCount, imported: { sourcePath: args.sourcePath } })
  return { ...syn, title: finalTitle, droppedToolResults, ...(cwdHint ? { cwdHint } : {}), ...(compacted ? { compacted: true } : {}), ...(trimmed ? { trimmed } : {}) }
}
