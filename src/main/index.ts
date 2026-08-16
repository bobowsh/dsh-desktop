import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'
import {
  app,
  BrowserWindow,
  dialog,
  Menu,
  nativeTheme,
  shell,
  type MessageBoxOptions
} from 'electron'
import { HarnessRuntime } from './runtime/harness-runtime'
import { secureWindow } from './security'
import { ensureLaunchRoot } from './state/launch-root'
import { isAbortedNavigationError, shouldLoadHarnessUrl } from './window-navigation'
import {
  checkForUpdates,
  registerUpdateHandlers,
  startUpdateManager,
  stopUpdateManager
} from './update/update-manager'
import type { RuntimeSnapshot } from '../shared/contracts'

let mainWindow: BrowserWindow | undefined
let runtime: HarnessRuntime
let launchDirectory: string

function windowTitle(): string {
  return `DeepSeek Harness Desktop V${app.getVersion()}`
}
let quitting = false
let failureDialogVisible = false

function isDevelopmentBuild(): boolean {
  if (!app.isPackaged) return true

  try {
    const metadata = JSON.parse(
      readFileSync(join(app.getAppPath(), 'package.json'), 'utf8')
    ) as { dshDesktopChannel?: unknown }
    return metadata.dshDesktopChannel === 'development'
  } catch {
    return false
  }
}

const developmentBuild = isDevelopmentBuild()

function configureAppIdentity(): void {
  if (developmentBuild) {
    app.setName('DSH Desktop Dev')
    app.setPath('userData', join(app.getPath('appData'), 'dsh-desktop-dev'))
    return
  }

  app.setName('DSH Desktop')
  // Keep the historical lowercase directory stable across product-name and
  // branding changes. Harness stores workspaces, sessions, credentials, and
  // custom presets below userData, so deriving this path from app.getName()
  // would make an ordinary upgrade look like a fresh installation.
  app.setPath('userData', join(app.getPath('appData'), 'dsh-desktop'))
}

async function syncNativeTheme(window: BrowserWindow): Promise<void> {
  if (window.isDestroyed()) return

  // The sidebar already reserves enough room for macOS traffic lights. Read
  // Harness's resolved theme before showing the window so the native surface
  // matches the first rendered frame. The transparent drag strip restores the
  // native window gesture without adding a visual titlebar or covering the
  // traffic lights and right-side header actions.
  const isDark = await window.webContents.executeJavaScript(
    `(() => {
      if (${process.platform === 'darwin'}) {
        let dragRegion = document.getElementById('dsh-desktop-drag-region')
        if (!dragRegion) {
          dragRegion = document.createElement('div')
          dragRegion.id = 'dsh-desktop-drag-region'
          dragRegion.setAttribute('aria-hidden', 'true')
          Object.assign(dragRegion.style, {
            position: 'fixed',
            zIndex: '18',
            top: '0',
            left: '80px',
            right: '220px',
            height: '24px',
            background: 'transparent',
            pointerEvents: 'auto',
            userSelect: 'none'
          })
          dragRegion.style.setProperty('-webkit-app-region', 'drag')
          document.body.appendChild(dragRegion)
        }
      }
      return document.body.hasAttribute('data-ds-dark-theme')
    })()`
  )
  window.setBackgroundColor(isDark ? '#141416' : '#ffffff')
}

function dshEntryPath(): string {
  if (app.isPackaged) {
    return join(
      process.resourcesPath,
      'app',
      'node_modules',
      '@deepseek-ai',
      'dsh',
      'lib',
      'bin.js'
    )
  }
  return join(app.getAppPath(), 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js')
}

interface HarnessNodeRuntime {
  executablePath: string
  /** True when the Harness child reuses the Electron binary as its Node.js runtime. */
  useElectronRuntime: boolean
}

// Prefer reusing the running Electron binary as the Harness Node.js runtime so we
// do not pay for a second standalone Node process. Fall back to the bundled
// node_modules/node runtime when the Electron executable is unavailable (or when
// running unpackaged in an environment where execPath is not the app binary).
function harnessNodeRuntime(): HarnessNodeRuntime {
  const executable = process.platform === 'win32' ? 'node.exe' : 'node'
  const bundled = join(app.getAppPath(), 'node_modules', 'node', 'bin', executable)
  if (process.execPath && existsSync(process.execPath)) {
    return { executablePath: process.execPath, useElectronRuntime: true }
  }
  return { executablePath: bundled, useElectronRuntime: false }
}

function harnessNodeEntryPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'harness-node-entry.mjs')
    : join(app.getAppPath(), 'build', 'harness-node-entry.mjs')
}

function desktopResourcePath(name: string): string {
  return app.isPackaged ? join(process.resourcesPath, name) : join(app.getAppPath(), 'build', name)
}

function desktopIconPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'icon.png')
    : join(app.getAppPath(), 'build', 'app-icon.png')
}

function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1380,
    height: 900,
    minWidth: 900,
    minHeight: 640,
    show: false,
    title: windowTitle(),
    icon: desktopIconPath(),
    frame: process.platform !== 'darwin',
    autoHideMenuBar: process.platform !== 'darwin',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#141416' : '#f8f8f6',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: join(import.meta.dirname, '../preload/index.cjs'),
      sandbox: true,
      webSecurity: true
    }
  })
  if (process.platform === 'darwin') {
    window.setWindowButtonVisibility(true)
    window.setWindowButtonPosition({ x: 12, y: 9 })
  }
  window.on('page-title-updated', (event) => {
    event.preventDefault()
    window.setTitle(windowTitle())
  })
  secureWindow(window)
  window.on('closed', () => {
    if (mainWindow === window) mainWindow = undefined
  })
  mainWindow = window
  return window
}

async function openHarness(url: string): Promise<void> {
  const window = mainWindow && !mainWindow.isDestroyed() ? mainWindow : createWindow()
  if (shouldLoadHarnessUrl(window.webContents.getURL(), url)) {
    try {
      await window.loadURL(url)
    } catch (error) {
      if (isAbortedNavigationError(error)) return
      throw error
    }
  }
  if (runtime.snapshot().url !== url || window.isDestroyed()) return
  await syncNativeTheme(window)
  if (window.isMinimized()) window.restore()
  window.show()
  window.focus()
}

async function showSplash(): Promise<void> {
  const window = mainWindow && !mainWindow.isDestroyed() ? mainWindow : createWindow()
  await window.loadFile(desktopResourcePath('splash.html'))
  if (window.isDestroyed()) return
  window.show()
  window.focus()
}

async function launchHarness(): Promise<void> {
  await showSplash()
  await runtime.start(launchDirectory)
}

function showUnexpectedError(error: unknown): void {
  const message = error instanceof Error ? error.stack ?? error.message : String(error)
  dialog.showErrorBox('DSH Desktop encountered an error', message)
}

async function showRuntimeFailure(snapshot: RuntimeSnapshot): Promise<void> {
  if (failureDialogVisible || quitting) return
  failureDialogVisible = true

  try {
    while (!quitting && runtime.snapshot().phase === 'failed') {
      const options: MessageBoxOptions = {
        type: 'error',
        title: 'Harness could not start',
        message: snapshot.message,
        detail: snapshot.launchDirectory
          ? `Launch directory: ${snapshot.launchDirectory}\n\nYou can retry or inspect the Harness log.`
          : 'You can retry or inspect the Harness log.',
        buttons: ['Retry', 'Show Log', 'Quit'],
        defaultId: 0,
        cancelId: 2,
        noLink: true
      }
      const result = mainWindow
        ? await dialog.showMessageBox(mainWindow, options)
        : await dialog.showMessageBox(options)

      if (result.response === 0) {
        await launchHarness()
      } else if (result.response === 1) {
        shell.showItemInFolder(join(app.getPath('logs'), 'harness.log'))
        continue
      } else {
        app.quit()
      }

      if (runtime.snapshot().phase !== 'failed') return
      snapshot = runtime.snapshot()
    }
  } catch (error) {
    showUnexpectedError(error)
  } finally {
    failureDialogVisible = false
  }
}

function installMenu(): void {
  const checkForUpdatesLabel = app.getLocale().toLowerCase().startsWith('zh')
    ? '检查更新…'
    : 'Check for Updates…'
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(process.platform === 'darwin'
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              {
                label: checkForUpdatesLabel,
                accelerator: 'CmdOrCtrl+U',
                click: () => void checkForUpdates(true).catch(showUnexpectedError)
              },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const }
            ]
          }
        ]
      : []),
    {
      label: 'Harness',
      submenu: [
        {
          label: 'Restart Harness',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => void launchHarness().catch(showUnexpectedError)
        },
        {
          label: 'Show Harness Log',
          click: () => shell.showItemInFolder(join(app.getPath('logs'), 'harness.log'))
        },
        ...(process.platform === 'darwin'
          ? []
          : [
              { type: 'separator' as const },
              {
                label: checkForUpdatesLabel,
                accelerator: 'CmdOrCtrl+U',
                click: () => void checkForUpdates(true).catch(showUnexpectedError)
              }
            ]),
        ...(process.platform === 'darwin'
          ? []
          : [{ type: 'separator' as const }, { role: 'quit' as const }])
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    { label: 'Window', submenu: [{ role: 'minimize' }, { role: 'close' }] }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

async function bootstrap(): Promise<void> {
  if (process.platform === 'darwin') app.dock?.setIcon(desktopIconPath())
  launchDirectory = await ensureLaunchRoot(app.getPath('userData'))
  registerUpdateHandlers()
  createWindow()
  const nodeRuntime = harnessNodeRuntime()
  runtime = new HarnessRuntime({
    dshEntryPath: dshEntryPath(),
    nodeExecutablePath: nodeRuntime.executablePath,
    useElectronRuntime: nodeRuntime.useElectronRuntime,
    nodeEntryPath: harnessNodeEntryPath(),
    dshPatchPath: desktopResourcePath('dsh-desktop.patch.yml'),
    dshHome: join(app.getPath('userData'), 'harness'),
    logPath: join(app.getPath('logs'), 'harness.log'),
    launchProcess: (executablePath, args, options) => spawn(executablePath, args, options),
    onChanged: (snapshot) => {
      if (snapshot.phase === 'ready' && snapshot.url) {
        void openHarness(snapshot.url).catch(showUnexpectedError)
      } else if (snapshot.phase === 'failed') {
        void showRuntimeFailure(snapshot)
      }
    }
  })
  installMenu()
  await launchHarness()
  if (!developmentBuild) {
    startUpdateManager({
      prepareToInstall: async () => {
        await runtime.stop()
        quitting = true
        stopUpdateManager()
      }
    })
  }
}

configureAppIdentity()
const singleInstance = app.requestSingleInstanceLock()
if (!singleInstance) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const snapshot = runtime?.snapshot()
    if (snapshot?.phase === 'ready' && snapshot.url) {
      void openHarness(snapshot.url).catch(showUnexpectedError)
    }
  })
  app.whenReady().then(bootstrap).catch((error: unknown) => {
    showUnexpectedError(error)
    app.quit()
  })
  app.on('activate', () => {
    const snapshot = runtime?.snapshot()
    if (snapshot?.phase === 'ready' && snapshot.url) {
      void openHarness(snapshot.url).catch(showUnexpectedError)
    } else if (snapshot?.phase === 'idle') {
      void launchHarness().catch(showUnexpectedError)
    }
  })
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
  app.on('before-quit', (event) => {
    if (quitting || !runtime) return
    event.preventDefault()
    quitting = true
    stopUpdateManager()
    void runtime.stop().finally(() => app.quit())
  })
}
