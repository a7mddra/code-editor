import * as monaco from "monaco-editor";
import {
  loadWASM,
  createOnigScanner,
  createOnigString,
} from "vscode-oniguruma";
import {
  Registry,
  INITIAL,
  IGrammar,
  StateStack,
  IRawTheme,
} from "vscode-textmate";
import wasmUrl from "vscode-oniguruma/release/onig.wasm?url";

// Grammar loaders
const GRAMMAR_LOADERS: Record<string, () => Promise<any>> = {
  markdown: () => import("tm-grammars/grammars/markdown.json"),
  csv: () => import("tm-grammars/grammars/csv.json"),
  json: () => import("tm-grammars/grammars/json.json"),
  xml: () => import("tm-grammars/grammars/xml.json"),
  yaml: () => import("tm-grammars/grammars/yaml.json"),
  toml: () => import("tm-grammars/grammars/toml.json"),
  ini: () => import("tm-grammars/grammars/ini.json"),
  html: () => import("tm-grammars/grammars/html.json"),
  css: () => import("tm-grammars/grammars/css.json"),
  javascript: () => import("tm-grammars/grammars/javascript.json"),
  typescript: () => import("tm-grammars/grammars/typescript.json"),
  jsx: () => import("tm-grammars/grammars/jsx.json"),
  tsx: () => import("tm-grammars/grammars/tsx.json"),
  shellscript: () => import("tm-grammars/grammars/shellscript.json"),
  fish: () => import("tm-grammars/grammars/fish.json"),
  python: () => import("tm-grammars/grammars/python.json"),
  rust: () => import("tm-grammars/grammars/rust.json"),
  go: () => import("tm-grammars/grammars/go.json"),
  java: () => import("tm-grammars/grammars/java.json"),
  c: () => import("tm-grammars/grammars/c.json"),
  cpp: () => import("tm-grammars/grammars/cpp.json"),
  sql: () => import("tm-grammars/grammars/sql.json"),
  log: () => import("tm-grammars/grammars/log.json"),
};

const SCOPE_TO_KEY: Record<string, string> = {
  "text.html.markdown": "markdown",
  "text.csv": "csv",
  "source.json": "json",
  "text.xml": "xml",
  "source.yaml": "yaml",
  "source.toml": "toml",
  "source.ini": "ini",
  "text.html.basic": "html",
  "source.css": "css",
  "source.js": "javascript",
  "source.ts": "typescript",
  "source.js.jsx": "jsx",
  "source.tsx": "tsx",
  "source.shell": "shellscript",
  "source.fish": "fish",
  "source.python": "python",
  "source.rust": "rust",
  "source.go": "go",
  "source.java": "java",
  "source.c": "c",
  "source.cpp": "cpp",
  "source.sql": "sql",
  "text.log": "log",
};

export interface ThemeOption {
  name: string;
  isDark: boolean;
  loader: () => Promise<any>;
}

export const THEME_LOADERS: Record<string, ThemeOption> = {
  vesper: {
    name: "Vesper (Default)",
    isDark: true,
    loader: () => import("tm-themes/themes/vesper.json"),
  },
  "dark-plus": {
    name: "VS Code Dark+",
    isDark: true,
    loader: () => import("tm-themes/themes/dark-plus.json"),
  },
  "github-dark": {
    name: "GitHub Dark",
    isDark: true,
    loader: () => import("tm-themes/themes/github-dark.json"),
  },
  "one-dark-pro": {
    name: "One Dark Pro",
    isDark: true,
    loader: () => import("tm-themes/themes/one-dark-pro.json"),
  },
  monokai: {
    name: "Monokai",
    isDark: true,
    loader: () => import("tm-themes/themes/monokai.json"),
  },
  dracula: {
    name: "Dracula",
    isDark: true,
    loader: () => import("tm-themes/themes/dracula.json"),
  },
  "tokyo-night": {
    name: "Tokyo Night",
    isDark: true,
    loader: () => import("tm-themes/themes/tokyo-night.json"),
  },
  "light-plus": {
    name: "VS Code Light+",
    isDark: false,
    loader: () => import("tm-themes/themes/light-plus.json"),
  },
};

function normalizeHex(hex: string): string {
  if (!hex) return hex;
  let clean = hex.trim();
  if (clean.startsWith("#")) {
    clean = clean.slice(1);
  }
  if (clean.length === 3) {
    clean = clean
      .split("")
      .map((c) => c + c)
      .join("");
  }
  return "#" + clean;
}

let wasmInitialized = false;
let initPromise: Promise<void> | null = null;
let registry: Registry | null = null;
let currentThemeId = "vesper";
const loadedGrammars = new Map<string, IGrammar>();
const registeredLanguages = new Set<string>();

/**
 * Initialize WebAssembly layer and create vscode-textmate Registry
 */
export function initTextMateEngine(initialThemeId?: string): Promise<void> {
  if (initialThemeId && THEME_LOADERS[initialThemeId]) {
    currentThemeId = initialThemeId;
  }
  if (initPromise) return initPromise;
  initPromise = doInit();
  return initPromise;
}

async function doInit(): Promise<void> {
  console.log("[TextMate] Initializing Oniguruma WASM...");
  try {
    const wasmResponse = await fetch(wasmUrl);
    const wasmArrayBuffer = await wasmResponse.arrayBuffer();
    await loadWASM(wasmArrayBuffer);
    wasmInitialized = true;
    console.log("[TextMate] Oniguruma WASM loaded successfully.");
  } catch (err) {
    console.error("[TextMate] Failed to initialize WASM:", err);
    throw err;
  }

  const onigLib = Promise.resolve({
    createOnigScanner: (sources: string[]) => createOnigScanner(sources),
    createOnigString: (str: string) => createOnigString(str),
  });

  registry = new Registry({
    onigLib,
    loadGrammar: async (scopeName: string) => {
      const key = SCOPE_TO_KEY[scopeName];
      if (key && GRAMMAR_LOADERS[key]) {
        try {
          const mod = await GRAMMAR_LOADERS[key]();
          return mod.default || mod;
        } catch (err) {
          console.warn(
            `[TextMate] Error loading grammar for scope ${scopeName}:`,
            err,
          );
        }
      }
      return null;
    },
  });

  await setTheme(currentThemeId);
  console.log(`[TextMate] Engine initialized with ${currentThemeId} theme.`);
}

/**
 * Set TextMate theme & propagate color map to Monaco
 */
export async function setTheme(themeId: string): Promise<void> {
  const themeConfig = THEME_LOADERS[themeId];
  if (!themeConfig) {
    console.warn(`[TextMate] Unknown theme: ${themeId}`);
    return;
  }

  if (!registry) {
    await initTextMateEngine(themeId);
  }

  const themeMod = await themeConfig.loader();
  const rawTheme = themeMod.default || themeMod;
  currentThemeId = themeId;

  const editorThemeName = `tm-${themeId}`;
  const isDark = themeConfig.isDark;

  // Extract explicit theme foreground and background with normalization
  const rawFg =
    rawTheme.colors?.["editor.foreground"] || (isDark ? "#D4D4D4" : "#24292E");
  const rawBg =
    rawTheme.colors?.["editor.background"] || (isDark ? "#1E1E1E" : "#FFFFFF");
  const fg = normalizeHex(rawFg);
  const bg = normalizeHex(rawBg);

  // 1. Define theme in Monaco with explicit rules and minimap background
  monaco.editor.defineTheme(editorThemeName, {
    base: isDark ? "vs-dark" : "vs",
    inherit: true,
    rules: [
      {
        token: "",
        foreground: fg.replace("#", ""),
        background: bg.replace("#", ""),
      },
    ],
    colors: {
      ...(rawTheme.colors || {}),
      "editor.background": bg,
      "editor.foreground": fg,
      "minimap.background": bg,
      "minimapSlider.background": isDark ? "#79797933" : "#64646420",
      "minimapSlider.hoverBackground": isDark ? "#79797959" : "#64646438",
      "minimapSlider.activeBackground": isDark ? "#79797980" : "#64646450",
      "scrollbarSlider.background": isDark ? "#79797933" : "#64646420",
      "scrollbarSlider.hoverBackground": isDark ? "#79797959" : "#64646438",
      "scrollbarSlider.activeBackground": isDark ? "#79797980" : "#64646450",
      "editorLineNumber.foreground": isDark ? "#858585" : "#747474",
      "editorLineNumber.activeForeground": isDark ? "#c6c6c6" : "#222222",
      "editorCursor.foreground": isDark ? "#aeafad" : "#000000",
      "editor.selectionBackground": isDark ? "#264f78" : "#add6ff",
      "editor.inactiveSelectionBackground": isDark ? "#3a3d41" : "#e5ebf1",
    },
  });

  monaco.editor.setTheme(editorThemeName);

  // 2. Pass base settings rule into vscode-textmate so Color ID 1 = fg and Color ID 2 = bg
  if (registry) {
    const baseSettingsRule = {
      settings: {
        foreground: fg,
        background: bg,
      },
    };

    const tokenColors = rawTheme.tokenColors || rawTheme.settings || [];

    registry.setTheme({
      name: rawTheme.name || themeId,
      settings: [baseSettingsRule, ...tokenColors],
    } as IRawTheme);

    const colorMap = registry.getColorMap();
    if (colorMap && colorMap.length > 2) {
      colorMap[0] = "#00000000";
      colorMap[1] = fg;
      colorMap[2] = bg;
      monaco.languages.setColorMap(colorMap);
    }
  }

  // Update root CSS variables to harmonize titlebar, tab, and statusbar with theme
  const titleBarBg =
    rawTheme.colors?.["titleBar.activeBackground"] ||
    (isDark ? "#18191f" : "#f3f3f3");
  const tabActiveBg = rawTheme.colors?.["tab.activeBackground"] || bg;
  const tabInactiveBg =
    rawTheme.colors?.["tab.inactiveBackground"] ||
    (isDark ? "#141519" : "#ececec");
  const statusBarBg =
    rawTheme.colors?.["statusBar.background"] ||
    (isDark ? "#007acc" : "#007acc");
  const statusBarFg = rawTheme.colors?.["statusBar.foreground"] || "#ffffff";
  const accentColor =
    rawTheme.colors?.["focusBorder"] ||
    rawTheme.colors?.["activityBarBadge.background"] ||
    (isDark ? "#FFC799" : "#007acc");

  document.documentElement.style.setProperty("--editor-bg", bg);
  document.documentElement.style.setProperty("--editor-fg", fg);
  document.documentElement.style.setProperty("--titlebar-bg", titleBarBg);
  document.documentElement.style.setProperty("--tab-active-bg", tabActiveBg);
  document.documentElement.style.setProperty(
    "--tab-inactive-bg",
    tabInactiveBg,
  );
  document.documentElement.style.setProperty("--status-bar-bg", statusBarBg);
  document.documentElement.style.setProperty("--status-bar-fg", statusBarFg);
  document.documentElement.style.setProperty("--accent-primary", accentColor);
}

/**
 * Ensure a language grammar is loaded and hooked into Monaco's incremental line tokenizer
 */
export async function wireLanguageGrammar(
  languageId: string,
  scopeName?: string | null,
): Promise<IGrammar | null> {
  if (!scopeName || languageId === "plaintext") {
    return null;
  }

  await initTextMateEngine();
  if (!registry) {
    console.warn("[TextMate] Registry not available after init");
    return null;
  }

  if (!registeredLanguages.has(languageId)) {
    const existing = monaco.languages
      .getLanguages()
      .find((l) => l.id === languageId);
    if (!existing) {
      monaco.languages.register({ id: languageId });
    }
    registeredLanguages.add(languageId);
  }

  if (loadedGrammars.has(languageId)) {
    return loadedGrammars.get(languageId)!;
  }

  console.log(
    `[TextMate] Wiring incremental grammar for ${languageId} (${scopeName})...`,
  );
  const grammar = await registry.loadGrammar(scopeName);
  if (!grammar) {
    console.warn(`[TextMate] Could not load grammar for ${scopeName}`);
    return null;
  }

  monaco.languages.setTokensProvider(languageId, {
    getInitialState: () => INITIAL,
    tokenizeEncoded: (line: string, state: monaco.languages.IState) => {
      const result = grammar.tokenizeLine2(line, state as StateStack);
      return {
        tokens: result.tokens,
        endState: result.ruleStack,
      };
    },
  });

  loadedGrammars.set(languageId, grammar);
  console.log(
    `[TextMate] Language ${languageId} successfully bound to Monaco TokensProvider!`,
  );
  return grammar;
}

export function getCurrentTheme(): string {
  return currentThemeId;
}
