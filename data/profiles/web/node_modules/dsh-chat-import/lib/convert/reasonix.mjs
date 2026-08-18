// lib/convert/reasonix.mjs — Reasonix 会话 JSONL → DSH 会话（纯函数）

import {
  SESSION_FORMAT_VERSION,
  applyBudgetTrim,
  mintSessionId,
  parseJsonlLines,
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

// Reasonix 会话 JSONL → DSH 会话。
//
// 存储：~/.reasonix/sessions/<stem>.jsonl（desktop-* 桌面会话 / subagent-sub-*
// 子代理会话），每文件一个会话；同目录 <stem>.meta.json 携带 workspace/summary。
// 行结构是消息风格（无 envelope），兼容两代：
//   - user：{ role, content: string } → 开新轮；
//   - assistant：{ role, content: string|null, reasoning_content?, tool_calls?,
//     createdAt? } → 一步。tool_calls 两种形状都接受：
//       v1：{ id, type: "function", function: { name, arguments(JSON 字符串) } }
//       v2：{ id, name, arguments(JSON 字符串) }（扁平）
//   - tool：{ role, tool_call_id, name, content: string } → 挂到最近一步的
//     tool/result，按 tool_call_id 与 assistant 的 tool_calls[].id 配对。
// createdAt 是 unix 毫秒（v2 新增）；缺省回退见 reasonixStemTime。
// Reasonix 会话 id 取文件名 stem（index 层传 args.reasonixId），保证幂等；
// stem 内嵌会话创建时刻（desktop-YYYYMMDDHHMM-N / subagent-sub-N-YYYYMMDDHHMM，
// 本地时间）。转录行与 meta 都没有时间戳时回退到它，避免把导入时刻当会话创建时间。
export function reasonixStemTime(stem) {
  const m = String(stem || '').match(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})/)
  if (!m) return null
  const month = +m[2]
  const day = +m[3]
  const hour = +m[4]
  const minute = +m[5]
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null
  const t = new Date(+m[1], month - 1, day, hour, minute)
  return Number.isNaN(t.getTime()) ? null : t.getTime()
}

export function convertReasonixJsonl(raw, args = {}) {
  // REQ-22 V2 WAL 合并：checkpoint（主 jsonl）为基线，<stem>.events.jsonl（WAL，
  // 经 args.walText 传入）是事件日志权威（PR #7982）。合并规则：
  //   - WAL 内 {type:'replace', messages:[...]} 事件整表替换消息（权威快照）；
  //   - 其余 WAL 行按 role 消息追加（checkpoint 之后到达的事件，晚到者胜）；
  //   - 无 WAL / walText 为空 → 纯 checkpoint（旧行为）。
  // 报告：walMerged / walRecords（差异可见，不静默）。
  const { recs, skipped, skippedLines, secrets } = parseJsonlLines(raw)
  let walMerged = false
  let walRecords = 0
  if (args.walText) {
    const wal = parseJsonlLines(String(args.walText))
    const replace = wal.recs.find((r) => r && typeof r === 'object' && r.type === 'replace' && Array.isArray(r.messages))
    if (replace) {
      // 权威 replace 快照：WAL 消息整表接管（checkpoint 仅作兼容基线）
      walMerged = true
      walRecords = replace.messages.length
      const merged = replace.messages
      return finishReasonix(merged, args, skipped, skippedLines, secrets, walMerged, walRecords)
    }
    if (wal.recs.length > 0) {
      // 追加式 WAL：checkpoint 记录 + WAL 记录（按出现顺序）
      walMerged = true
      walRecords = wal.recs.length
      return finishReasonix([...recs, ...wal.recs], args, skipped, skippedLines, secrets, walMerged, walRecords)
    }
  }
  return finishReasonix(recs, args, skipped, skippedLines, secrets, walMerged, walRecords)
}

// 共享转换主体：recs 为合并后的记录列表（checkpoint 或 checkpoint+WAL）。
function finishReasonix(recs, args, skipped, skippedLines, secrets, walMerged, walRecords) {
  const turns = []
  let cur = null
  let lastStep = null
  let firstCreatedAt = null
  // 待配对的工具调用：assistant 声明 tool_calls → 后续 tool 消息按 id 挂结果
  const pendingCalls = new Map()
  for (const rec of recs) {
    if (!rec || typeof rec !== 'object') continue
    if (firstCreatedAt === null && typeof rec.createdAt === 'number' && rec.createdAt > 0) {
      firstCreatedAt = rec.createdAt
    }
    const role = rec.role
    if (role === 'user' && typeof rec.content === 'string') {
      const prompt = rec.content.trim()
      if (prompt) {
        cur = { prompt, steps: [] }
        turns.push(cur)
        lastStep = null
      }
    } else if (role === 'assistant' && cur) {
      const step = { content: [], toolCalls: [], toolResults: [] }
      if (typeof rec.content === 'string' && rec.content.trim()) {
        step.content.push({ type: 'text', text: rec.content.trim() })
      }
      if (typeof rec.reasoning_content === 'string' && rec.reasoning_content.trim()) {
        step.content.push({ type: 'reasoning', text: rec.reasoning_content.trim() })
      }
      if (Array.isArray(rec.tool_calls)) {
        for (const tc of rec.tool_calls) {
          if (!tc || typeof tc !== 'object') continue
          // v1：{ id, type:"function", function:{name, arguments} }；v2：{ id, name, arguments }
          const fn = tc.function && typeof tc.function === 'object' ? tc.function : tc
          if (!fn || typeof fn !== 'object') continue
          const callId = String(tc.id || 'reasonix-' + turns.length + '-' + (cur.steps.length + 1))
          const mapped = {
            id: callId,
            name: fn.name || 'unknown',
            arguments: typeof fn.arguments === 'string' ? fn.arguments : JSON.stringify(fn.arguments ?? {}),
          }
          step.content.push({ type: 'tool-call', ...mapped })
          step.toolCalls.push(mapped)
          pendingCalls.set(callId, step)
        }
      }
      cur.steps.push(step)
      lastStep = step
    } else if (role === 'tool' && cur) {
      const callId = rec.tool_call_id
      const step = pendingCalls.get(callId) || lastStep
      if (step) {
        const text = typeof rec.content === 'string' ? rec.content : JSON.stringify(rec.content ?? '')
        step.toolResults.push({
          toolCallId: callId,
          content: [{ type: 'text', text }],
          isError: false,
        })
      }
    }
  }

  const finalId = args.sessionId || mintSessionId(args.reasonixId)
  const meta = {
    version: SESSION_FORMAT_VERSION,
    id: finalId,
    createdAt: args.createdAt || firstCreatedAt || reasonixStemTime(args.reasonixId) || Date.now(),
  }
  if (args.reasonixId) meta.sourceId = args.reasonixId
  if (args.cwd) meta.cwd = args.cwd
  // REQ-27 标题兜底：meta.summary（args.title，显式）> 首问兜底。显式标题钉
  // session/title 事件；首问只回填 out.title（DSH 自动回退首条 user 文本）。
  const explicitTitle = typeof args.title === 'string' && args.title.trim() ? args.title.trim() : null
  const finalTitle = normalizeTitle(explicitTitle || (turns.length > 0 ? turns[0].prompt : ''))
  const { turns: seedTurns, trimmed } = applyBudgetTrim(turns, args.budget)
  const out = synthesizeSession({ meta, turns: seedTurns, title: explicitTitle ? finalTitle : undefined, provider: 'reasonix', model: 'reasonix', skipped, records: recs.length, skippedLines, secrets, imported: { sourcePath: args.sourcePath } })
  const result = trimmed ? { ...out, trimmed } : out
  return {
    ...result,
    title: finalTitle,
    // REQ-22：WAL 合并报告（差异可见，不静默）
    ...(walMerged ? { walMerged: true, walRecords } : {}),
  }
}
