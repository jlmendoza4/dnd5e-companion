const { app, BrowserWindow, dialog, ipcMain, safeStorage } = require('electron')
const path = require('path')
const fs = require('fs')
const { pathToFileURL } = require('url')
const { autoUpdater } = require('electron-updater')

let mainWindow = null

function getDesktopConfigPath() {
  return path.join(app.getPath('userData'), 'desktop-config.json')
}

function getSharedCharactersPath() {
  if (!app.isPackaged) {
    return path.join(app.getAppPath(), 'public', 'characters.shared.json')
  }
  return path.join(app.getPath('userData'), 'shared-characters.json')
}

function readDesktopConfig() {
  try {
    const raw = fs.readFileSync(getDesktopConfigPath(), 'utf8')
    return JSON.parse(raw)
  } catch {
    return { ai: {} }
  }
}

function writeDesktopConfig(nextConfig) {
  fs.writeFileSync(getDesktopConfigPath(), JSON.stringify(nextConfig, null, 2), 'utf8')
}

function encodeSecret(value) {
  const normalized = String(value || '').trim()
  if (!normalized) return null

  if (safeStorage.isEncryptionAvailable()) {
    return {
      mode: 'safeStorage',
      value: safeStorage.encryptString(normalized).toString('base64'),
    }
  }

  return {
    mode: 'plain',
    value: normalized,
  }
}

function decodeSecret(entry) {
  if (!entry || !entry.value) return ''

  if (entry.mode === 'safeStorage' && safeStorage.isEncryptionAvailable()) {
    try {
      return safeStorage.decryptString(Buffer.from(entry.value, 'base64'))
    } catch {
      return ''
    }
  }

  return String(entry.value || '')
}

function readSharedCharactersState() {
  try {
    const raw = fs.readFileSync(getSharedCharactersPath(), 'utf8')
    const parsed = JSON.parse(raw)
    const characters = Array.isArray(parsed?.characters) ? parsed.characters : []
    const activeId = typeof parsed?.activeId === 'string' ? parsed.activeId : ''
    return { characters, activeId }
  } catch {
    return { characters: [], activeId: '' }
  }
}

function writeSharedCharactersState(nextState) {
  const targetPath = getSharedCharactersPath()
  fs.mkdirSync(path.dirname(targetPath), { recursive: true })
  const safeState = {
    characters: Array.isArray(nextState?.characters) ? nextState.characters : [],
    activeId: typeof nextState?.activeId === 'string' ? nextState.activeId : '',
  }
  fs.writeFileSync(targetPath, JSON.stringify(safeState, null, 2), 'utf8')
}

function registerDesktopSettingsHandlers() {
  ipcMain.handle('dnd:ai-config:load', () => {
    const config = readDesktopConfig()
    return {
      apiKey: decodeSecret(config.ai?.apiKey),
      endpoint: config.ai?.endpoint || '',
      model: config.ai?.model || '',
    }
  })

  ipcMain.handle('dnd:ai-config:save', (_, payload) => {
    const current = readDesktopConfig()
    const next = {
      ...current,
      ai: {
        apiKey: encodeSecret(payload?.apiKey),
        endpoint: String(payload?.endpoint || ''),
        model: String(payload?.model || ''),
      },
    }
    writeDesktopConfig(next)
    return true
  })

  ipcMain.handle('dnd:ai-config:clear-key', () => {
    const current = readDesktopConfig()
    const next = {
      ...current,
      ai: {
        ...current.ai,
        apiKey: null,
      },
    }
    writeDesktopConfig(next)
    return true
  })

  ipcMain.handle('dnd:characters:load', () => {
    return readSharedCharactersState()
  })

  ipcMain.handle('dnd:characters:save', (_, payload) => {
    writeSharedCharactersState(payload)
    return true
  })
}

function setupAutoUpdater() {
  if (!app.isPackaged) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('error', (error) => {
    console.error('Auto-update error:', error)
  })

  autoUpdater.on('update-downloaded', async (info) => {
    if (!mainWindow) {
      autoUpdater.quitAndInstall()
      return
    }

    const result = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      buttons: ['Reiniciar ahora', 'Luego'],
      defaultId: 0,
      cancelId: 1,
      title: 'Actualización lista',
      message: `Se ha descargado la versión ${info?.version || 'nueva'} de D&D 5e Companion.`,
      detail: 'La aplicación debe reiniciarse para instalar la actualización.'
    })

    if (result.response === 0) {
      autoUpdater.quitAndInstall()
    }
  })

  autoUpdater.checkForUpdatesAndNotify().catch((error) => {
    console.error('Auto-update check failed:', error)
  })
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    icon: path.join(__dirname, '../public/favicon.ico'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    title: 'D&D 5e Companion',
  })

  mainWindow = win
  win.on('closed', () => {
    if (mainWindow === win) mainWindow = null
  })

  if (app.isPackaged) {
    win.loadURL(pathToFileURL(path.join(__dirname, '../dist/index.html')).href)
  } else {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  }
}

app.whenReady().then(() => {
  registerDesktopSettingsHandlers()
  createWindow()
  setupAutoUpdater()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})