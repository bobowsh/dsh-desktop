import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

export const STORAGE_FILENAME = 'desktop-storage.json'

/**
 * Windows transient-rename error codes. An atomic tmp->dest rename can briefly
 * fail with EPERM/EBUSY/EACCES when an external reader (Windows Defender, the
 * Search indexer, a sync client, a file watcher) still holds a handle to the
 * destination or the just-written tmp file. These self-resolve after a few ms,
 * so a short backoff retry makes the atomic write robust instead of failing one
 * flush and leaving the tmp behind (the recurring "[desktop-storage] EPERM
 * rename async-flush" noise on Windows).
 */
const RENAME_RETRY_CODES = new Set(['EPERM', 'EBUSY', 'EACCES'])
const RENAME_RETRY_ATTEMPTS = 6

function renameRetryDelay(attempt: number): number {
  // 25ms, 100ms, 225ms, 400ms, 625ms, ... (quadratic backoff)
  return 25 * (attempt + 1) * (attempt + 1)
}

async function renameWithRetry(src: string, dest: string): Promise<void> {
  let lastError: unknown
  for (let i = 0; i < RENAME_RETRY_ATTEMPTS; i++) {
    try {
      await rename(src, dest)
      return
    } catch (error) {
      lastError = error
      const code = (error as NodeJS.ErrnoException)?.code
      if (!RENAME_RETRY_CODES.has(code ?? '')) throw error
      await new Promise(resolve => setTimeout(resolve, renameRetryDelay(i)))
    }
  }
  throw lastError
}

function renameSyncWithRetry(src: string, dest: string): void {
  let lastError: unknown
  // SharedArrayBuffer + Atomics.wait gives a dependency-free synchronous sleep
  // in the Electron main process (used on the before-quit path).
  const waitBuf = typeof SharedArrayBuffer !== 'undefined' ? new Int32Array(new SharedArrayBuffer(4)) : null
  for (let i = 0; i < RENAME_RETRY_ATTEMPTS; i++) {
    try {
      renameSync(src, dest)
      return
    } catch (error) {
      lastError = error
      const code = (error as NodeJS.ErrnoException)?.code
      if (!RENAME_RETRY_CODES.has(code ?? '')) throw error
      if (waitBuf) Atomics.wait(waitBuf, 0, 0, renameRetryDelay(i))
    }
  }
  throw lastError
}

/** Remove a tmp file, tolerating a missing or still-locked file. */
async function cleanupTmp(path: string): Promise<void> {
  try {
    await unlink(path)
  } catch { /* tmp already gone or still locked; harmless */ }
}

export type DesktopStorageAction =
  | { type: 'set'; key: string; val: string }
  | { type: 'remove'; key: string }
  | { type: 'clear' }

export interface DesktopStorageOptions {
  debounceMs?: number
  onError?: (error: Error, context: string) => void
}

export class DesktopStorageManager {
  private memoryStore: Map<string, string> = new Map()
  private filePath: string
  private debounceMs: number
  private flushTimer?: NodeJS.Timeout
  private isDirty = false
  private onError?: (error: Error, context: string) => void

  constructor(profileDirectory: string, options: DesktopStorageOptions = {}) {
    this.filePath = join(profileDirectory, STORAGE_FILENAME)
    this.debounceMs = options.debounceMs ?? 200
    this.onError = options.onError
    this.loadFromDiskSync()
  }

  getStorageFilePath(): string {
    return this.filePath
  }

  /**
   * Returns a snapshot of all stored keys and values.
   */
  getAll(): Record<string, string> {
    const result: Record<string, string> = {}
    for (const [key, value] of this.memoryStore.entries()) {
      result[key] = value
    }
    return result
  }

  getItem(key: string): string | null {
    return this.memoryStore.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    const stringKey = String(key)
    const stringVal = String(value)
    if (this.memoryStore.get(stringKey) === stringVal) return
    this.memoryStore.set(stringKey, stringVal)
    this.markDirty()
  }

  removeItem(key: string): void {
    const stringKey = String(key)
    if (!this.memoryStore.has(stringKey)) return
    this.memoryStore.delete(stringKey)
    this.markDirty()
  }

  clear(): void {
    if (this.memoryStore.size === 0) return
    this.memoryStore.clear()
    this.markDirty()
  }

  applyAction(action: DesktopStorageAction): void {
    switch (action.type) {
      case 'set':
        this.setItem(action.key, action.val)
        break
      case 'remove':
        this.removeItem(action.key)
        break
      case 'clear':
        this.clear()
        break
    }
  }

  /**
   * Switch the storage manager to a new profile directory.
   * Flushes any pending changes for the previous profile first.
   */
  switchProfile(profileDirectory: string): void {
    this.flushSync()
    this.filePath = join(profileDirectory, STORAGE_FILENAME)
    this.memoryStore.clear()
    this.loadFromDiskSync()
  }

  /**
   * Flushes any dirty state asynchronously.
   */
  async flush(): Promise<void> {
    if (this.flushTimer !== undefined) {
      clearTimeout(this.flushTimer)
      this.flushTimer = undefined
    }
    if (!this.isDirty) return

    this.isDirty = false
    const serialized = JSON.stringify(this.getAll(), null, 2)
    const tmpPath = `${this.filePath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`

    try {
      await mkdir(dirname(this.filePath), { recursive: true })
      await writeFile(tmpPath, serialized, 'utf8')
      await renameWithRetry(tmpPath, this.filePath)
    } catch (error) {
      this.isDirty = true
      await cleanupTmp(tmpPath)
      this.handleError(error, 'async-flush')
    }
  }

  /**
   * Flushes any dirty state synchronously (e.g., during app before-quit or window close).
   */
  flushSync(): void {
    if (this.flushTimer !== undefined) {
      clearTimeout(this.flushTimer)
      this.flushTimer = undefined
    }
    if (!this.isDirty) return

    this.isDirty = false
    const serialized = JSON.stringify(this.getAll(), null, 2)
    const tmpPath = `${this.filePath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`

    try {
      mkdirSync(dirname(this.filePath), { recursive: true })
      writeFileSync(tmpPath, serialized, 'utf8')
      renameSyncWithRetry(tmpPath, this.filePath)
    } catch (error) {
      this.isDirty = true
      try {
        if (existsSync(tmpPath)) unlinkSync(tmpPath)
      } catch {}
      this.handleError(error, 'sync-flush')
    }
  }

  private markDirty(): void {
    this.isDirty = true
    if (this.flushTimer !== undefined) return
    this.flushTimer = setTimeout(() => {
      this.flushTimer = undefined
      void this.flush()
    }, this.debounceMs)
  }

  private loadFromDiskSync(): void {
    this.isDirty = false
    if (!existsSync(this.filePath)) {
      return
    }

    try {
      const raw = readFileSync(this.filePath, 'utf8').trim()
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        for (const [k, v] of Object.entries(parsed)) {
          if (typeof v === 'string') {
            this.memoryStore.set(k, v)
          } else {
            this.memoryStore.set(k, String(v))
          }
        }
      }
    } catch (error) {
      this.handleError(error, 'load-from-disk')
    }
  }

  private handleError(error: unknown, context: string): void {
    const err = error instanceof Error ? error : new Error(String(error))
    if (this.onError) {
      this.onError(err, context)
    }
  }
}
