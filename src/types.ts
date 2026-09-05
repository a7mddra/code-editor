export interface LanguageDefinition {
  languageId: string;
  displayName: string;
  badgeColor: string;
  scopeName: string | null;
  grammarFile: string | null;
}

export interface OpenedFile {
  filePath: string;
  fileName: string;
  extension: string;
  content: string;
  size?: number;
  mtime?: number;
}

export interface RecentFile {
  filePath: string;
  fileName: string;
  extension: string;
  size?: number;
  lastOpened: number;
}

export interface ElectronFileResult {
  canceled: boolean;
  filePath?: string;
  fileName?: string;
  extension?: string;
  content?: string;
  size?: number;
  mtime?: number;
  error?: string;
  success?: boolean;
}

export interface ElectronAPI {
  openFileDialog: () => Promise<ElectronFileResult>;
  readFile: (filePath: string) => Promise<ElectronFileResult>;
  saveFile: (filePath: string, content: string) => Promise<ElectronFileResult>;
  saveFileAs: (defaultName: string, content: string) => Promise<ElectronFileResult>;
  windowAction: (action: 'minimize' | 'maximize' | 'close') => Promise<void>;
  getInitialFile?: () => Promise<ElectronFileResult | null>;
  onOpenInitialFile?: (callback: (data: ElectronFileResult) => void) => () => void;
  isElectron?: boolean;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
    MonacoEnvironment?: any;
  }
}
