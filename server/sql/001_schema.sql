create extension if not exists pgcrypto;

create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  timezone text not null default 'Asia/Manila',
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tasks boolean not null default true,
  bills boolean not null default true,
  appointments boolean not null default true,
  documents boolean not null default true,
  lead_days int not null default 3 check (lead_days between 0 and 30),
  updated_at timestamptz not null default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  notes text,
  category text not null default 'general',
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  due_date date,
  recurrence text not null default 'none' check (recurrence in ('none','daily','weekly','monthly','yearly')),
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  notes text,
  remind_at timestamptz not null,
  done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  amount numeric(12,2) not null check (amount >= 0),
  due_date date not null,
  status text not null default 'unpaid' check (status in ('unpaid','paid')),
  recurrence text not null default 'none' check (recurrence in ('none','weekly','monthly','yearly')),
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  reference_notes text,
  expires_on date,
  renewal_remind_days int not null default 30 check (renewal_remind_days >= 0),
  file_path text,
  file_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('task','bill','appointment','document')),
  ref_id uuid not null,
  title text not null,
  body text,
  dedupe_key text not null,
  read boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, dedupe_key)
);

-- Indexes
create index on tasks (user_id, due_date);
create index on tasks (user_id, completed);
create index on reminders (user_id, remind_at);
create index on bills (user_id, due_date);
create index on appointments (user_id, starts_at);
create index on documents (user_id, expires_on);
create index on notifications (user_id, read, created_at desc);

-- updated_at triggers + RLS (owner-only) on every user-owned table
do $$
declare t text;
begin
  foreach t in array array['tasks','reminders','bills','appointments','documents','profiles','notification_preferences'] loop
    execute format('create trigger trg_%s_updated before update on %I for each row execute function set_updated_at()', t, t);
  end loop;

  foreach t in array array['tasks','reminders','bills','appointments','documents','notifications'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "%s_owner" on %I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t, t);
  end loop;

  execute 'alter table profiles enable row level security';
  execute 'create policy profiles_owner on profiles for all to authenticated using (id = auth.uid()) with check (id = auth.uid())';
  execute 'alter table notification_preferences enable row level security';
  execute 'create policy prefs_owner on notification_preferences for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())';
end $$;

-- Auto-create profile + prefs on signup
create or replace function handle_new_user() returns trigger as $$
begin
  insert into profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  insert into notification_preferences (user_id) values (new.id);
  return new;
end; $$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();
