import type { ChildProcessWithoutNullStreams, SpawnOptionsWithoutStdio } from 'node:child_process'
import { createWriteStream, existsSync, readFileSync, writeFileSync, type WriteStream } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { createServer } from 'node:net'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import type { RuntimePhase, RuntimeSnapshot } from '../../shared/contracts'

export interface HarnessRuntimeOptions {
  dshEntryPath: string
  nodeExecutablePath: string
  nodeEntryPath: string
  dshPatchPath: string
  dshHome: string
  logPath: string
  /**
   * True when `nodeExecutablePath` points at the Electron binary being reused as
   * the Node.js runtime; the Harness child then needs ELECTRON_RUN_AS_NODE=1.
   * False when it points at the standalone bundled Node.js runtime (fallback).
   */
  useElectronRuntime?: boolean
  launchProcess(
    executablePath: string,
    args: string[],
    options: SpawnOptionsWithoutStdio
  ): ChildProcessWithoutNullStreams
  startupTimeoutMs?: number
  onChanged(snapshot: RuntimeSnapshot): void
}

export function buildHarnessArguments(port: number, patchPath?: string): string[] {
  return [
    'web',
    ...(patchPath ? ['--patch', patchPath] : []),
    '--host',
    '127.0.0.1',
    '--port',
    String(port)
  ]
}

export function buildHarnessSpawnOptions(
  launchDirectory: string,
  dshHome: string,
  platform: NodeJS.Platform = process.platform,
  environment: NodeJS.ProcessEnv = process.env,
  useElectronRuntime = false
): SpawnOptionsWithoutStdio {
  const { ELECTRON_RUN_AS_NODE: _runAsNode, ...parentEnvironment } = environment
  const pathKey = platform === 'win32' ? 'Path' : 'PATH'

  return {
    cwd: launchDirectory,
    env: {
      ...parentEnvironment,
      NO_COLOR: '1',
      // Point the Harness at the data directory living next to the running
      // program so the whole profile (plugins, settings, credentials) stays
      // portable beside the executable instead of in the user's home.
      DSH_HOME: dshHome,
      // Resolve the bundled Mnemon CLI relative to the data directory that sits
      // next to the executable (dshHome/bin/mnemon.exe). The dsh-mnemon plugin
      // prefers this env var over the settings `cliPath` field, which only
      // supports `~` or absolute paths — so this keeps the CLI path portable
      // without any hardcoded absolute path in the repo or the installer.
      MNEMON_CLI_PATH: join(dshHome, 'bin', 'mnemon.exe'),
      // When the Harness child reuses the Electron binary as its Node.js runtime
      // it must opt back into "run as Node" mode so Electron does not boot a GUI.
      // When the child runs the standalone bundled Node.js runtime instead, the
      // flag must be stripped so Node is not accidentally forced back into that mode.
      ...(useElectronRuntime ? { ELECTRON_RUN_AS_NODE: '1' } : {}),
      [pathKey]: environment[pathKey] ?? environment.PATH ?? ''
    },
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true
  }
}

export function buildNodeArguments(
  nodeEntryPath: string,
  dshEntryPath: string,
  port: number,
  patchPath?: string
): string[] {
  return [
    '--expose-internals',
    nodeEntryPath,
    dshEntryPath,
    ...buildHarnessArguments(port, patchPath)
  ]
}

export class HarnessRuntime {
  private child?: ChildProcessWithoutNullStreams
  private logStream?: WriteStream
  private phase: RuntimePhase = 'idle'
  private message = 'Harness is not running.'
  private launchDirectory?: string
  private url?: string
  private readonly logLines: string[] = []

  constructor(private readonly options: HarnessRuntimeOptions) {}

  snapshot(): RuntimeSnapshot {
    return {
      phase: this.phase,
      message: this.message,
      launchDirectory: this.launchDirectory,
      url: this.url,
      logs: [...this.logLines]
    }
  }

  async start(launchDirectory: string): Promise<void> {
    await this.stop()
    this.launchDirectory = launchDirectory
    this.url = undefined

    if (!existsSync(this.options.dshEntryPath)) {
      this.setState('failed', `Harness entry was not found: ${this.options.dshEntryPath}`)
      return
    }
    if (!existsSync(this.options.nodeExecutablePath)) {
      this.setState('failed', `Bundled Node.js runtime was not found: ${this.options.nodeExecutablePath}`)
      return
    }
    if (!existsSync(this.options.nodeEntryPath)) {
      this.setState('failed', `Harness diagnostic entry was not found: ${this.options.nodeEntryPath}`)
      return
    }
    if (!existsSync(this.options.dshPatchPath)) {
      this.setState('failed', `DSH Desktop patch was not found: ${this.options.dshPatchPath}`)
      return
    }

    await mkdir(this.options.dshHome, { recursive: true })
    await mkdir(dirname(this.options.logPath), { recursive: true })
    this.logStream = createWriteStream(this.options.logPath, { flags: 'a' })

    syncModulesMetadata(this.options.dshHome, (line) => this.writeLog(line))

    const port = await reservePort()
    const url = `http://127.0.0.1:${port}`
    const args = buildNodeArguments(
      this.options.nodeEntryPath,
      this.options.dshEntryPath,
      port,
      this.options.dshPatchPath
    )
    const startupTimeoutMs =
      this.options.startupTimeoutMs ?? (process.platform === 'win32' ? 120_000 : 45_000)

    this.writeLog(`\n[desktop] starting ${new Date().toISOString()}`)
    this.writeLog(`[desktop] launch directory ${launchDirectory}`)
    this.writeLog(`[desktop] endpoint ${url}`)
    this.setState('starting', 'Starting DeepSeek Harness…')

    let child: ChildProcessWithoutNullStreams
    try {
      child = this.options.launchProcess(
        this.options.nodeExecutablePath,
        args,
        buildHarnessSpawnOptions(
          launchDirectory,
          this.options.dshHome,
          process.platform,
          process.env,
          this.options.useElectronRuntime ?? false
        )
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.writeLog(`[utility] launch failed: ${message}`)
      this.setState('failed', `Harness could not start: ${message}`)
      return
    }
    this.child = child

    child.stdout.on('data', (chunk: Buffer) => this.writeChunk('stdout', chunk))
    child.stderr.on('data', (chunk: Buffer) => this.writeChunk('stderr', chunk))
    child.once('spawn', () => this.writeLog('[desktop] Bundled Node.js Harness process started'))
    child.once('error', (error) => {
      this.writeLog(`[node] ${error.stack ?? error.message}`)
      if (this.child !== child) return
      this.child = undefined
      this.setState('failed', `Harness could not start: ${error.message}`)
    })
    child.once('exit', (code, signal) => {
      const detail = signal ? `signal ${signal}` : formatExitCode(code ?? -1)
      this.writeLog(`[node] Harness process exited (${detail})`)
      if (this.child !== child) return
      this.child = undefined
      this.setState('failed', `Harness stopped unexpectedly (${detail}).`)
    })

    const startedAt = Date.now()
    const progressTimer = setInterval(
      () => this.writeLog(`[desktop] waiting for Harness (${Math.round((Date.now() - startedAt) / 1000)}s)`),
      10_000
    )
    const ready = await waitUntilReady(
      url,
      () => this.child === child && child.exitCode === null,
      startupTimeoutMs
    ).finally(() => clearInterval(progressTimer))

    if (this.child !== child) return
    if (!ready) {
      await this.stopChild(child)
      this.setState(
        'failed',
        `Harness did not become ready within ${Math.round(startupTimeoutMs / 1000)} seconds.`
      )
      return
    }

    this.url = url
    this.setState('ready', 'Harness is ready.')
  }

  async stop(): Promise<void> {
    const child = this.child
    if (!child) {
      this.closeLog()
      if (this.phase !== 'failed') this.setState('idle', 'Harness is not running.')
      return
    }

    this.setState('stopping', 'Stopping Harness…')
    this.child = undefined
    await this.stopChild(child)
    this.closeLog()
    this.url = undefined
    this.setState('idle', 'Harness is not running.')
  }

  private async stopChild(child: ChildProcessWithoutNullStreams): Promise<void> {
    if (child.exitCode !== null) return
    const exitPromise = new Promise<boolean>((resolve) =>
      child.once('exit', () => resolve(true))
    )
    child.kill('SIGTERM')
    const exited = await Promise.race([
      exitPromise,
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 4_000))
    ])
    if (!exited && child.exitCode === null) child.kill('SIGKILL')
  }

  private setState(phase: RuntimePhase, message: string): void {
    this.phase = phase
    this.message = message
    this.options.onChanged(this.snapshot())
  }

  private writeChunk(source: 'stdout' | 'stderr', chunk: Buffer): void {
    for (const line of chunk.toString('utf8').split(/\r?\n/)) {
      if (line.length > 0) this.writeLog(`[${source}] ${line}`)
    }
  }

  private writeLog(line: string): void {
    this.logLines.push(line)
    if (this.logLines.length > 200) this.logLines.splice(0, this.logLines.length - 200)
    this.logStream?.write(`${line}\n`)
  }

  private closeLog(): void {
    this.logStream?.end()
    this.logStream = undefined
  }
}

export function formatExitCode(code: number): string {
  const unsigned = code >>> 0
  const hexadecimal = `0x${unsigned.toString(16).padStart(8, '0').toUpperCase()}`
  if (unsigned === 0xffff7003) {
    return `exit code ${unsigned} (${hexadecimal}, Crashpad handler unavailable)`
  }
  return `exit code ${code} (${hexadecimal})`
}

async function reservePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.unref()
    server.once('error', reject)
    server.listen({ host: '127.0.0.1', port: 0 }, () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        server.close()
        reject(new Error('Could not reserve a local port.'))
        return
      }
      const { port } = address
      server.close((error) => (error ? reject(error) : resolve(port)))
    })
  })
}

async function waitUntilReady(
  url: string,
  isAlive: () => boolean,
  timeoutMs: number
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline && isAlive()) {
    try {
      const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(1_000) })
      if (response.status >= 200 && response.status < 500) return true
    } catch {
      // The server is expected to reject connections while it is booting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  return false
}

/**
 * Keep the shipped plugin tree's pnpm metadata aligned with the CURRENT machine.
 *
 * The profile (data/profiles/web) is staged by a plain recursive copy
 * (scripts/bundle-user-data.mjs), which leaves `node_modules/.modules.yaml` naming
 * the SOURCE machine's absolute paths — or, after bundle normalization, no paths
 * at all. pnpm's checkCompatibility then compares the recorded values against the
 * tree it is actually running in and throws ERR_PNPM_UNEXPECTED_STORE /
 * ERR_PNPM_UNEXPECTED_VIRTUAL_STORE on the first add/remove from the market UI.
 *
 * This rewrites the file for the machine that boots the harness:
 * - `storeDir` must EXIST and exactly match the store pnpm resolves. The shipped
 *   workspace pins `storeDir: ~/AppData/Local/pnpm/store` (expands to the current
 *   user's home on any machine), so pnpm resolves `<home>\AppData\Local\pnpm\store\v11`
 *   on Windows — we write that same absolute path here.
 * - `virtualStoreDir` is an optional check, so it is dropped and pnpm recomputes
 *   it from the tree location on its next run.
 *
 * Anything unexpected (missing file, non-JSON, read failure) is non-fatal: the
 * harness still boots, and the worst case is a pnpm "unexpected store location"
 * error surfacing again in the market UI.
 */
function syncModulesMetadata(dshHome: string, log: (line: string) => void): void {
  try {
    const modulesFile = join(dshHome, 'profiles', 'web', 'node_modules', '.modules.yaml')
    if (!existsSync(modulesFile)) return
    const parsed = JSON.parse(readFileSync(modulesFile, 'utf8')) as {
      storeDir?: string
      virtualStoreDir?: string
    }
    const localAppData =
      process.env.LOCALAPPDATA ?? join(homedir(), 'AppData', 'Local')
    // pnpm's STORE_VERSION for the bundled pnpm 11 (see pnpm-workspace.yaml's
    // storeDir pin); keep in sync when the bundled pnpm major changes.
    const storeDir = join(localAppData, 'pnpm', 'store', 'v11')
    let changed = false
    if (parsed.storeDir !== storeDir) {
      parsed.storeDir = storeDir
      changed = true
    }
    if (parsed.virtualStoreDir !== undefined) {
      delete parsed.virtualStoreDir
      changed = true
    }
    if (changed) {
      writeFileSync(modulesFile, `${JSON.stringify(parsed, null, 2)}\n`)
      log('[desktop] synced pnpm .modules.yaml storeDir for this machine')
    }
  } catch (error) {
    log(
      `[desktop] pnpm .modules.yaml sync skipped: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
