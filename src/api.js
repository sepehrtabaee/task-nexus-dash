const BASE = import.meta.env.VITE_API_URL || '';
const TOKEN = import.meta.env.VITE_API_TOKEN;

async function request(path, options = {}) {
  const headers = {
    ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
    ...options.headers,
  };
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

// Try UUID lookup first, then fall back to telegram_id search
export async function findUser(input) {
  // Try direct UUID lookup
  try {
    const user = await request(`/api/users/${input}`);
    if (user && user.id) return user;
  } catch {
    // Not a UUID or not found, try telegram_id
  }

  // Try matching telegram_id from all users
  const users = await request('/api/users');
  const found = users.find(
    (u) =>
      String(u.telegram_id) === String(input) ||
      u.id === input
  );
  return found || null;
}

export const getListsByUserId = (userId) =>
  request(`/api/lists/user/${userId}`);

export const getTasksByListId = (listId, concise = false) =>
  request(`/api/tasks/list/${listId}${concise ? '?concise=true' : ''}`);

export const createList = (data) =>
  request('/api/lists', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const updateList = (id, data) =>
  request(`/api/lists/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const deleteList = (id) =>
  request(`/api/lists/${id}`, { method: 'DELETE' });

export const createTask = (data) =>
  request('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const updateTask = (id, data) =>
  request(`/api/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const deleteTask = (id) =>
  request(`/api/tasks/${id}`, { method: 'DELETE' });
