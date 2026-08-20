// lib/convert/codex.mjs — Codex / ChatGPT CLI rollout JSONL → DSH 会话（纯函数）

import {
  SESSION_FORMAT_VERSION,
  applyBudgetTrim,
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

// Codex / ChatGPT CLI rollout JSONL → 统一的回合中间结构。
//
// 行 envelope：{ timestamp, type, payload }。只消费 response_item（模型产物）与
// session_meta / turn_context（元数据）；event_msg 的 user_message / agent_message
// 是 response_item 的重复（schema 笔记明确警告会重复计数），一律忽略。
// 用户消息里以 `<` 开头的块（<environment_context>、<user_instructions>、
// <system-reminder> 等）是 harness 注入，不是人类输入，跳过。
export function convertCodexJsonl(raw, args = {}) {
  // REQ-26：逐行解析带行号明细（畸形行计数不设限，明细封顶 200）+ secrets 位置
  const { recs, skipped, skippedLines, secrets } = parseJsonlLines(raw)
  // REQ-44：custom_tool_call 的 JS 参数未能转标准 JSON、原样保留的个数（诊断计数）
  let droppedMalformedArgs = 0

  let sourceId = null
  let cwd = null
  let createdAt = null
  let model = null
  // 开关开启时收集 developer（系统提示词/系统注入）文本，作为上下文注入保留
  let systemPrompt = null

  // callId → 它所属的 step（跨行配对 function_call_output）
  const callSteps = new Map()

  const turns = []
  let cur = null
  let lastStep = null

  // 新开一个「用户提问」回合。
  const openTurn = (prompt) => {
    cur = { prompt, steps: [] }
    turns.push(cur)
    lastStep = null
  }

  // 追加一步 assistant 产物（文本 / 工具调用）；没有当前回合时忽略。
  const openStep = () => {
    const step = { content: [], toolCalls: [], toolResults: [] }
    cur.steps.push(step)
    lastStep = step
    return step
  }

  for (const rec of recs) {
    const env = rec && rec.type
    const payload = rec && rec.payload
    if (env === 'session_meta' && payload) {
      if (!sourceId && typeof payload.id === 'string') sourceId = payload.id
      if (!cwd && typeof payload.cwd === 'string') cwd = payload.cwd
      if (createdAt === null) createdAt = parseTime(payload.timestamp ?? rec.timestamp)
      continue
    }
    if (env === 'turn_context' && payload) {
      if (!model && typeof payload.model === 'string') model = payload.model
      continue
    }
    if (env !== 'response_item' || !payload) continue

    if (payload.type === 'message') {
      if (payload.role === 'user' && Array.isArray(payload.content)) {
        // 过滤 harness 注入，剩余文本合并为用户提问
        const parts = []
        for (const block of payload.content) {
          if (block && block.type === 'input_text' && typeof block.text === 'string') {
            if (!block.text.startsWith('<')) parts.push(block.text)
          }
        }
        const prompt = parts.join('\n').trim()
        if (prompt) openTurn(prompt)
      } else if (payload.role === 'assistant' && cur) {
        const step = openStep()
        for (const block of payload.content) {
          if (block && block.type === 'output_text' && typeof block.text === 'string') {
            step.content.push({ type: 'text', text: block.text })
          }
        }
      } else if (payload.role === 'developer' && args.importSystemPrompt === true) {
        // developer（系统提示词）：默认忽略；开关开启时按上下文注入保留
        const text = codexMessageText(payload.content)
        if (text) systemPrompt = systemPrompt ? systemPrompt + '\n\n' + text : text
      }
      // developer（系统注入）默认忽略
    } else if ((payload.type === 'function_call' || payload.type === 'custom_tool_call') && cur) {
      // 挂到最近的 assistant 步骤（一步 = assistant 消息 + 其工具调用）；没有则新开一步
      const step = lastStep || openStep()
      const callId = payload.call_id
      let argumentsText
      if (payload.type === 'function_call') {
        argumentsText = typeof payload.arguments === 'string' ? payload.arguments : JSON.stringify(payload.arguments ?? {})
      } else {
        // custom_tool_call（如 apply_patch）：input 是自由格式；2026+ 新版是 JS 代码
        // （tools.exec_command({...}) 等调用形态）——识别并转标准 JSON，失败原样保留
        const res = codexCustomToolArguments(payload.input)
        argumentsText = res.arguments
        if (res.fallback) droppedMalformedArgs++
      }
      const mapped = {
        id: callId,
        name: payload.name || 'unknown',
        arguments: argumentsText,
      }
      // assistant 消息内容必须携带 tool-call block：wire 适配器的 tool_calls 只从
      // assistant 消息的 content 块派生（dsh-llm-deepseek serializeAssistant），
      // 只挂 step.toolCalls 会让 tool/result 成为无前置 tool_calls 的孤儿 tool 消息
      step.content.push({ type: 'tool-call', ...mapped })
      step.toolCalls.push(mapped)
      if (callId) callSteps.set(callId, step)
    } else if ((payload.type === 'function_call_output' || payload.type === 'custom_tool_call_output') && cur) {
      const callId = payload.call_id
      const step = callSteps.get(callId) || lastStep || openStep()
      // output 可能是纯字符串，也可能是 {"output": "...", "metadata": {...}} JSON 字符串
      let text
      const out = payload.output
      if (typeof out === 'string') {
        let parsed = null
        try { parsed = JSON.parse(out) } catch (_) { /* 纯文本 */ }
        text = parsed && typeof parsed === 'object' && typeof parsed.output === 'string'
          ? parsed.output
          : out
      } else if (out && typeof out === 'object' && typeof out.output === 'string') {
        text = out.output
      } else {
        text = typeof out === 'string' ? out : JSON.stringify(out ?? '')
      }
      step.toolResults.push({
        toolCallId: callId,
        content: [{ type: 'text', text }],
        isError: false,
      })
    }
    // reasoning（内容加密，通常不可读）与其余事件忽略
  }

  const sessionId = args.sessionId || mintSessionId(sourceId)
  const meta = { version: SESSION_FORMAT_VERSION, id: sessionId, createdAt: createdAt ?? Date.now() }
  if (sourceId) meta.sourceId = sourceId
  if (cwd) meta.cwd = cwd

  // REQ-27 标题兜底：Codex 无显式标题源（无 ai-title/custom-title）→ 首问兜底。
  // 只回填 out.title，不钉 session/title 事件（DSH 自动回退首条 user 文本，见 claude.mjs）。
  const finalTitle = normalizeTitle(turns.length > 0 ? turns[0].prompt : '')
  const { turns: seedTurns, trimmed } = applyBudgetTrim(turns, args.budget)
  const syn = synthesizeSession({ meta, turns: seedTurns, title: undefined, provider: 'codex', model, skipped, records: recs.length, skippedLines, secrets, imported: { sourcePath: args.sourcePath }, systemPrompt })
  return {
    ...syn,
    title: finalTitle,
    droppedMalformedArgs,
    ...(trimmed ? { trimmed } : {}),
  }
}

// Codex 消息 content → 纯文本（字符串原样；数组逐块取 input_text/output_text）。
// developer / user 消息共用（user 分支过滤 < 开头 harness 注入后走同一提取）。
function codexMessageText(content) {
  if (typeof content === 'string') return content.trim()
  if (!Array.isArray(content)) return ''
  const parts = []
  for (const block of content) {
    if (block && (block.type === 'input_text' || block.type === 'output_text') && typeof block.text === 'string') {
      parts.push(block.text)
    }
  }
  return parts.join('\n').trim()
}

// Codex `custom_tool_call` 的 input 是 JS 代码字符串（2026+ 新版，如
// `tools.exec_command({cmd: "...", workdir: "..."})`、直接对象字面量或箭头/括号包裹的
// 调用表达式）。直接 JSON.stringify 当 arguments 传模型会让模型学到错误的调用格式
// （JS/XML 混合）。识别 JS 调用形态 → 提取最外层对象字面量 → 最小转换器转标准 JSON；
// 提取/转换任一失败回退原样（不抛异常、不产生垃圾输出）。返回 { arguments, fallback }：
// fallback=true 表示「识别为 JS 形态但未能转换、原样保留」（供调用方计数
// droppedMalformedArgs）；apply_patch 这类自由文本不算，因为根本没进入转换流程。
export function codexCustomToolArguments(input) {
  if (typeof input !== 'string') return { arguments: JSON.stringify(input ?? {}), fallback: false }
  const text = input.trim()
  if (!text || !codexJsArgsShape(text)) return { arguments: JSON.stringify(input), fallback: false }
  const start = findObjectStart(text)
  if (start === -1) return { arguments: JSON.stringify(input), fallback: true }
  const end = findMatchingBrace(text, start)
  if (end === -1) return { arguments: JSON.stringify(input), fallback: true }
  const json = jsObjectLiteralToJson(text.slice(start, end + 1))
  if (json === null) return { arguments: JSON.stringify(input), fallback: true }
  return { arguments: json, fallback: false }
}

// 识别 Codex custom_tool_call 的 JS 调用形态：直接对象字面量 {…}、括号包裹表达式
// （IIFE / 箭头函数 / Promise.all）、name(…) / tools.name(…) 调用，以及带赋值/返回
// 前缀的调用片段（const r = await tools.exec_command({…}) 等）。
function codexJsArgsShape(text) {
  return /^\{/.test(text)
    || /^\(/.test(text)
    || /^(?:return\s+|(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=\s*)?(?:await\s+)?(?:[A-Za-z_$][\w$]*\.)*[A-Za-z_$][\w$]*\s*\(/.test(text)
}

// 定位 input 中第一个不在字符串/模板字面量里的 '{'（提取调用参数的对象字面量起点）。
function findObjectStart(text) {
  for (let i = 0; i < text.length;) {
    const ch = text[i]
    if (ch === '"' || ch === "'") { i = skipJsString(text, i); continue }
    if (ch === '`') { i = skipJsTemplate(text, i); continue }
    if (ch === '{') return i
    i++
  }
  return -1
}

// 从 start（text[start] === '{'）找到匹配的 '}'（嵌套花括号 / 字符串 / 模板 aware）。
function findMatchingBrace(text, start) {
  let depth = 0
  for (let i = start; i < text.length;) {
    const ch = text[i]
    if (ch === '"' || ch === "'") { i = skipJsString(text, i); continue }
    if (ch === '`') { i = skipJsTemplate(text, i); continue }
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) return i
    }
    i++
  }
  return -1
}

// 跳过单/双引号字符串（含反斜杠转义）；返回越过闭合引号的下标。未闭合时扫到末尾。
function skipJsString(text, start) {
  const quote = text[start]
  for (let i = start + 1; i < text.length;) {
    const ch = text[i]
    if (ch === '\\') { i += 2; continue }
    i++
    if (ch === quote) return i
  }
  return text.length
}

// 跳过模板字面量（含 ${…} 插值：插值内按 JS 代码扫描，可嵌套字符串/模板/花括号）；
// 返回越过闭合反引号的下标。未闭合时扫到末尾。
function skipJsTemplate(text, start) {
  for (let i = start + 1; i < text.length;) {
    const ch = text[i]
    if (ch === '\\') { i += 2; continue }
    if (ch === '$' && text[i + 1] === '{') {
      let depth = 1
      i += 2
      while (i < text.length && depth > 0) {
        const c = text[i]
        if (c === '"' || c === "'") { i = skipJsString(text, i); continue }
        if (c === '`') { i = skipJsTemplate(text, i); continue }
        if (c === '{') { depth++; i++; continue }
        if (c === '}') { depth--; i++; if (depth === 0) break }
        i++
      }
      continue
    }
    i++
    if (ch === '`') return i
  }
  return text.length
}

// 最小 JS 对象字面量 → JSON 文本（零依赖、无 eval；递归下降）。
// 支持：字符串键/值（单/双引号 + 常用转义）、无引号标识符键、数字、true/false/null、
// 数组、嵌套对象。不支持（返回 null）：函数/方法调用、变量引用、注释、尾逗号、
// 模板字符串值、十六进制数字等——调用方回退原样。
export function jsObjectLiteralToJson(src) {
  let i = 0
  const err = () => { throw new SyntaxError('unsupported JS object literal at ' + i) }
  const skipWs = () => { while (i < src.length && (src[i] === ' ' || src[i] === '\t' || src[i] === '\n' || src[i] === '\r')) i++ }
  const parseString = () => {
    const quote = src[i]
    i++
    let out = ''
    while (i < src.length) {
      const ch = src[i]
      if (ch === quote) { i++; return out }
      if (ch !== '\\') { out += ch; i++; continue }
      i++
      const e = src[i]
      switch (e) {
        case 'n': out += '\n'; i++; break
        case 't': out += '\t'; i++; break
        case 'r': out += '\r'; i++; break
        case 'b': out += '\b'; i++; break
        case 'f': out += '\f'; i++; break
        case 'v': out += '\v'; i++; break
        case '0': out += '\0'; i++; break
        case 'u': {
          i++
          if (src[i] === '{') {
            // \u{…}：1–6 位十六进制码点
            let hex = ''
            i++
            while (i < src.length && /[0-9a-fA-F]/.test(src[i])) { hex += src[i]; i++ }
            if (src[i] !== '}' || hex.length === 0 || hex.length > 6) err()
            const cp = parseInt(hex, 16)
            if (cp > 0x10ffff) err()
            out += String.fromCodePoint(cp)
            i++
          } else {
            const hex = src.slice(i, i + 4)
            if (!/^[0-9a-fA-F]{4}$/.test(hex)) err()
            out += String.fromCharCode(parseInt(hex, 16))
            i += 4
          }
          break
        }
        case 'x': {
          i++
          const hex = src.slice(i, i + 2)
          if (!/^[0-9a-fA-F]{2}$/.test(hex)) err()
          out += String.fromCharCode(parseInt(hex, 16))
          i += 2
          break
        }
        default:
          // 身份转义（\\ \' \" 与未知转义按 JS 语义取原字符）
          out += e
          i++
      }
    }
    err() // 未闭合字符串
  }
  const parseIdentifier = () => {
    const m = /^[A-Za-z_$][A-Za-z0-9_$]*/.exec(src.slice(i))
    if (!m) err()
    i += m[0].length
    return m[0]
  }
  const parseNumber = () => {
    const m = /^-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/.exec(src.slice(i))
    if (!m) err()
    const n = Number(m[0])
    if (!Number.isFinite(n)) err()
    i += m[0].length
    return n
  }
  const parseValue = () => {
    skipWs()
    if (i >= src.length) err()
    const ch = src[i]
    if (ch === '{') return parseObject()
    if (ch === '[') return parseArray()
    if (ch === '"' || ch === "'") return parseString()
    if (ch === '-' || ch === '.' || (ch >= '0' && ch <= '9')) return parseNumber()
    if (src.startsWith('true', i) && !/[A-Za-z0-9_$]/.test(src[i + 4] || '')) { i += 4; return true }
    if (src.startsWith('false', i) && !/[A-Za-z0-9_$]/.test(src[i + 5] || '')) { i += 5; return false }
    if (src.startsWith('null', i) && !/[A-Za-z0-9_$]/.test(src[i + 4] || '')) { i += 4; return null }
    err()
  }
  const parseArray = () => {
    i++ // '['
    const arr = []
    skipWs()
    if (src[i] === ']') { i++; return arr }
    for (;;) {
      arr.push(parseValue())
      skipWs()
      if (src[i] === ',') { i++; continue }
      if (src[i] === ']') { i++; return arr }
      err()
    }
  }
  const parseObject = () => {
    i++ // '{'
    const obj = {}
    skipWs()
    if (src[i] === '}') { i++; return obj }
    for (;;) {
      skipWs()
      const key = src[i] === '"' || src[i] === "'" ? parseString() : parseIdentifier()
      skipWs()
      if (src[i] !== ':') err()
      i++
      obj[key] = parseValue()
      skipWs()
      if (src[i] === ',') { i++; continue }
      if (src[i] === '}') { i++; return obj }
      err()
    }
  }
  const parseTop = () => {
    skipWs()
    const value = parseValue()
    skipWs()
    if (i !== src.length) err()
    return JSON.stringify(value)
  }
  try {
    return parseTop()
  } catch {
    // 解析器不支持的结构（函数/表达式/注释/尾逗号/模板字符串值等）→ null，调用方回退原样
    return null
  }
}
