import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in client/.env');

export const supabase = createClient(url || 'http://localhost', key || 'missing', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export function friendlyAuthError(err) {
  const m = (err?.message || '').toLowerCase();
  if (m.includes('invalid login')) return 'Incorrect email or password.';
  if (m.includes('not confirmed')) return 'Please verify your email first. We sent a code to your inbox.';
  if (m.includes('already registered')) return 'An account with this email already exists.';
  if (m.includes('at least') || m.includes('weak')) return 'Password is too weak. Use at least 8 characters with letters and numbers.';
  if (m.includes('rate limit') || m.includes('too many') || m.includes('security purposes')) return 'Too many attempts. Please wait a minute and try again.';
  // Maling o expired na verification code
  if (m.includes('token') && (m.includes('expired') || m.includes('invalid'))) return 'That code is incorrect or has expired. Check the code or request a new one.';
  // SMTP / pagpapadala ng email ang pumalya
  if (m.includes('sending') && m.includes('email')) return "We couldn't send the email right now. Please try again in a few minutes.";
  if (m.includes('invalid') && m.includes('email')) return 'Please enter a valid email address.';
  if (m.includes('fetch') || m.includes('network')) return 'Network error. Check your connection.';
  if (m.includes('same password')) return 'New password must be different from the old one.';
  return err?.message || 'Something went wrong. Please try again.';
}