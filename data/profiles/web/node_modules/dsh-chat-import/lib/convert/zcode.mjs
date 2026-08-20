// lib/convert/zcode.mjs — zcode（z.ai 官方 CLI）历史库会话 → DSH 会话（纯函数）

import {
  SESSION_FORMAT_VERSION,
  applyBudgetTrim,
  mintSessionId,
  parseTime,
  synthesizeSession,
} from './core.mjs'

// zcode 历史库会话（index 层从 db.sqlite 抽取的中间 JSON）→ DSH 会话。
//
// 存储：~/.zcode/cli/db/db.sqlite（SQLite 权威索引）。index 层把每个会话的
// session/message/part 三表抽成下述中间 JSON 再调用本函数，因此本函数保持纯函数
// （零 DSH 依赖，可单测）：
// {
//   id, title, directory, createdAt, summary?,
//   messages: [
//     { id, role: 'user'|'assistant', createdAt, model?, parts: [ part.data 原样 ] }
//   ]
// }
// part.type 映射：text→text、reasoning→reasoning、tool→tool/call + tool/result
// 成对输出（state.input 序列化为 arguments、state.output 为结果文本，status
// 'failed'/'error' 标 isError；output 缺失也发空文本结果，保证 call/result 配对）、
// file→[image: <name>]；compaction / step-start / step-finish / timeline 是结构性
// 块，跳过。含 <system-reminder> 的 user 注入消息整条过滤（系统注入不进对话）。
// 压缩摘要（readZcodeDb 已把 compaction part 的 data.summary.body 抽到 chat.summary）
// 作为 reasoning 块前置到首个 assistant 步骤，让 resume 时模型可见被压掉的历史概要，
// 但不把前段全量历史灌入上下文。
// 模型回退链（assistant 消息级 model）：modelID → model（字符串）→ undefined（回退
// provider 名 zcode）。
export function convertZcodeJson(raw, args = {}) {
  let chat
  try {
    chat = JSON.parse(raw)
  } catch {
    return { meta: null, events: [], turns: [], title: undefined, messages: 0, toolCalls: 0, skipped: 1, records: 0, skippedLines: [], secrets: [] }
  }
  if (!chat || typeof chat !== 'object' || !Array.isArray(chat.messages)) {
    return { meta: null, events: [], turns: [], title: undefined, messages: 0, toolCalls: 0, skipped: 1, records: 0, skippedLines: [], secrets: [] }
  }

  const turns = []
  let cur = null
  for (const msg of chat.messages) {
    if (!msg || typeof msg !== 'object') continue
    if (msg.role === 'user') {
      // text part 合并为用户提问 → 新轮；含 <system-reminder> 的系统注入整条过滤
      const texts = []
      if (Array.isArray(msg.parts)) {
        for (const p of msg.parts) {
          if (p && p.type === 'text' && typeof p.text === 'string' && p.text.trim()) texts.push(p.text.trim())
        }
      }
      const prompt = texts.join('\n')
      if (prompt && !prompt.includes('<system-reminder>')) {
        cur = { prompt, steps: [] }
        turns.push(cur)
      }
    } else if (msg.role === 'assistant' && cur) {
      const step = { content: [], toolCalls: [], toolResults: [] }
      if (Array.isArray(msg.parts)) {
        for (const p of msg.parts) {
          if (!p || typeof p !== 'object') continue
          if (p.type === 'text' && typeof p.text === 'string') {
            step.content.push({ type: 'text', text: p.text })
          } else if (p.type === 'reasoning' && typeof p.text === 'string') {
            step.content.push({ type: 'reasoning', text: p.text })
          } else if (p.type === 'tool') {
            const callId = String(p.callID || 'zcode-' + turns.length + '-' + (cur.steps.length + 1))
            const state = p.state && typeof p.state === 'object' ? p.state : {}
            const mapped = {
              id: callId,
              name: p.tool || 'unknown',
              arguments: JSON.stringify(state.input ?? {}),
            }
            step.content.push({ type: 'tool-call', ...mapped })
            step.toolCalls.push(mapped)
            step.toolResults.push({
              toolCallId: callId,
              content: [{ type: 'text', text: toolResultText(state.output) }],
              isError: state.status === 'failed' || state.status === 'error',
            })
          } else if (p.type === 'file') {
            step.content.push({ type: 'text', text: '[image: ' + (p.filename || 'unknown') + ']' })
          }
          // compaction / step-start / step-finish / timeline 与未知类型是结构块，跳过
        }
      }
      const stepModel = zcodeMessageModel(msg)
      if (stepModel) step.model = stepModel
      cur.steps.push(step)
    }
  }

  // 压缩摘要（zcode compaction）：作为 reasoning 块前置到首个 assistant 步骤，
  // 让 resume 时模型可见被压掉的历史概要，但不把前段全量历史灌入上下文。
  if (typeof chat.summary === 'string' && chat.summary.trim()) {
    for (const t of turns) {
      if (t.steps.length > 0) {
        t.steps[0].content.unshift({ type: 'reasoning', text: chat.summary.trim() })
        break
      }
    }
  }

  const sessionId = args.sessionId || mintSessionId(chat.id)
  const meta = { version: SESSION_FORMAT_VERSION, id: sessionId, createdAt: parseTime(chat.createdAt) }
  if (chat.id) meta.sourceId = chat.id
  if (typeof chat.directory === 'string' && chat.directory) meta.cwd = chat.directory
  const title = typeof chat.title === 'string' ? chat.title.trim() : undefined
  // 开关开启时 readZcodeDb / readZcodeTranscript 已把 system 消息收集到 chat.systemPrompt
  const systemPrompt = args.importSystemPrompt === true && typeof chat.systemPrompt === 'string' && chat.systemPrompt.trim() ? chat.systemPrompt : undefined
  const { turns: seedTurns, trimmed } = applyBudgetTrim(turns, args.budget)
  const out = synthesizeSession({
    meta,
    turns: seedTurns,
    title,
    provider: 'zcode',
    model: undefined,
    skipped: 0,
    records: chat.messages.length,
    imported: { sourcePath: args.sourcePath },
    systemPrompt,
  })
  return trimmed ? { ...out, trimmed } : out
}

// 工具结果文本：字符串原样；对象/数组序列化；缺失发空（call/result 仍配对）。
function toolResultText(output) {
  if (typeof output === 'string') return output
  if (output === undefined || output === null) return ''
  return JSON.stringify(output)
}

// 消息级模型：平铺 modelID 优先，其次 model 字符串。
function zcodeMessageModel(msg) {
  if (typeof msg.modelID === 'string' && msg.modelID) return msg.modelID
  if (typeof msg.model === 'string' && msg.model) return msg.model
  return undefined
}
