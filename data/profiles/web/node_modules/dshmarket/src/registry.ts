/**
 * Registry access: fetch the curated list from awesome-dsh-plugin.com with an
 * in-memory cache, falling back to the bundled snapshot when offline.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export interface RegistryPlugin {
  name: string
  owner: string
  url: string
  category: string
  description: Record<string, string>
  npm?: string | null
  stars?: number | null
  install: string
  added: string
  /**
   * Catalog-side deprecation flags (#60): supplied by awesome-dsh-plugin,
   * absent for every normal entry — the market only consumes them, so a
   * catalog without the fields behaves exactly as before.
   */
  deprecated?: boolean
  /** Catalog name of the suggested replacement plugin, when deprecated. */
  replacement?: string
}

export interface Registry {
  updated: string
  count: number
  categories: Record<string, Record<string, string>>
  plugins: RegistryPlugin[]
}

/**
 * Where the curated list comes from. Overridable through the process
 * environment ONLY — the layer-3 e2e points it at a local fixture catalog so
 * the install route can be driven end to end without publishing anything.
 *
 * This does not weaken the install route's registry check. That check exists
 * to stop a malicious PAGE from POSTing an arbitrary source at the local
 * server; a page cannot set environment variables, and anyone who can set
 * this process's environment already controls the process. What the override
 * changes is WHICH list is curated, never WHETHER the check runs.
 */
const REGISTRY_URL = process.env.DSHM_REGISTRY_URL ?? 'https://awesome-dsh-plugin.com/plugins.json'
const TTL_MS = 60 * 60 * 1000

let cache: { at: number; data: Registry } | null = null

function snapshot(): Registry {
  const path = fileURLToPath(new URL('../data/registry-snapshot.json', import.meta.url))
  return JSON.parse(readFileSync(path, 'utf8')) as Registry
}

export async function loadRegistry(): Promise<{ registry: Registry; source: 'live' | 'cache' | 'snapshot' }> {
  if (cache && Date.now() - cache.at < TTL_MS) {
    return { registry: cache.data, source: 'cache' }
  }
  try {
    const res = await fetch(REGISTRY_URL, { signal: AbortSignal.timeout(4000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as Registry
    if (!Array.isArray(data.plugins) || data.plugins.length === 0) throw new Error('empty registry')
    cache = { at: Date.now(), data }
    return { registry: data, source: 'live' }
  } catch {
    return { registry: cache?.data ?? snapshot(), source: cache ? 'cache' : 'snapshot' }
  }
}
