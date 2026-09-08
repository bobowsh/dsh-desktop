import { homedir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const toUrl = (p) => pathToFileURL(p).href
const home = process.env.DSH_HOME || join(homedir(), '.dsh')

const { projectGenerations } = await import(
  toUrl('E:/work/dsh-desktop-me/packages/dsh-desktop-market-installer/generations/projection.mjs')
)
const { listGenerations } = await import(
  toUrl('E:/work/dsh-desktop-me/packages/dsh-desktop-market-installer/generations/registry.mjs')
)
const { verifyGenerationPeers } = await import(
  toUrl('E:/work/dsh-desktop-me/packages/dsh-desktop-market-installer/generations/installer.mjs')
)

// Simulate cold-start projection: creates junctions + repairs missing dep links.
const projection = await projectGenerations(home, 'web')
console.log('projected linked      =', JSON.stringify(projection.linked))
console.log('repaired dep links    =', projection.repairedLinks)
console.log('unlinked              =', JSON.stringify(projection.unlinked))

// Verify the rules-manager generation closure.
const generations = await listGenerations(home)
const gen = generations.find((g) => g.pluginName === 'dsh-rules-manager')
console.log('generation            =', gen?.id)
const verify = await verifyGenerationPeers(home, gen)
console.log('verifyGenerationPeers ok =', verify.ok)
if (!verify.ok) {
  console.log('problems:')
  for (const p of verify.problems) console.log('  -', p)
}

// Show the now-materialised top-level deps in the generation.
const { readdir } = await import('node:fs/promises')
const nm = join(gen.directory, 'node_modules')
const entries = (await readdir(nm, { withFileTypes: true }))
  .filter((e) => !e.name.startsWith('.') || e.name === '.bin')
  .map((e) => e.name)
console.log('generation node_modules top-level =', entries.join(', '))
