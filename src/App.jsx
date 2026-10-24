
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

function App() {
  const [page, setPage] = useState("Overview");
  const [tasks, setTasks] = useState(initialTasks);
  const [newTask, setNewTask] = useState("");
  const [notes, setNotes] = useState("");
  const [seconds, setSeconds] = useState(25 * 60);
  const [duration, setDuration] = useState(25);
  const [isRunning, setIsRunning] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState("All changes saved");

  const completedCount = tasks.filter(
    (task) => task.completed
  ).length;

  // Load tasks and notes from the local JSON file.
  useEffect(() => {
    async function loadSavedData() {
      try {
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

  // Focus timer countdown.
  useEffect(() => {
    if (!isRunning) return;

    const timer = window.setInterval(() => {
      setSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          setIsRunning(false);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isRunning]);

  function openPage(selectedPage) {
    setPage(selectedPage);
  }

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

  function toggleTask(id) {
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === id
          ? { ...task, completed: !task.completed }
          : task
      )
    );
  }

  function deleteTask(id) {
    setTasks((currentTasks) =>
      currentTasks.filter((task) => task.id !== id)
    );
  }

  function changeDuration(event) {
    const minutes = Number(event.target.value);

    if (minutes >= 1 && minutes <= 600) {
      setDuration(minutes);
      setIsRunning(false);
      setSeconds(minutes * 60);
    }
  }

  function resetTimer() {
    setIsRunning(false);
    setSeconds(duration * 60);
  }

  function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
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

      {/* Home page */}
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
              {/* Tasks: text left, image right */}
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
    <span className="preview-task-text">Review lecture notes</span>
  </div>

  <div className="preview-task">
    <span className="preview-check" />
    <span className="preview-task-text">Complete assignment</span>
  </div>

  <div className="preview-task">
    <span className="preview-check" />
    <span className="preview-task-text">Prepare for quiz</span>
  </div>
</div>

              </button>

              {/* Timer: image left, text right */}
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

  <span className="preview-subtitle">Ready when you are.</span>

  <div className="preview-timer-actions">
    <span className="preview-start">▶ &nbsp; Start focus</span>
    <span className="preview-reset">↺</span>
  </div>
</div>

              </button>

              {/* Notes: text left, image right */}
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

  <div className="preview-note-title">Lecture notes</div>

  <div className="preview-note-line long" />
  <div className="preview-note-line medium" />
  <div className="preview-note-line long" />
  <div className="preview-note-line short" />

  <span className="preview-note-footer">A thought worth keeping.</span>
</div>

              </button>
            </div>
          </section>

          {/* Quote at the end of the home page */}

{/* Decorative dotted connector section */}
<section className="connector-section" aria-hidden="true">
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
              Choose a duration and give one thing your full attention.
            </p>
          </div>

          <section className="utility-panel focus-panel">
            <p className="eyebrow">YOUR FOCUS SESSION</p>

            <label className="duration-label" htmlFor="duration">
              Session length in minutes
            </label>

            <input
              id="duration"
              className="duration-input"
              type="number"
              min="1"
              max="600"
              value={duration}
              disabled={isRunning}
              onChange={changeDuration}
            />

            <p className="timer-display">{formatTime(seconds)}</p>

            <p className="utility-description">
              A little uninterrupted time can go a long way.
            </p>

            <div className="timer-actions">
              <button
                className="primary-button"
                onClick={() => {
                  if (seconds === 0) {
                    setSeconds(duration * 60);
                    setIsRunning(true);
                  } else {
                    setIsRunning((running) => !running);
                  }
                }}
              >
                {isRunning
                  ? "Pause session"
                  : seconds === 0
                    ? "Start again"
                    : "Start focus"}
              </button>

              <button
                className="secondary-button"
                onClick={resetTimer}
              >
                Reset
              </button>
            </div>

            {seconds === 0 && (
              <p className="task-summary">
                Your focus session is complete. Well done!
              </p>
            )}
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

            <p className="notes-hint">
              {notes.length} characters
            </p>
          </section>
        </section>
      )}
    </main>
  );
}

export default App;
