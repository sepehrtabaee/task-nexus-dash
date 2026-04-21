import { useState, useEffect, useCallback, useRef } from 'react';
import * as api from './api';
import { supabase } from './supabase';

// ─── Login Screen ────────────────────────────────────────────────────────────

function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const emailRef = useRef(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError('');
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) throw authError;
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
        <p>Sign in to your account</p>
        <form onSubmit={handleSubmit}>
          <input
            ref={emailRef}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            disabled={loading}
            autoComplete="email"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            disabled={loading}
            autoComplete="current-password"
          />
          {error && <div className="error">{error}</div>}
          <button type="submit" disabled={loading || !email.trim() || !password}>
            {loading ? 'Signing in...' : 'Sign in →'}
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

// ─── Edit List Modal ──────────────────────────────────────────────────────────

function EditListModal({ onClose, onSaved, list }) {
  const [name, setName] = useState(list.name ?? '');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed === list.name) {
      onClose();
      return;
    }
    setLoading(true);
    try {
      const updated = await api.updateList(list.id, { name: trimmed });
      onSaved(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Edit List" onClose={onClose}>
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
            Save [Enter]
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Edit Task Modal ──────────────────────────────────────────────────────────

function isoToLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function EditTaskModal({ onClose, onSaved, task, listName }) {
  const [form, setForm] = useState({
    title: task.title ?? '',
    description: task.description ?? '',
    due_date: isoToLocalInput(task.due_date),
    priority: task.priority ?? 1,
    is_completed: !!task.is_completed,
  });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
  }, []);

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setLoading(true);
    try {
      const data = {
        title: form.title.trim(),
        description: form.description.trim(),
        priority: Number(form.priority),
        is_completed: form.is_completed,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
      };
      const updated = await api.updateTask(task.id, data);
      onSaved(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={`Edit Task${listName ? ` — ${listName}` : ''}`} onClose={onClose}>
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
          placeholder="Description"
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
        <label className="modal-checkbox">
          <input
            type="checkbox"
            checked={form.is_completed}
            onChange={set('is_completed')}
            disabled={loading}
          />
          <span>Completed</span>
        </label>
        <div className="modal-buttons">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel [Esc]
          </button>
          <button type="submit" className="btn-primary" disabled={loading || !form.title.trim()}>
            Save [Enter]
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

const POLL_MS = 15000;
const NIGHT_POLL_MS = 60000;

function getPollInterval(now = new Date()) {
  const hour = now.getHours();
  return hour >= 2 && hour < 6 ? NIGHT_POLL_MS : POLL_MS;
}

function isMobileViewport() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;
}

function Dashboard({ user, onLogout }) {
  const [lists, setLists] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [taskCounts, setTaskCounts] = useState({}); // { [listId]: taskCount }
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
  const [editList, setEditList] = useState(null); // list object being edited
  const [editTask, setEditTask] = useState(null); // task object being edited
  const [confirmDelete, setConfirmDelete] = useState(null); // { type, id, name }

  const selectedListRowRef = useRef(null);
  const selectedTaskRowRef = useRef(null);

  const modalOpen = showNewList || showNewTask || !!editList || !!editTask || !!confirmDelete;

  const selectedList = lists[listIdx] ?? null;

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchLists = useCallback(async () => {
    try {
      const data = await api.getListsByUserId(user.id);
      const listsData = data ?? [];
      setLists(listsData);
      setLastUpdated(new Date());
      setApiError(null);
      const counts = {};
      listsData.forEach((list) => {
        counts[list.id] = list.pending_task_count ?? 0;
      });
      setTaskCounts(counts);
    } catch (err) {
      setApiError(err.message);
    }
  }, [user.id]);

  const fetchTasks = useCallback(async () => {
    if (!selectedList) {
      setTasks([]);
      return;
    }
    try {
      const data = await api.getTasksByListId(selectedList.id, concise);
      const sorted = [...(data ?? [])].sort((a, b) => a.is_completed - b.is_completed);
      setTasks(sorted);
    } catch (err) {
      console.error('Tasks fetch failed:', err.message);
    }
  }, [selectedList?.id, concise]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initial load + polling
  useEffect(() => {
    let timeoutId;
    let cancelled = false;
    const tick = async () => {
      await fetchLists();
      if (cancelled) return;
      timeoutId = setTimeout(tick, getPollInterval());
    };
    tick();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [fetchLists]);

  useEffect(() => {
    let timeoutId;
    let cancelled = false;
    const tick = async () => {
      await fetchTasks();
      if (cancelled) return;
      timeoutId = setTimeout(tick, getPollInterval());
    };
    tick();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
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

      // E: edit selected item
      if (key === 'e' || key === 'E') {
        if (panel === 'lists' && selectedList) {
          setEditList(selectedList);
        } else if (panel === 'tasks' && tasks[taskIdx]) {
          setEditTask(tasks[taskIdx]);
        }
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
      <div className="panels" data-active-panel={panel}>
        {/* Lists panel */}
        <div className={`panel panel-lists ${panel === 'lists' ? 'is-active' : ''}`}>
          <div className="panel-head">
            <span>Lists</span>
            <span className="panel-count">{lists.length}</span>
            <button
              className="mobile-action"
              onClick={() => setShowNewList(true)}
              aria-label="New list"
            >
              + New
            </button>
          </div>
          <div className="panel-body">
            {lists.length === 0 ? (
              <div className="empty">
                <span>No lists yet</span>
                <span className="empty-hint">Tap + New to create one</span>
              </div>
            ) : (
              lists.map((list, idx) => (
                <div
                  key={list.id}
                  ref={idx === listIdx ? selectedListRowRef : null}
                  className={`row row-list ${idx === listIdx ? 'is-selected' : ''}`}
                  onClick={() => {
                    setListIdx(idx);
                    setPanel(isMobileViewport() ? 'tasks' : 'lists');
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
                  <button
                    className="row-edit"
                    onClick={(e) => {
                      e.stopPropagation();
                      setListIdx(idx);
                      setEditList(list);
                    }}
                    aria-label="Edit list"
                    title="Edit list"
                  >
                    ✎
                  </button>
                </div>
              ))
            )}
          </div>
          <div className="panel-foot">
            <kbd>N</kbd> New &nbsp; <kbd>E</kbd> Edit &nbsp; <kbd>D</kbd> Delete
          </div>
        </div>

        {/* Tasks panel */}
        <div className={`panel panel-tasks ${panel === 'tasks' ? 'is-active' : ''}`} style={{ '--task-fs': `${taskFontSize}px` }}>
          <div className="panel-head">
            <button
              className="mobile-back"
              onClick={() => setPanel('lists')}
              aria-label="Back to lists"
            >
              ← Lists
            </button>
            <span className="panel-head-title">{selectedList ? selectedList.name : 'Select a list'}</span>
            {tasks.length > 0 && (
              <span className="panel-count">{completedCount}/{tasks.length}</span>
            )}
            {selectedList && (
              <button
                className="mobile-action"
                onClick={() => setShowNewTask(true)}
                aria-label="New task"
              >
                + New
              </button>
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
                    <button
                      className="row-edit"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTaskIdx(idx);
                        setEditTask(task);
                      }}
                      aria-label="Edit task"
                      title="Edit task"
                    >
                      ✎
                    </button>
                  </div>
                );
              })
            )}
          </div>
          <div className="panel-foot">
            <kbd>N</kbd> New &nbsp; <kbd>E</kbd> Edit &nbsp; <kbd>D</kbd> Delete &nbsp; <kbd>Enter</kbd> Toggle done &nbsp; <kbd>+</kbd><kbd>-</kbd> Font size
          </div>
        </div>
      </div>

      {/* Footer shortcuts */}
      <footer className="footer">
        <span><kbd>Tab</kbd> / <kbd>←</kbd><kbd>→</kbd> Switch panel</span>
        <span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
        <span><kbd>Enter</kbd> Select / Toggle</span>
        <span><kbd>N</kbd> New</span>
        <span><kbd>E</kbd> Edit</span>
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

      {editList && (
        <EditListModal
          list={editList}
          onClose={() => setEditList(null)}
          onSaved={async () => {
            setEditList(null);
            await fetchLists();
          }}
        />
      )}

      {editTask && (
        <EditTaskModal
          task={editTask}
          listName={selectedList?.name}
          onClose={() => setEditTask(null)}
          onSaved={async () => {
            setEditTask(null);
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
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        try {
          const profile = await api.getUser(session.user.id);
          setUser(profile);
        } catch {
          setUser(null);
        }
      }
      setAuthReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        try {
          const profile = await api.getUser(session.user.id);
          setUser(profile);
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (!authReady) return null;

  return user ? (
    <Dashboard user={user} onLogout={handleLogout} />
  ) : (
    <LoginScreen />
  );
}
