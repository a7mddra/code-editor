import React, { useState } from 'react';
import {
  FolderOpen,
  FileText,
  Sparkles,
  Command,
  FileCode,
  Layers,
  Clock
} from 'lucide-react';
import { ALL_SUPPORTED_EXTENSIONS, getLanguageByExtension } from '../languages';
import { RecentFile } from '../types';

interface HomeProps {
  onOpenFile: (filePath?: string) => void;
  onFileDrop: (file: File) => void;
  recentFiles: RecentFile[];
}

export const Home: React.FC<HomeProps> = ({
  onOpenFile,
  onFileDrop,
  recentFiles
}) => {
  const [isDragActive, setIsDragActive] = useState(false);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      onFileDrop(file);
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <section id="home-view">
      <div className="home-container">
        {/* Brand Header */}
        <header className="home-header">
          <div className="home-logo-badge">
            <svg className="home-logo-icon" viewBox="0 0 24 24">
              <path d="M17.58 2.37L9.84 9.49 4.3 5.4 2 6.88l5.22 4.95L2 16.78l2.3 1.48 5.54-4.09 7.74 7.12 4.42-2.1V4.47l-4.42-2.1zm.42 16.48l-6.14-5.65 6.14-5.65v11.3z" />
            </svg>
          </div>
          <div className="home-title-group">
            <h1>Monaco IDE</h1>
            <p>
              VS Code Architecture: Incremental TextMate &amp; Oniguruma WASM
              Tokenization Engine
            </p>
          </div>
        </header>

        {/* Main Grid */}
        <div className="home-grid">
          {/* Left: Dropzone & Formats */}
          <div className="home-left-col">
            <div
              className={`drop-zone-card ${isDragActive ? 'drag-active' : ''}`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <div className="drop-icon-wrap">
                <FileCode size={36} />
              </div>
              <div className="drop-title">Import or Drop Local File</div>
              <div className="drop-subtitle">
                Drag &amp; drop any source or text file here, or browse local storage
              </div>
              <button
                className="btn-primary"
                onClick={() => onOpenFile()}
                type="button"
              >
                <FolderOpen size={18} />
                Browse Local File
              </button>
            </div>

            {/* Supported Formats Section */}
            <div className="formats-section">
              <div className="section-label">
                <span>Supported Formats ({ALL_SUPPORTED_EXTENSIONS.length} Types)</span>
                <span
                  style={{
                    color: 'var(--accent-primary-hover)',
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Sparkles size={12} /> TextMate Grammars
                </span>
              </div>
              <div className="supported-chips">
                {ALL_SUPPORTED_EXTENSIONS.map((ext) => {
                  const lang = getLanguageByExtension(ext);
                  return (
                    <div
                      key={ext}
                      className="lang-chip"
                      title={`${lang.displayName} (.${ext})`}
                    >
                      <span
                        className="chip-dot"
                        style={{ backgroundColor: lang.badgeColor }}
                      />
                      <span className="chip-ext">.{ext}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Recents & Architecture */}
          <div className="home-right-col">
            {/* Recent Files */}
            <div className="recent-card">
              <div className="section-label">
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={13} /> Recent Files
                </span>
              </div>
              {recentFiles.length === 0 ? (
                <div className="empty-state">
                  No recent files opened yet.
                  <br />
                  Drop or import a file to start editing.
                </div>
              ) : (
                <div className="recent-list">
                  {recentFiles.map((item) => {
                    const lang = getLanguageByExtension(item.extension);
                    return (
                      <div
                        key={item.filePath}
                        className="recent-item"
                        onClick={() => onOpenFile(item.filePath)}
                      >
                        <div
                          className="recent-icon"
                          style={{
                            color: lang.badgeColor,
                            borderColor: `${lang.badgeColor}40`
                          }}
                        >
                          {(item.extension || 'txt').toUpperCase()}
                        </div>
                        <div className="recent-info">
                          <div className="recent-name">{item.fileName}</div>
                          <div className="recent-path" title={item.filePath}>
                            {item.filePath}
                          </div>
                        </div>
                        <div className="recent-action">
                          <span className="recent-badge">
                            {formatSize(item.size)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Architecture Card */}
            <div className="info-card">
              <div className="tech-badge">
                <Layers size={14} />
                VS Code Engine Architecture
              </div>
              <p
                style={{
                  color: 'var(--text-secondary)',
                  fontSize: '12px',
                  lineHeight: '1.5'
                }}
              >
                Line-by-line state machine powered by Microsoft's{' '}
                <code style={{ fontFamily: 'var(--font-mono)', color: '#9cdcfe' }}>
                  vscode-textmate
                </code>{' '}
                and native{' '}
                <code style={{ fontFamily: 'var(--font-mono)', color: '#ce9178' }}>
                  vscode-oniguruma
                </code>{' '}
                WebAssembly engine emitting binary{' '}
                <code style={{ fontFamily: 'var(--font-mono)', color: '#b5cea8' }}>
                  Uint32Array
                </code>{' '}
                tokens.
              </p>

              <div className="shortcuts-grid">
                <div className="shortcut-box">
                  <div className="shortcut-key">Ctrl + O</div>
                  <div className="shortcut-desc">Open File</div>
                </div>
                <div className="shortcut-box">
                  <div className="shortcut-key">Ctrl + S</div>
                  <div className="shortcut-desc">Save File</div>
                </div>
                <div className="shortcut-box">
                  <div className="shortcut-key">Ctrl + W</div>
                  <div className="shortcut-desc">Close to Home</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
