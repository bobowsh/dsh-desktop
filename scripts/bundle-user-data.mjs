// Stages the developer's installed harness user-data (~/.dsh) and memory
// system (~/.mnemon) into ./bundled-user-data so that electron-builder can
// ship them inside the installer and release them to the user's home on
// install (see build/install-user-data.nsh — pure NSIS, no PowerShell).
//
// What is bundled — strict ALLOW-lists (everything else dropped):
//   ~/.dsh     : only profiles/web + settings.yaml
//     - profiles/web  : the web profile (plugins/bundles) — the only profile shipped
//     - settings.yaml : model/provider config (llm-pi-ai, agent-default-model,
//                       vision-toolkit, web-search-deepseek) is STRIPPED before
//                       staging — only mnemon.cliPath / dsh-desktop are shipped,
//                       so personal model setup never leaks.
//   ~/.mnemon  : only bin/ (mnemon.exe + its runtime DLLs) — the memory CLI the
//                harness spawns. The memory DATABASE / runtime data under
//                ~/.mnemon is user-specific and is NOT shipped.
// Everything else (sessions/memory/attachments/... under .dsh, the mnemon
// runtime data, .credentials.yaml, cache, ...) is user runtime data / sensitive
// and is NOT shipped. Edit DSH_ALLOW_LIST / MNEMON_ALLOW_LIST to change.

import { basename, dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'
import { existsSync, cpSync, mkdirSync, statSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const destRoot = join(projectRoot, 'bundled-user-data')

// Top-level settings.yaml sections that contain personal model / provider setup.
// These are dropped from the shipped bundle; everything else (mnemon.cliPath,
// dsh-desktop, ui-onboarding, …) is preserved.
const DROP_SETTINGS_SECTIONS = [
  'llm-pi-ai',
  'agent-default-model',
  'vision-toolkit',
  'web-search-deepseek'
]

// Remove the listed top-level sections from a settings.yaml document, keeping
// every other line (including nested keys) intact. Block-based, not a YAML parser,
// so flow-style values ({ ... } / [ ... ]) inside a dropped section are dropped too
// because all their lines are indented under the dropped top-level key.
function stripModelConfig(text) {
  const lines = text.split(/\r?\n/)
  const out = []
  let dropping = false
  for (const line of lines) {
    const m = /^(\S[^:]*):/.exec(line) // top-level key = no leading whitespace
    if (m) {
      const key = m[1].trim()
      dropping = DROP_SETTINGS_SECTIONS.includes(key)
      if (dropping) {
        console.log(`[bundle-user-data]     - dropped settings section: ${key}`)
        continue
      }
    }
    if (dropping) continue
    out.push(line)
  }
  return out.join('\n')
}

// ~/.dsh ships ONLY these top-level entries (allow-list). Everything else is
// user runtime data (sessions/memory/attachments/...) or sensitive
// (.credentials.yaml) and must never be shipped.
const DSH_ALLOW_LIST = ['settings.yaml', 'profiles']

// ~/.mnemon ships ONLY bin/ (the mnemon.exe memory CLI + its runtime DLLs).
// The memory database / runtime data is user-specific and is NOT shipped.
const MNEMON_ALLOW_LIST = ['bin']

const SOURCES = [
  { name: '.dsh', src: join(homedir(), '.dsh'), allowList: DSH_ALLOW_LIST },
  { name: '.mnemon', src: join(homedir(), '.mnemon'), allowList: MNEMON_ALLOW_LIST }
]

// Always create the destination so electron-builder's extraResources never
// fails when a source happens to be missing on the build machine.
mkdirSync(destRoot, { recursive: true })

let failed = false
for (const { name, src, allowList } of SOURCES) {
  if (!existsSync(src)) {
    console.warn(`[bundle-user-data] skip: source not found: ${src}`)
    continue
  }
  const dest = join(destRoot, name)
  console.log(`[bundle-user-data] staging ${src} -> ${dest}`)
  try {
    cpSync(src, dest, {
      recursive: true,
      force: true,
      filter: (p) => {
        // Allow-list: at the top level of ~/.dsh keep only DSH_ALLOW_LIST
        // entries (settings.yaml + profiles). Everything else is dropped.
        if (allowList && dirname(p) === src && !allowList.includes(basename(p))) {
          console.log(`[bundle-user-data]   excluded ${basename(p)} (not in allow-list)`)
          return false
        }
        // under .dsh/profiles keep ONLY the "web" profile (drop node_modules/desktop/etc.)
        const rel = relative(src, p)
        if (rel === 'profiles' || rel.startsWith(`profiles${sep}`)) {
          const keep = rel === 'profiles' || rel === `profiles${sep}web` || rel.startsWith(`profiles${sep}web${sep}`)
          if (!keep) {
            console.log(`[bundle-user-data]   excluded ${rel}`)
            return false
          }
        }
        return true
      }
    })
    console.log(`[bundle-user-data]   done (${humanSize(dirSize(dest))})`)
    // Strip personal model/provider config from settings.yaml (keep mnemon.cliPath,
    // dsh-desktop, ui-onboarding). Then replace the machine-specific absolute
    // cliPath with a placeholder so the installer (NSIS) can rewrite the whole
    // `cliPath:` line to the target machine's real path at install time.
    if (name === '.dsh') {
      const settings = join(dest, 'settings.yaml')
      if (existsSync(settings)) {
        try {
          const cleaned = stripModelConfig(readFileSync(settings, 'utf8'))
          const withPlaceholder = cleaned.replace(
            /^(\s*cliPath:\s*).*$/m,
            '$1@@MNEMON_CLI@@'
          )
          writeFileSync(settings, withPlaceholder, 'utf8')
          console.log('[bundle-user-data]   stripped model config from settings.yaml + set cliPath placeholder')
        } catch (err) {
          failed = true
          console.error('[bundle-user-data] failed to clean settings.yaml:', err)
        }
      }
    }
  } catch (err) {
    failed = true
    console.error(`[bundle-user-data] failed to stage ${name}:`, err)
  }
}

if (failed) process.exit(1)
console.log('[bundle-user-data] complete -> ./bundled-user-data')

function dirSize(dir) {
  let total = 0
  const walk = (d) => {
    for (const entry of readdirSync(d)) {
      const p = join(d, entry)
      try {
        const s = statSync(p)
        if (s.isDirectory()) walk(p)
        else total += s.size
      } catch {
        // ignore unreadable entries
      }
    }
  }
  try {
    walk(dir)
  } catch {
    // ignore
  }
  return total
}

function humanSize(n) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i++
  }
  return `${n.toFixed(1)} ${units[i]}`
}
