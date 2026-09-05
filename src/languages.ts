import { LanguageDefinition } from "./types";

export const SUPPORTED_LANGUAGES: Record<string, LanguageDefinition> = {
  // Plain Text & Logs
  txt: {
    languageId: "plaintext",
    displayName: "Plain Text",
    badgeColor: "#858585",
    scopeName: null,
    grammarFile: null,
  },
  log: {
    languageId: "log",
    displayName: "Log File",
    badgeColor: "#e5c07b",
    scopeName: "text.log",
    grammarFile: "log.json",
  },
  csv: {
    languageId: "csv",
    displayName: "CSV",
    badgeColor: "#98c379",
    scopeName: "text.csv",
    grammarFile: "csv.json",
  },

  // Markdown
  md: {
    languageId: "markdown",
    displayName: "Markdown",
    badgeColor: "#42a5f5",
    scopeName: "text.html.markdown",
    grammarFile: "markdown.json",
  },

  // Web
  html: {
    languageId: "html",
    displayName: "HTML",
    badgeColor: "#e44d26",
    scopeName: "text.html.basic",
    grammarFile: "html.json",
  },
  css: {
    languageId: "css",
    displayName: "CSS",
    badgeColor: "#264de4",
    scopeName: "source.css",
    grammarFile: "css.json",
  },
  js: {
    languageId: "javascript",
    displayName: "JavaScript",
    badgeColor: "#f7df1e",
    scopeName: "source.js",
    grammarFile: "javascript.json",
  },
  jsx: {
    languageId: "javascriptreact",
    displayName: "React (JSX)",
    badgeColor: "#61dafb",
    scopeName: "source.js.jsx",
    grammarFile: "jsx.json",
  },
  ts: {
    languageId: "typescript",
    displayName: "TypeScript",
    badgeColor: "#3178c6",
    scopeName: "source.ts",
    grammarFile: "typescript.json",
  },
  tsx: {
    languageId: "typescriptreact",
    displayName: "React (TSX)",
    badgeColor: "#3178c6",
    scopeName: "source.tsx",
    grammarFile: "tsx.json",
  },

  // Config & Data
  json: {
    languageId: "json",
    displayName: "JSON",
    badgeColor: "#cbcf20",
    scopeName: "source.json",
    grammarFile: "json.json",
  },
  yaml: {
    languageId: "yaml",
    displayName: "YAML",
    badgeColor: "#cb171e",
    scopeName: "source.yaml",
    grammarFile: "yaml.json",
  },
  yml: {
    languageId: "yaml",
    displayName: "YAML",
    badgeColor: "#cb171e",
    scopeName: "source.yaml",
    grammarFile: "yaml.json",
  },
  toml: {
    languageId: "toml",
    displayName: "TOML",
    badgeColor: "#9c4121",
    scopeName: "source.toml",
    grammarFile: "toml.json",
  },
  xml: {
    languageId: "xml",
    displayName: "XML",
    badgeColor: "#e37933",
    scopeName: "text.xml",
    grammarFile: "xml.json",
  },
  ini: {
    languageId: "ini",
    displayName: "INI Config",
    badgeColor: "#64b5f6",
    scopeName: "source.ini",
    grammarFile: "ini.json",
  },
  cfg: {
    languageId: "ini",
    displayName: "Config File",
    badgeColor: "#64b5f6",
    scopeName: "source.ini",
    grammarFile: "ini.json",
  },
  conf: {
    languageId: "ini",
    displayName: "Configuration",
    badgeColor: "#64b5f6",
    scopeName: "source.ini",
    grammarFile: "ini.json",
  },

  // Shell
  sh: {
    languageId: "shellscript",
    displayName: "Shell (Bash)",
    badgeColor: "#4eaa25",
    scopeName: "source.shell",
    grammarFile: "shellscript.json",
  },
  bash: {
    languageId: "shellscript",
    displayName: "Bash Script",
    badgeColor: "#4eaa25",
    scopeName: "source.shell",
    grammarFile: "shellscript.json",
  },
  zsh: {
    languageId: "shellscript",
    displayName: "Zsh Script",
    badgeColor: "#4eaa25",
    scopeName: "source.shell",
    grammarFile: "shellscript.json",
  },
  fish: {
    languageId: "fish",
    displayName: "Fish Shell",
    badgeColor: "#d64639",
    scopeName: "source.fish",
    grammarFile: "fish.json",
  },

  // Programming
  py: {
    languageId: "python",
    displayName: "Python",
    badgeColor: "#3572a5",
    scopeName: "source.python",
    grammarFile: "python.json",
  },
  rs: {
    languageId: "rust",
    displayName: "Rust",
    badgeColor: "#dea584",
    scopeName: "source.rust",
    grammarFile: "rust.json",
  },
  go: {
    languageId: "go",
    displayName: "Go",
    badgeColor: "#00add8",
    scopeName: "source.go",
    grammarFile: "go.json",
  },
  java: {
    languageId: "java",
    displayName: "Java",
    badgeColor: "#b07219",
    scopeName: "source.java",
    grammarFile: "java.json",
  },
  c: {
    languageId: "c",
    displayName: "C",
    badgeColor: "#555555",
    scopeName: "source.c",
    grammarFile: "c.json",
  },
  cpp: {
    languageId: "cpp",
    displayName: "C++",
    badgeColor: "#f34b7d",
    scopeName: "source.cpp",
    grammarFile: "cpp.json",
  },
  h: {
    languageId: "cpp",
    displayName: "C/C++ Header",
    badgeColor: "#f34b7d",
    scopeName: "source.cpp",
    grammarFile: "cpp.json",
  },
  hpp: {
    languageId: "cpp",
    displayName: "C++ Header",
    badgeColor: "#f34b7d",
    scopeName: "source.cpp",
    grammarFile: "cpp.json",
  },
  sql: {
    languageId: "sql",
    displayName: "SQL",
    badgeColor: "#e38c00",
    scopeName: "source.sql",
    grammarFile: "sql.json",
  },
};

export const ALL_SUPPORTED_EXTENSIONS = Object.keys(SUPPORTED_LANGUAGES);

export function getLanguageByExtension(extension?: string): LanguageDefinition {
  if (!extension) return SUPPORTED_LANGUAGES.txt;
  const cleanExt = extension.toLowerCase().replace(/^\./, "");
  return (
    SUPPORTED_LANGUAGES[cleanExt] || {
      languageId: "plaintext",
      displayName: cleanExt.toUpperCase(),
      badgeColor: "#858585",
      scopeName: null,
      grammarFile: null,
    }
  );
}

export function getLanguageByFileName(fileName?: string): LanguageDefinition {
  if (!fileName) return SUPPORTED_LANGUAGES.txt;
  const parts = fileName.split(".");
  if (parts.length <= 1) return SUPPORTED_LANGUAGES.txt;
  const ext = parts.pop();
  return getLanguageByExtension(ext);
}
