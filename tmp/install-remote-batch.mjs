// Batch-install remote-catalog experts as agent presets, using the real
// MarketService.installRemote() pipeline (CDN download + validated surgery).
//
// Usage: node tmp/install-remote-batch.mjs <CategoryId>[,<CategoryId>...] [--dry]
//        node tmp/install-remote-batch.mjs --ids Id1,Id2 --dry
//
// - Skips experts whose CDN promptFile is not reachable (404 = not synced yet).
// - Skips experts already installed (package dir + preset id) unless --force.
// - Never deletes anything.
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { pathToFileURL } from 'node:url'

const dshHome = process.env.DSH_HOME
if (!dshHome) throw new Error('set DSH_HOME')
const pluginRoot = join(dshHome, 'profiles', 'web', 'node_modules', 'dsh-expert-market')
const baselinePath = join(dshHome, 'profiles', 'web', 'node_modules', '@deepseek-ai', 'dsh-agent-presets', 'presets', 'standard', 'agent.cordis.yml')
const baselineText = await readFile(baselinePath, 'utf8')
const userPresetRoot = join(dshHome, '.agent-presets')
const marketRoot = join(dshHome, 'experts', 'marketplaces', 'official', 'plugins')

const args = process.argv.slice(2)
const dry = args.includes('--dry')
const force = args.includes('--force')
const idsArg = args.find(a => a.startsWith('--ids='))
const catArg = args.find(a => !a.startsWith('--'))

const presets = {
  roots: [{ trust: 'user', path: userPresetRoot }],
  async read(id) { if (id !== 'standard') throw new Error(`unexpected baseline ${id}`); return baselineText },
  async list() { return [] },
}

const { MarketService } = await import(pathToFileURL(join(pluginRoot, 'lib', 'market.js')).href)
const market = new MarketService({ marketplacesRoot: '' })
const catalog = market.readRemoteCatalog()
const base = market.cdnRoot()

const toKebab = id => id
  .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
  .toLowerCase()
  .replaceAll(/[^a-z0-9-]+/g, '-')
  .replace(/^-+|-+$/g, '')

let targets
if (idsArg) {
  const wanted = idsArg.slice(6).split(',').map(s => s.trim()).filter(Boolean)
  targets = wanted.map(w => catalog.find(r => r.id === w || toKebab(r.id) === toKebab(w))).filter(Boolean)
  const missing = wanted.filter((w, i) => !targets[i])
  if (missing.length) console.log(`catalog miss: ${missing.join(', ')}`)
} else {
  const cats = (catArg ?? '02-Engineering').split(',')
  targets = catalog.filter(e => cats.includes(e.categoryId))
}

async function reachable(record) {
  const files = [record.promptFile, ...(record.members ?? []).map(m => m.promptFile)].filter(Boolean)
  for (const f of [...new Set(files)]) {
    try {
      const r = await fetch(base + f)
      if (!r.ok) return { ok: false, reason: `HTTP ${r.status} ${f}` }
    } catch (e) { return { ok: false, reason: `${f}: ${e.message}` } }
  }
  return { ok: true }
}

const results = []
for (const record of targets) {
  const slug = 'expert-' + toKebab(record.id)
  const presetDir = join(userPresetRoot, slug)
  if (!force && existsSync(presetDir)) {
    console.log(`SKIP ${slug.padEnd(42)} already installed`)
    results.push({ slug, status: 'skipped' })
    continue
  }
  const probe = await reachable(record)
  if (!probe.ok) {
    console.log(`SKIP ${slug.padEnd(42)} CDN unreachable (${probe.reason})`)
    results.push({ slug, status: 'unreachable', reason: probe.reason })
    continue
  }
  if (dry) {
    console.log(`DRY  ${slug.padEnd(42)} ${(record.expertType ?? 'agent').padEnd(6)} ${record.displayName?.zh ?? record.displayName?.en ?? ''}`)
    results.push({ slug, status: 'dry' })
    continue
  }
  try {
    const s = await market.installRemote(presets, record, slug)
    const warns = (s.warnings ?? []).filter(w => !w.includes('is not a known product-provider row'))
    console.log(`OK   ${s.presetId.padEnd(42)} ${(record.expertType ?? 'agent').padEnd(6)} ${record.displayName?.zh ?? ''}${warns.length ? '  warnings=' + warns.length : ''}`)
    for (const w of warns) console.log(`       warn: ${w}`)
    results.push({ slug: s.presetId, status: 'ok', warnings: warns })
  } catch (e) {
    console.log(`FAIL ${slug.padEnd(42)} ${e.message.split('\n')[0]}`)
    results.push({ slug, status: 'fail', error: e.message })
  }
}

const by = k => results.filter(r => r.status === k).length
console.log(`\n=== total=${results.length} ok=${by('ok')} skipped=${by('skipped')} unreachable=${by('unreachable')} fail=${by('fail')} dry=${by('dry')} ===`)
if (by('fail')) console.log('FAILED: ' + results.filter(r => r.status === 'fail').map(r => r.slug).join(', '))
if (by('unreachable')) console.log('UNREACHABLE: ' + results.filter(r => r.status === 'unreachable').map(r => r.slug).join(', '))
