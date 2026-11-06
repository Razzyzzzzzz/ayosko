-- Spending habits: expenses + monthly budgets. Run after 001/002.
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  category text not null check (category in ('food','transport','bills','shopping','health','entertainment','education','savings','other')),
  description text,
  payment_method text not null default 'cash' check (payment_method in ('cash','gcash','maya','card','bank')),
  spent_on date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('food','transport','bills','shopping','health','entertainment','education','savings','other')),
  monthly_limit numeric(12,2) not null check (monthly_limit > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category)
);

create index if not exists expenses_user_date_idx on expenses (user_id, spent_on desc);
create index if not exists expenses_user_cat_idx on expenses (user_id, category);

create trigger trg_expenses_updated before update on expenses for each row execute function set_updated_at();
create trigger trg_budgets_updated before update on budgets for each row execute function set_updated_at();

alter table expenses enable row level security;
alter table budgets enable row level security;
create policy "expenses_owner" on expenses for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "budgets_owner" on budgets for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
