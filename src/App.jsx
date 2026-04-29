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

// ─── Activity tracking ────────────────────────────────────────────────────────

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'];

function useLastActivity() {
  const [activityTime, setActivityTime] = useState(() => new Date());
  useEffect(() => {
    let lastStateUpdate = 0;
    const mark = () => {
      const now = Date.now();
      if (now - lastStateUpdate >= 1000) {
        lastStateUpdate = now;
        setActivityTime(new Date(now));
      }
    };
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, mark, { passive: true }));
    return () => ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, mark));
  }, []);
  return { activityTime };
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

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
  // Map<taskId, list_id> of every incomplete task in the user's scope.
  // Used to derive taskCounts incrementally from realtime events without
  // re-querying the DB on every change.
  const incompleteTasksRef = useRef(new Map());

  const modalOpen = showNewList || showNewTask || !!editList || !!editTask || !!confirmDelete;

  const selectedList = lists[listIdx] ?? null;

  // ── Data fetching (Supabase direct + realtime) ─────────────────────────────

  const recomputeTaskCounts = useCallback(() => {
    const counts = {};
    incompleteTasksRef.current.forEach((listId) => {
      counts[listId] = (counts[listId] ?? 0) + 1;
    });
    setTaskCounts(counts);
  }, []);

  const fetchLists = useCallback(async () => {
    try {
      const [listsRes, tasksRes] = await Promise.all([
        supabase
          .from('taskmanager_lists')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true }),
        // RLS scopes this to the current user's tasks.
        supabase
          .from('taskmanager_tasks')
          .select('id, list_id')
          .eq('is_completed', false),
      ]);
      if (listsRes.error) throw listsRes.error;
      if (tasksRes.error) throw tasksRes.error;
      setLists(listsRes.data ?? []);
      const m = new Map();
      (tasksRes.data ?? []).forEach((t) => m.set(t.id, t.list_id));
      incompleteTasksRef.current = m;
      recomputeTaskCounts();
      setLastUpdated(new Date());
      setApiError(null);
    } catch (err) {
      setApiError(err.message);
    }
  }, [user.id, recomputeTaskCounts]);

  const fetchTasks = useCallback(async () => {
    if (!selectedList) {
      setTasks([]);
      return;
    }
    try {
      let q = supabase
        .from('taskmanager_tasks')
        .select('*')
        .eq('list_id', selectedList.id);
      if (concise) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        q = q.or(`is_completed.eq.false,created_at.gte.${todayStart.toISOString()}`);
      }
      const { data, error } = await q;
      if (error) throw error;
      const sorted = [...(data ?? [])].sort((a, b) => a.is_completed - b.is_completed);
      setTasks(sorted);
    } catch (err) {
      console.error('Tasks fetch failed:', err.message);
    }
  }, [selectedList?.id, concise]); // eslint-disable-line react-hooks/exhaustive-deps

  const { activityTime } = useLastActivity();

  // Refs read inside the long-lived subscription handler so it can react to
  // current selectedList / concise without being torn down on each change.
  const selectedListIdRef = useRef(null);
  const conciseRef = useRef(concise);
  useEffect(() => { selectedListIdRef.current = selectedList?.id ?? null; }, [selectedList?.id]);
  useEffect(() => { conciseRef.current = concise; }, [concise]);

  // Single channel for all dashboard realtime. Two listeners on the same
  // channel — splitting them across separate channels caused the second
  // taskmanager_tasks subscription to silently miss events.
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    fetchLists();

    const matchesConciseNow = (task) => {
      if (!conciseRef.current) return true;
      if (!task.is_completed) return true;
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      return new Date(task.created_at) >= todayStart;
    };

    const ch = supabase
      .channel(`dashboard-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'taskmanager_lists', filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (cancelled) return;
          setLists((prev) => {
            if (payload.eventType === 'INSERT') {
              if (prev.some((l) => l.id === payload.new.id)) return prev;
              return [...prev, payload.new].sort(
                (a, b) => new Date(a.created_at) - new Date(b.created_at),
              );
            }
            if (payload.eventType === 'UPDATE') {
              return prev.map((l) => (l.id === payload.new.id ? payload.new : l));
            }
            if (payload.eventType === 'DELETE') {
              return prev.filter((l) => l.id !== payload.old.id);
            }
            return prev;
          });
          setLastUpdated(new Date());
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'taskmanager_tasks' },
        (payload) => {
          if (cancelled) return;

          // 1) Maintain per-list incomplete-task counts.
          const map = incompleteTasksRef.current;
          if (payload.eventType === 'INSERT') {
            if (!payload.new.is_completed) map.set(payload.new.id, payload.new.list_id);
          } else if (payload.eventType === 'UPDATE') {
            if (payload.new.is_completed) map.delete(payload.new.id);
            else map.set(payload.new.id, payload.new.list_id);
          } else if (payload.eventType === 'DELETE') {
            // payload.old has only the PK under default REPLICA IDENTITY —
            // enough, since we key the map by id.
            map.delete(payload.old.id);
          }
          recomputeTaskCounts();
          setLastUpdated(new Date());

          // 2) Patch the visible tasks list if the event affects the
          //    currently selected list.
          const selId = selectedListIdRef.current;
          if (!selId) return;
          if (payload.eventType !== 'DELETE' && payload.new.list_id !== selId) return;

          setTasks((prev) => {
            if (payload.eventType === 'DELETE') {
              return prev.filter((t) => t.id !== payload.old.id);
            }
            if (payload.eventType === 'INSERT') {
              if (prev.some((t) => t.id === payload.new.id)) return prev;
              if (!matchesConciseNow(payload.new)) return prev;
              return [...prev, payload.new].sort((a, b) => a.is_completed - b.is_completed);
            }
            if (payload.eventType === 'UPDATE') {
              const matches = matchesConciseNow(payload.new);
              const idx = prev.findIndex((t) => t.id === payload.new.id);
              if (idx === -1) {
                if (!matches) return prev;
                return [...prev, payload.new].sort((a, b) => a.is_completed - b.is_completed);
              }
              if (!matches) return prev.filter((t) => t.id !== payload.new.id);
              const next = [...prev];
              next[idx] = payload.new;
              return next.sort((a, b) => a.is_completed - b.is_completed);
            }
            return prev;
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [user?.id, fetchLists, recomputeTaskCounts]);

  // Initial fetch when selected list or concise mode changes. The realtime
  // patches are handled by the unified subscription above.
  useEffect(() => {
    fetchTasks();
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
  const timeFmt = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
  const timeStr = lastUpdated?.toLocaleTimeString([], timeFmt);
  const activityStr = activityTime?.toLocaleTimeString([], timeFmt);

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
          {activityStr && <span className="last-activity" title="Last user activity">● {activityStr}</span>}
          {timeStr && !apiError && <span className="last-updated" title="Last data refresh">↺ {timeStr}</span>}
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
  // undefined = checking storage, null = signed out, Session object = signed in
  const [session, setSession] = useState(undefined);
  const [user, setUser] = useState(null);

  // Subscribe to auth state. Keep this callback synchronous — awaiting inside
  // it holds Supabase's auth lock and deadlocks subsequent calls.
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession()
      .then(({ data }) => { if (mounted) setSession(data?.session ?? null); })
      .catch(() => { if (mounted) setSession(null); });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (mounted) setSession(newSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Load profile in a separate effect so it never blocks the auth lock.
  // A failed profile fetch must NOT sign the user out — the Supabase session
  // is still valid; we just fall back to a session-derived minimal user.
  useEffect(() => {
    if (!session) {
      setUser(null);
      return;
    }
    if (user?.id === session.user.id) return;

    let cancelled = false;
    api.getUser(session.user.id)
      .then((profile) => { if (!cancelled) setUser(profile); })
      .catch(() => {
        if (cancelled) return;
        setUser({
          id: session.user.id,
          email: session.user.email,
          username: session.user.email,
        });
      });
    return () => { cancelled = true; };
  }, [session?.user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (session === undefined) {
    return (
      <div className="setup-screen">
        <div className="setup-card"><p>Loading…</p></div>
      </div>
    );
  }
  if (!session) return <LoginScreen />;
  if (!user) {
    return (
      <div className="setup-screen">
        <div className="setup-card"><p>Loading profile…</p></div>
      </div>
    );
  }
  return <Dashboard user={user} onLogout={handleLogout} />;
}
