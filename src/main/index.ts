import { existsSync } from 'node:fs'
import { join } from 'node:path'
import {
  app,
  BrowserWindow,
  dialog,
  Menu,
  shell,
  type MessageBoxOptions
} from 'electron'
import { HarnessRuntime } from './runtime/harness-runtime'
import { secureWindow } from './security'
import { AppSettingsStore } from './state/app-settings'
import type { RuntimeSnapshot } from '../shared/contracts'

let mainWindow: BrowserWindow | undefined
let runtime: HarnessRuntime
let settings: AppSettingsStore
let quitting = false
let failureDialogVisible = false

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

function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1380,
    height: 900,
    minWidth: 900,
    minHeight: 640,
    show: false,
    title: '',
    backgroundColor: '#f8f8f6',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  })
  window.on('page-title-updated', (event) => {
    event.preventDefault()
    window.setTitle('')
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
  await window.loadURL(url)
  if (runtime.snapshot().url !== url || window.isDestroyed()) return
  window.show()
  window.focus()
}

async function launchWorkspace(workspace: string): Promise<void> {
  if (!existsSync(workspace)) throw new Error(`Workspace does not exist: ${workspace}`)
  mainWindow?.hide()
  await settings.rememberWorkspace(workspace)
  installMenu()
  await runtime.start(workspace)
}

async function chooseWorkspace(quitWhenCanceled = false): Promise<string | undefined> {
  const options: Electron.OpenDialogOptions = {
    title: 'Choose a workspace',
    properties: ['openDirectory', 'createDirectory']
  }
  const result = mainWindow
    ? await dialog.showOpenDialog(mainWindow, options)
    : await dialog.showOpenDialog(options)
  const workspace = result.filePaths[0]
  if (result.canceled || !workspace) {
    if (quitWhenCanceled) app.quit()
    return undefined
  }
  await launchWorkspace(workspace)
  return workspace
}

function showUnexpectedError(error: unknown): void {
  const message = error instanceof Error ? error.stack ?? error.message : String(error)
  dialog.showErrorBox('DSH Desktop encountered an error', message)
}

function startWorkspaceFromUi(workspace: string): void {
  void launchWorkspace(workspace).catch(showUnexpectedError)
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
        detail: snapshot.workspace
          ? `Workspace: ${snapshot.workspace}\n\nYou can retry, choose another workspace, or inspect the Harness log.`
          : 'You can retry, choose another workspace, or inspect the Harness log.',
        buttons: ['Retry', 'Choose Workspace…', 'Show Log', 'Quit'],
        defaultId: 0,
        cancelId: 3,
        noLink: true
      }
      const result = mainWindow
        ? await dialog.showMessageBox(mainWindow, options)
        : await dialog.showMessageBox(options)

      if (result.response === 0 && snapshot.workspace) {
        await launchWorkspace(snapshot.workspace)
      } else if (result.response === 1) {
        await chooseWorkspace()
      } else if (result.response === 2) {
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
  const recentItems: Electron.MenuItemConstructorOptions[] = settings.recentWorkspaces.length
    ? settings.recentWorkspaces.map((workspace) => ({
        label: workspace,
        click: () => startWorkspaceFromUi(workspace)
      }))
    : [{ label: 'No Recent Workspaces', enabled: false }]

  const template: Electron.MenuItemConstructorOptions[] = [
    ...(process.platform === 'darwin'
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
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
      label: 'Workspace',
      submenu: [
        {
          label: 'Open Workspace…',
          accelerator: 'CmdOrCtrl+O',
          click: () => void chooseWorkspace().catch(showUnexpectedError)
        },
        { label: 'Open Recent', submenu: recentItems },
        {
          label: 'Restart Harness',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => {
            const workspace = runtime.snapshot().workspace ?? settings.lastWorkspace
            if (workspace) startWorkspaceFromUi(workspace)
          }
        },
        {
          label: 'Show Harness Log',
          click: () => shell.showItemInFolder(join(app.getPath('logs'), 'harness.log'))
        },
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
  settings = new AppSettingsStore(join(app.getPath('userData'), 'desktop-settings.json'))
  await settings.load()
  createWindow()
  runtime = new HarnessRuntime({
    dshEntryPath: dshEntryPath(),
    dshHome: join(app.getPath('userData'), 'harness'),
    logPath: join(app.getPath('logs'), 'harness.log'),
    nodeExecutable: process.execPath,
    onChanged: (snapshot) => {
      if (snapshot.phase === 'ready' && snapshot.url) {
        void openHarness(snapshot.url).catch(showUnexpectedError)
      } else if (snapshot.phase === 'failed') {
        void showRuntimeFailure(snapshot)
      }
    }
  })
  installMenu()

  if (settings.lastWorkspace) {
    await launchWorkspace(settings.lastWorkspace)
  } else {
    await chooseWorkspace(true)
  }
}

const singleInstance = app.requestSingleInstanceLock()
if (!singleInstance) {
  app.quit()
} else {
  app.setName('DSH Desktop')
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
      void chooseWorkspace().catch(showUnexpectedError)
    }
  })
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
  app.on('before-quit', (event) => {
    if (quitting || !runtime) return
    event.preventDefault()
    quitting = true
    void runtime.stop().finally(() => app.quit())
  })
}
