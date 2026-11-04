create table if not exists public.scheduled_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  transaction_type text not null check (transaction_type in ('expense','transfer')),
  amount numeric(18,2) not null check (amount > 0),
  currency text not null default 'PHP' check (currency ~ '^[A-Z]{3}$'),
  account_id uuid not null references public.financial_accounts(id) on delete restrict,
  transfer_to_account_id uuid references public.financial_accounts(id) on delete restrict,
  scheduled_for date not null,
  frequency text not null default 'once' check (frequency in ('once','weekly','monthly','yearly')),
  status text not null default 'scheduled' check (status in ('scheduled','completed','cancelled')),
  category text not null default 'Other',
  notes text,
  last_logged_at timestamptz,
  last_transaction_id uuid references public.transactions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scheduled_transfer_destination check (
    (transaction_type='transfer' and transfer_to_account_id is not null and transfer_to_account_id<>account_id)
    or (transaction_type='expense' and transfer_to_account_id is null)
  )
);
create index if not exists scheduled_transactions_due_idx on public.scheduled_transactions(user_id,scheduled_for) where status='scheduled';
alter table public.scheduled_transactions enable row level security;
drop policy if exists "Users manage their scheduled transactions" on public.scheduled_transactions;
create policy "Users manage their scheduled transactions" on public.scheduled_transactions
  for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);
alter table public.transactions add column if not exists schedule_id uuid references public.scheduled_transactions(id) on delete set null;
create unique index if not exists transactions_schedule_occurrence_unique on public.transactions(user_id,schedule_id,occurred_at) where schedule_id is not null;
