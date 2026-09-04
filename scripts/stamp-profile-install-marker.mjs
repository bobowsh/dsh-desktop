// Restamp the profile's `.install-complete` marker from the bytes that are
// about to be packaged. src/main/state/profile-install-marker.ts computes
//   sha256(package.json + '\0' + pnpm-lock.yaml + '\0') as hex
// and treats any other recorded value as "the last install did not finish",
// which sends the packaged app's first launch into a profile repair the
// packaged runtime cannot complete. Stamping here — in CI, immediately before
// electron-builder packs the profile — keeps the shipped marker byte-exact
// against the shipped manifests; the copy tracked in git is always stale by
// the time a fresh checkout packages it.
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const FINGERPRINTED = ['package.json', 'pnpm-lock.yaml']

async function main() {
  const profileDirectory = resolve(process.argv[2] ?? join('data', 'profiles', 'web'))
  const digest = createHash('sha256')
  for (const name of FINGERPRINTED) {
    digest.update(await readFile(join(profileDirectory, name)))
    digest.update('\0')
  }
  const fingerprint = digest.digest('hex')
  const markerPath = join(profileDirectory, '.install-complete')
  await writeFile(markerPath, `${fingerprint}\n`, 'utf8')
  console.log(`Stamped ${markerPath} with fingerprint ${fingerprint}`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main()
