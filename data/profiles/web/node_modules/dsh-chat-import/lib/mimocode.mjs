// lib/mimocode.mjs — mimocode SQLite 历史库读取与导入编排（opencode fork 专属）
//
// mimocode 是 opencode 的 fork：历史库为 SQLite（默认 ~/.local/share/mimocode/
// mimocode.db），session/message/part 三表 schema 与 opencode 同构（唯一差异：
// session 表无 model 列，消息级 model 在 message.data.modelID）。读取/导入/编排
// 完全复用 lib/opencode.mjs 的通用实现，本文件只收 mimocode 专属差异：
//   - 库文件名 mimocode.db（目录模式定位）
//   - provider 标签 mimocode（lib/convert/mimocode.mjs）
//   - 剔除 MiMo 后台任务会话（checkpoint-writer / AutoDream / AutoDistill），
//     isMimocodeBackgroundSession 判定后作为 filter 传入 readOpencodeDb
//   - 无 model 列的 schema 由 readOpencodeDb 按 PRAGMA 探测自动兼容
//
// 保持「每源一个编排文件」的仓库惯例（对照 lib/zcode.mjs / lib/hermes.mjs），
// opencode 编排文件不含任何 mimocode 专属分支。

import { join } from 'node:path'
import { importOpencodeFile, importOpencodeDirectory, readOpencodeDb } from './opencode.mjs'

/** mimocode 历史库默认文件名（目录模式定位用）。 */
export const MIMOCODE_DB_NAME = 'mimocode.db'

// mimocode 后台任务会话特征（2026-08-18 实测 mimocode.db）：
//   checkpoint-writer —— 标题前缀 "checkpoint-writer: ..."（全库 822 条），消息 agent=checkpoint-writer
//   AutoDream        —— 标题 "Auto Dream"（4 条），消息 agent=dream（156 条）
//   AutoDistill      —— 标题 "Auto Distill"（1 条），消息 agent=distill（7 条）
// 这些是 MiMo 的记忆巩固/工作流蒸馏后台任务，无用户交互价值，导入/发现时剔除。
// 标题用空格分隔（Auto Dream/Auto Distill），因此标题正则与 agent 集合双信号判定。
const MIMOCODE_BG_TITLE = /^(checkpoint[-_ ]?writer|auto[-_ ]?(dream|distill))\b/i
const MIMOCODE_BG_AGENTS = new Set(['checkpoint-writer', 'dream', 'distill'])

/** mimocode 后台任务会话判定（纯函数）：标题前缀或任一条消息 agent 命中即真。 */
export function isMimocodeBackgroundSession(session) {
  if (!session || typeof session !== 'object') return false
  if (typeof session.title === 'string' && MIMOCODE_BG_TITLE.test(session.title.trim())) return true
  if (Array.isArray(session.messages)) {
    for (const m of session.messages) {
      if (m && typeof m.agent === 'string' && MIMOCODE_BG_AGENTS.has(m.agent.toLowerCase())) return true
    }
  }
  return false
}

// mimocode 历史库（SQLite）→ 中间会话 JSON 数组：复用 opencode 读取器，默认剔除
// 后台任务会话（options.filter 覆盖时以显式值为准；fullHistory 语义与 opencode 一致）。
export function readMimocodeDb(dbPath, options = {}) {
  return readOpencodeDb(dbPath, {
    fullHistory: options.fullHistory === true,
    filter: options.filter === undefined ? isMimocodeBackgroundSession : options.filter,
  })
}

// mimocode 单库导入：复用 opencode 编排（importOpencodeFile），恒返回批量形态；
// 默认剔除后台任务会话（filter 透传给 readOpencodeDb）。
export async function importMimocodeFile(ctx, target, args, options = {}) {
  return importOpencodeFile(ctx, target, args, { ...options, filter: isMimocodeBackgroundSession })
}

// mimocode 目录导入：目录里定位 mimocode.db（无递归），再走单库导入；缺 DB 时抛错。
export async function importMimocodeDirectory(ctx, dirTarget, args, options = {}) {
  return importOpencodeDirectory(ctx, dirTarget, args, {
    ...options,
    dbName: MIMOCODE_DB_NAME,
    filter: isMimocodeBackgroundSession,
  })
}
