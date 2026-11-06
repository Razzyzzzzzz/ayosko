-- Finance: income + expenses in one table, custom categories, overall + per-category budgets, budget alerts.
-- Run AFTER 004_spending.sql.

alter table expenses rename to transactions;
alter table transactions add column if not exists type text not null default 'expense' check (type in ('income','expense'));
alter table transactions drop constraint if exists expenses_category_check;
update transactions set category = 'transportation' where category = 'transport';
alter index if exists expenses_user_date_idx rename to transactions_user_date_idx;
alter index if exists expenses_user_cat_idx rename to transactions_user_cat_idx;
create index if not exists transactions_user_type_date_idx on transactions (user_id, type, spent_on desc);
alter policy "expenses_owner" on transactions rename to "transactions_owner";

-- Budgets: any category name (default or custom); the reserved name 'overall' is the total monthly budget.
alter table budgets drop constraint if exists budgets_category_check;
update budgets set category = 'transportation' where category = 'transport';

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 30),
  type text not null check (type in ('income','expense')),
  color text not null default '#64748b' check (color ~ '^#[0-9a-fA-F]{6}$'),
  created_at timestamptz not null default now(),
  unique (user_id, type, name)
);
alter table categories enable row level security;
create policy "categories_owner" on categories for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Budget alerts use the notifications table.
alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check check (type in ('task','bill','appointment','document','budget'));
alter table notification_preferences add column if not exists budgets boolean not null default true;
