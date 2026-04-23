import { supabase } from './supabase';

const BASE = import.meta.env.VITE_API_TARGET;

async function request(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

export const getUser = (userId) => request(`/api/users/${userId}`);

export const getListsByUserId = (userId) =>
  request(`/api/lists/user/${userId}`);

export const getTasksByListId = (listId, concise = false, signal) =>
  request(`/api/tasks/list/${listId}${concise ? '?concise=true' : ''}`, { signal });

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
