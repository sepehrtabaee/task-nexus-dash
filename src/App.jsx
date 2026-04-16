import { useState, useEffect, useCallback, useRef } from 'react';
import * as api from './api';

// ─── Setup Screen ───────────────────────────────────────────────────────────

function SetupScreen({ onSetup }) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const val = input.trim();
    if (!val) return;
    setLoading(true);
    setError('');
    try {
      const user = await api.findUser(val);
      if (user) {
        onSetup(user);
      } else {
        setError('User not found. Check your ID and try again.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="setup-screen">
      <div className="setup-card">
        <div className="setup-logo">✓</div>
        <h1>Task Manager</h1>
        <p>Enter your User ID or Telegram ID</p>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="User ID or Telegram ID"
            disabled={loading}
            autoComplete="off"
          />
          {error && <div className="error">{error}</div>}
          <button type="submit" disabled={loading || !input.trim()}>
            {loading ? 'Searching...' : 'Continue →'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Modal ───────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>{title}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── New List Modal ───────────────────────────────────────────────────────────

function NewListModal({ onClose, onCreated, userId }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const list = await api.createList({ user_id: userId, name: name.trim() });
      onCreated(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="New List" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="List name"
          disabled={loading}
        />
        <div className="modal-buttons">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel [Esc]
          </button>
          <button type="submit" className="btn-primary" disabled={loading || !name.trim()}>
            Create [Enter]
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── New Task Modal ───────────────────────────────────────────────────────────

function NewTaskModal({ onClose, onCreated, listId, listName }) {
  const [form, setForm] = useState({ title: '', description: '', due_date: '', priority: 1 });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setLoading(true);
    try {
      const data = {
        list_id: listId,
        title: form.title.trim(),
        priority: Number(form.priority),
      };
      if (form.description.trim()) data.description = form.description.trim();
      if (form.due_date) data.due_date = new Date(form.due_date).toISOString();
      const task = await api.createTask(data);
      onCreated(task);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={`New Task — ${listName}`} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          value={form.title}
          onChange={set('title')}
          placeholder="Title *"
          disabled={loading}
        />
        <input
          type="text"
          value={form.description}
          onChange={set('description')}
          placeholder="Description (optional)"
          disabled={loading}
        />
        <input
          type="datetime-local"
          value={form.due_date}
          onChange={set('due_date')}
          disabled={loading}
        />
        <select value={form.priority} onChange={set('priority')} disabled={loading}>
          <option value={1}>Normal priority</option>
          <option value={2}>High priority (!)</option>
          <option value={3}>Urgent priority (!!!)</option>
        </select>
        <div className="modal-buttons">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel [Esc]
          </button>
          <button type="submit" className="btn-primary" disabled={loading || !form.title.trim()}>
            Create [Enter]
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────

function ConfirmModal({ message, onConfirm, onClose }) {
  const btnRef = useRef(null);
  useEffect(() => {
    setTimeout(() => btnRef.current?.focus(), 50);
  }, []);

  return (
    <Modal title="Confirm" onClose={onClose}>
      <p className="confirm-message">{message}</p>
      <div className="modal-buttons">
        <button className="btn-secondary" onClick={onClose}>Cancel [Esc]</button>
        <button ref={btnRef} className="btn-danger" onClick={onConfirm}>Delete [Enter]</button>
      </div>
    </Modal>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

const POLL_MS = 5000;

function Dashboard({ user, onLogout }) {
  const [lists, setLists] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [taskCounts, setTaskCounts] = useState({}); // { [listId]: incompleteCount }
  const [taskFontSize, setTaskFontSize] = useState(14); // px
  const [listIdx, setListIdx] = useState(0);
  const [taskIdx, setTaskIdx] = useState(0);
  const [panel, setPanel] = useState('lists'); // 'lists' | 'tasks'
  const [concise, setConcise] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [apiError, setApiError] = useState(null);

  // Modals
  const [showNewList, setShowNewList] = useState(false);
  const [showNewTask, setShowNewTask] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // { type, id, name }

  const selectedListRowRef = useRef(null);
  const selectedTaskRowRef = useRef(null);

  const modalOpen = showNewList || showNewTask || !!confirmDelete;

  const selectedList = lists[listIdx] ?? null;

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchLists = useCallback(async () => {
    try {
      const data = await api.getListsByUserId(user.id);
      setLists(data ?? []);
      setLastUpdated(new Date());
      setApiError(null);
      // Fetch incomplete task counts for all lists in the background
      if (data?.length) {
        Promise.all(data.map((list) => api.getTasksByListId(list.id, concise).catch(() => [])))
          .then((results) => {
            const counts = {};
            data.forEach((list, i) => {
              counts[list.id] = (results[i] ?? []).filter((t) => !t.is_completed).length;
            });
            setTaskCounts(counts);
          })
          .catch(() => { });
      }
    } catch (err) {
      setApiError(err.message);
    }
  }, [user.id, concise]);

  const fetchTasks = useCallback(async () => {
    if (!selectedList) {
      setTasks([]);
      return;
    }
    try {
      const data = await api.getTasksByListId(selectedList.id, concise);
      const sorted = [...(data ?? [])].sort((a, b) => a.is_completed - b.is_completed);
      setTasks(sorted);
      setTaskCounts((prev) => ({
        ...prev,
        [selectedList.id]: (data ?? []).filter((t) => !t.is_completed).length,
      }));
    } catch (err) {
      console.error('Tasks fetch failed:', err.message);
    }
  }, [selectedList?.id, concise]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initial load + polling
  useEffect(() => {
    fetchLists();
    const id = setInterval(fetchLists, POLL_MS);
    return () => clearInterval(id);
  }, [fetchLists]);

  useEffect(() => {
    fetchTasks();
    const id = setInterval(fetchTasks, POLL_MS);
    return () => clearInterval(id);
  }, [fetchTasks]);

  // Reset task cursor when list changes
  useEffect(() => {
    setTaskIdx(0);
  }, [listIdx]);

  // Scroll selected list row into view on keyboard navigation
  useEffect(() => {
    selectedListRowRef.current?.scrollIntoView({ block: 'nearest' });
  }, [listIdx]);

  // Scroll selected task row into view on keyboard navigation
  useEffect(() => {
    selectedTaskRowRef.current?.scrollIntoView({ block: 'nearest' });
  }, [taskIdx]);

  // ── Keyboard navigation ────────────────────────────────────────────────────

  useEffect(() => {
    if (modalOpen) return;

    const handleKey = (e) => {
      const { key } = e;

      // Panel switching
      if (key === 'Tab') {
        e.preventDefault();
        setPanel((p) => (p === 'lists' ? 'tasks' : 'lists'));
        return;
      }
      if (key === 'ArrowLeft') { setPanel('lists'); return; }
      if (key === 'ArrowRight') { setPanel('tasks'); return; }

      // Navigation within panel
      if (key === 'ArrowUp') {
        e.preventDefault();
        if (panel === 'lists') setListIdx((i) => Math.max(0, i - 1));
        else setTaskIdx((i) => Math.max(0, i - 1));
        return;
      }
      if (key === 'ArrowDown') {
        e.preventDefault();
        if (panel === 'lists') setListIdx((i) => Math.min(lists.length - 1, i + 1));
        else setTaskIdx((i) => Math.min(tasks.length - 1, i + 1));
        return;
      }

      // Enter: select list or toggle task
      if (key === 'Enter') {
        if (panel === 'lists' && selectedList) {
          setPanel('tasks');
        } else if (panel === 'tasks' && tasks[taskIdx]) {
          handleToggleTask(tasks[taskIdx]);
        }
        return;
      }

      // N: new item
      if (key === 'n' || key === 'N') {
        if (panel === 'lists') setShowNewList(true);
        else if (selectedList) setShowNewTask(true);
        return;
      }

      // +/= and -: task font size
      if (key === '+' || key === '=') {
        setTaskFontSize((s) => Math.min(22, s + 1));
        return;
      }
      if (key === '-') {
        setTaskFontSize((s) => Math.max(10, s - 1));
        return;
      }

      // C: toggle concise mode
      if (key === 'c' || key === 'C') {
        setConcise((v) => !v);
        return;
      }

      // D / Delete: delete item
      if (key === 'd' || key === 'D' || key === 'Delete') {
        if (panel === 'lists' && selectedList) {
          setConfirmDelete({ type: 'list', id: selectedList.id, name: selectedList.name });
        } else if (panel === 'tasks' && tasks[taskIdx]) {
          setConfirmDelete({ type: 'task', id: tasks[taskIdx].id, name: tasks[taskIdx].title });
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [modalOpen, panel, lists, tasks, listIdx, taskIdx, selectedList, concise]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleToggleTask = async (task) => {
    try {
      await api.updateTask(task.id, { is_completed: !task.is_completed });
      await fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    const { type, id } = confirmDelete;
    setConfirmDelete(null);
    try {
      if (type === 'list') {
        await api.deleteList(id);
        setListIdx((i) => Math.max(0, i - 1));
        await fetchLists();
      } else {
        await api.deleteTask(id);
        setTaskIdx((i) => Math.max(0, i - 1));
        await fetchTasks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ── Derived ────────────────────────────────────────────────────────────────

  const completedCount = tasks.filter((t) => t.is_completed).length;
  const displayName = user.username || user.first_name || user.telegram_id || user.id;
  const timeStr = lastUpdated?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <span className="app-title">✓ Task Manager</span>
          <span className="user-badge">{displayName}</span>
        </div>
        <div className="header-right">
          {apiError && <span className="api-error">⚠ {apiError}</span>}
          {timeStr && !apiError && <span className="last-updated">↺ {timeStr}</span>}
          <span className={`concise-badge ${concise ? 'is-on' : 'is-off'}`}>
            {concise ? 'Concise ON' : 'Concise OFF'}
          </span>
          <button className="btn-ghost" onClick={onLogout}>Change User</button>
        </div>
      </header>

      {/* Two-panel layout */}
      <div className="panels">
        {/* Lists panel */}
        <div className={`panel panel-lists ${panel === 'lists' ? 'is-active' : ''}`}>
          <div className="panel-head">
            <span>Lists</span>
            <span className="panel-count">{lists.length}</span>
          </div>
          <div className="panel-body">
            {lists.length === 0 ? (
              <div className="empty">
                <span>No lists yet</span>
                <span className="empty-hint">Press N to create one</span>
              </div>
            ) : (
              lists.map((list, idx) => (
                <div
                  key={list.id}
                  ref={idx === listIdx ? selectedListRowRef : null}
                  className={`row row-list ${idx === listIdx ? 'is-selected' : ''}`}
                  onClick={() => {
                    setListIdx(idx);
                    setPanel('lists');
                  }}
                  onDoubleClick={() => {
                    setListIdx(idx);
                    setPanel('tasks');
                  }}
                >
                  <span className="row-icon">{idx === listIdx ? '▸' : ' '}</span>
                  <span className="row-name">{list.name}</span>
                  {taskCounts[list.id] > 0 && (
                    <span className="list-task-count">{taskCounts[list.id]}</span>
                  )}
                </div>
              ))
            )}
          </div>
          <div className="panel-foot">
            <kbd>N</kbd> New &nbsp; <kbd>D</kbd> Delete
          </div>
        </div>

        {/* Tasks panel */}
        <div className={`panel panel-tasks ${panel === 'tasks' ? 'is-active' : ''}`} style={{ '--task-fs': `${taskFontSize}px` }}>
          <div className="panel-head">
            <span>{selectedList ? selectedList.name : 'Select a list'}</span>
            {tasks.length > 0 && (
              <span className="panel-count">{completedCount}/{tasks.length}</span>
            )}
          </div>
          <div className="panel-body">
            {!selectedList ? (
              <div className="empty">
                <span>← Select a list first</span>
              </div>
            ) : tasks.length === 0 ? (
              <div className="empty">
                <span>No tasks yet</span>
                <span className="empty-hint">Press N to create one</span>
              </div>
            ) : (
              tasks.map((task, idx) => {
                const isSelected = idx === taskIdx && panel === 'tasks';
                const overdue =
                  task.due_date &&
                  !task.is_completed &&
                  new Date(task.due_date) < new Date();
                return (
                  <div
                    key={task.id}
                    ref={idx === taskIdx ? selectedTaskRowRef : null}
                    className={`row row-task ${isSelected ? 'is-selected' : ''} ${task.is_completed ? 'is-done' : ''}`}
                    onClick={() => {
                      setTaskIdx(idx);
                      setPanel('tasks');
                    }}
                    onDoubleClick={() => handleToggleTask(task)}
                  >
                    <span className={`task-check ${task.is_completed ? 'checked' : ''}`}>
                      {task.is_completed ? '✓' : '○'}
                    </span>
                    <div className="task-body">
                      <span className="task-title">{task.title}</span>
                      {task.description && (
                        <span className="task-desc">{task.description}</span>
                      )}
                      {task.due_date && (
                        <span className={`task-due ${overdue ? 'overdue' : ''}`}>
                          {overdue ? '⚠ ' : ''}
                          {new Date(task.due_date).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>
                    {task.priority > 1 && (
                      <span className={`task-priority p${task.priority}`}>
                        {'!'.repeat(task.priority)}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
          <div className="panel-foot">
            <kbd>N</kbd> New &nbsp; <kbd>D</kbd> Delete &nbsp; <kbd>Enter</kbd> Toggle done &nbsp; <kbd>+</kbd><kbd>-</kbd> Font size
          </div>
        </div>
      </div>

      {/* Footer shortcuts */}
      <footer className="footer">
        <span><kbd>Tab</kbd> / <kbd>←</kbd><kbd>→</kbd> Switch panel</span>
        <span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
        <span><kbd>Enter</kbd> Select / Toggle</span>
        <span><kbd>N</kbd> New</span>
        <span><kbd>D</kbd> Delete</span>
        <span><kbd>C</kbd> Toggle concise</span>
      </footer>

      {/* Modals */}
      {showNewList && (
        <NewListModal
          userId={user.id}
          onClose={() => setShowNewList(false)}
          onCreated={async () => {
            setShowNewList(false);
            await fetchLists();
            setListIdx(lists.length); // point to new list (will be at end)
          }}
        />
      )}

      {showNewTask && selectedList && (
        <NewTaskModal
          listId={selectedList.id}
          listName={selectedList.name}
          onClose={() => setShowNewTask(false)}
          onCreated={async () => {
            setShowNewTask(false);
            await fetchTasks();
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          message={`Delete "${confirmDelete.name}"?`}
          onConfirm={handleConfirmDelete}
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('tm_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleSetup = (u) => {
    localStorage.setItem('tm_user', JSON.stringify(u));
    setUser(u);
  };

  const handleLogout = () => {
    localStorage.removeItem('tm_user');
    setUser(null);
  };

  return user ? (
    <Dashboard user={user} onLogout={handleLogout} />
  ) : (
    <SetupScreen onSetup={handleSetup} />
  );
}
