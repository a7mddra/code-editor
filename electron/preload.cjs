const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
  readFile: (filePath) => ipcRenderer.invoke('file:read', filePath),
  saveFile: (filePath, content) => ipcRenderer.invoke('file:save', { filePath, content }),
  saveFileAs: (defaultName, content) => ipcRenderer.invoke('file:saveAs', { defaultName, content }),
  windowAction: (action) => ipcRenderer.invoke(`window:${action}`),
  getInitialFile: () => ipcRenderer.invoke('app:getInitialFile'),
  onOpenInitialFile: (callback) => {
    const listener = (_, data) => callback(data);
    ipcRenderer.on('app:openInitialFile', listener);
    return () => ipcRenderer.removeListener('app:openInitialFile', listener);
  },
  isElectron: true
});
