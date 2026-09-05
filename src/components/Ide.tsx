import React, { useEffect, useRef, useState } from 'react';
import * as monaco from 'monaco-editor';
import {
  Save,
  Home as HomeIcon,
  X,
  FileCode,
  Files,
  Search,
  GitBranch,
  WrapText,
  Minimize2,
  Check,
  Disc
} from 'lucide-react';
import { OpenedFile } from '../types';
import { getLanguageByExtension } from '../languages';
import { THEME_LOADERS, wireLanguageGrammar, setTheme } from '../textmate-engine';

interface IdeProps {
  file: OpenedFile;
  isDirty: boolean;
  theme: string;
  onSave: (content: string) => void;
  onSaveAs: (content: string) => void;
  onClose: () => void;
  onThemeChange: (themeId: string) => void;
  onDirtyChange: (dirty: boolean) => void;
}

export const Ide: React.FC<IdeProps> = ({
  file,
  isDirty,
  theme,
  onSave,
  onSaveAs,
  onClose,
  onThemeChange,
  onDirtyChange
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const originalContentRef = useRef<string>(file.content);

  const [cursorPos, setCursorPos] = useState({ line: 1, column: 1, selectedLength: 0 });
  const [isWordWrap, setIsWordWrap] = useState(false);
  const [isMinimap, setIsMinimap] = useState(true);
  const [grammarLoaded, setGrammarLoaded] = useState(false);

  const langConfig = getLanguageByExtension(file.extension);

  // Initialize Monaco Editor and bind TextMate
  useEffect(() => {
    if (!containerRef.current) return;

    // Create editor instance
    const editor = monaco.editor.create(containerRef.current, {
      value: file.content,
      language: langConfig.languageId,
      theme: `tm-${theme}`,
      fontSize: 14,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace",
      fontLigatures: true,
      lineNumbers: 'on',
      renderWhitespace: 'selection',
      scrollBeyondLastLine: false,
      smoothScrolling: true,
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on',
      bracketPairColorization: { enabled: true },
      renderLineHighlight: 'all',
      tabSize: 2,
      wordWrap: 'off',
      automaticLayout: true,
      minimap: {
        enabled: isMinimap,
        renderCharacters: true,
        maxColumn: 120,
        showSlider: 'always',
        side: 'right'
      },
      padding: {
        top: 12,
        bottom: 12
      }
    });

    editorRef.current = editor;
    originalContentRef.current = file.content;

    // Hook TextMate grammar if available
    if (langConfig.scopeName) {
      wireLanguageGrammar(langConfig.languageId, langConfig.scopeName)
        .then((grammar) => {
          if (grammar) {
            setGrammarLoaded(true);
            // Refresh model language to trigger TextMate tokenizer
            const model = editor.getModel();
            if (model) {
              monaco.editor.setModelLanguage(model, langConfig.languageId);
            }
          }
        })
        .catch((err) => {
          console.warn('[TextMate] Fallback to standard tokenization:', err);
        });
    }

    // Cursor position tracking
    const cursorSub = editor.onDidChangeCursorPosition((e) => {
      const selection = editor.getSelection();
      let selectedLength = 0;
      if (selection && !selection.isEmpty()) {
        const model = editor.getModel();
        if (model) {
          selectedLength = model.getValueInRange(selection).length;
        }
      }
      setCursorPos({
        line: e.position.lineNumber,
        column: e.position.column,
        selectedLength
      });
    });

    // Model content tracking for dirty state
    const contentSub = editor.onDidChangeModelContent(() => {
      const currentVal = editor.getValue();
      const dirty = currentVal !== originalContentRef.current;
      onDirtyChange(dirty);
    });

    // Add Ctrl+S command
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onSave(editor.getValue());
      originalContentRef.current = editor.getValue();
      onDirtyChange(false);
    });

    // Add Ctrl+W command
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyW, () => {
      onClose();
    });

    return () => {
      cursorSub.dispose();
      contentSub.dispose();
      editor.dispose();
      editorRef.current = null;
    };
  }, [file.filePath]);

  // Update theme dynamically
  useEffect(() => {
    setTheme(theme)
      .then(() => {
        if (editorRef.current) {
          monaco.editor.setTheme(`tm-${theme}`);
        }
      })
      .catch(console.error);
  }, [theme]);

  // Handle external save
  const handleSaveClick = () => {
    if (editorRef.current) {
      const content = editorRef.current.getValue();
      onSave(content);
      originalContentRef.current = content;
      onDirtyChange(false);
    }
  };

  const handleSaveAsClick = () => {
    if (editorRef.current) {
      onSaveAs(editorRef.current.getValue());
    }
  };

  const handleToggleWrap = () => {
    if (editorRef.current) {
      const next = !isWordWrap;
      setIsWordWrap(next);
      editorRef.current.updateOptions({ wordWrap: next ? 'on' : 'off' });
    }
  };

  const handleToggleMinimap = () => {
    if (editorRef.current) {
      const next = !isMinimap;
      setIsMinimap(next);
      editorRef.current.updateOptions({ minimap: { enabled: next, renderCharacters: true } });
    }
  };

  // Breadcrumbs trail
  const breadcrumbs = file.filePath
    ? file.filePath.split(/[/\\]/).slice(-3).join(' › ')
    : file.fileName;

  return (
    <section id="ide-view">
      {/* Titlebar */}
      <div className="ide-titlebar">
        <div className="titlebar-left">
          <svg className="titlebar-app-icon" viewBox="0 0 24 24">
            <path d="M17.58 2.37L9.84 9.49 4.3 5.4 2 6.88l5.22 4.95L2 16.78l2.3 1.48 5.54-4.09 7.74 7.12 4.42-2.1V4.47l-4.42-2.1zm.42 16.48l-6.14-5.65 6.14-5.65v11.3z" />
          </svg>
          <div className="breadcrumbs">
            <span>myide</span>
            <span>›</span>
            <span className="breadcrumbs-trail" title={file.filePath}>
              {breadcrumbs}
            </span>
          </div>
        </div>

        <div className="titlebar-center">Monaco IDE - TextMate Powered</div>

        <div className="titlebar-right">
          <button
            className="win-btn"
            title="Minimize"
            onClick={() => window.electronAPI?.windowAction('minimize')}
          >
            −
          </button>
          <button
            className="win-btn"
            title="Maximize"
            onClick={() => window.electronAPI?.windowAction('maximize')}
          >
            □
          </button>
          <button
            className="win-btn close"
            title="Close"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="ide-workspace">
        {/* Activity Bar */}
        <aside className="activity-bar">
          <div className="activity-item active" title="Explorer">
            <Files size={20} />
          </div>
          <div className="activity-item" title="Search">
            <Search size={18} />
          </div>
          <div className="activity-item" title="Source Control">
            <GitBranch size={18} />
          </div>
        </aside>

        {/* Editor Main Column */}
        <div className="editor-main-col">
          {/* Tab Bar & Action Bar */}
          <div className="ide-header-bar">
            {/* Active Tab */}
            <div className="tab-strip">
              <div className="editor-tab">
                <span
                  className="tab-icon"
                  style={{
                    color: langConfig.badgeColor,
                    borderColor: `${langConfig.badgeColor}80`
                  }}
                >
                  {(file.extension || 'txt').toUpperCase()}
                </span>
                <span className="tab-title">{file.fileName}</span>
                {isDirty && (
                  <span
                    className="tab-dirty-dot"
                    style={{ display: 'inline-block' }}
                    title="Unsaved changes"
                  />
                )}
                <button
                  className="tab-close"
                  onClick={onClose}
                  title="Close File (Ctrl+W)"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="header-actions">
              {/* Save Button */}
              <button
                className={`btn-header btn-save ${isDirty ? 'is-dirty' : ''}`}
                onClick={handleSaveClick}
                title="Save File (Ctrl+S)"
              >
                <Save size={14} />
                <span>Save</span>
              </button>

              {/* Save As Button */}
              <button
                className="btn-header"
                onClick={handleSaveAsClick}
                title="Save File As..."
              >
                <span>Save As...</span>
              </button>

              {/* Close to Home Button */}
              <button
                className="btn-header btn-close-ide"
                onClick={onClose}
                title="Close to Home (Ctrl+W)"
              >
                <HomeIcon size={14} />
                <span>Close</span>
              </button>

              <div
                style={{
                  width: '1px',
                  height: '18px',
                  background: 'rgba(255,255,255,0.1)',
                  margin: '0 4px'
                }}
              />

              {/* Theme Dropdown */}
              <select
                className="theme-dropdown"
                value={theme}
                onChange={(e) => onThemeChange(e.target.value)}
                title="Color Theme"
              >
                {Object.entries(THEME_LOADERS).map(([id, info]) => (
                  <option key={id} value={id}>
                    {info.name}
                  </option>
                ))}
              </select>

              {/* Word Wrap Toggle */}
              <button
                className={`icon-btn ${isWordWrap ? 'active' : ''}`}
                onClick={handleToggleWrap}
                title="Toggle Word Wrap"
              >
                <WrapText size={16} />
              </button>

              {/* Minimap Toggle */}
              <button
                className={`icon-btn ${isMinimap ? 'active' : ''}`}
                onClick={handleToggleMinimap}
                title="Toggle Minimap"
              >
                <Minimize2 size={16} />
              </button>
            </div>
          </div>

          {/* Monaco Editor Container */}
          <div id="editor-container" ref={containerRef} />
        </div>
      </div>

      {/* VS Code Status Bar */}
      <footer className="ide-statusbar">
        <div className="statusbar-left">
          <div className="status-item status-branch" title="Git Branch">
            <GitBranch size={13} />
            <span>main</span>
          </div>

          <div
            className={`status-item ${isDirty ? 'status-modified' : 'status-clean'}`}
          >
            {isDirty ? (
              <>
                <Disc size={12} /> Modified
              </>
            ) : (
              <>
                <Check size={12} /> Saved
              </>
            )}
          </div>

          <div className="status-item">Ready</div>
        </div>

        <div className="statusbar-right">
          <div className="status-item" title="Line and Column">
            Ln {cursorPos.line}, Col {cursorPos.column}
            {cursorPos.selectedLength > 0 && ` (${cursorPos.selectedLength} selected)`}
          </div>

          <div className="status-item" title="Indentation">
            Spaces: 2
          </div>

          <div className="status-item" title="Encoding">
            UTF-8
          </div>

          <div className="status-item" title="End of Line Sequence">
            LF
          </div>

          <div className="status-item" title="Language Mode">
            {langConfig.displayName}{' '}
            {grammarLoaded && (
              <span style={{ opacity: 0.85, marginLeft: '3px' }}>(TextMate)</span>
            )}
          </div>

          <div
            className="status-item status-pill"
            title="Syntax Tokenizer Architecture"
          >
            {grammarLoaded ? 'Oniguruma WASM' : 'Standard'}
          </div>
        </div>
      </footer>
    </section>
  );
};
