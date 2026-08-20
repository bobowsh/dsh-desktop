// lib/convert/grokbuild.mjs — Grok Build 会话（summary.json + chat_history.jsonl）→ DSH 会话（纯函数）
//
// 存储：~/.grok/sessions/<encoded-project>/<session_id>/（及 ~/.grok/archived_sessions/），
// 每会话一个目录，含 summary.json 与 chat_history.jsonl。目录扫描归 index 层，本模块
// 只做纯转换：convertGrokbuildJson(summaryJsonText, chatHistoryText, args)。
//
// summary.json：{ info:{id,cwd}, session_summary, generated_title, created_at, updated_at,
// last_active_at } → meta（id/cwd/createdAt）与标题（generated_title > session_summary）。
// chat_history.jsonl 每行 { type, content, timestamp }：
//   - type ∈ user/assistant/tool/system/reasoning；reasoning（含加密内部状态）跳过、
//     system（harness 注入）过滤，两者计入 filtered；
//   - content 为 string 或 Claude 风格 block 数组
//     [text | input_text | output_text | thinking | tool_use | tool_result]；
//   - assistant 的 tool_use → tool/call；type:"tool" 记录 / tool_result 块 → tool/result，
//     按 tool_use_id 挂回 call 所属 step（会话级，跨 step 的异步结果也可配对）；
//     无 tool_use_id 的纯文本 tool 记录在「唯一未覆盖调用」时兜底归属，否则丢弃计数，
//     保持配对不变量（每个 tool/call 必有 tool/result，缺则 synthesizeSession 补空）。

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
// 空白返回空串。core.mjs 属禁改面，各源按文件内联同款（改规则需同步 5 处）。
const TITLE_MAX_LEN = 80
const TITLE_ELLIPSIS = '…'
function normalizeTitle(text) {
  const t = String(text ?? '').trim().replace(/\s+/g, ' ')
  if (!t) return ''
  return t.length <= TITLE_MAX_LEN ? t : t.slice(0, TITLE_MAX_LEN - TITLE_ELLIPSIS.length) + TITLE_ELLIPSIS
}

// summary 时间字段回退链：created_at → updated_at → last_active_at；全部缺失返回 null
//（由调用方回退导入时刻，避免把导入时刻当会话创建时间）。parseTime 对缺失值会回退
// Date.now()，无法区分「缺失」与「合法」，故在此先滤掉空值。
function firstValidTime(...values) {
  for (const v of values) {
    if (v === undefined || v === null || v === '') continue
    return parseTime(v)
  }
  return null
}

// 记录 content → { texts, blocks, toolResults }。string → 单文本块；数组 → 逐块分类
//（text/input_text/output_text 记入 texts 且保留在 blocks 供映射，thinking/tool_use 只进
// blocks，tool_result 单独抽出）；未知/结构性块（summary_text 等）进 blocks 由映射过滤。
function parseGrokContent(content) {
  const out = { texts: [], blocks: [], toolResults: [] }
  const raw = typeof content === 'string'
    ? [{ type: 'text', text: content }]
    : (Array.isArray(content) ? content : [])
  for (const block of raw) {
    if (!block || typeof block !== 'object') continue
    if (block.type === 'tool_result') { out.toolResults.push(block); continue }
    if ((block.type === 'text' || block.type === 'input_text' || block.type === 'output_text')
      && typeof block.text === 'string') {
      out.texts.push(block.text)
    }
    out.blocks.push(block)
  }
  return out
}

// block → DSH content 块。Claude 原生类型（text/thinking/tool_use）走 core 的
// mapContentBlock；input_text/output_text（Gemini/Codex 风格）归一到 text；其余返回 null。
function mapGrokBlock(block) {
  const mapped = mapContentBlock(block)
  if (mapped) return mapped
  if ((block.type === 'input_text' || block.type === 'output_text') && typeof block.text === 'string') {
    return { type: 'text', text: block.text }
  }
  return null
}

// tool_result 块的内容 → DSH content 块：数组按 mapContentBlock 逐块映射（Claude 风格
// 嵌套块）；纯字符串 → 单文本块；其余空数组（不虚构文本，缺结果时由 synthesizeSession
// 补空 result）。
function mapToolResultContent(content) {
  if (Array.isArray(content)) return content.map(mapContentBlock).filter(Boolean)
  if (typeof content === 'string' && content !== '') return [{ type: 'text', text: content }]
  return []
}

export function convertGrokbuildJson(summaryJsonText, chatHistoryText, args = {}) {
  let summary = null
  try {
    summary = JSON.parse(summaryJsonText)
  } catch {
    return emptySkip('malformed summary.json')
  }
  if (!summary || typeof summary !== 'object') return emptySkip('malformed summary.json')
  const info = summary.info && typeof summary.info === 'object' ? summary.info : {}

  // REQ-26：逐行解析带行号明细（畸形行计数不设限，明细封顶 200）+ secrets 位置
  const { recs, skipped, skippedLines, secrets } = parseJsonlLines(chatHistoryText ?? '')

  const sourceId = typeof info.id === 'string' && info.id ? info.id : null
  const cwd = typeof info.cwd === 'string' && info.cwd ? info.cwd : null
  const createdAt = firstValidTime(summary.created_at, summary.updated_at, summary.last_active_at) ?? Date.now()

  // 标题：generated_title > session_summary（显式标题钉 session/title 事件，首问只回填 out.title）
  const generatedTitle = typeof summary.generated_title === 'string' ? summary.generated_title.trim() : ''
  const sessionSummary = typeof summary.session_summary === 'string' ? summary.session_summary.trim() : ''
  const explicitTitle = generatedTitle || sessionSummary || null

  const turns = []
  let cur = null
  // callId → 所属 step（会话级）：结果记录可能晚于后续 assistant 到达，按 callId 挂回
  // call 所在 step，保证投影出的 tool 消息紧邻其 tool_calls 的 assistant（wire 规则）
  const callSteps = new Map()
  // 会话级「未覆盖」调用（按到达顺序）：无 tool_use_id 的纯文本 tool 记录的兜底归属
  const openCallIds = []
  // 丢弃的孤儿 tool/result 计数（transcript 里没有对应 tool_use 或归属歧义）
  let droppedToolResults = 0
  // reasoning（加密内部状态）与 system（harness 注入）记录的过滤计数
  let filtered = 0
  // 开关开启时收集 system（系统提示词）文本，作为上下文注入保留
  let systemPrompt = null

  const attachResult = (toolCallId, content, isError) => {
    const step = callSteps.get(toolCallId)
    if (!step) { droppedToolResults++; return }
    step.toolResults.push({ toolCallId, content, isError: isError === true })
    const i = openCallIds.indexOf(toolCallId)
    if (i !== -1) openCallIds.splice(i, 1)
  }

  // tool_result 块 → 结果；缺 tool_use_id 时兜底唯一未覆盖调用（多候选不冒险错配）
  const attachToolResultBlock = (block) => {
    const id = block.tool_use_id
    if (typeof id === 'string' && id) {
      attachResult(id, mapToolResultContent(block.content), block.is_error)
    } else if (openCallIds.length === 1) {
      attachResult(openCallIds[0], mapToolResultContent(block.content), block.is_error)
    } else {
      droppedToolResults++
    }
  }

  for (const rec of recs) {
    if (!rec || typeof rec !== 'object') continue
    const kind = rec.type
    if (kind === 'system') {
      if (args.importSystemPrompt === true) {
        const text = parseGrokContent(rec.content).texts.join('\n').trim()
        if (text) systemPrompt = systemPrompt ? systemPrompt + '\n\n' + text : text
      }
      filtered++
      continue
    }
    if (kind === 'reasoning') { filtered++; continue }
    if (kind !== 'user' && kind !== 'assistant' && kind !== 'tool') continue
    const pc = parseGrokContent(rec.content)
    if (kind === 'user') {
      // 含 tool_result 的 user 记录是结果消息（Claude 风格），配对、不开新轮
      if (pc.toolResults.length > 0) {
        for (const tr of pc.toolResults) attachToolResultBlock(tr)
        continue
      }
      const prompt = pc.texts.join('\n').trim()
      if (prompt) {
        cur = { prompt, steps: [] }
        turns.push(cur)
      }
    } else if (kind === 'assistant' && cur) {
      const step = { content: [], toolCalls: [], toolResults: [] }
      for (const block of pc.blocks) {
        const mapped = mapGrokBlock(block)
        if (!mapped) continue
        if (mapped.type === 'tool-call') {
          step.content.push(mapped)
          step.toolCalls.push(mapped)
          callSteps.set(mapped.id, step)
          openCallIds.push(mapped.id)
        } else {
          step.content.push(mapped)
        }
      }
      cur.steps.push(step)
      // assistant 记录里的 tool_result 块（防御）同样配对
      for (const tr of pc.toolResults) attachToolResultBlock(tr)
    } else if (kind === 'tool') {
      if (pc.toolResults.length > 0) {
        for (const tr of pc.toolResults) attachToolResultBlock(tr)
        continue
      }
      // 纯文本 tool 记录：顶层 tool_use_id 优先，其次唯一未覆盖调用；否则孤儿丢弃
      const text = mapToolResultContent(pc.texts.join('\n'))
      const recId = typeof rec.tool_use_id === 'string' && rec.tool_use_id ? rec.tool_use_id : null
      if (recId) attachResult(recId, text, rec.is_error)
      else if (openCallIds.length === 1) attachResult(openCallIds[0], text, rec.is_error)
      else droppedToolResults++
    }
  }

  const sessionId = args.sessionId || mintSessionId(sourceId)
  const meta = { version: SESSION_FORMAT_VERSION, id: sessionId, createdAt }
  if (sourceId) meta.sourceId = sourceId
  if (cwd) meta.cwd = cwd

  // REQ-27 标题：显式（generated_title > session_summary）钉事件；首问兜底只回填 out.title。
  // 无可导入内容（turns=0）时不钉 title 事件——Grok 的 summary 几乎总带 generated_title，
  // 空 chat_history 也满足显式标题；若照常钉事件，index 层的空会话跳过判定
  // （turns===0 && events===0）会失效，落盘只有一条 title 的空会话。
  const finalTitle = normalizeTitle(explicitTitle || (turns.length > 0 ? turns[0].prompt : ''))
  const { turns: seedTurns, trimmed } = applyBudgetTrim(turns, args.budget)
  const syn = synthesizeSession({
    meta,
    turns: seedTurns,
    title: turns.length > 0 && explicitTitle ? finalTitle : undefined,
    provider: 'grokbuild',
    skipped,
    records: recs.length,
    skippedLines,
    secrets,
    imported: { sourcePath: args.sourcePath },
    systemPrompt,
  })
  return {
    ...syn,
    title: finalTitle,
    filtered,
    droppedToolResults,
    ...(trimmed ? { trimmed } : {}),
  }
}

// summary.json 无法解析时的空结果形态（对齐 claude 辅助 transcript 的 skipReason 返回）。
function emptySkip(reason) {
  return {
    meta: null,
    events: [],
    turns: [],
    title: undefined,
    messages: 0,
    toolCalls: 0,
    skipped: 0,
    records: 0,
    filtered: 0,
    droppedToolResults: 0,
    skippedLines: [],
    secrets: [],
    skipReason: reason,
  }
}
