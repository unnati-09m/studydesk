const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("studyDesk", {
  // Existing local data storage
  loadData: () => ipcRenderer.invoke("load-data"),
  saveData: (data) => ipcRenderer.invoke("save-data", data),

  // Timer window and timer controls
  openTimerWindow: () => ipcRenderer.invoke("open-timer-window"),
  startTimer: (durationSeconds) => ipcRenderer.invoke("timer-start", durationSeconds),
  pauseTimer: () => ipcRenderer.invoke("timer-pause"),
  resumeTimer: () => ipcRenderer.invoke("timer-resume"),
  resetTimer: (durationSeconds) => ipcRenderer.invoke("timer-reset", durationSeconds),
  getTimerState: () => ipcRenderer.invoke("timer-get-state"),
  toggleTimerFullscreen: () => ipcRenderer.invoke("timer-toggle-fullscreen"),
  closeTimerWindow: () => ipcRenderer.invoke("timer-close-window"),

  onTimerUpdate: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on("timer-update", listener);
    return () => ipcRenderer.removeListener("timer-update", listener);
  },

  onTimerFullscreenUpdate: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on("timer-fullscreen-update", listener);
    return () => ipcRenderer.removeListener("timer-fullscreen-update", listener);
  },
});
