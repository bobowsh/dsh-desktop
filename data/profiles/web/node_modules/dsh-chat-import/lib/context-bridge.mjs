// lib/context-bridge.mjs — REQ-28 memory / CLAUDE.md / skills 上下文桥接（默认关闭）
//
// env DSH_IMPORT_CONTEXT_BRIDGE=1 开启：agent/session-start 时把 Claude Code 的上下文
// 资产桥进该 agent 的 scoped systemPrompt / skills 注册（agent-local，销毁自动撤销）：
//   - memory：~/.claude/memory/*.md → PromptContext（**同步** provider + mtime 缓存——
//     rc.6 systemPrompt 组装不 await，async 提供者会注入 [object Promise]；按文件名
//     分组 feedback>project>reference>user 排序，8 KiB 上限）
//   - CLAUDE.md：cwd/CLAUDE.md → PromptContext（项目说明，同样同步 + mtime 缓存）
//   - skills：~/.claude/skills/<name>/SKILL.md → skills.registerProvider（agent scope，
//     name 前缀 claude-，rank 900 让位给官方技能）
// 默认关闭（env 开关），不改变任何现有导入行为。注入失败只记警告不打断会话启动。

import { homedir } from 'node:os'
import { join } from 'node:path'
import { readFileSync, readdirSync, statSync } from 'node:fs'

const MEMORY_DIR = 'memory'
const MEMORY_MAX_BYTES = 8192
const MEMORY_GROUPS = ['feedback', 'project', 'reference', 'user']

// —— memory 读取（同步 + mtime 指纹缓存：文件未变不重读内容）——
const memoryCache = new Map() // dir → { mtimeTotal, text }

function readClaudeMemory(claudeHome) {
  const dir = join(claudeHome, MEMORY_DIR)
  let names
  try {
    names = readdirSync(dir).filter((n) => /\.md$/i.test(n))
  } catch {
    return '' // memory 目录缺失/无权限：无可桥接
  }
  if (names.length === 0) return ''
  const groupOf = (name) => {
    const lower = name.toLowerCase()
    for (let i = 0; i < MEMORY_GROUPS.length; i++) {
      if (lower.startsWith(MEMORY_GROUPS[i])) return i
    }
    return MEMORY_GROUPS.length
  }
  names.sort((a, b) => groupOf(a) - groupOf(b) || a.localeCompare(b))
  let mtimeTotal = 0
  const contents = []
  for (const name of names) {
    const file = join(dir, name)
    try {
      const st = statSync(file)
      if (!st.isFile()) continue
      mtimeTotal += (st.mtimeMs || 0) + (st.size || 0)
      contents.push({ name, text: readFileSync(file, 'utf8') })
    } catch {
      // 单个文件读取失败：跳过该文件（不拖垮整体桥接）
    }
  }
  const cached = memoryCache.get(dir)
  if (cached && cached.mtimeTotal === mtimeTotal) return cached.text
  const blocks = []
  let used = 0
  for (const c of contents) {
    const block = c.name + ':\n' + c.text.trim() + '\n'
    if (used + block.length > MEMORY_MAX_BYTES) break
    blocks.push(block)
    used += block.length
  }
  const text = blocks.join('\n')
  memoryCache.set(dir, { mtimeTotal, text })
  return text
}

// —— CLAUDE.md 读取（同步 + mtime/size 缓存）——
const claudeMdCache = new Map() // file → { mtimeMs, size, text }

function readClaudeMd(cwd) {
  const file = join(cwd, 'CLAUDE.md')
  let st
  try {
    st = statSync(file)
  } catch {
    return undefined // 项目根无 CLAUDE.md
  }
  if (!st.isFile()) return undefined
  const cached = claudeMdCache.get(file)
  if (cached && cached.mtimeMs === st.mtimeMs && cached.size === st.size) return cached.text
  let text
  try {
    text = readFileSync(file, 'utf8')
  } catch {
    return undefined
  }
  claudeMdCache.set(file, { mtimeMs: st.mtimeMs, size: st.size, text })
  return text
}

// —— 全局 CLAUDE.md 读取（~/.claude/CLAUDE.md；同步 + mtime/size 缓存）——
const globalClaudeMdCache = new Map() // file → { mtimeMs, size, text }

function readGlobalClaudeMd(claudeHome) {
  const file = join(claudeHome, 'CLAUDE.md')
  let st
  try {
    st = statSync(file)
  } catch {
    return undefined
  }
  if (!st.isFile()) return undefined
  const cached = globalClaudeMdCache.get(file)
  if (cached && cached.mtimeMs === st.mtimeMs && cached.size === st.size) return cached.text
  let text
  try {
    text = readFileSync(file, 'utf8')
  } catch {
    return undefined
  }
  globalClaudeMdCache.set(file, { mtimeMs: st.mtimeMs, size: st.size, text })
  return text
}

// —— Claude skills 扫描（~/.claude/skills/<name>/SKILL.md，kebab-case 目录名）——
function listClaudeSkills(claudeHome) {
  const dir = join(claudeHome, 'skills')
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return []
  }
  const skills = []
  for (const e of entries) {
    if (!e.isDirectory() || !/^[a-z0-9][a-z0-9-]*$/.test(e.name)) continue
    const skillFile = join(dir, e.name, 'SKILL.md')
    try {
      const st = statSync(skillFile)
      if (!st.isFile()) continue
      skills.push({ name: e.name, skillFile, mtimeMs: st.mtimeMs, size: st.size })
    } catch {
      // 非标准技能目录（无 SKILL.md）：跳过
    }
  }
  return skills
}

export function registerContextBridge(ctx, { claudeHome = join(homedir(), '.claude') } = {}) {
  // env 开关：DSH_IMPORT_CONTEXT_BRIDGE=1 开启（默认关闭——不改变现有导入行为）
  const enabled = () => process.env.DSH_IMPORT_CONTEXT_BRIDGE === '1'
  ctx.on('agent/session-start', async ({ agent }) => {
    try {
      if (!enabled()) return
      const header = agent && agent.session && agent.session.header
      const cwd = header && typeof header.cwd === 'string' && header.cwd ? header.cwd : undefined
      const agentCtx = agent && agent.ctx
      if (!agentCtx || !cwd) return
      const sp = agentCtx.systemPrompt

      if (sp && typeof sp.context === 'function') {
        // 1) memory → PromptContext（同步 provider + mtime 缓存；8 KiB 上限已在读取层）
        sp.context({
          name: 'claude-bridge-memory',
          order: 400, // 动态上下文：persona 之后、工具引导之前
          text: () => {
            const text = readClaudeMemory(claudeHome)
            return text ? '以下为 Claude Code 记忆（只读桥接，可参考）：\n' + text : ''
          },
        })
        // 2) CLAUDE.md → PromptContext（项目说明；仅项目根存在时注册）
        if (readClaudeMd(cwd)) {
          sp.context({
            name: 'claude-bridge-claude-md',
            order: 300,
            text: () => {
              const t = readClaudeMd(cwd)
              return t ? '项目说明（CLAUDE.md，只读桥接）：\n' + t : ''
            },
          })
        }
        // 2b) 全局 CLAUDE.md → PromptContext（~/.claude/CLAUDE.md；存在时注册）
        if (readGlobalClaudeMd(claudeHome)) {
          sp.context({
            name: 'claude-bridge-global-claude-md',
            order: 250,
            text: () => {
              const t = readGlobalClaudeMd(claudeHome)
              return t ? '全局说明（~/.claude/CLAUDE.md，只读桥接）：\n' + t : ''
            },
          })
        }
      }

      // 3) skills → skills.registerProvider（agent scope：该 agent 独享，销毁自动撤销；
      //    rank 900 落后于官方/本地技能（BUNDLED_SKILL_RANK=600）——同名不抢占）
      const skills = agentCtx.skills
      if (skills && typeof skills.registerProvider === 'function') {
        // control/options 是 provider 接口约定参数（本实现未用：只读静态清单），
        // 加 _ 前缀声明「接口契约位、未消费」——eslint argsIgnorePattern
        skills.registerProvider((_control) => ({
          name: 'claude-bridge',
          async list(_options) {
            return listClaudeSkills(claudeHome).map((s) => ({
              name: 'claude-' + s.name,
              description: 'Claude Code 技能（桥接）: ' + s.name,
              whenToUse: 'Claude Code 中安装的技能，桥接进 DSH 使用。',
              invocation: { modelInvocable: true, userInvocable: false },
              source: 'custom',
              provider: 'claude-bridge',
              rank: 900,
              locator: { skillFile: s.skillFile, mtimeMs: s.mtimeMs, size: s.size },
              path: s.skillFile,
            }))
          },
          async get(candidate, _options) {
            const loc = candidate.locator
            if (!loc || typeof loc.skillFile !== 'string') return undefined
            let text
            try {
              text = readFileSync(loc.skillFile, 'utf8')
            } catch {
              return undefined
            }
            return {
              name: candidate.name,
              description: candidate.description,
              whenToUse: candidate.whenToUse,
              invocation: candidate.invocation,
              source: candidate.source,
              provider: candidate.provider,
              content: text,
              path: loc.skillFile,
              metadata: {},
            }
          },
        }))
      }
    } catch (err) {
      // 桥接是增强功能：任何失败不打断会话启动（失败要大声——记警告不静默吞）
      console.warn('[dsh-chat-import] 上下文桥接失败（不影响会话）：' + String((err && err.message) || err))
    }
  })
}
