
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");

const dataPath = () => path.join(app.getPath("userData"), "studydesk-data.json");

async function loadData() {
  try {
    const file = await fs.readFile(dataPath(), "utf-8");
    return JSON.parse(file);
  } catch (error) {
    if (error.code === "ENOENT") {
      return { tasks: [], notes: [] };
    }

    throw error;
  }
}

async function saveData(data) {
  await fs.writeFile(dataPath(), JSON.stringify(data, null, 2), "utf-8");
  return { success: true };
}

ipcMain.handle("load-data", () => loadData());
ipcMain.handle("save-data", (_event, data) => saveData(data));

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 750,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadURL("http://localhost:5173");
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
