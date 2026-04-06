const { app, BrowserWindow } = require('electron')
const path = require('path')
const { pathToFileURL } = require('url')

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
    },
    title: 'D&D 5e Companion',
  })

  // En producción carga los archivos del build; en dev usa el servidor de Vite
  if (app.isPackaged) {
    win.loadURL(pathToFileURL(path.join(__dirname, '../dist/index.html')).href)
  } else {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
