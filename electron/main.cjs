const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");

let mainWindow = null;
let timerWindow = null;
let timerInterval = null;

let timerState = {
  remainingSeconds: 0,
  isRunning: false,
  endAt: null,
};

// -------------------- Existing JSON persistence --------------------
const dataPath = () => path.join(app.getPath("userData"), "studydesk-data.json");

async function loadData() {
  try {
    const file = await fs.readFile(dataPath(), "utf-8");
    return JSON.parse(file);
  } catch (error) {
    if (error.code === "ENOENT") return { tasks: [], notes: "" };
    throw error;
  }
}

async function saveData(data) {
  await fs.writeFile(dataPath(), JSON.stringify(data, null, 2), "utf-8");
  return { success: true };
}

ipcMain.handle("load-data", () => loadData());
ipcMain.handle("save-data", (_event, data) => saveData(data));

// -------------------- Electron-owned countdown --------------------
function getRemainingSeconds() {
  if (!timerState.isRunning || !timerState.endAt) return timerState.remainingSeconds;
  return Math.max(0, Math.ceil((timerState.endAt - Date.now()) / 1000));
}

function sendTimerUpdate() {
  timerState.remainingSeconds = getRemainingSeconds();

  if (timerState.remainingSeconds <= 0 && timerState.isRunning) {
    timerState.remainingSeconds = 0;
    timerState.isRunning = false;
    timerState.endAt = null;
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
  }

  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send("timer-update", {
        remainingSeconds: timerState.remainingSeconds,
        isRunning: timerState.isRunning,
      });
    }
  }
}

function stopTimerInterval() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
}

function startTimerInterval() {
  stopTimerInterval();
  timerState.isRunning = true;
  timerState.endAt = Date.now() + timerState.remainingSeconds * 1000;
  sendTimerUpdate();
  timerInterval = setInterval(sendTimerUpdate, 250);
}

function safeDuration(value) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds)) return 0;
  return Math.max(0, Math.floor(seconds));
}

ipcMain.handle("timer-start", (_event, durationSeconds) => {
  timerState.remainingSeconds = safeDuration(durationSeconds);
  timerState.endAt = null;
  timerState.isRunning = false;
  stopTimerInterval();
  if (timerState.remainingSeconds > 0) startTimerInterval();
  else sendTimerUpdate();
  return { remainingSeconds: timerState.remainingSeconds, isRunning: timerState.isRunning };
});

ipcMain.handle("timer-pause", () => {
  timerState.remainingSeconds = getRemainingSeconds();
  timerState.isRunning = false;
  timerState.endAt = null;
  stopTimerInterval();
  sendTimerUpdate();
  return { remainingSeconds: timerState.remainingSeconds, isRunning: false };
});

ipcMain.handle("timer-resume", () => {
  if (!timerState.isRunning && timerState.remainingSeconds > 0) startTimerInterval();
  return { remainingSeconds: getRemainingSeconds(), isRunning: timerState.isRunning };
});

ipcMain.handle("timer-reset", (_event, durationSeconds) => {
  stopTimerInterval();
  timerState = {
    remainingSeconds: safeDuration(durationSeconds),
    isRunning: false,
    endAt: null,
  };
  sendTimerUpdate();
  return { remainingSeconds: timerState.remainingSeconds, isRunning: false };
});

ipcMain.handle("timer-get-state", () => ({
  remainingSeconds: getRemainingSeconds(),
  isRunning: timerState.isRunning,
}));

// -------------------- Windows --------------------
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL("http://localhost:5173");
  mainWindow.on("closed", () => { mainWindow = null; });
}

function sendFullscreenState() {
  if (!timerWindow || timerWindow.isDestroyed()) return;
  timerWindow.webContents.send("timer-fullscreen-update", {
    isFullScreen: timerWindow.isFullScreen(),
  });
}

function createTimerWindow() {
  if (timerWindow && !timerWindow.isDestroyed()) {
    timerWindow.show();
    timerWindow.focus();
    return;
  }

  timerWindow = new BrowserWindow({
    width: 700,
    height: 650,
    minWidth: 420,
    minHeight: 450,
    resizable: true,
    maximizable: true,
    fullscreenable: true,
    alwaysOnTop: false,
    frame: true,
    title: "StudyDesk Focus Timer",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  timerWindow.on("enter-full-screen", sendFullscreenState);
  timerWindow.on("leave-full-screen", sendFullscreenState);
  
timerWindow.on("closed", () => {
  timerWindow = null;

  // Stop the countdown when the timer window closes.
  stopTimerInterval();

  // Start fresh next time the timer window opens.
  timerState = {
    remainingSeconds: 0,
    isRunning: false,
    endAt: null,
  };
});

  timerWindow.loadURL("http://localhost:5173/?window=timer");
}

ipcMain.handle("open-timer-window", () => {
  createTimerWindow();
  return { success: true };
});

ipcMain.handle("timer-toggle-fullscreen", () => {
  if (!timerWindow || timerWindow.isDestroyed()) return { isFullScreen: false };
  timerWindow.setFullScreen(!timerWindow.isFullScreen());
  // Do not return a UI state for React to trust; macOS updates asynchronously.
  return { requested: true };
});

ipcMain.handle("timer-close-window", () => {
  if (timerWindow && !timerWindow.isDestroyed()) timerWindow.close();
  return { success: true };
});

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
