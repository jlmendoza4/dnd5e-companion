const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('dndDesktopSettings', {
  loadAIConfig: () => ipcRenderer.invoke('dnd:ai-config:load'),
  saveAIConfig: (config) => ipcRenderer.invoke('dnd:ai-config:save', config),
  clearAIKey: () => ipcRenderer.invoke('dnd:ai-config:clear-key'),
})