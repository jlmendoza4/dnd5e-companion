const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('dndDesktopSettings', {
  loadAIConfig: () => ipcRenderer.invoke('dnd:ai-config:load'),
  saveAIConfig: (config) => ipcRenderer.invoke('dnd:ai-config:save', config),
  clearAIKey: () => ipcRenderer.invoke('dnd:ai-config:clear-key'),
})

contextBridge.exposeInMainWorld('dndDesktopCharacters', {
  loadSharedState: () => ipcRenderer.invoke('dnd:characters:load'),
  saveSharedState: (state) => ipcRenderer.invoke('dnd:characters:save', state),
})