-- MOVO production financial foundation
-- Apply through Supabase migrations after creating a dedicated MOVO Supabase project.
-- Never put a service-role key in browser code.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) <= 100),
  preferred_currency text not null default 'PHP' check (preferred_currency ~ '^[A-Z]{3}$'),
  timezone text not null default 'Asia/Manila' check (char_length(timezone) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.financial_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  account_type text not null check (account_type in ('bank', 'card', 'e_wallet', 'cash', 'investment', 'other')),
  institution_name text check (institution_name is null or char_length(institution_name) <= 100),
  currency text not null default 'PHP' check (currency ~ '^[A-Z]{3}$'),
  opening_balance numeric(20,2) not null default 0,
  is_archived boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null,
  transfer_to_account_id uuid,
  transaction_type text not null check (transaction_type in ('income', 'expense', 'transfer')),
  amount numeric(20,2) not null check (amount > 0 and amount < 100000000000000000),
  currency text not null default 'PHP' check (currency ~ '^[A-Z]{3}$'),
  merchant text not null check (char_length(trim(merchant)) between 1 and 160),
  category text not null default 'Other' check (char_length(category) between 1 and 60),
  note text check (note is null or char_length(note) <= 1000),
  occurred_at timestamptz not null,
  source text not null default 'manual' check (source in ('manual', 'csv_import', 'bank_sync', 'notification', 'apple_pay_export', 'other')),
  external_reference text check (external_reference is null or char_length(external_reference) <= 200),
  is_pending boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transactions_account_owner_fk foreign key (account_id, user_id)
    references public.financial_accounts(id, user_id) on delete restrict,
  constraint transactions_transfer_target_owner_fk foreign key (transfer_to_account_id, user_id)
    references public.financial_accounts(id, user_id) on delete restrict,
  constraint transactions_transfer_shape check (
    (transaction_type = 'transfer' and transfer_to_account_id is not null and transfer_to_account_id <> account_id)
    or (transaction_type <> 'transfer' and transfer_to_account_id is null)
  )
);

create unique index if not exists transactions_external_reference_unique
  on public.transactions(user_id, account_id, external_reference)
  where external_reference is not null;
create index if not exists transactions_user_occurred_at_idx
  on public.transactions(user_id, occurred_at desc);
create index if not exists transactions_user_category_date_idx
  on public.transactions(user_id, category, occurred_at desc);
create index if not exists transactions_user_account_date_idx
  on public.transactions(user_id, account_id, occurred_at desc);
create index if not exists financial_accounts_user_display_idx
  on public.financial_accounts(user_id, display_order, created_at);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (char_length(trim(category)) between 1 and 60),
  monthly_limit numeric(20,2) not null check (monthly_limit > 0),
  currency text not null default 'PHP' check (currency ~ '^[A-Z]{3}$'),
  starts_on date not null default date_trunc('month', current_date)::date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category, starts_on)
);
create index if not exists budgets_user_active_idx on public.budgets(user_id, is_active);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), 100)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_movo on auth.users;
create trigger on_auth_user_created_movo
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
drop trigger if exists financial_accounts_set_updated_at on public.financial_accounts;
create trigger financial_accounts_set_updated_at before update on public.financial_accounts
  for each row execute function public.set_updated_at();
drop trigger if exists transactions_set_updated_at on public.transactions;
create trigger transactions_set_updated_at before update on public.transactions
  for each row execute function public.set_updated_at();
drop trigger if exists budgets_set_updated_at on public.budgets;
create trigger budgets_set_updated_at before update on public.budgets
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.financial_accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated using (id = (select auth.uid()));
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (id = (select auth.uid()));
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "accounts_select_own" on public.financial_accounts;
create policy "accounts_select_own" on public.financial_accounts for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "accounts_insert_own" on public.financial_accounts;
create policy "accounts_insert_own" on public.financial_accounts for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "accounts_update_own" on public.financial_accounts;
create policy "accounts_update_own" on public.financial_accounts for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "accounts_delete_own" on public.financial_accounts;
create policy "accounts_delete_own" on public.financial_accounts for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists "transactions_select_own" on public.transactions;
create policy "transactions_select_own" on public.transactions for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "transactions_insert_own" on public.transactions;
create policy "transactions_insert_own" on public.transactions for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "transactions_update_own" on public.transactions;
create policy "transactions_update_own" on public.transactions for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "transactions_delete_own" on public.transactions;
create policy "transactions_delete_own" on public.transactions for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists "budgets_select_own" on public.budgets;
create policy "budgets_select_own" on public.budgets for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "budgets_insert_own" on public.budgets;
create policy "budgets_insert_own" on public.budgets for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "budgets_update_own" on public.budgets;
create policy "budgets_update_own" on public.budgets for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "budgets_delete_own" on public.budgets;
create policy "budgets_delete_own" on public.budgets for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.profiles, public.financial_accounts, public.transactions, public.budgets from anon;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.financial_accounts to authenticated;
grant select, insert, update, delete on public.transactions to authenticated;
grant select, insert, update, delete on public.budgets to authenticated;
