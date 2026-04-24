import { supabase } from './supabase';

const BASE = import.meta.env.VITE_API_TARGET;

// Cache the access token so requests don't compete for the Supabase auth lock.
// Updated synchronously via onAuthStateChange (TOKEN_REFRESHED, SIGNED_IN, …).
let cachedToken = null;
supabase.auth.getSession().then(({ data }) => {
  cachedToken = data?.session?.access_token ?? null;
});
supabase.auth.onAuthStateChange((_event, session) => {
  cachedToken = session?.access_token ?? null;
});

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      ...(cachedToken ? { Authorization: `Bearer ${cachedToken}` } : {}),
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
