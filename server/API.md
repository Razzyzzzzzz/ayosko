# AyosKo Server (Express, MVC)

## Structure
`routes → middleware (auth, validate) → controllers → models → Supabase (RLS)`; `services/` holds cross-model logic (AI inbox, recurrence, notifications); `jobs/` the hourly scheduler.

## Setup
1. Create a Supabase project. In the SQL editor run `sql/001_schema.sql`, then `sql/002_storage.sql`.
2. Auth → URL config: set Site URL to your frontend. Auth → Providers → Email: keep "Confirm email" ON.
3. `cp .env.example .env` and fill in the keys (service-role key stays server-side only).
4. `npm install && npm run dev` → http://localhost:4000/api/health
5. Optional: set `ANTHROPIC_API_KEY` to enable AI parsing; otherwise Life Inbox falls back to manual entry.

## Auth model
The Vue app uses `@supabase/supabase-js` directly for signUp (with `options.data.full_name`), email verification, login, logout, password reset and `updateUser({ password })`. It sends `Authorization: Bearer <access_token>` to this API. The server verifies the token, requires a confirmed email, and uses only `req.user.id`. Client-sent `user_id` is stripped by validation and ignored. DB calls use a user-scoped client, so RLS applies.

## Response shape
Success: `{ success: true, data, meta? }`. Error: `{ success: false, error: { message, details? } }`.

## Endpoints (all under /api, all require Bearer token except /health)
| Resource | Endpoints |
|---|---|
| Dashboard | `GET /dashboard` |
| Tasks | `GET /tasks?search=&completed=&priority=&category=&sort=&dir=&limit=&offset=`, `POST`, `GET/PATCH/DELETE /tasks/:id` |
| Reminders | same CRUD at `/reminders` (`?done=`) |
| Bills | same CRUD at `/bills` (`?status=unpaid\|paid`) |
| Appointments | same CRUD at `/appointments` |
| Documents | CRUD at `/documents`; `POST /documents/:id/file` (multipart `file`, PDF/JPG/PNG/WEBP, 5 MB); `GET /documents/:id/file` → 60s signed URL |
| Profile | `GET /profile`, `PATCH /profile`, `PATCH /profile/preferences` |
| Notifications | `GET /notifications?unread=true`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all` |
| Life Inbox | `GET /inbox/status`, `POST /inbox/parse` `{ text }` → suggestion only; save via `POST /tasks` after user confirms |

## Behavior notes
- Completing a recurring task or paying a recurring bill creates the next occurrence.
- Inbox never invents dates: unclear deadlines return `due_date: null` plus warnings.
- Notifications are in-app only (generated hourly, deduplicated). No push/email/SMS is sent; users see them when they open the app.
- `sql/003_seed_dev.sql` is a commented, dev-only template. Nothing is seeded automatically.
