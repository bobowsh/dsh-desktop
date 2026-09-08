// Verify installed expert presets: meta present, persona file exists,
// agent.cordis.yml parses with the loader dialect, delegate rows wired for teams.
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { pathToFileURL } from 'node:url'

const dshHome = process.env.DSH_HOME
const root = join(dshHome, '.agent-presets')
const pluginRoot = join(dshHome, 'profiles', 'web', 'node_modules', 'dsh-expert-market')
const { MarketService } = await import(pathToFileURL(join(pluginRoot, 'lib', 'market.js')).href)
const market = new MarketService({ marketplacesRoot: '' })

// reuse the plugin's own resolution by importing generator through market
const dirs = readdirSync(root, { withFileTypes: true })
  .filter(d => d.isDirectory() && d.name.startsWith('expert-'))
  .map(d => d.name)

let bad = 0
const report = []
for (const id of dirs) {
  const dir = join(root, id)
  const issues = []
  const yml = join(dir, 'agent.cordis.yml')
  const metaPath = join(dir, '.expert-meta.json')
  if (!existsSync(yml)) issues.push('no agent.cordis.yml')
  if (!existsSync(join(dir, 'expert-persona.js'))) issues.push('no expert-persona.js')
  if (!existsSync(metaPath)) { issues.push('no .expert-meta.json') }
  let meta
  if (existsSync(metaPath)) {
    meta = JSON.parse(await readFile(metaPath, 'utf8'))
    const persona = join(dir, meta.personaFile ?? '')
    if (!existsSync(persona)) issues.push(`persona missing: ${meta.personaFile}`)
    if (meta.personaMode === undefined) issues.push('no personaMode')
  }
  // parse the composition with the loader dialect
  try {
    const gen = await import(pathToFileURL(join(pluginRoot, 'lib', 'generator.js')).href)
    // parseComposition is not exported; approximate via baseline read + yaml
    const { createRequire } = await import('node:module')
    const inc = createRequire(join(dshHome, 'profiles', 'web', 'node_modules', 'cordis', 'package.json'))
    const incPath = inc.resolve('@deepseek-ai/cordis-plugin-include')
    const include = await import(pathToFileURL(incPath).href)
    const r2 = createRequire(incPath)
    const yaml = await import(pathToFileURL(r2.resolve('js-yaml')).href)
    const text = await readFile(yml, 'utf8')
    const parsed = yaml.load(text, { schema: include.entryListSchema })
    if (!Array.isArray(parsed)) issues.push('composition is not a list')
  } catch (e) {
    issues.push('parse error: ' + e.message.split('\n')[0])
  }
  const memberTools = meta?.memberTools ?? []
  if (meta?.expertType === 'team' && memberTools.length === 0) issues.push('team has 0 delegate rows')
  if (issues.length) bad++
  report.push({ id, type: meta?.expertType ?? '?', members: memberTools.length, issues })
  const flag = issues.length ? 'BAD ' : 'OK  '
  console.log(`${flag} ${id.padEnd(42)} ${(meta?.expertType ?? '?').padEnd(6)} members=${memberTools.length}${issues.length ? '  ' + issues.join('; ') : ''}`)
}
console.log(`\n=== presets=${dirs.length} bad=${bad} ===`)
if (bad) console.log('BAD: ' + report.filter(r => r.issues.length).map(r => r.id).join(', '))
