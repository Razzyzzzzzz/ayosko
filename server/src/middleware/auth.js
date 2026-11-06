import { adminClient, userClient } from '../config/supabase.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Verifies the Supabase JWT server-side. req.user.id is the ONLY trusted identity.
export const auth = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new AppError('Authentication required.', 401);

  const { data, error } = await adminClient.auth.getUser(token);

  if (error) {
    console.error('[auth] getUser failed:', error.status, error.message);
    // 5xx or invalid-key errors are server config problems, not an expired user session
    if (!error.status || error.status >= 500 || /api key/i.test(error.message)) {
      throw new AppError('Server auth is misconfigured. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.', 500);
    }
    throw new AppError('Session expired. Please log in again.', 401);
  }
  if (!data?.user) throw new AppError('Session expired. Please log in again.', 401);
  if (!data.user.email_confirmed_at) throw new AppError('Please verify your email first.', 403);

  req.user = { id: data.user.id, email: data.user.email };
  req.db = userClient(token); // RLS-enforced client
  next();
});