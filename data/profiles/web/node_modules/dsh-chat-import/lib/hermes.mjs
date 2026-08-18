// lib/hermes.mjs — Hermes（本地 AI 编码 CLI）SQLite 历史库读取（第 11 源）
//
// Hermes 会话存于 ~/.hermes/（Windows %LOCALAPPDATA%\hermes）：state.db（SQLite，
// 权威索引）+ sessions/*.jsonl|.json（回退）。readHermesDb 只读打开 state.db
//（node:sqlite DatabaseSync readOnly，对齐 lib/zcode.mjs readZcodeDb），把
// sessions + messages 两表抽成中间会话 JSON 数组（供 convertHermesJson 消费）：
//   { id, title, cwd, createdAt, messages: [{ role, content, ts }] }
// content 原样保留（string 或 Claude 风格 block 数组——DB 里 block 数组以 JSON 文本
// 存储，读时解析回数组）；ts/createdAt 归一为毫秒。列名兼容两种变体（cc-switch 的
// cwd|directory、started_at|created_at、ended_at|updated_at；hermes-agent 的
// messages.timestamp），messages 按时间升序（无时间列回退 rowid, id）。不设
// cc-switch 的 LIMIT 500：导入不应静默丢弃第 500 个之后的会话。db 不可用（不存在 /
// 非 SQLite / 无 sessions 表 / 查询失败）返回 null，由 index 层回退 sessions/*.jsonl。
import { DatabaseSync } from 'node:sqlite'
import { parseHermesTime } from './convert/hermes.mjs'

export function readHermesDb(dbPath) {
  let db
  try {
    db = new DatabaseSync(dbPath, { readOnly: true })
  } catch {
    // 文件不存在 / 非 SQLite / 损坏 → db 不可用（index 层回退 JSONL）
    return null
  }
  try {
    const has = db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name='sessions'").get()
    if (!has || has.n === 0) return null // 无 sessions 表 → 不是 hermes 库
    const sCols = tableColumns(db, 'sessions')
    const cwdCol = pickCol(sCols, 'cwd', 'directory')
    const startCol = pickCol(sCols, 'started_at', 'created_at')
    const endCol = pickCol(sCols, 'ended_at', 'updated_at')
    // REQ-51：压缩分叉 lineage（parent_session_id 关联，父会话通常无消息、内容由
    // 子会话承接）——读出供 index 层过滤/标注
    const parentCol = pickCol(sCols, 'parent_session_id', 'parent_id')
    const mCols = tableColumns(db, 'messages')
    const timeCol = pickCol(mCols, 'created_at', 'timestamp')
    // REQ-50 hermes-agent（NousResearch）变体：tool_calls / reasoning 存独立列
    //（JSON 文本）而非 content 内 block 数组——存在则读出进中间 JSON。
    const toolCallsCol = pickCol(mCols, 'tool_calls', 'tool_call')
    const reasoningCol = pickCol(mCols, 'reasoning')

    const sessions = []
    for (const row of db.prepare('SELECT * FROM sessions ORDER BY rowid DESC').all()) {
      const id = typeof row.id === 'string' && row.id ? row.id : undefined
      if (!id) continue // 缺 id 的脏行不成会话（cc-switch 同款）
      const startedAt = startCol ? parseHermesTime(row[startCol]) : undefined
      const endedAt = endCol ? parseHermesTime(row[endCol]) : undefined
      const messages = []
      if (mCols.includes('session_id') && mCols.includes('role')) {
        const hasContent = mCols.includes('content')
        const order = (timeCol || 'rowid') + (mCols.includes('id') ? ', id' : '')
        const stmt = db.prepare(
          `SELECT role, ${hasContent ? 'content' : "'' AS content"}, ${timeCol ? `${timeCol} AS ts` : 'NULL AS ts'}, ` +
          `${toolCallsCol ? `${toolCallsCol} AS tool_calls` : 'NULL AS tool_calls'}, ` +
          `${reasoningCol ? `${reasoningCol} AS reasoning` : 'NULL AS reasoning'} ` +
          `FROM messages WHERE session_id = ? ORDER BY ${order}`
        )
        for (const m of stmt.all(id)) {
          const role = typeof m.role === 'string' ? m.role : undefined
          if (!role) continue
          const content = hermesContent(m.content)
          if (content === undefined) continue // 空内容消息跳过（cc-switch 同款）
          const msg = { role, content, ts: timeCol ? parseHermesTime(m.ts) : undefined }
          const toolCalls = hermesToolCalls(m.tool_calls)
          const reasoning = hermesReasoning(m.reasoning)
          if (toolCalls !== undefined) msg.toolCalls = toolCalls
          if (reasoning !== undefined) msg.reasoning = reasoning
          messages.push(msg)
        }
      }
      sessions.push({
        id,
        title: typeof row.title === 'string' && row.title ? row.title : undefined,
        cwd: cwdCol && typeof row[cwdCol] === 'string' && row[cwdCol] ? row[cwdCol] : undefined,
        createdAt: startedAt ?? endedAt,
        messages,
        // REQ-51：parent_session_id 透出（压缩分叉关联；无该列/值为空不占键）
        ...(parentCol && typeof row[parentCol] === 'string' && row[parentCol] ? { parentSessionId: row[parentCol] } : {}),
      })
    }
    return sessions
  } catch {
    // 查询失败（表损坏 / 非 hermes 库）→ db 不可用，回退 JSONL
    return null
  } finally {
    db.close()
  }
}

// PRAGMA table_info 列名列表（兼容不同 hermes 变体列名）。
function tableColumns(db, table) {
  try {
    return db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name)
  } catch {
    // 表不存在 → 空列（调用方按无该表处理）
    return []
  }
}

// 按优先级取第一个存在的列名。
function pickCol(cols, ...names) {
  for (const n of names) if (cols.includes(n)) return n
  return undefined
}

// content 归一：DB 存的是 TEXT——Claude 风格 block 数组以 JSON 文本存储 → 解析回
// 数组；其余字符串原样；空/缺失 → undefined（该消息跳过）。
function hermesContent(raw) {
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (!trimmed) return undefined
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) return parsed.length > 0 ? parsed : undefined
      } catch {
        // 字面 '[' 开头的普通文本，按字符串保留
      }
    }
    return raw
  }
  if (Array.isArray(raw) && raw.length > 0) return raw
  return undefined
}

// REQ-50 hermes-agent 变体：tool_calls 列（JSON 文本）→ 工具调用数组
// [{ id, name, input }]。JSON 解析失败 / 非数组 / 空 → undefined（该消息无工具列，
// 静默降级现状）。arguments 与 input 同义（两种命名的列内字段都接受）。
function hermesToolCalls(raw) {
  let arr = raw
  if (raw === null || raw === undefined) return undefined
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (!trimmed) return undefined
    try {
      arr = JSON.parse(trimmed)
    } catch {
      return undefined
    }
  }
  if (!Array.isArray(arr) || arr.length === 0) return undefined
  const out = []
  for (const t of arr) {
    if (!t || typeof t !== 'object') continue
    const id = typeof t.id === 'string' ? t.id : (typeof t.tool_call_id === 'string' ? t.tool_call_id : undefined)
    const name = typeof t.name === 'string' ? t.name : (typeof t.tool_name === 'string' ? t.tool_name : undefined)
    if (!id || !name) continue
    out.push({ id, name, input: t.arguments ?? t.input })
  }
  return out.length > 0 ? out : undefined
}

// REQ-50 hermes-agent 变体：reasoning 列（JSON 文本或普通文本）→ 推理字符串。
// JSON 字符串 / {content|text} 对象取正文；普通文本原样；空 → undefined。
function hermesReasoning(raw) {
  if (raw === null || raw === undefined) return undefined
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (!trimmed) return undefined
    if (trimmed.startsWith('{') || trimmed.startsWith('"')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (typeof parsed === 'string') return parsed || undefined
        if (parsed && typeof parsed === 'object') {
          const c = typeof parsed.content === 'string' ? parsed.content : (typeof parsed.text === 'string' ? parsed.text : '')
          return c || undefined
        }
      } catch {
        // 以 { / " 开头的字面文本，按原样保留
      }
    }
    return raw
  }
  if (typeof raw === 'object') {
    const c = typeof raw.content === 'string' ? raw.content : (typeof raw.text === 'string' ? raw.text : '')
    return c || undefined
  }
  return undefined
}
