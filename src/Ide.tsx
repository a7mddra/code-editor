import React, { useEffect, useRef, useState, useCallback } from "react";
import * as monaco from "monaco-editor";
import { OpenedFile } from "./types";
import { getLanguageByExtension } from "./languages";
import {
  THEME_LOADERS,
  wireLanguageGrammar,
  setTheme,
} from "./textmate-engine";

interface IdeProps {
  file: OpenedFile;
  isDirty: boolean;
  theme: string;
  onOpenFile: () => void;
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
  onOpenFile,
  onSave,
  onSaveAs,
  onClose,
  onThemeChange,
  onDirtyChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const originalContentRef = useRef<string>(file.content);

  const [cursorPos, setCursorPos] = useState({
    line: 1,
    column: 1,
    selectedLength: 0,
  });

  const [isMinimap, setIsMinimap] = useState(true);
  const [grammarLoaded, setGrammarLoaded] = useState(false);
  const [fontSize, setFontSize] = useState(14);

  const langConfig = getLanguageByExtension(file.extension);

  useEffect(() => {
    if (!containerRef.current) return;

    const editor = monaco.editor.create(containerRef.current, {
      value: file.content,
      language: langConfig.languageId,
      theme: `tm-${theme}`,
      fontSize: fontSize,
      fontFamily:
        "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace",
      fontLigatures: true,
      lineNumbers: "on",
      renderWhitespace: "selection",
      scrollBeyondLastLine: false,
      smoothScrolling: true,
      cursorBlinking: "smooth",
      cursorSmoothCaretAnimation: "on",
      bracketPairColorization: { enabled: true },
      renderLineHighlight: "all",
      tabSize: 2,
      wordWrap: "off",
      automaticLayout: true,
      minimap: {
        enabled: isMinimap,
        renderCharacters: true,
        maxColumn: 120,
        showSlider: "always",
        side: "right",
      },
      padding: {
        top: 12,
        bottom: 12,
      },
    });

    editorRef.current = editor;
    originalContentRef.current = file.content;

    if (langConfig.scopeName) {
      wireLanguageGrammar(langConfig.languageId, langConfig.scopeName)
        .then((grammar) => {
          if (grammar) {
            setGrammarLoaded(true);

            const model = editor.getModel();
            if (model) {
              monaco.editor.setModelLanguage(model, langConfig.languageId);
            }
          }
        })
        .catch((err) => {
          console.warn("[TextMate] Fallback to standard tokenization:", err);
        });
    }

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
        selectedLength,
      });
    });

    const contentSub = editor.onDidChangeModelContent(() => {
      const currentVal = editor.getValue();
      const dirty = currentVal !== originalContentRef.current;
      onDirtyChange(dirty);
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onSave(editor.getValue());
      originalContentRef.current = editor.getValue();
      onDirtyChange(false);
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyW, () => {
      onClose();
    });

    // Override Monaco's native Indent/Outdent shortcuts for font sizing
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.BracketRight,
      () => {
        setFontSize((prev) => Math.min(prev + 2, 48));
      },
    );
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.BracketLeft,
      () => {
        setFontSize((prev) => Math.max(prev - 2, 8));
      },
    );

    return () => {
      cursorSub.dispose();
      contentSub.dispose();
      editor.dispose();
      editorRef.current = null;
    };
  }, [file.filePath]);

  useEffect(() => {
    setTheme(theme)
      .then(() => {
        if (editorRef.current) {
          monaco.editor.setTheme(`tm-${theme}`);
        }
      })
      .catch(console.error);
  }, [theme]);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({ fontSize });
    }
  }, [fontSize]);

  const handleSaveClick = useCallback(() => {
    if (editorRef.current) {
      const content = editorRef.current.getValue();
      onSave(content);
      originalContentRef.current = content;
      onDirtyChange(false);
    }
  }, [onSave, onDirtyChange]);

  const handleSaveAsClick = useCallback(() => {
    if (editorRef.current) {
      onSaveAs(editorRef.current.getValue());
    }
  }, [onSaveAs]);

  const handleToggleMinimap = () => {
    if (editorRef.current) {
      const next = !isMinimap;
      setIsMinimap(next);
      editorRef.current.updateOptions({
        minimap: { enabled: next, renderCharacters: true },
      });
    }
  };

  const actionsRef = useRef({
    onOpenFile,
    handleSaveClick,
    handleSaveAsClick,
    onThemeChange,
    handleToggleMinimap,
  });
  useEffect(() => {
    actionsRef.current = {
      onOpenFile,
      handleSaveClick,
      handleSaveAsClick,
      onThemeChange,
      handleToggleMinimap,
    };
  });

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "]") {
          e.preventDefault();
          setFontSize((prev) => Math.min(prev + 2, 48));
        } else if (e.key === "[") {
          e.preventDefault();
          setFontSize((prev) => Math.max(prev - 2, 8));
        }
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  useEffect(() => {
    if (!window.electronAPI?.onMenuAction) return;
    const unsubscribe = window.electronAPI.onMenuAction((action) => {
      const {
        onOpenFile,
        handleSaveClick,
        handleSaveAsClick,
        onThemeChange,
        handleToggleMinimap,
      } = actionsRef.current;
      switch (action) {
        case "openFile":
          onOpenFile();
          break;
        case "save":
          handleSaveClick();
          break;
        case "saveAs":
          handleSaveAsClick();
          break;
        case "undo":
          editorRef.current?.trigger("menu", "undo", null);
          break;
        case "redo":
          editorRef.current?.trigger("menu", "redo", null);
          break;
        case "copy":
          editorRef.current?.trigger(
            "menu",
            "editor.action.clipboardCopyAction",
            null,
          );
          break;
        case "paste":
          editorRef.current?.trigger(
            "menu",
            "editor.action.clipboardPasteAction",
            null,
          );
          break;
        case "cut":
          editorRef.current?.trigger(
            "menu",
            "editor.action.clipboardCutAction",
            null,
          );
          break;
        case "selectAll":
          editorRef.current?.trigger("menu", "editor.action.selectAll", null);
          break;
        case "zoomIn":
          setFontSize((prev) => Math.min(prev + 2, 48));
          break;
        case "zoomOut":
          setFontSize((prev) => Math.max(prev - 2, 8));
          break;
        case "toggleMinimap":
          handleToggleMinimap();
          break;
        default:
          if (action.startsWith("theme:")) {
            onThemeChange(action.split(":")[1]);
          }
          break;
      }
    });
    return () => unsubscribe();
  }, []);

  const showMenu = (type: string, e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const bounds = { x: rect.left, y: rect.bottom };
    if (type === "file") window.electronAPI?.showFileMenu?.(bounds);
    else if (type === "edit") window.electronAPI?.showEditMenu?.(bounds);
    else if (type === "view") {
      const serializableThemes = Object.fromEntries(
        Object.entries(THEME_LOADERS).map(([k, v]) => [k, { name: v.name }]),
      );
      window.electronAPI?.showViewMenu?.({
        bounds,
        themes: serializableThemes,
        currentTheme: theme,
        isMinimap,
      });
    }
  };

  return (
    <section id="ide-view">
      <div className="ide-titlebar">
        <div className="titlebar-left">
          <div className="menu-item" onClick={(e) => showMenu("file", e)}>
            File
          </div>
          <div className="menu-item" onClick={(e) => showMenu("edit", e)}>
            Edit
          </div>
          <div className="menu-item" onClick={(e) => showMenu("view", e)}>
            View
          </div>
        </div>

        <div className="titlebar-center">
          {file.fileName}
          {isDirty && <span className="title-dirty-dot"></span>}
        </div>

        <div className="titlebar-right"></div>
      </div>

      <div className="ide-workspace">
        <div className="editor-main-col">
          <div id="editor-container" ref={containerRef} />
        </div>
      </div>

      <footer className="ide-statusbar">
        <div className="statusbar-left">
          <div className="status-item">
            {isDirty ? <>Modified</> : <>Unchanged</>}
          </div>
        </div>

        <div className="statusbar-right">
          <div className="status-item" title="Line and Column">
            Ln {cursorPos.line}, Col {cursorPos.column}
            {cursorPos.selectedLength > 0 &&
              ` (${cursorPos.selectedLength} selected)`}
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
            {langConfig.displayName}{" "}
            {grammarLoaded && (
              <span style={{ opacity: 0.85, marginLeft: "3px" }}>
                (TextMate)
              </span>
            )}
          </div>

          <div className="status-item">Powered by Squigit</div>
        </div>
      </footer>
    </section>
  );
};
