const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
  readFile: (filePath) => ipcRenderer.invoke('file:read', filePath),
  saveFile: (filePath, content) => ipcRenderer.invoke('file:save', { filePath, content }),
  saveFileAs: (defaultName, content) => ipcRenderer.invoke('file:saveAs', { defaultName, content }),
  windowAction: (action) => ipcRenderer.invoke(`window:${action}`),
  showFileMenu: (bounds) => ipcRenderer.invoke('menu:showFile', bounds),
  showEditMenu: (bounds) => ipcRenderer.invoke('menu:showEdit', bounds),
  showViewMenu: (args) => ipcRenderer.invoke('menu:showView', args),
  onMenuAction: (callback) => {
    const listener = (_, action) => callback(action);
    ipcRenderer.on('menu:action', listener);
    return () => ipcRenderer.removeListener('menu:action', listener);
  },
  getInitialFile: () => ipcRenderer.invoke('app:getInitialFile'),
  onOpenInitialFile: (callback) => {
    const listener = (_, data) => callback(data);
    ipcRenderer.on('app:openInitialFile', listener);
    return () => ipcRenderer.removeListener('app:openInitialFile', listener);
  },
  isElectron: true
});
