-- Complete the payment and reminder lifecycle without initiating payments.
alter table public.scheduled_transactions
  add column if not exists timezone text not null default 'Asia/Manila',
  add column if not exists reminder_days integer[] not null default array[0,1,3],
  add column if not exists snoozed_until timestamptz,
  add column if not exists paused_at timestamptz,
  add column if not exists ends_on date,
  add column if not exists last_reminded_at timestamptz,
  add column if not exists reference_note text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.scheduled_transactions drop constraint if exists scheduled_transactions_status_check;
alter table public.scheduled_transactions add constraint scheduled_transactions_status_check
  check (status in ('scheduled','paused','completed','cancelled'));

alter table public.scheduled_transactions drop constraint if exists scheduled_transactions_reminder_days_check;
alter table public.scheduled_transactions add constraint scheduled_transactions_reminder_days_check
  check (cardinality(reminder_days) between 0 and 8 and reminder_days <@ array[0,1,2,3,5,7,14,30]);

create index if not exists scheduled_transactions_snooze_idx
  on public.scheduled_transactions(user_id,snoozed_until) where status='scheduled';

create table if not exists public.payment_reminder_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  reminder_days integer[] not null default array[0,1,3],
  quiet_start time,
  quiet_end time,
  timezone text not null default 'Asia/Manila',
  push_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint payment_reminder_preferences_days_check
    check (cardinality(reminder_days) between 0 and 8 and reminder_days <@ array[0,1,2,3,5,7,14,30])
);
alter table public.payment_reminder_preferences enable row level security;
drop policy if exists "Users manage their payment reminder preferences" on public.payment_reminder_preferences;
create policy "Users manage their payment reminder preferences" on public.payment_reminder_preferences
  for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);

create table if not exists public.payment_reminder_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null check (source_type in ('scheduled','bill','subscription','loan','credit_card')),
  source_id text not null,
  occurrence_date date not null,
  reminder_offset integer not null default 0,
  channel text not null default 'in_app' check (channel in ('in_app','push','email')),
  status text not null default 'queued' check (status in ('queued','sent','failed','dismissed')),
  snoozed_until timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id,source_type,source_id,occurrence_date,reminder_offset,channel)
);
alter table public.payment_reminder_events enable row level security;
drop policy if exists "Users read their payment reminder events" on public.payment_reminder_events;
create policy "Users read their payment reminder events" on public.payment_reminder_events
  for select to authenticated using (auth.uid()=user_id);
drop policy if exists "Users manage their payment reminder events" on public.payment_reminder_events;
create policy "Users manage their payment reminder events" on public.payment_reminder_events
  for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);
create index if not exists payment_reminder_events_user_idx on public.payment_reminder_events(user_id,created_at desc);

-- Optional reference fields make receipts and provider references searchable without storing card credentials.
alter table public.transactions add column if not exists payment_reference text;
alter table public.transactions add column if not exists receipt_note text;
