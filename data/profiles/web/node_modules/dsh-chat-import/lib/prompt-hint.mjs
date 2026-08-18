// lib/prompt-hint.mjs — REQ-53 新会话开始迁移提示
//
// 监听 agent/session-start（会话生命周期开始，首轮前）：取 agent 的 cwd，若该工作区
// 存在可导入/已导入的外部聊天历史 → 在 agent 的 scoped systemPrompt 注册一条
// PromptContext（durable user-role snapshot：模型可见且进入会话日志，满足「模型可见
// ⟺ 落盘」），提示可用 /import 命令或侧边栏「导入会话」面板继续。per-project 记忆
// （registry 目录 hints.json 按 cwd 记 lastShownAt）保证同一 cwd 只提示一次；env
// 开关 DSH_IMPORT_SESSION_HINT=0 关闭（默认开）。
//
// 不改变任何导入行为：提示注入是唯一的副作用；任何失败只记警告，不打断会话启动
//（失败要大声）。

import { join } from 'node:path'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { loadImports } from './imports.mjs'
import { discoverSessions } from './discovery.mjs'
import { makeDiscoveryHost } from './discovery-host.mjs'

const HINTS_FILE = 'hints.json'
const HINT_CONTEXT_NAME = 'chat-import-migration-hint'

// 读取 per-project 提示记忆（{ [cwd]: lastShownAt }）；缺失/损坏 → 空（不阻断）。
async function loadHints(registryDir) {
  try {
    const parsed = JSON.parse(await readFile(join(registryDir, HINTS_FILE), 'utf8'))
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
  } catch {
    // 缺失/损坏按空处理（首次运行 / 手工删除均不报错）
  }
  return {}
}

async function saveHints(registryDir, hints) {
  await mkdir(registryDir, { recursive: true })
  await writeFile(join(registryDir, HINTS_FILE), JSON.stringify(hints, null, 2) + '\n', 'utf8')
}

// 组装提示文本：已导入 / 可导入计数（只提示有东西的工作区）。
function hintText(cwd, sessions) {
  const imported = sessions.filter((s) => s.importStatus === 'imported').length
  const pending = sessions.length - imported
  const bits = []
  if (imported) bits.push(imported + ' 个已导入会话')
  if (pending) bits.push(pending + ' 个可导入会话')
  return '此工作区（' + cwd + '）有 ' + bits.join('、') + '（来自外部聊天记录）。'
    + '可用 /import <source> <path> 命令或侧边栏「导入会话」面板查看/继续。'
}

export function registerSessionHint(ctx, registryDir) {
  // env 开关：DSH_IMPORT_SESSION_HINT=0 关闭（默认开）；提示是增强，开关缺席按开处理
  const enabled = () => process.env.DSH_IMPORT_SESSION_HINT !== '0'
  ctx.on('agent/session-start', async ({ agent }) => {
    try {
      if (!enabled()) return
      const header = agent && agent.session && agent.session.header
      const cwd = header && typeof header.cwd === 'string' && header.cwd ? header.cwd : undefined
      if (!cwd) return // 无 cwd 的会话（headless / 无工作区）不提示
      const hints = await loadHints(registryDir)
      if (hints[cwd] !== undefined) return // per-project 记忆：同一 cwd 只提示一次
      // 发现该 cwd 下可导入 / 已导入的会话（30s TTL 缓存 + 持久化书签，零副作用）
      const registry = await loadImports(registryDir)
      const found = await discoverSessions({
        path: cwd,
        host: makeDiscoveryHost(ctx),
        imports: registry.imports,
        cacheDir: registryDir,
      })
      if (!found.sessions || found.sessions.length === 0) return
      // agent.ctx 是 agent-scoped context：注册只对该 agent 生效，agent 销毁自动撤销
      const sp = agent.ctx && agent.ctx.systemPrompt
      if (!sp || typeof sp.context !== 'function') return
      sp.context({
        name: HINT_CONTEXT_NAME,
        order: 500, // 动态上下文：persona 之后、工具引导之前
        text: hintText(cwd, found.sessions),
      })
      hints[cwd] = Date.now()
      await saveHints(registryDir, hints)
    } catch (err) {
      // 提示是增强功能：任何失败不打断会话启动（失败要大声——记警告不静默吞）
      console.warn('[dsh-chat-import] 迁移提示注入失败（不影响会话）：' + String((err && err.message) || err))
    }
  })
}
