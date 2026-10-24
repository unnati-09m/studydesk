
import { useEffect, useState } from "react";
import "./App.css";

const initialTasks = [
  {
    id: 1,
    title: "Revise data structures",
    subject: "ADA",
    time: "10:00 AM",
    completed: false,
  },
  {
    id: 2,
    title: "Complete database assignment",
    subject: "DBMS",
    time: "12:00 PM",
    completed: false,
  },
  {
    id: 3,
    title: "Review lecture notes",
    subject: "Maths",
    time: "2:00 PM",
    completed: true,
  },
];

function StudyDeskApp() {
  // Current page
  const [page, setPage] = useState("Overview");

  // Tasks and notes
  const [tasks, setTasks] = useState(initialTasks);
  const [newTask, setNewTask] = useState("");
  const [notes, setNotes] = useState("");


  // Electron data-saving status
  const [dataLoaded, setDataLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState("All changes saved");

  const completedCount = tasks.filter(
    (task) => task.completed
  ).length;

  // Load saved tasks and notes from Electron.
  useEffect(() => {
    async function loadSavedData() {
      try {
        if (!window.studyDesk) {
          return;
        }

        const savedData = await window.studyDesk.loadData();

        if (savedData) {
          if (Array.isArray(savedData.tasks)) {
            setTasks(savedData.tasks);
          }

          if (typeof savedData.notes === "string") {
            setNotes(savedData.notes);
          }
        }
      } catch (error) {
        console.error("Could not load saved data:", error);
      } finally {
        setDataLoaded(true);
      }
    }

    loadSavedData();
  }, []);

  // Save tasks and notes after five seconds without changes.
  useEffect(() => {
    if (!dataLoaded) return;

    if (!window.studyDesk) {
      setSaveStatus("Desktop storage unavailable");
      return;
    }

    setSaveStatus("Saving changes...");

    const saveTimer = window.setTimeout(async () => {
      try {
        await window.studyDesk.saveData({ tasks, notes });
        setSaveStatus("All changes saved");
      } catch (error) {
        console.error("Could not save data:", error);
        setSaveStatus("Unable to save changes");
      }
    }, 5000);

    return () => window.clearTimeout(saveTimer);
  }, [tasks, notes, dataLoaded]);


  // Navigate between pages.
  function openPage(selectedPage) {
    setPage(selectedPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Add a new task.
  function addTask(event) {
    event.preventDefault();

    const title = newTask.trim();

    if (!title) return;

    const task = {
      id: Date.now(),
      title,
      subject: "Personal",
      time: "No time set",
      completed: false,
    };

    setTasks((currentTasks) => [...currentTasks, task]);
    setNewTask("");
  }

  // Mark a task as completed or incomplete.
  function toggleTask(id) {
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === id
          ? { ...task, completed: !task.completed }
          : task
      )
    );
  }

  // Delete a task.
  function deleteTask(id) {
    setTasks((currentTasks) =>
      currentTasks.filter((task) => task.id !== id)
    );
  }


  return (
    <main className="app-shell">
      {/* Navigation */}
      <header className="topbar">
        <button
          className="brand"
          onClick={() => openPage("Overview")}
          aria-label="Go to home"
        >
          StudyDesk
        </button>

        <nav className="navigation" aria-label="Main navigation">
          {["Overview", "My tasks", "Focus timer", "Quick notes"].map(
            (item) => (
              <button
                key={item}
                className={`nav-link ${
                  page === item ? "active" : ""
                }`}
                onClick={() => openPage(item)}
              >
                {item}
              </button>
            )
          )}
        </nav>
      </header>

      {/* Overview page */}
      {page === "Overview" && (
        <>
          <section className="hero">
            <div className="hero-content">
              <p className="eyebrow">YOUR SPACE. YOUR PACE.</p>

              <h1>
                Make room
                <br />
                for learning.
              </h1>

              <p className="hero-description">
                One task at a time. One step closer to your goals.
              </p>

              <button
                className="hero-button"
                onClick={() => openPage("My tasks")}
              >
                Get started <span>→</span>
              </button>
            </div>
          </section>

          {/* Feature sections */}
          <section className="feature-section">
            <div className="feature-heading">
              <p className="eyebrow">EXPLORE YOUR WORKSPACE</p>

              <h2>Everything you need, in one quiet place.</h2>

              <p className="section-description">
                A little more clarity for your everyday study routine.
              </p>
            </div>

            <div className="feature-list">
              {/* Tasks preview */}
              <button
                className="feature-row tasks-row"
                onClick={() => openPage("My tasks")}
              >
                <div className="feature-copy">
                  <p className="feature-number">01 / ORGANIZE</p>

                  <h3>Make space for what matters.</h3>

                  <p>
                    Keep your assignments and daily tasks together.
                    Break big goals into small, manageable steps.
                  </p>

                  <span className="feature-link">
                    Explore tasks →
                  </span>
                </div>

                <div className="feature-visual tasks-visual">
                  <div className="preview-header">
                    <span>MY TASKS</span>
                    <span>02 / 03</span>
                  </div>

                  <div className="preview-progress">
                    <div />
                  </div>

                  <div className="preview-task">
                    <span className="preview-check completed">✓</span>
                    <span className="preview-task-text">
                      Review lecture notes
                    </span>
                  </div>

                  <div className="preview-task">
                    <span className="preview-check" />
                    <span className="preview-task-text">
                      Complete assignment
                    </span>
                  </div>

                  <div className="preview-task">
                    <span className="preview-check" />
                    <span className="preview-task-text">
                      Prepare for quiz
                    </span>
                  </div>
                </div>
              </button>

              {/* Timer preview */}
              <button
                className="feature-row timer-row"
                onClick={() => openPage("Focus timer")}
              >
                <div className="feature-copy">
                  <p className="feature-number">02 / FOCUS</p>

                  <h3>Give your attention room to breathe.</h3>

                  <p>
                    Set your own study duration and settle into one
                    uninterrupted session at a time.
                  </p>

                  <span className="feature-link">
                    Find your focus →
                  </span>
                </div>

                <div className="feature-visual timer-visual">
                  <span className="preview-label">FOCUS SESSION</span>

                  <div className="preview-timer">25:00</div>

                  <span className="preview-subtitle">
                    Ready when you are.
                  </span>

                  <div className="preview-timer-actions">
                    <span className="preview-start">
                      ▶ &nbsp; Start focus
                    </span>
                    <span className="preview-reset">↺</span>
                  </div>
                </div>
              </button>

              {/* Notes preview */}
              <button
                className="feature-row notes-row"
                onClick={() => openPage("Quick notes")}
              >
                <div className="feature-copy">
                  <p className="feature-number">03 / CAPTURE</p>

                  <h3>Keep a little space for every idea.</h3>

                  <p>
                    Write down thoughts, reminders, and class notes.
                    Your changes save automatically.
                  </p>

                  <span className="feature-link">
                    Open your notes →
                  </span>
                </div>

                <div className="feature-visual notes-visual">
                  <div className="preview-header">
                    <span>QUICK NOTES</span>
                    <span className="preview-saved">Saved</span>
                  </div>

                  <div className="preview-note-title">
                    Lecture notes
                  </div>

                  <div className="preview-note-line long" />
                  <div className="preview-note-line medium" />
                  <div className="preview-note-line long" />
                  <div className="preview-note-line short" />

                  <span className="preview-note-footer">
                    A thought worth keeping.
                  </span>
                </div>
              </button>
            </div>
          </section>

          {/* Decorative connector */}
          <section
            className="connector-section"
            aria-hidden="true"
          >
            <div className="connector-line">
              <span className="connector-dot green" />
              <span className="connector-dot peach" />
              <span className="connector-dot mauve" />
              <span className="connector-dot blue" />
            </div>

            <p className="connector-caption">
              A little space to focus, create, and grow.
            </p>
          </section>

          {/* Quote */}
          <section className="quote-section">
            <span className="quote-mark">“</span>

            <blockquote>
              Great things are done by a series of small things
              brought together.
            </blockquote>

            <p className="quote-author">— Vincent van Gogh</p>
          </section>
        </>
      )}

      {/* My tasks page */}
      {page === "My tasks" && (
        <section className="inner-page">
          <div className="section-heading">
            <p className="eyebrow">STAY ON TRACK</p>

            <h2>Your to-do list.</h2>

            <p className="section-description">
              Small steps, steady progress. Start with one thing.
            </p>
          </div>

          <section className="tasks-panel">
            <div className="panel-heading">
              <h3>My tasks</h3>

              <span className="count-badge">
                {String(tasks.length).padStart(2, "0")}
              </span>
            </div>

            <div className="task-list">
              {tasks.length === 0 && (
                <p className="empty-state">
                  Nothing on your list yet. Add your first task below.
                </p>
              )}

              {tasks.map((task) => (
                <article
                  className={`task-row ${
                    task.completed ? "is-completed" : ""
                  }`}
                  key={task.id}
                >
                  <button
                    className={`task-check ${
                      task.completed ? "checked" : ""
                    }`}
                    onClick={() => toggleTask(task.id)}
                    aria-label={`Toggle ${task.title}`}
                  >
                    {task.completed ? "✓" : ""}
                  </button>

                  <div className="task-content">
                    <p className="task-title">{task.title}</p>
                  </div>

                  <button
                    className="task-delete"
                    onClick={() => deleteTask(task.id)}
                    aria-label={`Delete ${task.title}`}
                  >
                    ×
                  </button>
                </article>
              ))}
            </div>

            <form className="add-task-form" onSubmit={addTask}>
              <input
                type="text"
                value={newTask}
                onChange={(event) => setNewTask(event.target.value)}
                placeholder="What needs to get done?"
                aria-label="New task"
              />

              <button className="primary-button" type="submit">
                Add task +
              </button>
            </form>

            <p className="task-summary">
              {completedCount} of {tasks.length} tasks completed
            </p>
          </section>
        </section>
      )}

      {/* Focus timer page */}
      {page === "Focus timer" && (
        <section className="inner-page">
          <div className="section-heading">
            <p className="eyebrow">MAKE TIME FOR WHAT MATTERS</p>
            <h2>Your time. Your pace.</h2>
            <p className="section-description">
              Open a dedicated timer window, set your duration, and focus.
            </p>
          </div>

          <section className="utility-panel focus-panel">
            <p className="eyebrow">YOUR FOCUS SESSION</p>
            <h3>Focus timer window</h3>
            <p className="utility-description">
              Your countdown will be managed by Electron and can run in its own
              resizable, maximizable, full-screen window.
            </p>
            <button
              className="primary-button"
              onClick={() => window.studyDesk?.openTimerWindow()}
            >
              Open timer window
            </button>
          </section>
        </section>
      )}

      {/* Quick notes page */}
      {page === "Quick notes" && (
        <section className="inner-page">
          <div className="section-heading">
            <p className="eyebrow">SAVE THAT THOUGHT</p>

            <h2>A place for your ideas.</h2>

            <p className="section-description">
              Write freely. Your changes save automatically after
              five seconds of inactivity.
            </p>
          </div>

          <section className="utility-panel notes-panel">
            <div className="panel-heading">
              <h3>Quick notes</h3>

              <span className="save-status">{saveStatus}</span>
            </div>

            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Start writing something worth remembering..."
              aria-label="Quick notes"
              rows={12}
            />

            <p className="notes-hint">{notes.length} characters</p>
          </section>
        </section>
      )}
    </main>
  );
}

function TimerWindow() {
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [timerHours, setTimerHours] = useState("0");
  const [timerMinutes, setTimerMinutes] = useState("0");
  const [timerSeconds, setTimerSeconds] = useState("0");
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    let unsubscribeTimer;
    let unsubscribeFullscreen;

    async function syncTimer() {
      try {
        const state = await window.studyDesk?.getTimerState();
        if (state) {
          setRemainingSeconds(state.remainingSeconds ?? 0);
          setIsRunning(Boolean(state.isRunning));
        }
      } catch (error) {
        console.error("Could not read timer state:", error);
      }
    }

    syncTimer();
    unsubscribeTimer = window.studyDesk?.onTimerUpdate((state) => {
      setRemainingSeconds(state.remainingSeconds ?? 0);
      setIsRunning(Boolean(state.isRunning));
    });
    unsubscribeFullscreen = window.studyDesk?.onTimerFullscreenUpdate?.((state) => {
      setIsFullScreen(Boolean(state.isFullScreen));
    });

    return () => {
      if (typeof unsubscribeTimer === "function") unsubscribeTimer();
      if (typeof unsubscribeFullscreen === "function") unsubscribeFullscreen();
    };
  }, []);

  function getSelectedDuration() {
    const hours = Number(timerHours);
    const minutes = Number(timerMinutes);
    const secs = Number(timerSeconds);

    if (
      timerHours.trim() === "" ||
      timerMinutes.trim() === "" ||
      timerSeconds.trim() === "" ||
      !Number.isInteger(hours) ||
      !Number.isInteger(minutes) ||
      !Number.isInteger(secs) ||
      hours < 0 || hours > 999 ||
      minutes < 0 || minutes > 99999 ||
      secs < 0 || secs > 59
    ) {
      return 0;
    }

    return hours * 3600 + minutes * 60 + secs;
  }

  function formatTime(totalSeconds) {
    const safeSeconds = Math.max(0, totalSeconds);
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const secs = safeSeconds % 60;

    return [hours, minutes, secs]
      .map((part) => String(part).padStart(2, "0"))
      .join(":");
  }

  async function applyDuration() {
    const duration = getSelectedDuration();

    if (duration < 1) {
      window.alert("Enter a duration greater than 00:00:00 first.");
      return;
    }

    const state = await window.studyDesk?.resetTimer(duration);

    // A newly selected duration has not started yet.
    setHasStarted(false);

    if (state) {
      setRemainingSeconds(state.remainingSeconds ?? duration);
      setIsRunning(Boolean(state.isRunning));
    } else {
      setRemainingSeconds(duration);
      setIsRunning(false);
    }
  }

  async function startPauseTimer() {
    if (isRunning) {
      await window.studyDesk?.pauseTimer();
      return;
    }

    // Start a fresh session after setting a duration, resetting, or opening a new timer window.
    if (!hasStarted || remainingSeconds <= 0) {
      const duration = getSelectedDuration();

      if (duration < 1) {
        window.alert("Set a duration greater than 00:00:00 before starting.");
        return;
      }

      const state = await window.studyDesk?.startTimer(duration);
      setHasStarted(true);

      if (state) {
        setRemainingSeconds(state.remainingSeconds ?? duration);
        setIsRunning(Boolean(state.isRunning));
      }
      return;
    }

    // Resume only a session that was started and then paused.
    const state = await window.studyDesk?.resumeTimer();
    if (state) {
      setRemainingSeconds(state.remainingSeconds ?? remainingSeconds);
      setIsRunning(Boolean(state.isRunning));
    }
  }

  async function resetTimer() {
    const duration = getSelectedDuration();
    const state = await window.studyDesk?.resetTimer(duration);

    setHasStarted(false);

    if (state) {
      setRemainingSeconds(state.remainingSeconds ?? duration);
      setIsRunning(Boolean(state.isRunning));
    } else {
      setRemainingSeconds(duration);
      setIsRunning(false);
    }
  }

  async function toggleFullscreen() {
    // The actual state is updated by Electron's enter/leave-full-screen events.
    // Do not set React state from the immediate IPC result: macOS may update it later.
    await window.studyDesk?.toggleTimerFullscreen();
  }

  async function closeTimerWindow() {
    try {
      await window.studyDesk?.closeTimerWindow();
    } catch (error) {
      console.error("Could not close timer window:", error);
    }
  }

  return (
    <main className={`app-shell timer-window-shell ${isRunning ? "timer-running-minimal" : ""}`}>
      <header className="topbar timer-window-topbar">
        <span className="brand">StudyDesk</span>
        <div className="timer-window-window-actions">
          <button className="secondary-button" onClick={toggleFullscreen}>
            {isFullScreen ? "Exit full screen" : "Full screen ⛶"}
          </button>
          <button className="secondary-button" onClick={closeTimerWindow}>
            Exit window ×
          </button>
        </div>
      </header>

      <section className="inner-page timer-window-page">
        <section className="utility-panel focus-panel timer-window-panel">
          {!isRunning && (
            <>
              <p className="eyebrow">FOCUS TIMER</p>
              <label className="duration-label">Set your session duration</label>

              <div className="duration-controls">
                <div className="time-field">
                  <label htmlFor="timer-hours">Hours</label>
                  <input id="timer-hours" className="duration-input" type="number"
                    min="0" max="999" step="1" value={timerHours}
                    onChange={(event) => setTimerHours(event.target.value)} />
                </div>
                <div className="time-field">
                  <label htmlFor="timer-minutes">Minutes</label>
                  <input id="timer-minutes" className="duration-input" type="number"
                    min="0" max="99999" step="1" value={timerMinutes}
                    onChange={(event) => setTimerMinutes(event.target.value)} />
                </div>
                <div className="time-field">
                  <label htmlFor="timer-seconds">Seconds</label>
                  <input id="timer-seconds" className="duration-input" type="number"
                    min="0" max="59" step="1" value={timerSeconds}
                    onChange={(event) => setTimerSeconds(event.target.value)} />
                </div>
              </div>

              <button className="secondary-button" onClick={applyDuration}>
                Set duration
              </button>
            </>
          )}

          <p className="timer-display">{formatTime(remainingSeconds)}</p>

          <div className="timer-actions timer-window-timer-actions">
            <button className="primary-button" onClick={startPauseTimer}>
              {isRunning ? "Pause" : hasStarted && remainingSeconds > 0 ? "Resume" : "Start"}
            </button>
            <button className="secondary-button" onClick={resetTimer}>Reset</button>
          </div>

          {!isRunning && remainingSeconds === 0 && (
            <p className="utility-description">Enter a duration to begin.</p>
          )}
          {!isRunning && remainingSeconds > 0 && (
            <p className="utility-description">Ready when you are.</p>
          )}
        </section>
      </section>
    </main>
  );
}

function App() {
  const isTimerWindow = new URLSearchParams(window.location.search).get("window") === "timer";
  return isTimerWindow ? <TimerWindow /> : <StudyDeskApp />;
}

export default App;
