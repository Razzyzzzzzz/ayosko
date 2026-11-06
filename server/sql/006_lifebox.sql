-- LifeBox. ADDITIVE ONLY: existing tables keep working. Run after 001-005. Safe to re-run.

-- 1) Documents: folder category, optional document number, stored file size (bytes).
alter table documents add column if not exists category text not null default 'other';
alter table documents add column if not exists document_number text;
alter table documents add column if not exists file_size integer;
create index if not exists documents_user_cat_idx on documents (user_id, category);

-- 2) Reminders for important dates (e.g. "Driver's license renewal", remind me 7 days before).
create table if not exists life_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null default 'other',
  due_on date not null,
  remind_days int not null default 7 check (remind_days between 0 and 365),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists life_reminders_user_idx on life_reminders (user_id, due_on);

-- 3) Life timeline (milestones, with an optional photo stored in the private "documents" bucket).
create table if not exists life_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  event_date date not null,
  photo_path text,
  photo_size integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists life_events_user_idx on life_events (user_id, event_date desc);

-- 4) Emergency card: one private row per user.
create table if not exists emergency_info (
  user_id uuid primary key references auth.users(id) on delete cascade,
  blood_type text, allergies text, conditions text, medications text,
  doctor_name text, doctor_phone text, hmo_name text, hmo_number text,
  preferred_hospital text, notes text,
  contacts jsonb not null default '[]'::jsonb check (jsonb_typeof(contacts) = 'array' and jsonb_array_length(contacts) <= 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Owner-only access (Row Level Security) + updated_at triggers
alter table life_reminders enable row level security;
alter table life_events enable row level security;
alter table emergency_info enable row level security;
do $$
declare t text;
begin
  foreach t in array array['life_reminders', 'life_events', 'emergency_info'] loop
    if not exists (select 1 from pg_policies where tablename = t and policyname = t || '_owner') then
      execute format('create policy "%1$s_owner" on %1$s for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    end if;
    if not exists (select 1 from pg_trigger where tgname = 'trg_' || t || '_updated') then
      execute format('create trigger trg_%1$s_updated before update on %1$s for each row execute function set_updated_at()', t);
    end if;
  end loop;
end $$;
