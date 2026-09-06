import { app, BrowserWindow, ipcMain, dialog, Menu, MenuItemConstructorOptions } from "electron";
import path from "path";
import fs from "fs";

let mainWindow: BrowserWindow | null = null;
let currentFilePath: string | null = null;
let initialFilePromise: Promise<any> | null = null;
const SUPPORTED_EXTENSIONS = [
  "txt",
  "md",
  "csv",
  "json",
  "xml",
  "yaml",
  "yml",
  "toml",
  "ini",
  "cfg",
  "conf",
  "html",
  "css",
  "js",
  "ts",
  "jsx",
  "tsx",
  "sh",
  "bash",
  "zsh",
  "fish",
  "py",
  "rs",
  "go",
  "java",
  "c",
  "cpp",
  "h",
  "hpp",
  "sql",
  "log",
];

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 800,
    minHeight: 520,
    backgroundColor: "#1e1e1e",
    frame: true,
    titleBarStyle: "default",
    title: "Monaco IDE - TextMate Powered",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
    show: false,
  });



  mainWindow.webContents.on("console-message", (...args: any[]) => {
    const msg =
      args[0] && typeof args[0] === "object" && "message" in args[0]
        ? args[0].message
        : args[2];
    console.log(`[Renderer] ${msg}`);
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  const fileArg = process.argv
    .slice(2)
    .find(
      (arg) =>
        !arg.startsWith("-") &&
        !arg.startsWith("http://") &&
        !arg.startsWith("https://") &&
        fs.existsSync(path.resolve(process.cwd(), arg)) &&
        fs.statSync(path.resolve(process.cwd(), arg)).isFile(),
    );

  if (fileArg) {
    const absPath = path.resolve(process.cwd(), fileArg);
    initialFilePromise = readFileData(absPath);
  }

  const devUrl = process.argv.find(
    (arg) => arg.startsWith("http://") || arg.startsWith("https://"),
  );
  if (devUrl) {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// IPC Handlers

ipcMain.handle("app:getInitialFile", async () => {
  if (initialFilePromise) {
    const data = await initialFilePromise;
    initialFilePromise = null;
    return data;
  }
  return null;
});


// 1. Open File Dialog & read
ipcMain.handle("dialog:openFile", async () => {
  if (!mainWindow) return { canceled: true };
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Open Text File",
    properties: ["openFile"],
    filters: [
      { name: "Supported files", extensions: SUPPORTED_EXTENSIONS },
      { name: "All Files", extensions: ["*"] },
    ],
  });

  if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
    return { canceled: true };
  }

  const filePath = result.filePaths[0];
  return await readFileData(filePath);
});

// 2. Read specific file (e.g. from Recent Files or drag-and-drop)
ipcMain.handle("file:read", async (_, filePath: string) => {
  return await readFileData(filePath);
});

async function readFileData(filePath: string) {
  try {
    const stats = await fs.promises.stat(filePath);
    const content = await fs.promises.readFile(filePath, "utf-8");
    const fileName = path.basename(filePath);
    const extension = path.extname(filePath).replace(".", "").toLowerCase();

    currentFilePath = filePath;

    return {
      canceled: false,
      filePath,
      fileName,
      extension,
      content,
      size: stats.size,
      mtime: stats.mtimeMs,
    };
  } catch (error) {
    console.error("Error reading file:", error);
    return {
      canceled: false,
      error: error instanceof Error ? error.message : "Failed to read file",
    };
  }
}

// 3. Save to existing file
ipcMain.handle("file:save", async (_, { content }) => {
  try {
    if (!currentFilePath) {
      throw new Error("No file path provided for saving");
    }
    await fs.promises.writeFile(currentFilePath, content, "utf-8");
    const stats = await fs.promises.stat(currentFilePath);
    return {
      success: true,
      mtime: stats.mtimeMs,
      size: stats.size,
    };
  } catch (error: any) {
    console.error("Error saving file:", error);
    return {
      success: false,
      error: error.message || "Failed to save file",
    };
  }
});

// 4. Save As Dialog
ipcMain.handle("file:saveAs", async (_, { defaultName, content }) => {
  if (!mainWindow) return { canceled: true };

  const ext = defaultName
    ? path.extname(defaultName).replace(".", "").toLowerCase()
    : "txt";
  const result = await dialog.showSaveDialog(mainWindow, {
    title: "Save File As",
    defaultPath: defaultName || "untitled.txt",
    filters: [
      { name: "Supported files", extensions: SUPPORTED_EXTENSIONS },
      { name: "All Files", extensions: ["*"] },
    ],
  });

  if (result.canceled || !result.filePath) {
    return { canceled: true };
  }

  const filePath = result.filePath;
  try {
    await fs.promises.writeFile(filePath, content, "utf-8");
    const stats = await fs.promises.stat(filePath);
    const fileName = path.basename(filePath);
    const extension = path.extname(filePath).replace(".", "").toLowerCase();

    currentFilePath = filePath;

    return {
      canceled: false,
      success: true,
      filePath,
      fileName,
      extension,
      size: stats.size,
      mtime: stats.mtimeMs,
    };
  } catch (error) {
    return {
      canceled: false,
      success: false,
      error: error instanceof Error ? error.message : "Failed to save file",
    };
  }
});


app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle("menu:showFile", (event, bounds) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  const template: MenuItemConstructorOptions[] = [
    { label: "Open File", accelerator: "CmdOrCtrl+O", click: () => win.webContents.send("menu:action", "openFile") },
    { label: "Save", accelerator: "CmdOrCtrl+S", click: () => win.webContents.send("menu:action", "save") },
    { label: "Save As...", accelerator: "CmdOrCtrl+Shift+S", click: () => win.webContents.send("menu:action", "saveAs") },
    { type: "separator" },
    { label: "Quit", accelerator: "CmdOrCtrl+Q", role: "quit" }
  ];
  const menu = Menu.buildFromTemplate(template);
  menu.popup({ window: win, x: Math.round(bounds.x), y: Math.round(bounds.y) });
});

ipcMain.handle("menu:showEdit", (event, bounds) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  const template: MenuItemConstructorOptions[] = [
    { label: "Undo", accelerator: "CmdOrCtrl+Z", click: () => win.webContents.send("menu:action", "undo") },
    { label: "Redo", accelerator: "CmdOrCtrl+Shift+Z", click: () => win.webContents.send("menu:action", "redo") },
    { type: "separator" },
    { label: "Copy", accelerator: "CmdOrCtrl+C", click: () => win.webContents.send("menu:action", "copy") },
    { label: "Paste", accelerator: "CmdOrCtrl+V", click: () => win.webContents.send("menu:action", "paste") },
    { label: "Cut", accelerator: "CmdOrCtrl+X", click: () => win.webContents.send("menu:action", "cut") },
    { type: "separator" },
    { label: "Select All", accelerator: "CmdOrCtrl+A", click: () => win.webContents.send("menu:action", "selectAll") }
  ];
  const menu = Menu.buildFromTemplate(template);
  menu.popup({ window: win, x: Math.round(bounds.x), y: Math.round(bounds.y) });
});

ipcMain.handle("menu:showView", (event, { bounds, themes, currentTheme, isMinimap }) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  const themeSubmenu: MenuItemConstructorOptions[] = Object.keys(themes).map(id => ({
    label: themes[id].name,
    type: "radio" as const,
    checked: id === currentTheme,
    click: () => win.webContents.send("menu:action", `theme:${id}`)
  }));
  const template: MenuItemConstructorOptions[] = [
    { label: "Increase Font Size", accelerator: "CmdOrCtrl+]", click: () => win.webContents.send("menu:action", "zoomIn") },
    { label: "Decrease Font Size", accelerator: "CmdOrCtrl+[", click: () => win.webContents.send("menu:action", "zoomOut") },
    { type: "separator" },
    { label: "Show Minimap", type: "checkbox", checked: isMinimap, click: () => win.webContents.send("menu:action", "toggleMinimap") },
    { type: "separator" },
    { label: "Color Theme", submenu: themeSubmenu }
  ];
  const menu = Menu.buildFromTemplate(template);
  menu.popup({ window: win, x: Math.round(bounds.x), y: Math.round(bounds.y) });
});
