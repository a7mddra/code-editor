import React, { useEffect, useState } from 'react';
import { OpenedFile, RecentFile } from './types';
import { Home } from './components/Home';
import { Ide } from './components/Ide';
import { ConfirmModal } from './components/ConfirmModal';
import { ToastContainer, ToastItem } from './components/Toast';
import { initTextMateEngine, setTheme, THEME_LOADERS } from './textmate-engine';
import { getLanguageByFileName } from './languages';

const RECENT_FILES_KEY = 'monaco_ide_recent_files';
const THEME_STORAGE_KEY = 'monaco_ide_theme';

export const App: React.FC = () => {
  const [view, setView] = useState<'home' | 'ide'>('home');
  const [activeFile, setActiveFile] = useState<OpenedFile | null>(null);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [theme, setCurrentTheme] = useState<string>(() => {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY) || 'vesper';
    } catch {
      return 'vesper';
    }
  });
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [isConfirmOpen, setIsConfirmOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Initialize engine & load recents
  useEffect(() => {
    initTextMateEngine(theme).catch((err) => {
      console.error('[App] Failed to initialize TextMate engine:', err);
    });

    try {
      const saved = localStorage.getItem(RECENT_FILES_KEY);
      if (saved) {
        setRecentFiles(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load recent files:', e);
    }

    if (window.electronAPI?.getInitialFile) {
      window.electronAPI.getInitialFile().then((fileData) => {
        if (fileData && fileData.filePath && fileData.content !== undefined) {
          openFileObject({
            filePath: fileData.filePath,
            fileName: fileData.fileName || fileData.filePath.split(/[/\\]/).pop() || 'file',
            extension: fileData.extension || '',
            content: fileData.content,
            size: fileData.size,
            mtime: fileData.mtime
          });
        }
      });
    }

    if (window.electronAPI?.onOpenInitialFile) {
      const unsubscribe = window.electronAPI.onOpenInitialFile((fileData) => {
        if (fileData && fileData.filePath && fileData.content !== undefined) {
          openFileObject({
            filePath: fileData.filePath,
            fileName: fileData.fileName || fileData.filePath.split(/[/\\]/).pop() || 'file',
            extension: fileData.extension || '',
            content: fileData.content,
            size: fileData.size,
            mtime: fileData.mtime
          });
        }
      });
      return () => unsubscribe();
    }
  }, []);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  };

  const addRecent = (file: OpenedFile) => {
    setRecentFiles((prev) => {
      const filtered = prev.filter((f) => f.filePath !== file.filePath);
      const updated: RecentFile[] = [
        {
          filePath: file.filePath,
          fileName: file.fileName,
          extension: file.extension,
          size: file.size,
          lastOpened: Date.now()
        },
        ...filtered
      ].slice(0, 10);

      try {
        localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save recents:', e);
      }

      return updated;
    });
  };

  // Open file handler (dialog or specific path)
  const handleOpenFile = async (specifiedPath?: string) => {
    let result: any = null;

    if (specifiedPath && window.electronAPI) {
      result = await window.electronAPI.readFile(specifiedPath);
    } else if (window.electronAPI) {
      result = await window.electronAPI.openFileDialog();
    } else {
      // Fallback file picker for web testing
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '*/*';
      input.onchange = async (e: any) => {
        const file = e.target.files[0];
        if (file) {
          const content = await file.text();
          const ext = file.name.split('.').pop() || 'txt';
          openFileObject({
            filePath: file.name,
            fileName: file.name,
            extension: ext,
            content,
            size: file.size,
            mtime: file.lastModified
          });
        }
      };
      input.click();
      return;
    }

    if (!result || result.canceled) return;

    if (result.error) {
      addToast(`Error opening file: ${result.error}`, 'error');
      return;
    }

    openFileObject({
      filePath: result.filePath,
      fileName: result.fileName,
      extension: result.extension,
      content: result.content,
      size: result.size,
      mtime: result.mtime
    });
  };

  const handleFileDrop = async (file: File) => {
    const electronFilePath = (file as any).path;
    if (electronFilePath && window.electronAPI) {
      handleOpenFile(electronFilePath);
    } else {
      const content = await file.text();
      const ext = file.name.split('.').pop() || 'txt';
      openFileObject({
        filePath: file.name,
        fileName: file.name,
        extension: ext,
        content,
        size: file.size,
        mtime: file.lastModified
      });
    }
  };

  const openFileObject = (file: OpenedFile) => {
    console.log('[App] Opening file:', file.fileName, file.filePath);
    setActiveFile(file);
    setIsDirty(false);
    setView('ide');
    addRecent(file);
    const lang = getLanguageByFileName(file.fileName);
    addToast(`Opened ${file.fileName} (${lang.displayName})`, 'success');
  };

  // Save handler
  const handleSave = async (content: string) => {
    if (!activeFile) return;

    if (window.electronAPI && activeFile.filePath) {
      const res = await window.electronAPI.saveFile(activeFile.filePath, content);
      if (res.success) {
        setActiveFile((prev) => (prev ? { ...prev, content } : null));
        setIsDirty(false);
        addToast(`Saved ${activeFile.fileName}`, 'success');
      } else {
        addToast(`Failed to save: ${res.error}`, 'error');
      }
    } else {
      setActiveFile((prev) => (prev ? { ...prev, content } : null));
      setIsDirty(false);
      addToast(`Saved locally`, 'success');
    }
  };

  // Save As handler
  const handleSaveAs = async (content: string) => {
    if (!activeFile) return;

    if (window.electronAPI) {
      const res = await window.electronAPI.saveFileAs(activeFile.fileName, content);
      if (!res.canceled && res.success && res.filePath) {
        const newFile: OpenedFile = {
          filePath: res.filePath,
          fileName: res.fileName || activeFile.fileName,
          extension: res.extension || activeFile.extension,
          content,
          size: res.size,
          mtime: res.mtime
        };
        setActiveFile(newFile);
        setIsDirty(false);
        addRecent(newFile);
        addToast(`Saved as ${newFile.fileName}`, 'success');
      }
    }
  };

  // Close handler (checks dirty state)
  const handleClose = () => {
    if (isDirty) {
      setIsConfirmOpen(true);
    } else {
      setView('home');
      setActiveFile(null);
    }
  };

  const handleConfirmSave = async () => {
    setIsConfirmOpen(false);
    if (activeFile) {
      await handleSave(activeFile.content);
    }
    setView('home');
    setActiveFile(null);
    addToast(`Closed file`, 'info');
  };

  const handleConfirmDiscard = () => {
    setIsConfirmOpen(false);
    setIsDirty(false);
    setView('home');
    setActiveFile(null);
    addToast(`Closed without saving`, 'info');
  };

  const handleConfirmCancel = () => {
    setIsConfirmOpen(false);
  };

  const handleThemeChange = async (themeId: string) => {
    try {
      await setTheme(themeId);
      setCurrentTheme(themeId);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, themeId);
      } catch (e) {
        // ignore
      }
      addToast(`Theme: ${THEME_LOADERS[themeId]?.name || themeId}`, 'info');
    } catch (err) {
      console.error(err);
      addToast(`Failed to apply theme`, 'error');
    }
  };

  // Global keybindings
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        handleOpenFile();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        if (view === 'ide') {
          handleClose();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [view, isDirty, activeFile]);

  return (
    <div id="app">
      {view === 'home' ? (
        <Home
          onOpenFile={handleOpenFile}
          onFileDrop={handleFileDrop}
          recentFiles={recentFiles}
        />
      ) : activeFile ? (
        <Ide
          file={activeFile}
          isDirty={isDirty}
          theme={theme}
          onSave={handleSave}
          onSaveAs={handleSaveAs}
          onClose={handleClose}
          onThemeChange={handleThemeChange}
          onDirtyChange={setIsDirty}
        />
      ) : null}

      <ConfirmModal
        isOpen={isConfirmOpen}
        fileName={activeFile?.fileName || 'untitled.txt'}
        onSave={handleConfirmSave}
        onDiscard={handleConfirmDiscard}
        onCancel={handleConfirmCancel}
      />

      <ToastContainer toasts={toasts} />
    </div>
  );
};
