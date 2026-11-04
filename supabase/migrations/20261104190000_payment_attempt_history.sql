-- Payment attempt history is informational only; MOVO never initiates a payment.
create table if not exists public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null check (source_type in ('scheduled','bill','subscription','loan','credit_card','receivable')),
  source_id text not null,
  due_date date not null,
  attempted_at timestamptz not null default now(),
  status text not null check (status in ('failed','paid','cancelled')),
  amount numeric(18,2) check (amount is null or amount > 0),
  currency text not null default 'PHP' check (currency ~ '^[A-Z]{3}$'),
  account_id uuid references public.financial_accounts(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists payment_attempts_user_created_idx
  on public.payment_attempts(user_id,created_at desc);
alter table public.payment_attempts enable row level security;
drop policy if exists "Users manage their payment attempts" on public.payment_attempts;
create policy "Users manage their payment attempts" on public.payment_attempts
  for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);
