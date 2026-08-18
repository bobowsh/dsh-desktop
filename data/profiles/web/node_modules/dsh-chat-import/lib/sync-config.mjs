// lib/sync-config.mjs — 双向增量同步配置 + 出站映射
//
// 落盘在 `$DSH_HOME/dsh-chat-import/sync.json`（开关 / 间隔 / 上次巡检）与
// `outbound.json`（原生 DSH 会话 → 外部副本路径）。默认全部关闭：必须由控制面板
// 显式打开才会巡检或写出，避免静默改写 Claude / Codex / Grok 文件。

import { join } from 'node:path'
import { mkdir, open, readFile, rename, rm } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { resolveRegistryDir } from './imports.mjs'

export const SYNC_CONFIG_VERSION = 1
export const DEFAULT_INTERVAL_MS = 60_000
export const SYNC_FORMATS = ['claude', 'codex', 'grokbuild']

const emptyConfig = () => ({
  version: SYNC_CONFIG_VERSION,
  inbound: { enabled: false, formats: [...SYNC_FORMATS] },
  outbound: { enabled: false, targets: [...SYNC_FORMATS], roots: {} },
  // REQ-54 watch 懒检查：面板打开时按 mtime 门控续写已导入源（无常驻监听）
  watch: { enabled: false },
  intervalMs: DEFAULT_INTERVAL_MS,
  lastRun: null,
})

let writeChain = Promise.resolve()

async function writeAtomic(filePath, data) {
  const slash = filePath.lastIndexOf('/')
  const back = filePath.lastIndexOf('\\')
  const cut = Math.max(slash, back)
  const dir = cut >= 0 ? filePath.slice(0, cut) : '.'
  const tmpPath = join(dir, '.' + randomUUID() + '.tmp')
  try {
    const handle = await open(tmpPath, 'wx')
    try {
      await handle.writeFile(data, 'utf8')
      await handle.sync()
    } finally {
      await handle.close()
    }
    await rename(tmpPath, filePath)
  } catch (err) {
    await rm(tmpPath, { force: true })
    throw err
  }
}

function clampFormats(list, fallback) {
  const allowed = new Set(SYNC_FORMATS)
  const out = (Array.isArray(list) ? list : []).filter((f) => allowed.has(f))
  return out.length > 0 ? [...new Set(out)] : [...fallback]
}

function normalizeConfig(raw) {
  const base = emptyConfig()
  if (!raw || typeof raw !== 'object') return base
  const inbound = raw.inbound && typeof raw.inbound === 'object' ? raw.inbound : {}
  const outbound = raw.outbound && typeof raw.outbound === 'object' ? raw.outbound : {}
  const interval = Number(raw.intervalMs)
  return {
    version: SYNC_CONFIG_VERSION,
    inbound: {
      enabled: inbound.enabled === true,
      formats: clampFormats(inbound.formats, base.inbound.formats),
    },
    outbound: {
      enabled: outbound.enabled === true,
      targets: clampFormats(outbound.targets, base.outbound.targets),
      roots: outbound.roots && typeof outbound.roots === 'object' ? {
        claude: typeof outbound.roots.claude === 'string' ? outbound.roots.claude : undefined,
        codex: typeof outbound.roots.codex === 'string' ? outbound.roots.codex : undefined,
        grokbuild: typeof outbound.roots.grokbuild === 'string' ? outbound.roots.grokbuild : undefined,
      } : {},
    },
    watch: { enabled: raw.watch && typeof raw.watch === 'object' && raw.watch.enabled === true },
    intervalMs: Number.isFinite(interval) ? Math.min(Math.max(Math.trunc(interval), 15_000), 3_600_000) : DEFAULT_INTERVAL_MS,
    lastRun: raw.lastRun && typeof raw.lastRun === 'object' ? raw.lastRun : null,
  }
}

async function readJson(filePath, fallback) {
  try {
    const parsed = JSON.parse(await readFile(filePath, 'utf8'))
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
  } catch (err) {
    if (err && err.code !== 'ENOENT') {
      console.warn('[dsh-chat-import] 同步配置损坏，按默认处理：' + String((err && err.message) || err))
    }
  }
  return fallback
}

export async function loadSyncConfig(registryDir = resolveRegistryDir()) {
  await writeChain.catch(() => {})
  return normalizeConfig(await readJson(join(registryDir, 'sync.json'), emptyConfig()))
}

export function saveSyncConfig(registryDir, next) {
  const data = normalizeConfig(next)
  const run = writeChain.then(async () => {
    await mkdir(registryDir, { recursive: true })
    await writeAtomic(join(registryDir, 'sync.json'), JSON.stringify(data, null, 2) + '\n')
    return data
  })
  writeChain = run.catch(() => {})
  return run
}

export async function patchSyncConfig(registryDir, patch) {
  const cur = await loadSyncConfig(registryDir)
  const merged = {
    ...cur,
    ...(patch && typeof patch === 'object' ? patch : {}),
    inbound: { ...cur.inbound, ...(patch && patch.inbound ? patch.inbound : {}) },
    outbound: { ...cur.outbound, ...(patch && patch.outbound ? patch.outbound : {}) },
    watch: { ...cur.watch, ...(patch && patch.watch && typeof patch.watch === 'object' ? patch.watch : {}) },
  }
  return saveSyncConfig(registryDir, merged)
}

export async function loadOutboundMap(registryDir = resolveRegistryDir()) {
  await writeChain.catch(() => {})
  const parsed = await readJson(join(registryDir, 'outbound.json'), { version: 1, mappings: {} })
  const mappings = parsed.mappings && typeof parsed.mappings === 'object' ? parsed.mappings : {}
  return { version: 1, mappings }
}

export function rememberOutbound(registryDir, sessionId, mapping) {
  if (typeof sessionId !== 'string' || !sessionId) return Promise.resolve()
  const run = writeChain.then(async () => {
    const file = join(registryDir, 'outbound.json')
    const parsed = await readJson(file, { version: 1, mappings: {} })
    if (!parsed.mappings || typeof parsed.mappings !== 'object') parsed.mappings = {}
    parsed.version = 1
    parsed.mappings[sessionId] = { ...(parsed.mappings[sessionId] || {}), ...mapping }
    await mkdir(registryDir, { recursive: true })
    await writeAtomic(file, JSON.stringify(parsed, null, 2) + '\n')
  })
  writeChain = run.catch(() => {})
  return run
}
