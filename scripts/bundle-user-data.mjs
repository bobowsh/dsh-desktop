// Stages the developer's installed harness user-data (~/.dsh) and memory
// system (~/.mnemon) into ./data as a FLAT layout, so the desktop shell can
// point DSH_HOME at <program-dir>/data and read it directly — there is no
// per-user release step at install time (see build/install-user-data.nsh).
//
// Shipped flat layout produced here:
//   data/
//     settings.yaml      (copied verbatim from data/settings.template.yaml —
//                         a clean, portable template that never reads the user's
//                         live ~/.dsh/settings.yaml; no personal model/provider
//                         config and no machine-specific cliPath)
//     profiles/web/...    (the only shipped profile + its self-contained node_modules)
//     bin/                (mnemon.exe memory CLI + its runtime DLLs)
//
// Strict ALLOW-lists: everything else (sessions, memory db, .credentials.yaml,
// cache, other profiles, …) is user runtime data / sensitive and is NEVER shipped.
// electron-builder then ships this `data` dir via extraResources (from: data),
// and the installer copies it next to the executable at $INSTDIR\data.

import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'
import { existsSync, cpSync, mkdirSync, rmSync, statSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const destRoot = join(projectRoot, 'data')

// `data/` doubles as the dev DSH_HOME: the running dev harness stores the user's
// LIVE runtime/secret data here (sessions/, .credentials.yaml, storages/,
// change-ledger/, sticky-notes/, …). We must NEVER delete those. We (re)stage only
// the three BUILD-INPUT artifacts below, and electron-builder's extraResources
// `filter` (see package.json) is the single source of truth for what actually ships
// — so any leftover runtime dir in `data/` is simply never packaged.
//
// To keep the plugin tree / binary tree clean we refresh them by removing *only*
// these two build-input dirs (regenerated from the canonical live profile every
// run). This is NOT user data and is safe to recreate.
mkdirSync(destRoot, { recursive: true })

for (const name of ['profiles', 'bin']) {
  const p = join(destRoot, name)
  if (existsSync(p)) {
    try {
      rmSync(p, { recursive: true, force: true })
    } catch {
      // locked (e.g. dev harness has it open) -> overwrite below
    }
  }
}

let failed = false

// 1) settings.yaml — copied verbatim from the project's clean template.
//    We deliberately NEVER read the user's live ~/.dsh/settings.yaml: it holds
//    personal model/provider config and a machine-specific cliPath. The template
//    already excludes those, so the shipped bundle is portable and leak-free by
//    construction (the shell injects MNEMON_CLI_PATH from DSH_HOME at launch).
const settingsTemplate = join(destRoot, 'settings.template.yaml')
const settingsDest = join(destRoot, 'settings.yaml')
if (existsSync(settingsTemplate)) {
  try {
    cpSync(settingsTemplate, settingsDest, { force: true })
    console.log('[bundle-user-data] staged settings.yaml <- data/settings.template.yaml')
  } catch (err) {
    failed = true
    console.error('[bundle-user-data] failed to stage settings.yaml:', err)
  }
} else {
  console.warn(`[bundle-user-data] skip: settings template not found at ${settingsTemplate}`)
}

// 2) profiles/web — the only shipped profile (+ its self-contained node_modules).
const webSrc = join(homedir(), '.dsh', 'profiles', 'web')
const webDest = join(destRoot, 'profiles', 'web')
  if (existsSync(webSrc)) {
    try {
      cpSync(webSrc, webDest, { recursive: true, force: true })
      normalizeModulesMetadata(webDest)
      trimNativePrebuilds(webDest)
      trimPdfjsBuild(webDest)
      console.log(`[bundle-user-data] staged profiles/web -> data/profiles/web (${humanSize(dirSize(webDest))})`)
    } catch (err) {
      failed = true
      console.error('[bundle-user-data] failed to stage profiles/web:', err)
    }
  } else {
    console.warn(`[bundle-user-data] skip: profile not found at ${webSrc}`)
  }

// 3) mnemon bin/ — the memory CLI the harness spawns.
const binSrc = join(homedir(), '.mnemon', 'bin')
const binDest = join(destRoot, 'bin')
if (existsSync(binSrc)) {
  try {
    cpSync(binSrc, binDest, { recursive: true, force: true })
    console.log(`[bundle-user-data] staged mnemon bin -> data/bin (${humanSize(dirSize(binDest))})`)
  } catch (err) {
    failed = true
    console.error('[bundle-user-data] failed to stage mnemon bin:', err)
  }
} else {
  console.warn(`[bundle-user-data] skip: mnemon bin not found at ${binSrc}`)
}

if (failed) process.exit(1)
console.log('[bundle-user-data] complete -> ./data (flat: settings.yaml, profiles/web, bin)')

/**
 * Make the copied plugin tree location-independent.
 *
 * The profile is staged with a plain recursive copy, so `node_modules/.modules.yaml`
 * still names the SOURCE machine's absolute paths. pnpm's checkCompatibility then
 * compares those against the directory the market UI actually runs in and throws
 * ERR_PNPM_UNEXPECTED_VIRTUAL_STORE / ERR_PNPM_UNEXPECTED_STORE ("Unexpected …
 * store location") on the first add/remove — which is exactly how a plugin
 * install/update from the market UI fails once DSH_HOME points at `data`.
 *
 * Two fields are dropped here:
 * - `virtualStoreDir` is an OPTIONAL check (`if (modules.virtualStoreDir && …)`);
 *   pnpm recomputes it from the tree location on the next run.
 * - `storeDir` must NOT simply be removed — `!modules.storeDir` fails the check
 *   too. It is dropped here and re-written at runtime by the desktop shell (see
 *   harness-runtime.ts) to the CURRENT machine's home store, which matches the
 *   workspace-level `storeDir: ~/AppData/Local/pnpm/store` pinned below.
 *
 * The workspace file also gains a pinned `storeDir` so pnpm does not fall back to
 * its default same-volume resolution (which would create a volume-root
 * `.pnpm-store` next to the profile, wasting a second cache on a different
 * volume). `~` expands to the current user's home on ANY machine, so the store
 * stays in the user's existing pnpm cache instead of the program directory.
 */
function normalizeModulesMetadata(profileDest) {
  const modulesFile = join(profileDest, 'node_modules', '.modules.yaml')
  if (existsSync(modulesFile)) {
    const raw = readFileSync(modulesFile, 'utf8')
    // pnpm writes this file as JSON (a valid YAML subset), so JSON.parse is enough
    // and keeps the script dependency-free.
    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      console.warn('[bundle-user-data] .modules.yaml is not JSON-shaped; left untouched')
      return
    }
    delete parsed.virtualStoreDir
    delete parsed.storeDir
    writeFileSync(modulesFile, `${JSON.stringify(parsed, null, 2)}\n`)
    console.log('[bundle-user-data] normalized .modules.yaml (dropped source-tree storeDir + virtualStoreDir)')
  }
  // Pin the store to the current user's home cache on every machine. Do NOT touch
  // the source profile — live ~/.dsh runs on the same volume as its store already.
  const workspaceFile = join(profileDest, 'pnpm-workspace.yaml')
  const workspaceRaw = readFileSync(workspaceFile, 'utf8')
  if (!/^\s*storeDir\s*:/m.test(workspaceRaw)) {
    writeFileSync(workspaceFile, `${workspaceRaw.replace(/\s*$/, '')}\n\n# pnpm store: reuse the user home store (~/AppData/Local/pnpm/store).\n# Explicit store-dir skips pnpm's default same-volume resolution (which would\n# create a volume-root .pnpm-store next to the profile); cross-volume imports\n# fall back to copy automatically.\nstoreDir: ~/AppData/Local/pnpm/store\n`)
    console.log('[bundle-user-data] pnpm-workspace.yaml: pinned storeDir: ~/AppData/Local/pnpm/store')
  }
}

/**
 * Trim platform junk from native prebuilds before packaging (win-x64 target):
 * - every `*.pdb` (debug symbols — never needed at runtime, they are the bulk of
 *   node-pty's ~58MB prebuilds),
 * - `prebuilds/` platform directories other than `win32-x64` (win32-arm64,
 *   darwin-*, linux-* …),
 * - third-party platform subdirs under `build/Release/conpty` (win10-arm64).
 *
 * Works on any package tree: scans every `prebuilds` / `build` directory under
 * `node_modules` and removes only the above shapes. The win32-x64 `.node` /
 * winpty.dll / OpenConsole.exe files actually loaded at runtime are untouched.
 */
function trimNativePrebuilds(profileDest) {
  const nm = join(profileDest, 'node_modules')
  if (!existsSync(nm)) return
  const removed = []
  const walk = (d) => {
    let entries
    try {
      entries = readdirSync(d, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of entries) {
      const p = join(d, e.name)
      if (e.isDirectory()) {
        walk(p)
        continue
      }
      if (e.isFile() && e.name.toLowerCase().endsWith('.pdb')) {
        rmSync(p, { force: true })
        removed.push(p)
      }
    }
  }
  walk(nm)
  // Platform dirs to drop inside any `prebuilds` (and `third_party`/`build`) tree.
  const drop = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      const isOtherPlatform =
        /^win32-(?!x64$)/.test(entry) || /^(darwin|linux|freebsd|openbsd|sunos|aix|android)-/.test(entry)
      if (isOtherPlatform) {
        try {
          rmSync(full, { recursive: true, force: true })
          removed.push(full)
        } catch (err) {
          // e.g. transient lock while the harness/electron-builder is reading the
          // tree — report instead of silently leaving ~28MB of arm64 prebuilds in.
          console.warn(
            `[bundle-user-data] trim: could not remove ${full}: ${err instanceof Error ? err.message : String(err)}`
          )
        }
      }
    }
  }
  const collectDirs = (d, acc) => {
    let entries
    try {
      entries = readdirSync(d, { withFileTypes: true })
    } catch {
      return acc
    }
    for (const e of entries) {
      if (!e.isDirectory()) continue
      const p = join(d, e.name)
      if (e.name === 'prebuilds') acc.push(p)
      else if (/^win10-(?!x64$)/.test(e.name) && /(conpty|third_party)/.test(d)) acc.push(p)
      else acc = collectDirs(p, acc)
    }
    return acc
  }
  const prebuildDirs = collectDirs(nm, [])
  for (const dir of prebuildDirs) {
    drop(dir)
  }
  if (removed.length > 0) {
    console.log(`[bundle-user-data] trimmed native prebuilds: removed ${removed.length} files/dirs (~${humanSize(removed.reduce((s, p) => s + (statSync(p, { throwIfNoEntry: false })?.size ?? 0), 0))})`)
  }
}

/**
 * Trim the unused top-level `pdfjs-dist/build/` (~14MB, modern/ES2018 entry).
 * The only consumer in the plugin tree (dsh-files) imports
 * `pdfjs-dist/legacy/build/pdf.mjs`, and no other package references the
 * top-level build entry — so only `legacy/build` is kept. Safe by construction:
 * this is a whole-directory drop, never a file-level prune.
 */
function trimPdfjsBuild(profileDest) {
  const p = join(profileDest, 'node_modules', 'pdfjs-dist', 'build')
  const legacy = join(profileDest, 'node_modules', 'pdfjs-dist', 'legacy', 'build')
  if (existsSync(p) && existsSync(legacy)) {
    try {
      rmSync(p, { recursive: true, force: true })
      console.log('[bundle-user-data] trimmed pdfjs-dist/build (unused modern entry; legacy kept)')
    } catch (err) {
      console.warn(
        `[bundle-user-data] trim: could not remove pdfjs-dist/build: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }
}

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
