
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
  const [isRunning, setIsRunning] = useState(false);

  const completedCount = tasks.filter((task) => task.completed).length;

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

  function toggleTask(id) {
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === id
          ? { ...task, completed: !task.completed }
          : task,
      ),
    );
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

  function deleteTask(id) {
    setTasks((currentTasks) =>
      currentTasks.filter((task) => task.id !== id),
    );
  }

  function resetTimer() {
    setIsRunning(false);
    setSeconds(25 * 60);
  }

  function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds,
    ).padStart(2, "0")}`;
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <button
          className="brand"
          onClick={() => setPage("Overview")}
          aria-label="Go to overview"
        >
          <span className="brand-mark">S.</span>
          <span>StudyDesk</span>
        </button>

        <nav className="navigation" aria-label="Main navigation">
          {["Overview", "My tasks", "Focus timer", "Quick notes"].map(
            (item) => (
              <button
                key={item}
                className={`nav-link ${page === item ? "active" : ""}`}
                onClick={() => setPage(item)}
              >
                {item}
              </button>
            ),
          )}
        </nav>

        <span className="workspace-label">PERSONAL WORKSPACE</span>
      </header>

      {page === "Overview" && (
        <section className="hero">
          <p className="eyebrow">YOUR SPACE. YOUR PACE.</p>

          <h1>Make room for learning.</h1>

          <p className="hero-description">
            One task at a time. One step closer to your goals.
          </p>

          <span className="hero-divider" aria-hidden="true" />

          <p className="quote">
            “Great things are done by a series of small things brought together.”
          </p>

          <p className="quote-author">— Vincent van Gogh</p>
        </section>
      )}

      <section className="workspace">
        <div className="section-heading">
          <div>
            <p className="eyebrow">YOUR PERSONAL STUDY SPACE</p>

            <h2>{page === "Overview" ? "Your workspace" : page}</h2>

            <p className="section-description">
              {page === "Overview"
                ? "Everything you need to settle into a study session."
                : page === "My tasks"
                  ? "Keep track of what needs to get done."
                  : page === "Focus timer"
                    ? "Give one thing your full attention."
                    : "A quiet place to collect your thoughts."}
            </p>
          </div>
        </div>

        {(page === "Overview" || page === "My tasks") && (
          <div className="tasks-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">STAY ON TRACK</p>
                <h3>My tasks</h3>
              </div>

              <span className="count-badge">
                {String(tasks.length).padStart(2, "0")}
              </span>
            </div>

            <div className="task-list">
              {tasks.map((task) => (
                <article
                  className={`task-row ${task.completed ? "is-completed" : ""}`}
                  key={task.id}
                >
                  <button
                    className={`task-check ${task.completed ? "checked" : ""}`}
                    onClick={() => toggleTask(task.id)}
                    aria-label={
                      task.completed
                        ? `Mark ${task.title} incomplete`
                        : `Complete ${task.title}`
                    }
                  >
                    {task.completed ? "✓" : ""}
                  </button>

                  <div className="task-content">
                    <p className="task-title">{task.title}</p>
                    <p className="task-meta">
                      {task.subject}
                      <span className="meta-dot">·</span>
                      {task.time}
                    </p>
                  </div>

                  <button
                    className="task-delete"
                    onClick={() => deleteTask(task.id)}
                    aria-label={`Delete ${task.title}`}
                    title="Delete task"
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
                placeholder="Add a task to your list..."
                aria-label="New task title"
              />

              <button type="submit" className="primary-button">
                + Add task
              </button>
            </form>

            <p className="task-summary">
              {completedCount} of {tasks.length} tasks completed
            </p>
          </div>
        )}

        {(page === "Overview" || page === "Focus timer") && (
          <section className="utility-panel focus-panel">
            <div className="utility-heading">
              <div>
                <p className="eyebrow">TAKE A MOMENT</p>
                <h3>Focus timer</h3>
              </div>

              <span className="utility-icon">◷</span>
            </div>

            <p className="timer-display">{formatTime(seconds)}</p>

            <p className="utility-description">
              A little uninterrupted time can go a long way.
            </p>

            <div className="timer-actions">
              <button
                className="primary-button"
                onClick={() => {
                  if (seconds === 0) setSeconds(25 * 60);
                  setIsRunning(!isRunning && seconds > 0);
                }}
              >
                {isRunning
                  ? "Pause"
                  : seconds === 0
                    ? "Start again"
                    : "Start focus"}
              </button>

              <button className="secondary-button" onClick={resetTimer}>
                Reset
              </button>
            </div>
          </section>
        )}

        {(page === "Overview" || page === "Quick notes") && (
          <section className="utility-panel notes-panel">
            <div className="utility-heading">
              <div>
                <p className="eyebrow">SAVE THAT THOUGHT</p>
                <h3>Quick notes</h3>
              </div>

              <span className="utility-icon">↗</span>
            </div>

            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Write something you want to remember..."
              aria-label="Quick notes"
              rows={5}
            />

            <p className="notes-hint">{notes.length} characters</p>
          </section>
        )}
      </section>

      <footer className="app-footer">
        <span>StudyDesk</span>
        <span>A little progress daily.</span>
      </footer>
    </main>
  );
}

export default App;
