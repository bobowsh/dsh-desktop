// Verify that data/profiles/web/.install-complete matches the fingerprint
// that src/main/state/profile-install-marker.ts computes:
//   sha256(package.json + '\0' + pnpm-lock.yaml + '\0') hex
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const profileDir = join(process.cwd(), 'data', 'profiles', 'web')

async function fingerprint() {
  const digest = createHash('sha256')
  for (const name of ['package.json', 'pnpm-lock.yaml']) {
    digest.update(await readFile(join(profileDir, name)))
    digest.update('\0')
  }
  return digest.digest('hex')
}

const expected = await fingerprint()
let marker = ''
try {
  marker = (await readFile(join(profileDir, '.install-complete'), 'utf8')).trim()
} catch {
  console.log('marker: <missing>')
}
let committed = ''
try {
  const { execFileSync } = await import('node:child_process')
  committed = execFileSync('git', ['show', 'HEAD:data/profiles/web/.install-complete'], { encoding: 'utf8' }).trim()
} catch (error) {
  committed = `<error: ${error.message}>`
}

console.log('fingerprint(current package.json + pnpm-lock.yaml):', expected)
console.log('working-tree .install-complete            :', marker)
console.log('committed    .install-complete            :', committed)
console.log('working tree matches fingerprint          :', marker === expected ? 'YES' : 'NO')
console.log('committed matches fingerprint             :', committed === expected ? 'YES' : 'NO')
