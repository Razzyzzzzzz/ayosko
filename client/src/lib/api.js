import { supabase } from './supabase';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export class ApiError extends Error {
  constructor(message, status, details) { super(message); this.status = status; this.details = details; }
}

// Sends the Supabase access token; the server verifies it and decides who the user is.
export async function api(path, { method = 'GET', body, form, params } = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const clean = Object.entries(params || {}).filter(([, v]) => v !== '' && v != null);
  const qs = clean.length ? `?${new URLSearchParams(clean)}` : '';
  let res;
  try {
    res = await fetch(BASE + path + qs, {
      method,
      headers: { ...(session && { Authorization: `Bearer ${session.access_token}` }), ...(body && { 'Content-Type': 'application/json' }) },
      body: form ?? (body ? JSON.stringify(body) : undefined),
    });
  } catch {
    throw new ApiError('Cannot reach the server. Is the backend running?', 0);
  }
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    if (res.status === 401) { await supabase.auth.signOut(); window.location.href = '/login?expired=1'; }
    throw new ApiError(json?.error?.message || 'Request failed.', res.status, json?.error?.details);
  }
  return json; // { success, data, meta? }
}
