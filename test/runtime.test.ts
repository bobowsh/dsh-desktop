import { describe, expect, it } from 'vitest'
import {
  buildHarnessArguments,
  buildHarnessSpawnOptions,
  buildNodeArguments,
  formatExitCode
} from '../src/main/runtime/harness-runtime'
import { canGrantWindowPermission, isTrustedAppUrl } from '../src/main/security-policy'
import {
  isAbortedNavigationError,
  shouldLoadHarnessUrl
} from '../src/main/window-navigation'

describe('Harness launch contract', () => {
  it('binds the web server to a random loopback port', () => {
    expect(buildHarnessArguments(43127)).toEqual([
      'web',
      '--host',
      '127.0.0.1',
      '--port',
      '43127'
    ])
  })

  it('applies the desktop composition patch before web arguments', () => {
    expect(buildHarnessArguments(43127, 'C:\\app\\dsh-desktop.patch.yml')).toEqual([
      'web',
      '--patch',
      'C:\\app\\dsh-desktop.patch.yml',
      '--host',
      '127.0.0.1',
      '--port',
      '43127'
    ])
  })

  it('strips ELECTRON_RUN_AS_NODE when launching the bundled Node.js runtime', () => {
    const options = buildHarnessSpawnOptions(
      'C:\\Users\\tester\\AppData\\Roaming\\dsh-desktop\\launch-root',
      'C:\\Users\\tester\\AppData\\Roaming\\dsh-desktop\\harness',
      'win32',
      {
        ELECTRON_RUN_AS_NODE: '1',
        PATH: 'fallback-path',
        Path: 'windows-path'
      },
      false
    )

    expect(options).toMatchObject({
      cwd: 'C:\\Users\\tester\\AppData\\Roaming\\dsh-desktop\\launch-root',
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
      env: {
        NO_COLOR: '1',
        Path: 'windows-path'
      }
    })
    expect(options.env).not.toHaveProperty('ELECTRON_RUN_AS_NODE')
  })

  it('injects ELECTRON_RUN_AS_NODE=1 when reusing the Electron binary as Node.js', () => {
    const options = buildHarnessSpawnOptions(
      'C:\\Users\\tester\\AppData\\Roaming\\dsh-desktop\\launch-root',
      'C:\\Users\\tester\\AppData\\Roaming\\dsh-desktop\\harness',
      'win32',
      {
        PATH: 'fallback-path',
        Path: 'windows-path'
      },
      true
    )

    expect(options).toMatchObject({
      cwd: 'C:\\Users\\tester\\AppData\\Roaming\\dsh-desktop\\launch-root',
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
      env: {
        NO_COLOR: '1',
        ELECTRON_RUN_AS_NODE: '1',
        Path: 'windows-path'
      }
    })
  })

  it('passes the internal-loader flag directly to bundled Node.js', () => {
    expect(
      buildNodeArguments(
        'C:\\app\\harness-node-entry.mjs',
        'C:\\app\\dsh\\lib\\bin.js',
        43127,
        'C:\\app\\dsh-desktop.patch.yml'
      )
    ).toEqual([
      '--expose-internals',
      'C:\\app\\harness-node-entry.mjs',
      'C:\\app\\dsh\\lib\\bin.js',
      'web',
      '--patch',
      'C:\\app\\dsh-desktop.patch.yml',
      '--host',
      '127.0.0.1',
      '--port',
      '43127'
    ])
  })

  it('makes native Windows termination codes diagnosable', () => {
    expect(formatExitCode(4294930435)).toContain(
      '0xFFFF7003, Crashpad handler unavailable'
    )
  })
})

describe('navigation trust boundary', () => {
  it('only trusts the launcher and loopback HTTP pages', () => {
    expect(isTrustedAppUrl('file:///app/index.html')).toBe(true)
    expect(isTrustedAppUrl('http://127.0.0.1:43127')).toBe(true)
    expect(isTrustedAppUrl('http://localhost:43127')).toBe(true)
    expect(isTrustedAppUrl('https://127.0.0.1:43127')).toBe(false)
    expect(isTrustedAppUrl('http://example.com')).toBe(false)
    expect(isTrustedAppUrl('javascript:alert(1)')).toBe(false)
  })

  it('only grants clipboard writes from the trusted main frame', () => {
    expect(
      canGrantWindowPermission(
        'clipboard-sanitized-write',
        'http://127.0.0.1:43127/session',
        true
      )
    ).toBe(true)
    expect(
      canGrantWindowPermission(
        'clipboard-sanitized-write',
        'http://localhost:43127/session',
        true
      )
    ).toBe(true)
    expect(
      canGrantWindowPermission('clipboard-read', 'http://127.0.0.1:43127/session', true)
    ).toBe(false)
    expect(
      canGrantWindowPermission(
        'clipboard-sanitized-write',
        'http://127.0.0.1:43127/session',
        false
      )
    ).toBe(false)
    expect(
      canGrantWindowPermission(
        'clipboard-sanitized-write',
        'https://example.com/session',
        true
      )
    ).toBe(false)
    expect(
      canGrantWindowPermission('clipboard-sanitized-write', 'file:///tmp/app.html', true)
    ).toBe(false)
  })
})

describe('Harness window activation', () => {
  it('preserves the current page when the existing Harness instance is focused again', () => {
    expect(
      shouldLoadHarnessUrl(
        'http://127.0.0.1:43127/settings/models',
        'http://127.0.0.1:43127'
      )
    ).toBe(false)
  })

  it('loads the page for a new window or a restarted Harness instance', () => {
    expect(shouldLoadHarnessUrl('about:blank', 'http://127.0.0.1:43127')).toBe(true)
    expect(
      shouldLoadHarnessUrl('http://127.0.0.1:43127/settings', 'http://127.0.0.1:43128')
    ).toBe(true)
  })

  it('recognizes Electron navigation cancellation without hiding other load failures', () => {
    expect(isAbortedNavigationError({ code: 'ERR_ABORTED', errno: -3 })).toBe(true)
    expect(
      isAbortedNavigationError(
        new Error("ERR_ABORTED (-3) loading 'http://127.0.0.1:43127/'")
      )
    ).toBe(true)
    expect(isAbortedNavigationError({ code: 'ERR_CONNECTION_REFUSED', errno: -102 })).toBe(
      false
    )
  })
})
