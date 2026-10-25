
const { app, BrowserWindow, ipcMain, Notification } = require("electron");
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

// -------------------- App-managed storage --------------------

const dataPath = () =>
  path.join(app.getPath("userData"), "studydesk-data.json");

const notesFolderPath = () => path.join(app.getAppPath(), "notes");

async function loadData() {
  try {
    const file = await fs.readFile(dataPath(), "utf-8");
    return JSON.parse(file);
  } catch (error) {
    if (error.code === "ENOENT") {
      return { tasks: [], notes: "", savedNotes: [], activeNoteId: null };
    }
    throw error;
  }
}

async function saveData(data) {
  await fs.mkdir(app.getPath("userData"), { recursive: true });
  await fs.writeFile(dataPath(), JSON.stringify(data, null, 2), "utf-8");
  return { success: true };
}

ipcMain.handle("load-data", () => loadData());
ipcMain.handle("save-data", (_event, data) => saveData(data));

// -------------------- Save note as TXT --------------------

function safeFilePart(value) {
  return (
    String(value || "")
      /* eslint-disable-next-line no-control-regex */
      .replace(/[\\/:*?"<>|\x00-\x1F]/g, "-")
      .trim()
      .slice(0, 60) || "Untitled note"
  );
}

function safeNoteId(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, "_");
}

ipcMain.handle("save-note-txt", async (_event, note) => {
  if (!note || note.id == null) {
    throw new Error("A note ID is required.");
  }

const folderPath = notesFolderPath();
await fs.mkdir(folderPath, { recursive: true });

  const title = String(note.title || "Untitled note");
  const id = safeNoteId(note.id);
  const fileName = `${safeFilePart(title)}-${id}.txt`;
  const filePath = path.join(folderPath, fileName);

  const content = `${title}\n${"=".repeat(Math.min(title.length, 60))}\n\n${String(note.content || "")}`;

  await fs.writeFile(filePath, content, "utf-8");

  // Remove the previous TXT file for this note if its title changed.
  const files = await fs.readdir(folderPath);

  await Promise.all(
    files
      .filter(
        (file) => file.endsWith(`-${id}.txt`) && file !== fileName
      )
      .map((file) =>
        fs.unlink(path.join(folderPath, file)).catch((error) => {
          if (error.code !== "ENOENT") throw error;
        })
      )
  );

  return { success: true, filePath };
});

ipcMain.handle("delete-note-txt", async (_event, noteId) => {
  if (noteId == null) {
    throw new Error("A note ID is required.");
  }

const folderPath = notesFolderPath();
  const id = safeNoteId(noteId);

  try {
    const files = await fs.readdir(folderPath);

    await Promise.all(
      files
        .filter((file) => file.endsWith(`-${id}.txt`))
        .map((file) =>
          fs.unlink(path.join(folderPath, file)).catch((error) => {
            if (error.code !== "ENOENT") throw error;
          })
        )
    );
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  return { success: true };
});

// -------------------- Calendar events --------------------

ipcMain.handle("load-calendar-events", async () => {
  try {
    const file = await fs.readFile(dataPath(), "utf-8");
    const data = JSON.parse(file);
    return Array.isArray(data.calendarEvents) ? data.calendarEvents : [];
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
});

ipcMain.handle("save-calendar-events", async (_event, events) => {
  // Load the existing data so we don't overwrite tasks or notes.
  let existing = {};
  try {
    const file = await fs.readFile(dataPath(), "utf-8");
    existing = JSON.parse(file);
  } catch {
    // File doesn't exist yet — start fresh.
  }

  const updated = { ...existing, calendarEvents: events };
  await fs.mkdir(app.getPath("userData"), { recursive: true });
  await fs.writeFile(dataPath(), JSON.stringify(updated, null, 2), "utf-8");
  return { success: true };
});

// -------------------- Electron-owned countdown --------------------

function getRemainingSeconds() {
  if (!timerState.isRunning || !timerState.endAt) {
    return timerState.remainingSeconds;
  }

  return Math.max(
    0,
    Math.ceil((timerState.endAt - Date.now()) / 1000)
  );
}

function stopTimerInterval() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
}

function sendTimerUpdate() {
  timerState.remainingSeconds = getRemainingSeconds();

  if (timerState.remainingSeconds <= 0 && timerState.isRunning) {
    timerState.remainingSeconds = 0;
    timerState.isRunning = false;
    timerState.endAt = null;
    stopTimerInterval();

    try {
      if (Notification.isSupported()) {
        new Notification({
          title: "StudyDesk Focus Timer",
          body: "Focus session complete! Time to take a break.",
        }).show();
      }
    } catch (notifError) {
      console.warn("Could not display notification:", notifError);
    }
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

function startTimerInterval() {
  stopTimerInterval();

  timerState.isRunning = true;
  timerState.endAt =
    Date.now() + timerState.remainingSeconds * 1000;

  sendTimerUpdate();
  timerInterval = setInterval(sendTimerUpdate, 250);
}

function safeDuration(value) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds)) return 0;
  return Math.max(0, Math.floor(seconds));
}

ipcMain.handle("timer-start", (_event, durationSeconds) => {
  stopTimerInterval();

  timerState = {
    remainingSeconds: safeDuration(durationSeconds),
    isRunning: false,
    endAt: null,
  };

  if (timerState.remainingSeconds > 0) {
    startTimerInterval();
  } else {
    sendTimerUpdate();
  }

  return {
    remainingSeconds: timerState.remainingSeconds,
    isRunning: timerState.isRunning,
  };
});

ipcMain.handle("timer-pause", () => {
  timerState.remainingSeconds = getRemainingSeconds();
  timerState.isRunning = false;
  timerState.endAt = null;

  stopTimerInterval();
  sendTimerUpdate();

  return {
    remainingSeconds: timerState.remainingSeconds,
    isRunning: false,
  };
});

ipcMain.handle("timer-resume", () => {
  if (!timerState.isRunning && timerState.remainingSeconds > 0) {
    startTimerInterval();
  }

  return {
    remainingSeconds: getRemainingSeconds(),
    isRunning: timerState.isRunning,
  };
});

ipcMain.handle("timer-reset", (_event, durationSeconds) => {
  stopTimerInterval();

  timerState = {
    remainingSeconds: safeDuration(durationSeconds),
    isRunning: false,
    endAt: null,
  };

  sendTimerUpdate();

  return {
    remainingSeconds: timerState.remainingSeconds,
    isRunning: false,
  };
});

ipcMain.handle("timer-get-state", () => ({
  remainingSeconds: getRemainingSeconds(),
  isRunning: timerState.isRunning,
}));

// -------------------- Main application window --------------------

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

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// -------------------- Focus timer window --------------------

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
    stopTimerInterval();

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
  if (!timerWindow || timerWindow.isDestroyed()) {
    return { isFullScreen: false };
  }

  timerWindow.setFullScreen(!timerWindow.isFullScreen());
  return { requested: true };
});

ipcMain.handle("timer-close-window", () => {
  if (timerWindow && !timerWindow.isDestroyed()) {
    timerWindow.close();
  }

  return { success: true };
});

// -------------------- App lifecycle --------------------

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
