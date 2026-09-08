import { spawn } from 'node:child_process'
import { homedir } from 'node:os'
import { join, dirname } from 'node:path'
import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const toUrl = (p) => pathToFileURL(p).href
const { installGeneration } = await import(
  toUrl('E:/work/dsh-desktop-me/packages/dsh-desktop-market-installer/generations/installer.mjs')
)
const { exposeMissingGenerationLinks, publishGenerationManifest } = await import(
  toUrl('E:/work/dsh-desktop-me/packages/dsh-desktop-market-installer/generations/projection.mjs')
)
const { withRegistryLock, readDesired, listGenerations, writeDesired } = await import(
  toUrl('E:/work/dsh-desktop-me/packages/dsh-desktop-market-installer/generations/registry.mjs')
)

const home = process.env.DSH_HOME || join(homedir(), '.dsh')

// Resolve pnpm entry the same way the installer does (root-hoisted pnpm).
const require = createRequire('E:/work/dsh-desktop-me/packages/dsh-desktop-market-installer/')
const pnpmManifest = require.resolve('pnpm')
const pnpmRoot = dirname(pnpmManifest)
let pnpmEntryPath = join(pnpmRoot, 'bin', 'pnpm.cjs')
if (!existsSync(pnpmEntryPath)) pnpmEntryPath = join(pnpmRoot, 'bin', 'pnpm.mjs')
console.log('node      =', process.execPath)
console.log('pnpm      =', pnpmEntryPath)
console.log('dshHome   =', home)

const spec = 'dsh-rules-manager@1.5.4'

// The plugin's @deepseek-ai peers are host singletons: the host closure already
// provides them at 0.1.2-rc.1 / cordis 4.0.2 / react 18.3.1, and the generation
// deletes every @deepseek-ai copy after install anyway. pnpm still tries to
// RESOLVE the peers up-front, but on the mirror @deepseek-ai/dsh-invariants and
// friends are prerelease-only (latest tag = 0.0.1-rc.1), so the ranges that
// demand a stable 0.1.x (e.g. dsh-invariants >=0.1.1 <0.2.0-0) cannot resolve.
// Pin every such peer to the exact closure version via a pnpm override.
const closure = 'E:/work/dsh-desktop-me/data/profiles/node_modules'
async function closureVersion(pkg) {
  const pj = join(closure, pkg, 'package.json')
  const json = JSON.parse(await readFile(pj, 'utf8'))
  return json.version
}
const deepseekPin = {
  '@deepseek-ai/cordis': await closureVersion('@deepseek-ai/cordis'),
  '@deepseek-ai/dsh-home-paths': await closureVersion('@deepseek-ai/dsh-home-paths'),
  '@deepseek-ai/dsh-typert-protocol': await closureVersion('@deepseek-ai/dsh-typert-protocol'),
  '@deepseek-ai/dsh-invariants': await closureVersion('@deepseek-ai/dsh-invariants')
}
console.log('override pins =', JSON.stringify(deepseekPin))

// Custom install: after installGeneration writes the staging package.json, add
// overrides to pnpm-workspace.yaml (pnpm >=10 no longer reads package.json's
// pnpm.overrides field) before spawning pnpm add. The installer calls runInstall
// with a single argument: the staging directory.
const runInstall = (stagingDir) =>
  (async () => {
    // The isolated linker leaves the plugin's own runtime dep
    // (dsh-rules-manager-client) buried in .pnpm; that is fine because the
    // projector's repairGenerationDependencyLinks re-materialises it as a
    // junction at cold start. What we DO have to fix here is resolution of the
    // @deepseek-ai peers: on the mirror they are prerelease-only while a
    // dep-range demands a stable 0.1.x, so pin every host-singleton peer to the
    // exact version the host closure provides, via pnpm-workspace overrides
    // (pnpm >=10 reads overrides there, not from package.json).
    const wsPath = join(stagingDir, 'pnpm-workspace.yaml')
    const overridesYaml = [
      'overrides:',
      ...Object.entries({
        ...deepseekPin,
        react: '18.3.1',
        'react-dom': '18.3.1'
      }).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`)
    ].join('\n')
    let ws = ''
    try {
      ws = await readFile(wsPath, 'utf8')
    } catch {
      ws = 'packages:\n  - .\n'
    }
    if (!/^packages:/m.test(ws)) ws = `packages:\n  - .\n${ws}`
    await writeFile(wsPath, `${ws.replace(/\s*$/, '\n')}${overridesYaml}\n`)
    console.log('[runInstall] wrote host-singleton peer overrides into', stagingDir)
    return new Promise((resolve) => {
      const child = spawn(process.execPath, [pnpmEntryPath, 'add', spec], {
        cwd: stagingDir,
        env: {
          ...process.env,
          CI: 'true',
          NO_COLOR: '1',
          npm_config_side_effects_cache: 'false'
        },
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true
      })
      let output = ''
      const collect = (chunk) => {
        output += chunk.toString()
        process.stdout.write(chunk)
      }
      child.stdout?.on('data', collect)
      child.stderr?.on('data', collect)
      const timer = setTimeout(() => child.kill('SIGKILL'), 12 * 60 * 1000)
      child.once('close', (code) => {
        clearTimeout(timer)
        resolve({ code: code ?? 1, output })
      })
      child.once('error', (error) => {
        clearTimeout(timer)
        resolve({ code: 1, output: `${output}\n${error.message}` })
      })
    })
  })()

await withRegistryLock(home, async () => {
  const install = await installGeneration({
    dshHome: home,
    pluginSpec: spec,
    expectedPluginName: 'dsh-rules-manager',
    nodeExecutablePath: process.execPath,
    pnpmEntryPath,
    spawnProcess: spawn,
    environment: process.env,
    profile: 'web',
    runInstall,
    onTrace: (line) => console.log('[trace]', line),
    onOutput: (chunk) => process.stdout.write(chunk)
  })
  console.log('install.ok =', install.ok, install.detail ?? '')
  if (!install.ok) {
    process.exitCode = 1
    return
  }
  console.log('generation =', install.generation?.id)

  const [desired, generations] = await Promise.all([readDesired(home), listGenerations(home)])
  const byId = new Map(generations.map((g) => [g.id, g]))
  const kept = desired.filter((id) => byId.get(id)?.pluginName !== install.generation.pluginName)
  await writeDesired(home, [...kept, install.generation.id])
  console.log('desired   =', JSON.stringify([...kept, install.generation.id]))

  const exposed = await exposeMissingGenerationLinks(home)
  const published = await publishGenerationManifest(home)
  console.log('exposed   =', JSON.stringify(exposed))
  console.log('published =', JSON.stringify(published))
})
