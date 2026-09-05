import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
  readFile: (filePath: string) => ipcRenderer.invoke('file:read', filePath),
  saveFile: (filePath: string, content: string) => ipcRenderer.invoke('file:save', { filePath, content }),
  saveFileAs: (defaultName: string, content: string) => ipcRenderer.invoke('file:saveAs', { defaultName, content }),

  showFileMenu: (bounds: { x: number, y: number }) => ipcRenderer.invoke('menu:showFile', bounds),
  showEditMenu: (bounds: { x: number, y: number }) => ipcRenderer.invoke('menu:showEdit', bounds),
  showViewMenu: (args: any) => ipcRenderer.invoke('menu:showView', args),
  onMenuAction: (callback: (action: string) => void) => {
    const listener = (_: any, action: string) => callback(action);
    ipcRenderer.on('menu:action', listener);
    return () => ipcRenderer.removeListener('menu:action', listener);
  },
  getInitialFile: () => ipcRenderer.invoke('app:getInitialFile'),
  onOpenInitialFile: (callback: (data: any) => void) => {
    const listener = (_: any, data: any) => callback(data);
    ipcRenderer.on('app:openInitialFile', listener);
    return () => ipcRenderer.removeListener('app:openInitialFile', listener);
  },
  isElectron: true
});
