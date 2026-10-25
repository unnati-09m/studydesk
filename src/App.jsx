
import { useEffect, useRef, useState } from "react";
import "./App.css";

function StudyDeskApp() {
  // Current page
  const [page, setPage] = useState("Overview");

  // Tasks and multiple saved notes
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [newTaskSubject, setNewTaskSubject] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [taskFilter, setTaskFilter] = useState("all");
  const [savedNotes, setSavedNotes] = useState([
    { id: 1, title: "Untitled note", content: "", updatedAt: Date.now() },
  ]);
  const [activeNoteId, setActiveNoteId] = useState(1);
  const [noteSearchQuery, setNoteSearchQuery] = useState("");


  // Electron data-saving status
  const [dataLoaded, setDataLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState("All changes saved");

  // Calendar state
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth()); // 0-indexed
  const [selectedDate, setSelectedDate] = useState(null); // "YYYY-MM-DD" string
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null); // null = new, object = editing
  const [eventTitle, setEventTitle] = useState("");
  const [eventNote, setEventNote] = useState("");
  const [eventCategory, setEventCategory] = useState("General");
  const [calendarSaveStatus, setCalendarSaveStatus] = useState("");

  const [taskSearchQuery, setTaskSearchQuery] = useState("");

  const completedCount = tasks.filter(
    (task) => task.completed
  ).length;

  const filteredTasks = tasks.filter((task) => {
    if (taskFilter === "pending" && task.completed) return false;
    if (taskFilter === "completed" && !task.completed) return false;
    if (taskSearchQuery.trim()) {
      const q = taskSearchQuery.toLowerCase().trim();
      const matchTitle = task.title?.toLowerCase().includes(q);
      const matchSubject = task.subject?.toLowerCase().includes(q);
      return matchTitle || matchSubject;
    }
    return true;
  });

  const filteredNotes = savedNotes.filter((note) => {
    if (!noteSearchQuery.trim()) return true;
    const q = noteSearchQuery.toLowerCase().trim();
    const matchTitle = note.title?.toLowerCase().includes(q);
    const matchContent = note.content?.toLowerCase().includes(q);
    return matchTitle || matchContent;
  });

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

          if (Array.isArray(savedData.savedNotes) && savedData.savedNotes.length > 0) {
            setSavedNotes(savedData.savedNotes);
            const requestedActiveId = savedData.activeNoteId;
            const activeExists = savedData.savedNotes.some(
              (note) => note.id === requestedActiveId
            );
            setActiveNoteId(activeExists ? requestedActiveId : savedData.savedNotes[0].id);
          } else if (typeof savedData.notes === "string" && savedData.notes.length > 0) {
            // Migrate the old single-note format without losing its content.
            const legacyNote = {
              id: Date.now(),
              title: savedData.notes.split("\n")[0].trim().slice(0, 40) || "My first note",
              content: savedData.notes,
              updatedAt: Date.now(),
            };
            setSavedNotes([legacyNote]);
            setActiveNoteId(legacyNote.id);
          } else {
            const firstNote = {
              id: Date.now(),
              title: "Untitled note",
              content: "",
              updatedAt: Date.now(),
            };
            setSavedNotes([firstNote]);
            setActiveNoteId(firstNote.id);
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

  // Auto-save tasks whenever the tasks list changes.
  // dataLoaded makes sure we don't save before the initial load finishes.
  useEffect(() => {
    if (!dataLoaded) return;
    if (!window.studyDesk) return;

    window.studyDesk.saveData({
      tasks,
      notes: "",
      savedNotes,
      activeNoteId,
    }).catch((error) => {
      console.error("Could not auto-save tasks:", error);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, dataLoaded]);

  // Notes are saved only when the user clicks the Save note button.
  async function saveNotesManually() {
    if (!dataLoaded) return;

    if (!window.studyDesk) {
      setSaveStatus("Desktop storage unavailable");
      return;
    }

    setSaveStatus("Saving...");

    try {
      const currentActiveNote = savedNotes.find((note) => note.id === activeNoteId);

      await window.studyDesk.saveData({
        tasks,
        // Keep this field for compatibility with older saved data.
        notes: currentActiveNote?.content ?? "",
        savedNotes,
        activeNoteId,
      });

      if (window.studyDesk.saveNoteTxt) {
        await Promise.all(
          savedNotes.map((note) =>
            window.studyDesk.saveNoteTxt({
              id: note.id,
              title: note.title || "Untitled note",
              content: note.content || "",
            })
          )
        );
        setSaveStatus("Saved successfully");
      } else {
        setSaveStatus("Saved in app; TXT saving is not configured");
      }
    } catch (error) {
      console.error("Could not save notes:", error);
      setSaveStatus("Could not save — try again");
    }
  }

  // Support Ctrl+S / Cmd+S shortcut to manually save notes
  useEffect(() => {
    function handleKeyDown(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        if (page === "Quick notes") {
          event.preventDefault();
          saveNotesManually();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, dataLoaded, tasks, savedNotes, activeNoteId]);

  const activeNote = savedNotes.find((note) => note.id === activeNoteId) ?? savedNotes[0];

  function createNote() {
    const newNote = {
      id: Date.now(),
      title: "Untitled note",
      content: "",
      updatedAt: Date.now(),
    };
    setSavedNotes((currentNotes) => [newNote, ...currentNotes]);
    setActiveNoteId(newNote.id);
    setSaveStatus("Unsaved changes");
  }

  function updateActiveNoteTitle(title) {
    setSavedNotes((currentNotes) =>
      currentNotes.map((note) =>
        note.id === activeNoteId
          ? { ...note, title, updatedAt: Date.now() }
          : note
      )
    );
    setSaveStatus("Unsaved changes");
  }

  function updateActiveNote(content) {
    setSavedNotes((currentNotes) =>
      currentNotes.map((note) =>
        note.id === activeNoteId
          ? { ...note, content, updatedAt: Date.now() }
          : note
      )
    );
    setSaveStatus("Unsaved changes");
  }

  function deleteNote(noteId) {
    const targetNote = savedNotes.find((note) => note.id === noteId);
    if (targetNote && (targetNote.content.trim() || (targetNote.title && targetNote.title !== "Untitled note"))) {
      const noteName = targetNote.title.trim() || "Untitled note";
      if (!window.confirm(`Delete "${noteName}"? This action cannot be undone.`)) {
        return;
      }
    }

    const remainingNotes = savedNotes.filter((note) => note.id !== noteId);

    if (window.studyDesk?.deleteNoteTxt) {
      window.studyDesk.deleteNoteTxt(noteId).catch((error) => {
        console.error("Could not delete note text file:", error);
      });
    }

    if (remainingNotes.length === 0) {
      const blankNote = {
        id: Date.now(),
        title: "Untitled note",
        content: "",
        updatedAt: Date.now(),
      };
      setSavedNotes([blankNote]);
      setActiveNoteId(blankNote.id);
      return;
    }

    setSavedNotes(remainingNotes);
    if (activeNoteId === noteId) {
      setActiveNoteId(remainingNotes[0].id);
    }
  }


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
      subject: newTaskSubject.trim() || "Personal",
      dueDate: newTaskDueDate || "",
      time: "No time set",
      completed: false,
    };

    setTasks((currentTasks) => [...currentTasks, task]);
    setNewTask("");
    setNewTaskSubject("");
    setNewTaskDueDate("");
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

  // Clear all completed tasks at once.
  function clearCompletedTasks() {
    if (completedCount === 0) return;
    if (!window.confirm(`Clear all ${completedCount} completed task(s)?`)) return;
    setTasks((currentTasks) => currentTasks.filter((task) => !task.completed));
  }

  // ---- Calendar helpers ----

  // Load calendar events from Electron when the app starts.
  useEffect(() => {
    if (!window.studyDesk?.loadCalendarEvents) return;
    window.studyDesk.loadCalendarEvents().then((events) => {
      setCalendarEvents(events);
    }).catch((error) => {
      console.error("Could not load calendar events:", error);
    });
  }, []);

  // Save all calendar events to disk.
  async function saveCalendarEvents(updatedEvents) {
    if (!window.studyDesk?.saveCalendarEvents) return;
    try {
      await window.studyDesk.saveCalendarEvents(updatedEvents);
    } catch (error) {
      console.error("Could not save calendar events:", error);
    }
  }

  // Get the date string "YYYY-MM-DD" for any date.
  function toDateString(year, month, day) {
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${year}-${mm}-${dd}`;
  }

  // Get events for a specific date string.
  function eventsForDate(dateString) {
    return calendarEvents.filter((ev) => ev.date === dateString);
  }

  // Navigate calendar months.
  function prevMonth() {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear((y) => y - 1);
    } else {
      setCalendarMonth((m) => m - 1);
    }
    setSelectedDate(null);
    setShowEventForm(false);
  }

  function nextMonth() {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear((y) => y + 1);
    } else {
      setCalendarMonth((m) => m + 1);
    }
    setSelectedDate(null);
    setShowEventForm(false);
  }

  // Jump calendar back to today's date and month.
  function goToToday() {
    const now = new Date();
    setCalendarYear(now.getFullYear());
    setCalendarMonth(now.getMonth());
    setSelectedDate(todayString);
    setShowEventForm(false);
  }

  // Click a day on the calendar.
  function selectDay(dateString) {
    setSelectedDate(dateString);
    setShowEventForm(false);
    setEditingEvent(null);
    setEventTitle("");
    setEventNote("");
    setEventCategory("General");
  }

  // Open the "add event" form for the selected date.
  function openAddEventForm() {
    setEditingEvent(null);
    setEventTitle("");
    setEventNote("");
    setEventCategory("General");
    setShowEventForm(true);
  }

  // Open the "edit event" form for an existing event.
  function openEditEventForm(event) {
    setEditingEvent(event);
    setEventTitle(event.title);
    setEventNote(event.note || "");
    setEventCategory(event.category || "General");
    setShowEventForm(true);
  }

  // Save (add or update) an event.
  async function saveEvent() {
    const title = eventTitle.trim();
    if (!title) {
      setCalendarSaveStatus("Please enter an event title.");
      return;
    }
    if (!selectedDate) return;

    let updatedEvents;

    if (editingEvent) {
      // Update existing event.
      updatedEvents = calendarEvents.map((ev) =>
        ev.id === editingEvent.id
          ? {
              ...ev,
              title,
              note: eventNote.trim(),
              category: eventCategory || "General",
            }
          : ev
      );
    } else {
      // Add new event.
      const newEvent = {
        id: Date.now(),
        date: selectedDate,
        title,
        note: eventNote.trim(),
        category: eventCategory || "General",
      };
      updatedEvents = [...calendarEvents, newEvent];
    }

    setCalendarEvents(updatedEvents);
    await saveCalendarEvents(updatedEvents);
    setShowEventForm(false);
    setEditingEvent(null);
    setEventTitle("");
    setEventNote("");
    setEventCategory("General");
    setCalendarSaveStatus("Event saved!");
    setTimeout(() => setCalendarSaveStatus(""), 2500);
  }

  // Delete an event.
  async function deleteEvent(eventId) {
    const targetEvent = calendarEvents.find((ev) => ev.id === eventId);
    const eventName = targetEvent?.title || "this event";
    if (!window.confirm(`Delete "${eventName}"? This action cannot be undone.`)) {
      return;
    }
    const updatedEvents = calendarEvents.filter((ev) => ev.id !== eventId);
    setCalendarEvents(updatedEvents);
    await saveCalendarEvents(updatedEvents);
  }

  // Build the grid of days for the current month.
  function buildCalendarDays() {
    const firstDay = new Date(calendarYear, calendarMonth, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    // Pad the start so day 1 falls on the correct weekday.
    const cells = Array(firstDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(d);
    }
    return cells;
  }

  // Today's date string, for highlighting.
  const todayString = toDateString(
    new Date().getFullYear(),
    new Date().getMonth(),
    new Date().getDate()
  );

  const monthNames = [
    "January", "February", "March", "April",
    "May", "June", "July", "August",
    "September", "October", "November", "December",
  ];

  // Upcoming events: next 7 days from today.
  function getUpcomingEvents() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in7Days = new Date(today);
    in7Days.setDate(today.getDate() + 7);

    return calendarEvents
      .filter((ev) => {
        const evDate = new Date(ev.date + "T00:00:00");
        return evDate >= today && evDate <= in7Days;
      })
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5);
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
          {["Overview", "My tasks", "Focus timer", "Quick notes", "Calendar"].map(
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
                    <span>{String(completedCount).padStart(2, "0")} / {String(tasks.length).padStart(2, "0")}</span>
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
                    Click Save note when you are ready to keep them.
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

          {/* Upcoming events from calendar — only show if events exist in next 7 days */}
          {getUpcomingEvents().length > 0 && (
            <section className="upcoming-section">
              <div className="upcoming-heading">
                <p className="eyebrow">COMING UP</p>
                <h2>Upcoming this week.</h2>
              </div>

              <div className="upcoming-list">
                {getUpcomingEvents().map((ev) => (
                  <div key={ev.id} className="upcoming-event-row">
                    <div className="upcoming-date-badge">
                      <span className="upcoming-day">
                        {new Date(ev.date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric" })}
                      </span>
                      <span className="upcoming-month">
                        {new Date(ev.date + "T00:00:00").toLocaleDateString("en-IN", { month: "short" })}
                      </span>
                    </div>
                    <div className="upcoming-event-info">
                      <div className="upcoming-title-row">
                        <p className="upcoming-event-title">{ev.title}</p>
                        {ev.category && (
                          <span className={`cal-event-category cat-${ev.category.toLowerCase()}`}>
                            {ev.category}
                          </span>
                        )}
                      </div>
                      {ev.note && <p className="upcoming-event-note">{ev.note}</p>}
                    </div>
                    <button
                      className="upcoming-view-btn"
                      onClick={() => {
                        const evDate = new Date(ev.date + "T00:00:00");
                        setCalendarMonth(evDate.getMonth());
                        setCalendarYear(evDate.getFullYear());
                        setSelectedDate(ev.date);
                        openPage("Calendar");
                      }}
                    >
                      View →
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

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

            <div className="task-controls-bar">
              <div className="task-filter-tabs">
                <button
                  type="button"
                  className={`task-filter-btn ${taskFilter === "all" ? "active" : ""}`}
                  onClick={() => setTaskFilter("all")}
                >
                  All ({tasks.length})
                </button>
                <button
                  type="button"
                  className={`task-filter-btn ${taskFilter === "pending" ? "active" : ""}`}
                  onClick={() => setTaskFilter("pending")}
                >
                  Pending ({tasks.length - completedCount})
                </button>
                <button
                  type="button"
                  className={`task-filter-btn ${taskFilter === "completed" ? "active" : ""}`}
                  onClick={() => setTaskFilter("completed")}
                >
                  Completed ({completedCount})
                </button>
              </div>

              <input
                type="text"
                className="task-search-input"
                placeholder="Search tasks..."
                value={taskSearchQuery}
                onChange={(e) => setTaskSearchQuery(e.target.value)}
                aria-label="Search tasks"
              />
            </div>

            <div className="task-list">
              {filteredTasks.length === 0 && (
                <p className="empty-state">
                  {tasks.length === 0
                    ? "Nothing on your list yet. Add your first task below."
                    : taskSearchQuery.trim()
                    ? `No tasks matching "${taskSearchQuery}".`
                    : taskFilter === "pending"
                    ? "All caught up! No pending tasks."
                    : "No completed tasks yet."}
                </p>
              )}

              {filteredTasks.map((task) => (
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
                    <div className="task-badges-row">
                      {task.subject && (
                        <span className="task-subject-badge">{task.subject}</span>
                      )}
                      {task.dueDate && (
                        <span className="task-due-badge">📅 {task.dueDate}</span>
                      )}
                    </div>
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
                placeholder="What needs to get done?"
                aria-label="New task"
              />
              <input
                type="text"
                className="task-subject-input"
                value={newTaskSubject}
                onChange={(event) => setNewTaskSubject(event.target.value)}
                placeholder="Subject (optional)"
                aria-label="Subject"
              />
              <input
                type="date"
                className="task-due-input"
                value={newTaskDueDate}
                onChange={(event) => setNewTaskDueDate(event.target.value)}
                aria-label="Due date"
                title="Due date (optional)"
              />

              <button className="primary-button" type="submit">
                Add task +
              </button>
            </form>

            <div className="task-summary-row">
              <p className="task-summary">
                {completedCount} of {tasks.length} tasks completed
              </p>
              {completedCount > 0 && (
                <button
                  type="button"
                  className="clear-completed-btn"
                  onClick={clearCompletedTasks}
                >
                  Clear completed ({completedCount})
                </button>
              )}
            </div>
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
              Open timer window ↗
            </button>
          </section>
        </section>
      )}

      {/* Quick notes page */}
      {page === "Quick notes" && (
        <section className="inner-page notes-page">
          <div className="section-heading">
            <p className="eyebrow">SAVE THAT THOUGHT</p>
            <h2>A place for your ideas.</h2>
            <p className="section-description">
              Give each note a title, write freely in the editor, then click Save note when you are ready.
            </p>
          </div>

          <section className="notes-workspace">
            <aside className="notes-sidebar">
              <div className="notes-sidebar-heading">
                <div>
                  <h3>Saved notes</h3>
                  <p>{savedNotes.length} {savedNotes.length === 1 ? "note" : "notes"}</p>
                </div>
                <button className="primary-button notes-new-button" onClick={createNote} aria-label="Create new note">
                  + New
                </button>
              </div>

              <div className="notes-search-wrap">
                <input
                  type="text"
                  className="notes-search-input"
                  placeholder="Search notes..."
                  value={noteSearchQuery}
                  onChange={(e) => setNoteSearchQuery(e.target.value)}
                  aria-label="Search notes"
                />
              </div>

              <div className="saved-notes-list">
                {filteredNotes.length === 0 ? (
                  <p className="empty-state">
                    {noteSearchQuery.trim()
                      ? `No notes matching "${noteSearchQuery}".`
                      : "No notes yet."}
                  </p>
                ) : (
                  filteredNotes.map((note) => (
                    <div
                      className={`saved-note-item ${note.id === activeNoteId ? "active" : ""}`}
                      key={note.id}
                    >
                      <button className="saved-note-select" onClick={() => setActiveNoteId(note.id)}>
                        <span className="saved-note-title">{note.title || "Untitled note"}</span>
                        <span className="saved-note-preview">
                          {note.content.trim() ? note.content.trim().replace(/\s+/g, " ").slice(0, 72) : "No content yet"}
                        </span>
                        <span className="saved-note-date">
                          {note.updatedAt ? new Date(note.updatedAt).toLocaleDateString() : "New note"}
                        </span>
                      </button>
                      <button
                        className="saved-note-delete"
                        onClick={() => deleteNote(note.id)}
                        aria-label={`Delete ${note.title || "note"}`}
                        title="Delete note"
                      >×</button>
                    </div>
                  ))
                )}
              </div>
            </aside>

            <section className="utility-panel notes-editor-panel">
              <div className="notes-editor-heading">
                <div>
                  <p className="eyebrow">CURRENT NOTE</p>
                  <h3>Write your note</h3>
                </div>
                <span className="save-status">{saveStatus}</span>
              </div>

              <label className="note-title-label" htmlFor="note-title">Title</label>
              <input
                id="note-title"
                className="note-title-input"
                type="text"
                value={activeNote?.title ?? ""}
                onChange={(event) => updateActiveNoteTitle(event.target.value)}
                placeholder="Give your note a title..."
                aria-label="Note title"
              />

              <label className="note-title-label" htmlFor="note-content">Your notes</label>
              <textarea
                id="note-content"
                className="notes-editor"
                value={activeNote?.content ?? ""}
                onChange={(event) => updateActiveNote(event.target.value)}
                placeholder="Start writing here... Your note content will stay separate from the title."
                aria-label="Current note content"
                rows={24}
              />
              
<div className="notes-editor-footer">
  <p className="notes-hint">
    {(activeNote?.content ?? "").length} characters
  </p>

  <div className="notes-save-actions">
    <span
      role="status"
      className={`save-feedback ${
        saveStatus === "Saved successfully"
          ? "save-success"
          : saveStatus.includes("Could not") ||
            saveStatus.includes("unavailable")
          ? "save-error"
          : ""
      }`}
    >
      {saveStatus === "Saved successfully"
        ? "✓ Saved successfully!"
        : saveStatus === "Saving..."
        ? "Saving your note..."
        : saveStatus === "Unsaved changes"
        ? "Unsaved changes"
        : saveStatus === "All changes saved"
        ? ""
        : saveStatus}
    </span>

    <button
      type="button"
      className="notes-save-button"
      onClick={saveNotesManually}
      disabled={!dataLoaded || saveStatus === "Saving..."}
      title="Save note (Ctrl+S / ⌘S)"
    >
      {saveStatus === "Saving..." ? "Saving..." : "Save note"}
    </button>
  </div>
</div>

            </section>
          </section>
        </section>
      )}

      {/* Study Calendar page */}
      {page === "Calendar" && (
        <section className="inner-page">
          <div className="section-heading">
            <p className="eyebrow">PLAN YOUR MONTH</p>
            <h2>Study calendar.</h2>
            <p className="section-description">
              Click any date to add a study event or deadline.
            </p>
          </div>

          <section className="calendar-layout">
            {/* Left: calendar grid */}
            <div className="calendar-panel">
              <div className="calendar-nav">
                <button className="cal-nav-btn" onClick={prevMonth} aria-label="Previous month">‹</button>
                <div className="cal-nav-center">
                  <span className="cal-month-label">
                    {monthNames[calendarMonth]} {calendarYear}
                  </span>
                  <button className="cal-today-btn" onClick={goToToday} title="Jump to today">
                    Today
                  </button>
                </div>
                <button className="cal-nav-btn" onClick={nextMonth} aria-label="Next month">›</button>
              </div>

              {/* Day-of-week headers */}
              <div className="calendar-grid">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div key={d} className="cal-weekday">{d}</div>
                ))}

                {/* Day cells */}
                {buildCalendarDays().map((day, index) => {
                  if (day === null) {
                    return <div key={`empty-${index}`} className="cal-day cal-day-empty" />;
                  }
                  const dateStr = toDateString(calendarYear, calendarMonth, day);
                  const isToday = dateStr === todayString;
                  const isSelected = dateStr === selectedDate;
                  const hasEvents = eventsForDate(dateStr).length > 0;

                  return (
                    <button
                      key={dateStr}
                      className={[
                        "cal-day",
                        isToday ? "cal-day-today" : "",
                        isSelected ? "cal-day-selected" : "",
                        hasEvents ? "cal-day-has-events" : "",
                      ].join(" ").trim()}
                      onClick={() => selectDay(dateStr)}
                      aria-label={`${monthNames[calendarMonth]} ${day}, ${calendarYear}`}
                      aria-pressed={isSelected}
                    >
                      <span className="cal-day-num">{day}</span>
                      {hasEvents && <span className="cal-event-dot" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: selected date events + form */}
            <div className="calendar-sidebar">
              {selectedDate ? (
                <>
                  <div className="cal-sidebar-heading">
                    <h3>
                      {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-IN", {
                        weekday: "long", day: "numeric", month: "long",
                      })}
                    </h3>
                    <button
                      className="primary-button cal-add-btn"
                      onClick={openAddEventForm}
                    >
                      + Add event
                    </button>
                  </div>

                  {/* Event form */}
                  {showEventForm && (
                    <form
                      className="cal-event-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        saveEvent();
                      }}
                    >
                      <label className="cal-form-label" htmlFor="event-title">
                        Event title *
                      </label>
                      <input
                        id="event-title"
                        className="cal-form-input"
                        type="text"
                        value={eventTitle}
                        onChange={(e) => { setEventTitle(e.target.value); setCalendarSaveStatus(""); }}
                        placeholder="e.g. DBMS exam, Assignment due"
                        autoFocus
                      />

                      <label className="cal-form-label" htmlFor="event-category">
                        Category
                      </label>
                      <select
                        id="event-category"
                        className="cal-form-input cal-form-select"
                        value={eventCategory}
                        onChange={(e) => setEventCategory(e.target.value)}
                      >
                        <option value="General">General</option>
                        <option value="Exam">Exam</option>
                        <option value="Assignment">Assignment</option>
                        <option value="Lecture">Lecture</option>
                        <option value="Deadline">Deadline</option>
                      </select>

                      <label className="cal-form-label" htmlFor="event-note">
                        Note (optional)
                      </label>
                      <input
                        id="event-note"
                        className="cal-form-input"
                        type="text"
                        value={eventNote}
                        onChange={(e) => setEventNote(e.target.value)}
                        placeholder="Any extra details..."
                      />

                      {calendarSaveStatus && (
                        <p className="cal-form-error">{calendarSaveStatus}</p>
                      )}

                      <div className="cal-form-actions">
                        <button className="primary-button" type="submit">
                          {editingEvent ? "Update event" : "Save event"}
                        </button>
                        <button
                          className="secondary-button"
                          type="button"
                          onClick={() => { setShowEventForm(false); setCalendarSaveStatus(""); }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  {/* List of events on this date */}
                  <div className="cal-events-list">
                    {eventsForDate(selectedDate).length === 0 ? (
                      <p className="cal-empty">No events on this date. Click "+ Add event" to add one.</p>
                    ) : (
                      eventsForDate(selectedDate).map((ev) => (
                        <div key={ev.id} className="cal-event-item">
                          <div className="cal-event-info">
                            <div className="cal-event-title-row">
                              <p className="cal-event-title">{ev.title}</p>
                              {ev.category && (
                                <span className={`cal-event-category cat-${ev.category.toLowerCase()}`}>
                                  {ev.category}
                                </span>
                              )}
                            </div>
                            {ev.note && <p className="cal-event-note">{ev.note}</p>}
                          </div>
                          <div className="cal-event-actions">
                            <button
                              className="cal-event-edit"
                              onClick={() => openEditEventForm(ev)}
                              aria-label={`Edit ${ev.title}`}
                              title="Edit event"
                            >✎</button>
                            <button
                              className="cal-event-delete"
                              onClick={() => deleteEvent(ev.id)}
                              aria-label={`Delete ${ev.title}`}
                              title="Delete event"
                            >×</button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <div className="cal-empty-sidebar">
                  <p className="cal-empty">Select a date on the calendar to view or add events.</p>
                </div>
              )}
            </div>
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
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [completedSessions, setCompletedSessions] = useState(() => {
    try {
      return Number(localStorage.getItem("studydesk_sessions_count") || 0);
    } catch {
      return 0;
    }
  });

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

  // Web Audio API synthesized completion chime
  function playTimerChime() {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      const playTone = (freq, start, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.12, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + duration);
      };

      playTone(587.33, now, 0.35); // D5
      playTone(880.0, now + 0.15, 0.55); // A5
      playTone(1174.66, now + 0.3, 0.8); // D6
    } catch (err) {
      console.warn("Could not play audio chime:", err);
    }
  }

  const prevRemainingRef = useRef(remainingSeconds);

  useEffect(() => {
    if (prevRemainingRef.current > 0 && remainingSeconds === 0 && hasStarted) {
      playTimerChime();
      setCompletedSessions((prev) => {
        const next = prev + 1;
        try {
          localStorage.setItem("studydesk_sessions_count", String(next));
        } catch {
          // Ignore
        }
        return next;
      });
    }
    prevRemainingRef.current = remainingSeconds;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingSeconds, hasStarted]);

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
    setHasStarted(false);
    if (state) {
      setRemainingSeconds(state.remainingSeconds);
      setIsRunning(Boolean(state.isRunning));
    }
  }

  async function setPreset(hours, minutes, seconds) {
    setTimerHours(String(hours));
    setTimerMinutes(String(minutes));
    setTimerSeconds(String(seconds));
    const totalSecs = hours * 3600 + minutes * 60 + seconds;
    const state = await window.studyDesk?.resetTimer(totalSecs);
    setHasStarted(false);
    if (state) {
      setRemainingSeconds(state.remainingSeconds);
      setIsRunning(Boolean(state.isRunning));
    }
  }

async function startPauseTimer() {
  if (isRunning) {
    await window.studyDesk?.pauseTimer();
    return;
  }

  if (!hasStarted || remainingSeconds <= 0) {
    const duration = getSelectedDuration();

    if (duration < 1) {
      window.alert("Set a duration greater than 00:00:00 before starting.");
      return;
    }

    await window.studyDesk?.startTimer(duration);
    setHasStarted(true);
    return;
  }

  await window.studyDesk?.resumeTimer();
}


  async function resetTimer() {
    const duration = getSelectedDuration();
    const state = await window.studyDesk?.resetTimer(duration);
    setHasStarted(false);
    if (state) {
      setRemainingSeconds(state.remainingSeconds ?? duration);
      setIsRunning(Boolean(state.isRunning));
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
          <button
            className="secondary-button"
            onClick={() => setSoundEnabled((prev) => !prev)}
            title="Toggle audio chime"
          >
            {soundEnabled ? "Sound: On 🔔" : "Sound: Muted 🔕"}
          </button>
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

              <div className="timer-presets">
                <button type="button" className="timer-preset-btn" onClick={() => setPreset(0, 25, 0)}>
                  25m Pomodoro
                </button>
                <button type="button" className="timer-preset-btn" onClick={() => setPreset(0, 5, 0)}>
                  5m Break
                </button>
                <button type="button" className="timer-preset-btn" onClick={() => setPreset(0, 15, 0)}>
                  15m Rest
                </button>
                <button type="button" className="timer-preset-btn" onClick={() => setPreset(0, 50, 0)}>
                  50m Deep
                </button>
              </div>

              <button className="secondary-button" onClick={applyDuration}>
                Set custom duration
              </button>
            </>
          )}

          <p className="timer-display">{formatTime(remainingSeconds)}</p>

          <div className="timer-session-badge">
            <span>🎯 {completedSessions} focus session{completedSessions === 1 ? "" : "s"} completed</span>
          </div>

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
