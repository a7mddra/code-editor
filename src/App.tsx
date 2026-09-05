import React, { useEffect, useState } from 'react';
import { OpenedFile } from './types';
import { Ide } from './components/Ide';

import { initTextMateEngine, setTheme, THEME_LOADERS } from './textmate-engine';
import { getLanguageByFileName } from './languages';

const RECENT_FILES_KEY = 'monaco_ide_recent_files';
const THEME_STORAGE_KEY = 'monaco_ide_theme';

const defaultUntitled = (): OpenedFile => ({
  filePath: '',
  fileName: 'Untitled-1',
  extension: 'txt',
  content: '',
  size: 0,
  mtime: Date.now()
});

export const App: React.FC = () => {
  const [activeFile, setActiveFile] = useState<OpenedFile>(defaultUntitled());
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [theme, setCurrentTheme] = useState<string>(() => {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY) || 'vesper';
    } catch {
      return 'vesper';
    }
  });


  // Initialize engine & load recents
  useEffect(() => {
    initTextMateEngine(theme).catch((err) => {
      console.error('[App] Failed to initialize TextMate engine:', err);
    });



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
    console.log(`[Toast ${type.toUpperCase()}]: ${message}`);
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



  const openFileObject = (file: OpenedFile) => {
    console.log('[App] Opening file:', file.fileName, file.filePath);
    setActiveFile(file);
    setIsDirty(false);

    const lang = getLanguageByFileName(file.fileName);
    addToast(`Opened ${file.fileName} (${lang.displayName})`, 'success');
  };

  // Save handler
  const handleSave = async (content: string) => {
    if (!activeFile) return;

    if (window.electronAPI && activeFile.filePath) {
      const res = await window.electronAPI.saveFile(activeFile.filePath, content);
      if (res.success) {
        setActiveFile((prev) => ({ ...prev, content }));
        setIsDirty(false);
        addToast(`Saved ${activeFile.fileName}`, 'success');
      } else {
        addToast(`Failed to save: ${res.error}`, 'error');
      }
    } else {
      setActiveFile((prev) => ({ ...prev, content }));
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

        addToast(`Saved as ${newFile.fileName}`, 'success');
      }
    }
  };

  // Close handler
  const handleClose = () => {
    setActiveFile(defaultUntitled());
    setIsDirty(false);
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
        handleClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isDirty, activeFile]);

  return (
    <div id="app">
      <Ide
        file={activeFile}
        isDirty={isDirty}
        theme={theme}
        onOpenFile={handleOpenFile}
        onSave={handleSave}
        onSaveAs={handleSaveAs}
        onClose={handleClose}
        onThemeChange={handleThemeChange}
        onDirtyChange={setIsDirty}
      />

    </div>
  );
};
