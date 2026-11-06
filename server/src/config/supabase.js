import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

const opts = { auth: { persistSession: false, autoRefreshToken: false } };

// Server-only. Bypasses RLS: use ONLY for token verification, cron jobs, storage signing.
export const adminClient = createClient(env.supabaseUrl, env.serviceKey, opts);

// Per-request client acting as the user, so RLS is enforced.
export const userClient = (token) =>
  createClient(env.supabaseUrl, env.anonKey, {
    ...opts,
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
