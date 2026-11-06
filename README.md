# AyosKo — Personal Life Organizer

Vue 3 + Vite + Pinia + Tailwind (client) · Express MVC API (server) · Supabase (Postgres, Auth, Storage, RLS)

```
ayosko/
├── client/   Vue app (views, components, stores, router, API client)
└── server/   Express API (routes → controllers → models) + sql/ + API.md
```

## 1. Supabase
1. Create a project at supabase.com.
2. SQL editor: run `server/sql/001_schema.sql`, then `server/sql/002_storage.sql`.
3. Authentication → Providers → Email: keep **Confirm email** ON.
4. Authentication → URL Configuration: Site URL `http://localhost:5173`, and add `http://localhost:5173/**` to Redirect URLs (needed for verification and password-reset links).
5. Settings → API: copy the Project URL, `anon` key, and `service_role` key.

## 2. Configure
```
cp server/.env.example server/.env     # add URL, anon key, service-role key (server only!)
cp client/.env.example client/.env     # add URL and anon key only
```
Optional: set `ANTHROPIC_API_KEY` in `server/.env` to enable AI parsing in Life Inbox. Without it, Life Inbox uses manual entry.

## 3. Run
```
npm install
npm run install:all
npm run dev        # API on :4000, web on :5173
```
Open http://localhost:5173, register, verify your email, then complete onboarding.

## Security model
- The client holds only the public anon key. The service-role key lives in `server/.env`.
- Every API call carries the user's Supabase token. The server verifies it and uses only the verified user id; any client-sent `user_id` is ignored.
- RLS is on every user-owned table, and the `documents` storage bucket is private with per-user folder policies.

## Deploy notes
Build the client with `npm run build` (output `client/dist`) and host it statically, with SPA fallback to `index.html`. Host `server/` on any Node host. Then set `CLIENT_ORIGIN` (server) and `VITE_API_URL` (client) to the production URLs, and update the Supabase Site URL and Redirect URLs.

## Notes
- Notifications are in-app only (generated hourly). No push, email, or SMS.
- No sample data is seeded. `server/sql/003_seed_dev.sql` is an optional dev-only template.
