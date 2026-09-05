const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");

let mainWindow = null;

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
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false,
    },
    show: false,
  });

  mainWindow.webContents.on(
    "console-message",
    (event, level, message, line, sourceId) => {
      console.log(`[Renderer] ${message}`);
    },
  );

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  let initialFilePromise = null;
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

  ipcMain.handle("app:getInitialFile", async () => {
    if (initialFilePromise) {
      const data = await initialFilePromise;
      initialFilePromise = null;
      return data;
    }
    return null;
  });

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
ipcMain.handle("file:read", async (_, filePath) => {
  return await readFileData(filePath);
});

async function readFileData(filePath) {
  try {
    const stats = await fs.promises.stat(filePath);
    const content = await fs.promises.readFile(filePath, "utf-8");
    const fileName = path.basename(filePath);
    const extension = path.extname(filePath).replace(".", "").toLowerCase();

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
      error: error.message || "Failed to read file",
    };
  }
}

// 3. Save to existing file
ipcMain.handle("file:save", async (_, { filePath, content }) => {
  try {
    if (!filePath) {
      throw new Error("No file path provided for saving");
    }
    await fs.promises.writeFile(filePath, content, "utf-8");
    const stats = await fs.promises.stat(filePath);
    return {
      success: true,
      mtime: stats.mtimeMs,
      size: stats.size,
    };
  } catch (error) {
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
      error: error.message,
    };
  }
});

// 5. Window Controls
ipcMain.handle("window:minimize", () => {
  mainWindow?.minimize();
});

ipcMain.handle("window:maximize", () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.handle("window:close", () => {
  mainWindow?.close();
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
