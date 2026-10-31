-- MOVO financial obligations, receivables and savings goals.
-- Apply through the normal Supabase migration pipeline; this commit does not mutate a live database.
begin;

create table if not exists public.financial_loans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  lender text,
  currency text not null default 'PHP' check (currency ~ '^[A-Z]{3}$'),
  principal_amount numeric(18,2) not null check (principal_amount > 0),
  outstanding_principal numeric(18,2) not null check (outstanding_principal >= 0),
  interest_rate numeric(8,5) not null default 0 check (interest_rate >= 0),
  due_date date,
  account_id uuid references public.financial_accounts(id) on delete set null,
  status text not null default 'active' check (status in ('active','paid_off','archived')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (outstanding_principal <= principal_amount + 1000000000000000)
);
create index if not exists financial_loans_user_status_idx on public.financial_loans(user_id, status);

create table if not exists public.loan_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  loan_id uuid not null references public.financial_loans(id) on delete cascade,
  event_type text not null check (event_type in ('borrowed','principal_increase','principal_payment','interest_payment','fee')),
  amount numeric(18,2) not null check (amount > 0),
  currency text not null default 'PHP' check (currency ~ '^[A-Z]{3}$'),
  account_id uuid references public.financial_accounts(id) on delete set null,
  transaction_id uuid references public.transactions(id) on delete set null,
  occurred_at timestamptz not null default now(),
  note text,
  created_at timestamptz not null default now()
);
create index if not exists loan_events_user_loan_date_idx on public.loan_events(user_id, loan_id, occurred_at desc);

create table if not exists public.financial_receivables (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  counterparty text,
  reason text,
  currency text not null default 'PHP' check (currency ~ '^[A-Z]{3}$'),
  opening_amount numeric(18,2) not null check (opening_amount > 0),
  outstanding_amount numeric(18,2) not null check (outstanding_amount >= 0),
  due_date date,
  account_id uuid references public.financial_accounts(id) on delete set null,
  status text not null default 'active' check (status in ('active','settled','written_off','archived')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists financial_receivables_user_status_idx on public.financial_receivables(user_id, status);

create table if not exists public.receivable_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  receivable_id uuid not null references public.financial_receivables(id) on delete cascade,
  event_type text not null check (event_type in ('lent','amount_increased','collected','written_off')),
  amount numeric(18,2) not null check (amount > 0),
  currency text not null default 'PHP' check (currency ~ '^[A-Z]{3}$'),
  account_id uuid references public.financial_accounts(id) on delete set null,
  transaction_id uuid references public.transactions(id) on delete set null,
  occurred_at timestamptz not null default now(),
  note text,
  created_at timestamptz not null default now()
);
create index if not exists receivable_events_user_receivable_date_idx on public.receivable_events(user_id, receivable_id, occurred_at desc);

create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  target_amount numeric(18,2) not null check (target_amount > 0),
  currency text not null default 'PHP' check (currency ~ '^[A-Z]{3}$'),
  target_date date,
  status text not null default 'active' check (status in ('active','completed','paused','archived')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists savings_goals_user_status_idx on public.savings_goals(user_id, status);

create table if not exists public.goal_allocations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.savings_goals(id) on delete cascade,
  amount numeric(18,2) not null check (amount > 0),
  currency text not null default 'PHP' check (currency ~ '^[A-Z]{3}$'),
  account_id uuid references public.financial_accounts(id) on delete set null,
  transaction_id uuid references public.transactions(id) on delete set null,
  status text not null default 'allocated' check (status in ('allocated','released')),
  note text,
  created_at timestamptz not null default now(),
  released_at timestamptz,
  unique (goal_id, transaction_id)
);
create index if not exists goal_allocations_user_goal_idx on public.goal_allocations(user_id, goal_id, status);

do $$
declare t text;
begin
  foreach t in array array['financial_loans','loan_events','financial_receivables','receivable_events','savings_goals','goal_allocations']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_select_own', t);
    execute format('create policy %I on public.%I for select to authenticated using (user_id = auth.uid())', t || '_select_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert_own', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (user_id = auth.uid())', t || '_insert_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_update_own', t);
    execute format('create policy %I on public.%I for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t || '_update_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete_own', t);
    execute format('create policy %I on public.%I for delete to authenticated using (user_id = auth.uid())', t || '_delete_own', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

commit;
