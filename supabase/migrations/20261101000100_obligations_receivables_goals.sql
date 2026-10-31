-- MOVO financial obligations, receivables and savings goals.
-- Apply through the normal Supabase migration pipeline; this commit does not mutate a live database.
begin;

create table if not exists public.accounting_postings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.financial_accounts(id) on delete cascade,
  signed_amount numeric(18,2) not null check (signed_amount <> 0),
  currency text not null default 'PHP' check (currency ~ '^[A-Z]{3}
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  lender text,
  obligation_type text not null default 'loan' check (obligation_type in ('loan','debt')),
  opening_principal numeric(18,2) not null default 0 check (opening_principal >= 0),
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
  opening_outstanding_amount numeric(18,2) not null default 0 check (opening_outstanding_amount >= 0),
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
  foreach t in array array['accounting_postings','financial_loans','loan_events','financial_receivables','receivable_events','savings_goals','goal_allocations']
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
    if t in ('accounting_postings','loan_events','receivable_events','goal_allocations') then
      execute format('drop policy if exists %I on public.%I', t || '_select_own', t);
      execute format('create policy %I on public.%I for select to authenticated using (user_id = auth.uid())', t || '_select_own', t);
      execute format('grant select on public.%I to authenticated', t);
      execute format('revoke insert, update, delete, truncate, references, trigger on public.%I from authenticated', t);
    else
      execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    end if;
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;


-- Enforce ownership across references; RLS on the child row alone is not sufficient.
create or replace function public.assert_movo_finance_child_ownership()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare parent_user uuid; ref_user uuid;
begin
  if tg_table_name = 'loan_events' then
    select user_id into parent_user from public.financial_loans where id = new.loan_id;
    if parent_user is distinct from new.user_id then raise exception 'loan_owner_mismatch' using errcode = '42501'; end if;
  elsif tg_table_name = 'receivable_events' then
    select user_id into parent_user from public.financial_receivables where id = new.receivable_id;
    if parent_user is distinct from new.user_id then raise exception 'receivable_owner_mismatch' using errcode = '42501'; end if;
  elsif tg_table_name = 'goal_allocations' then
    select user_id into parent_user from public.savings_goals where id = new.goal_id;
    if parent_user is distinct from new.user_id then raise exception 'goal_owner_mismatch' using errcode = '42501'; end if;
  end if;
  if new.account_id is not null then
    select user_id into ref_user from public.financial_accounts where id = new.account_id;
    if ref_user is distinct from new.user_id then raise exception 'account_owner_mismatch' using errcode = '42501'; end if;
  end if;
  if new.transaction_id is not null then
    select user_id into ref_user from public.transactions where id = new.transaction_id;
    if ref_user is distinct from new.user_id then raise exception 'transaction_owner_mismatch' using errcode = '42501'; end if;
  end if;
  return new;
end $$;

drop trigger if exists financial_loans_owner_guard on public.financial_loans;
create trigger financial_loans_owner_guard before insert or update on public.financial_loans
for each row execute function public.assert_movo_finance_child_ownership();
drop trigger if exists financial_receivables_owner_guard on public.financial_receivables;
create trigger financial_receivables_owner_guard before insert or update on public.financial_receivables
for each row execute function public.assert_movo_finance_child_ownership();
drop trigger if exists loan_events_owner_guard on public.loan_events;
create trigger loan_events_owner_guard before insert or update on public.loan_events
for each row execute function public.assert_movo_finance_child_ownership();
drop trigger if exists receivable_events_owner_guard on public.receivable_events;
create trigger receivable_events_owner_guard before insert or update on public.receivable_events
for each row execute function public.assert_movo_finance_child_ownership();
drop trigger if exists goal_allocations_owner_guard on public.goal_allocations;
create trigger goal_allocations_owner_guard before insert or update on public.goal_allocations
for each row execute function public.assert_movo_finance_child_ownership();

-- These RPCs atomically append an event and update its current balance.
create or replace function public.record_loan_event(
  p_loan_id uuid, p_event_type text, p_amount numeric, p_currency text default 'PHP',
  p_account_id uuid default null, p_transaction_id uuid default null,
  p_occurred_at timestamptz default null, p_note text default null
) returns public.loan_events
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid := auth.uid(); v_loan public.financial_loans; v_event public.loan_events;
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_amount is null or p_amount <= 0 or p_amount >= 1e16 then raise exception 'invalid_amount' using errcode = '22023'; end if;
  if p_event_type not in ('borrowed','principal_increase','principal_payment','interest_payment','fee') then raise exception 'invalid_loan_event' using errcode = '22023'; end if;
  if p_account_id is null then raise exception 'loan_event_account_required' using errcode = '22023'; end if;
  select * into v_loan from public.financial_loans where id = p_loan_id and user_id = v_user for update;
  if not found then raise exception 'loan_not_found' using errcode = 'P0002'; end if;
  if p_event_type = 'principal_payment' and p_amount > v_loan.outstanding_principal then raise exception 'payment_exceeds_principal' using errcode = '22023'; end if;
  if p_account_id is not null and not exists (select 1 from public.financial_accounts where id = p_account_id and user_id = v_user) then raise exception 'account_owner_mismatch' using errcode = '42501'; end if;
  if p_account_id is not null and exists (select 1 from public.financial_accounts where id = p_account_id and currency <> coalesce(p_currency,'PHP')) then raise exception 'obligation_account_currency_mismatch' using errcode = '22023'; end if;
  if p_transaction_id is not null and not exists (select 1 from public.transactions where id = p_transaction_id and user_id = v_user) then raise exception 'transaction_owner_mismatch' using errcode = '42501'; end if;
  insert into public.loan_events(user_id,loan_id,event_type,amount,currency,account_id,transaction_id,occurred_at,note)
  values(v_user,p_loan_id,p_event_type,round(p_amount,2),coalesce(p_currency,'PHP'),p_account_id,p_transaction_id,coalesce(p_occurred_at,now()),left(p_note,1000))
  returning * into v_event;
  if p_event_type in ('borrowed','principal_increase') then
    update public.financial_loans set outstanding_principal = outstanding_principal + round(p_amount,2), updated_at = now(), status = 'active' where id = p_loan_id;
  elsif p_event_type = 'principal_payment' then
    update public.financial_loans set outstanding_principal = greatest(0,outstanding_principal - round(p_amount,2)), updated_at = now(),
      status = case when outstanding_principal - round(p_amount,2) <= 0 then 'paid_off' else 'active' end where id = p_loan_id;
  end if;
  return v_event;
end $$;

create or replace function public.record_receivable_event(
  p_receivable_id uuid, p_event_type text, p_amount numeric, p_currency text default 'PHP',
  p_account_id uuid default null, p_transaction_id uuid default null,
  p_occurred_at timestamptz default null, p_note text default null
) returns public.receivable_events
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid := auth.uid(); v_item public.financial_receivables; v_event public.receivable_events;
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_amount is null or p_amount <= 0 or p_amount >= 1e16 then raise exception 'invalid_amount' using errcode = '22023'; end if;
  if p_event_type not in ('lent','amount_increased','collected','written_off') then raise exception 'invalid_receivable_event' using errcode = '22023'; end if;
  if p_event_type <> 'written_off' and p_account_id is null then raise exception 'receivable_event_account_required' using errcode = '22023'; end if;
  select * into v_item from public.financial_receivables where id = p_receivable_id and user_id = v_user for update;
  if not found then raise exception 'receivable_not_found' using errcode = 'P0002'; end if;
  if p_event_type in ('collected','written_off') and p_amount > v_item.outstanding_amount then raise exception 'event_exceeds_receivable' using errcode = '22023'; end if;
  if p_account_id is not null and not exists (select 1 from public.financial_accounts where id = p_account_id and user_id = v_user) then raise exception 'account_owner_mismatch' using errcode = '42501'; end if;
  if p_account_id is not null and exists (select 1 from public.financial_accounts where id = p_account_id and currency <> coalesce(p_currency,'PHP')) then raise exception 'obligation_account_currency_mismatch' using errcode = '22023'; end if;
  if p_transaction_id is not null and not exists (select 1 from public.transactions where id = p_transaction_id and user_id = v_user) then raise exception 'transaction_owner_mismatch' using errcode = '42501'; end if;
  insert into public.receivable_events(user_id,receivable_id,event_type,amount,currency,account_id,transaction_id,occurred_at,note)
  values(v_user,p_receivable_id,p_event_type,round(p_amount,2),coalesce(p_currency,'PHP'),p_account_id,p_transaction_id,coalesce(p_occurred_at,now()),left(p_note,1000))
  returning * into v_event;
  if p_event_type in ('lent','amount_increased') then
    update public.financial_receivables set outstanding_amount = outstanding_amount + round(p_amount,2), updated_at = now(), status = 'active' where id = p_receivable_id;
  else
    update public.financial_receivables set outstanding_amount = greatest(0,outstanding_amount - round(p_amount,2)), updated_at = now(),
      status = case when outstanding_amount - round(p_amount,2) <= 0 then case when p_event_type = 'written_off' then 'written_off' else 'settled' end else 'active' end
      where id = p_receivable_id;
  end if;
  return v_event;
end $$;

-- Serialize allocations per account and enforce same-currency allocation against ledger balance.
create or replace function public.allocate_goal_funds(
  p_goal_id uuid, p_amount numeric, p_currency text default 'PHP', p_account_id uuid default null,
  p_transaction_id uuid default null, p_note text default null
) returns public.goal_allocations
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid := auth.uid(); v_goal public.savings_goals; v_account public.financial_accounts;
  v_balance numeric; v_reserved numeric; v_allocation public.goal_allocations;
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_amount is null or p_amount <= 0 or p_amount >= 1e16 then raise exception 'invalid_amount' using errcode = '22023'; end if;
  if p_account_id is null then raise exception 'goal_account_required' using errcode = '22023'; end if;
  select * into v_goal from public.savings_goals where id = p_goal_id and user_id = v_user for update;
  if not found or v_goal.status in ('archived','paused') then raise exception 'goal_not_available' using errcode = 'P0002'; end if;
  select * into v_account from public.financial_accounts where id = p_account_id and user_id = v_user for update;
  if not found then raise exception 'account_not_found' using errcode = 'P0002'; end if;
  if v_account.account_type not in ('bank','e_wallet','cash') then raise exception 'goal_requires_spendable_account' using errcode = '22023'; end if;
  if v_account.currency <> coalesce(p_currency,'PHP') or v_goal.currency <> coalesce(p_currency,'PHP') then raise exception 'goal_currency_mismatch' using errcode = '22023'; end if;
  if exists(select 1 from public.transactions where user_id=v_user and (account_id=p_account_id or transfer_to_account_id=p_account_id) and currency <> v_account.currency)
     or exists(select 1 from public.accounting_postings where user_id=v_user and account_id=p_account_id and currency <> v_account.currency) then
    raise exception 'mixed_currency_account_requires_reconciliation' using errcode = '22023';
  end if;
  select v_account.opening_balance
    + coalesce((select sum(case
      when transaction_type='income' and account_id=p_account_id then amount
      when transaction_type='expense' and account_id=p_account_id then -amount
      when transaction_type='transfer' and account_id=p_account_id then -amount
      when transaction_type='transfer' and transfer_to_account_id=p_account_id then amount
      else 0 end) from public.transactions where user_id=v_user and (account_id=p_account_id or transfer_to_account_id=p_account_id)),0)
    + coalesce((select sum(signed_amount) from public.accounting_postings where user_id=v_user and account_id=p_account_id),0)
    into v_balance;
  select coalesce(sum(amount),0) into v_reserved from public.goal_allocations where user_id=v_user and account_id=p_account_id and status='allocated';
  if v_balance - v_reserved < round(p_amount,2) then raise exception 'insufficient_available_funds' using errcode = '22023'; end if;
  if p_transaction_id is not null and not exists(select 1 from public.transactions where id=p_transaction_id and user_id=v_user) then raise exception 'transaction_owner_mismatch' using errcode = '42501'; end if;
  insert into public.goal_allocations(user_id,goal_id,amount,currency,account_id,transaction_id,note)
  values(v_user,p_goal_id,round(p_amount,2),coalesce(p_currency,'PHP'),p_account_id,p_transaction_id,left(p_note,1000))
  returning * into v_allocation;
  return v_allocation;
end $$;

create or replace function public.release_goal_allocation(p_allocation_id uuid)
returns public.goal_allocations
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid := auth.uid(); v_item public.goal_allocations;
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  update public.goal_allocations set status='released', released_at=now()
  where id=p_allocation_id and user_id=v_user and status='allocated'
  returning * into v_item;
  if not found then raise exception 'active_allocation_not_found' using errcode = 'P0002'; end if;
  return v_item;
end $$;

revoke all on function public.record_loan_event(uuid,text,numeric,text,uuid,uuid,timestamptz,text) from public, anon;
revoke all on function public.record_receivable_event(uuid,text,numeric,text,uuid,uuid,timestamptz,text) from public, anon;
revoke all on function public.allocate_goal_funds(uuid,numeric,text,uuid,uuid,text) from public, anon;
revoke all on function public.release_goal_allocation(uuid) from public, anon;
grant execute on function public.record_loan_event(uuid,text,numeric,text,uuid,uuid,timestamptz,text) to authenticated;
grant execute on function public.record_receivable_event(uuid,text,numeric,text,uuid,uuid,timestamptz,text) to authenticated;
grant execute on function public.allocate_goal_funds(uuid,numeric,text,uuid,uuid,text) to authenticated;
grant execute on function public.release_goal_allocation(uuid) to authenticated;


-- Ledger postings make loan and receivable cash movement affect the same account balance as transactions.
create or replace function public.post_movo_obligation_cash_movement()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare delta numeric;
begin
  if new.account_id is null then return new; end if;
  if tg_table_name = 'loan_events' then
    delta := case when new.event_type in ('borrowed','principal_increase') then new.amount
      when new.event_type in ('principal_payment','interest_payment','fee') then -new.amount else 0 end;
    if delta <> 0 then
      insert into public.accounting_postings(user_id,account_id,signed_amount,currency,source_type,source_id,occurred_at)
      values(new.user_id,new.account_id,delta,new.currency,'loan_event',new.id,new.occurred_at)
      on conflict (source_type,source_id,account_id) do nothing;
    end if;
  else
    delta := case when new.event_type in ('lent','amount_increased') then -new.amount
      when new.event_type = 'collected' then new.amount else 0 end;
    if delta <> 0 then
      insert into public.accounting_postings(user_id,account_id,signed_amount,currency,source_type,source_id,occurred_at)
      values(new.user_id,new.account_id,delta,new.currency,'receivable_event',new.id,new.occurred_at)
      on conflict (source_type,source_id,account_id) do nothing;
    end if;
  end if;
  return new;
end $$;
revoke all on function public.post_movo_obligation_cash_movement() from public, anon, authenticated;
drop trigger if exists loan_event_cash_posting on public.loan_events;
create trigger loan_event_cash_posting after insert on public.loan_events
for each row execute function public.post_movo_obligation_cash_movement();
drop trigger if exists receivable_event_cash_posting on public.receivable_events;
create trigger receivable_event_cash_posting after insert on public.receivable_events
for each row execute function public.post_movo_obligation_cash_movement();

commit;
),
  source_type text not null check (source_type in ('loan_event','receivable_event')),
  source_id uuid not null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (source_type, source_id, account_id)
);
create index if not exists accounting_postings_user_account_date_idx on public.accounting_postings(user_id, account_id, occurred_at desc);

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


-- Enforce ownership across references; RLS on the child row alone is not sufficient.
create or replace function public.assert_movo_finance_child_ownership()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare parent_user uuid; ref_user uuid;
begin
  if tg_table_name = 'loan_events' then
    select user_id into parent_user from public.financial_loans where id = new.loan_id;
    if parent_user is distinct from new.user_id then raise exception 'loan_owner_mismatch' using errcode = '42501'; end if;
  elsif tg_table_name = 'receivable_events' then
    select user_id into parent_user from public.financial_receivables where id = new.receivable_id;
    if parent_user is distinct from new.user_id then raise exception 'receivable_owner_mismatch' using errcode = '42501'; end if;
  elsif tg_table_name = 'goal_allocations' then
    select user_id into parent_user from public.savings_goals where id = new.goal_id;
    if parent_user is distinct from new.user_id then raise exception 'goal_owner_mismatch' using errcode = '42501'; end if;
  end if;
  if new.account_id is not null then
    select user_id into ref_user from public.financial_accounts where id = new.account_id;
    if ref_user is distinct from new.user_id then raise exception 'account_owner_mismatch' using errcode = '42501'; end if;
  end if;
  if new.transaction_id is not null then
    select user_id into ref_user from public.transactions where id = new.transaction_id;
    if ref_user is distinct from new.user_id then raise exception 'transaction_owner_mismatch' using errcode = '42501'; end if;
  end if;
  return new;
end $$;

drop trigger if exists loan_events_owner_guard on public.loan_events;
create trigger loan_events_owner_guard before insert or update on public.loan_events
for each row execute function public.assert_movo_finance_child_ownership();
drop trigger if exists receivable_events_owner_guard on public.receivable_events;
create trigger receivable_events_owner_guard before insert or update on public.receivable_events
for each row execute function public.assert_movo_finance_child_ownership();
drop trigger if exists goal_allocations_owner_guard on public.goal_allocations;
create trigger goal_allocations_owner_guard before insert or update on public.goal_allocations
for each row execute function public.assert_movo_finance_child_ownership();

-- These RPCs atomically append an event and update its current balance.
create or replace function public.record_loan_event(
  p_loan_id uuid, p_event_type text, p_amount numeric, p_currency text default 'PHP',
  p_account_id uuid default null, p_transaction_id uuid default null,
  p_occurred_at timestamptz default null, p_note text default null
) returns public.loan_events
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid := auth.uid(); v_loan public.financial_loans; v_event public.loan_events;
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_amount is null or p_amount <= 0 or p_amount >= 1e16 then raise exception 'invalid_amount' using errcode = '22023'; end if;
  if p_event_type not in ('borrowed','principal_increase','principal_payment','interest_payment','fee') then raise exception 'invalid_loan_event' using errcode = '22023'; end if;
  select * into v_loan from public.financial_loans where id = p_loan_id and user_id = v_user for update;
  if not found then raise exception 'loan_not_found' using errcode = 'P0002'; end if;
  if p_event_type = 'principal_payment' and p_amount > v_loan.outstanding_principal then raise exception 'payment_exceeds_principal' using errcode = '22023'; end if;
  if p_account_id is not null and not exists (select 1 from public.financial_accounts where id = p_account_id and user_id = v_user) then raise exception 'account_owner_mismatch' using errcode = '42501'; end if;
  if p_transaction_id is not null and not exists (select 1 from public.transactions where id = p_transaction_id and user_id = v_user) then raise exception 'transaction_owner_mismatch' using errcode = '42501'; end if;
  insert into public.loan_events(user_id,loan_id,event_type,amount,currency,account_id,transaction_id,occurred_at,note)
  values(v_user,p_loan_id,p_event_type,round(p_amount,2),coalesce(p_currency,'PHP'),p_account_id,p_transaction_id,coalesce(p_occurred_at,now()),left(p_note,1000))
  returning * into v_event;
  if p_event_type in ('borrowed','principal_increase') then
    update public.financial_loans set outstanding_principal = outstanding_principal + round(p_amount,2), updated_at = now(), status = 'active' where id = p_loan_id;
  elsif p_event_type = 'principal_payment' then
    update public.financial_loans set outstanding_principal = greatest(0,outstanding_principal - round(p_amount,2)), updated_at = now(),
      status = case when outstanding_principal - round(p_amount,2) <= 0 then 'paid_off' else 'active' end where id = p_loan_id;
  end if;
  return v_event;
end $$;

create or replace function public.record_receivable_event(
  p_receivable_id uuid, p_event_type text, p_amount numeric, p_currency text default 'PHP',
  p_account_id uuid default null, p_transaction_id uuid default null,
  p_occurred_at timestamptz default null, p_note text default null
) returns public.receivable_events
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid := auth.uid(); v_item public.financial_receivables; v_event public.receivable_events;
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_amount is null or p_amount <= 0 or p_amount >= 1e16 then raise exception 'invalid_amount' using errcode = '22023'; end if;
  if p_event_type not in ('lent','amount_increased','collected','written_off') then raise exception 'invalid_receivable_event' using errcode = '22023'; end if;
  select * into v_item from public.financial_receivables where id = p_receivable_id and user_id = v_user for update;
  if not found then raise exception 'receivable_not_found' using errcode = 'P0002'; end if;
  if p_event_type in ('collected','written_off') and p_amount > v_item.outstanding_amount then raise exception 'event_exceeds_receivable' using errcode = '22023'; end if;
  if p_account_id is not null and not exists (select 1 from public.financial_accounts where id = p_account_id and user_id = v_user) then raise exception 'account_owner_mismatch' using errcode = '42501'; end if;
  if p_transaction_id is not null and not exists (select 1 from public.transactions where id = p_transaction_id and user_id = v_user) then raise exception 'transaction_owner_mismatch' using errcode = '42501'; end if;
  insert into public.receivable_events(user_id,receivable_id,event_type,amount,currency,account_id,transaction_id,occurred_at,note)
  values(v_user,p_receivable_id,p_event_type,round(p_amount,2),coalesce(p_currency,'PHP'),p_account_id,p_transaction_id,coalesce(p_occurred_at,now()),left(p_note,1000))
  returning * into v_event;
  if p_event_type in ('lent','amount_increased') then
    update public.financial_receivables set outstanding_amount = outstanding_amount + round(p_amount,2), updated_at = now(), status = 'active' where id = p_receivable_id;
  else
    update public.financial_receivables set outstanding_amount = greatest(0,outstanding_amount - round(p_amount,2)), updated_at = now(),
      status = case when outstanding_amount - round(p_amount,2) <= 0 then case when p_event_type = 'written_off' then 'written_off' else 'settled' end else 'active' end
      where id = p_receivable_id;
  end if;
  return v_event;
end $$;

-- Serialize allocations per account and enforce same-currency allocation against ledger balance.
create or replace function public.allocate_goal_funds(
  p_goal_id uuid, p_amount numeric, p_currency text default 'PHP', p_account_id uuid default null,
  p_transaction_id uuid default null, p_note text default null
) returns public.goal_allocations
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid := auth.uid(); v_goal public.savings_goals; v_account public.financial_accounts;
  v_balance numeric; v_reserved numeric; v_allocation public.goal_allocations;
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_amount is null or p_amount <= 0 or p_amount >= 1e16 then raise exception 'invalid_amount' using errcode = '22023'; end if;
  if p_account_id is null then raise exception 'goal_account_required' using errcode = '22023'; end if;
  select * into v_goal from public.savings_goals where id = p_goal_id and user_id = v_user for update;
  if not found or v_goal.status in ('archived','paused') then raise exception 'goal_not_available' using errcode = 'P0002'; end if;
  select * into v_account from public.financial_accounts where id = p_account_id and user_id = v_user for update;
  if not found then raise exception 'account_not_found' using errcode = 'P0002'; end if;
  if v_account.currency <> coalesce(p_currency,'PHP') then raise exception 'goal_currency_mismatch' using errcode = '22023'; end if;
  if exists(select 1 from public.transactions where user_id=v_user and (account_id=p_account_id or transfer_to_account_id=p_account_id) and currency <> v_account.currency) then
    raise exception 'mixed_currency_account_requires_reconciliation' using errcode = '22023';
  end if;
  select v_account.opening_balance + coalesce(sum(case
    when transaction_type='income' and account_id=p_account_id then amount
    when transaction_type='expense' and account_id=p_account_id then -amount
    when transaction_type='transfer' and account_id=p_account_id then -amount
    when transaction_type='transfer' and transfer_to_account_id=p_account_id then amount
    else 0 end),0)
    into v_balance from public.transactions where user_id=v_user and (account_id=p_account_id or transfer_to_account_id=p_account_id);
  select coalesce(sum(amount),0) into v_reserved from public.goal_allocations where user_id=v_user and account_id=p_account_id and status='allocated';
  if v_balance - v_reserved < round(p_amount,2) then raise exception 'insufficient_available_funds' using errcode = '22023'; end if;
  if p_transaction_id is not null and not exists(select 1 from public.transactions where id=p_transaction_id and user_id=v_user) then raise exception 'transaction_owner_mismatch' using errcode = '42501'; end if;
  insert into public.goal_allocations(user_id,goal_id,amount,currency,account_id,transaction_id,note)
  values(v_user,p_goal_id,round(p_amount,2),coalesce(p_currency,'PHP'),p_account_id,p_transaction_id,left(p_note,1000))
  returning * into v_allocation;
  return v_allocation;
end $$;

create or replace function public.release_goal_allocation(p_allocation_id uuid)
returns public.goal_allocations
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid := auth.uid(); v_item public.goal_allocations;
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  update public.goal_allocations set status='released', released_at=now()
  where id=p_allocation_id and user_id=v_user and status='allocated'
  returning * into v_item;
  if not found then raise exception 'active_allocation_not_found' using errcode = 'P0002'; end if;
  return v_item;
end $$;

revoke all on function public.record_loan_event(uuid,text,numeric,text,uuid,uuid,timestamptz,text) from public, anon;
revoke all on function public.record_receivable_event(uuid,text,numeric,text,uuid,uuid,timestamptz,text) from public, anon;
revoke all on function public.allocate_goal_funds(uuid,numeric,text,uuid,uuid,text) from public, anon;
revoke all on function public.release_goal_allocation(uuid) from public, anon;
grant execute on function public.record_loan_event(uuid,text,numeric,text,uuid,uuid,timestamptz,text) to authenticated;
grant execute on function public.record_receivable_event(uuid,text,numeric,text,uuid,uuid,timestamptz,text) to authenticated;
grant execute on function public.allocate_goal_funds(uuid,numeric,text,uuid,uuid,text) to authenticated;
grant execute on function public.release_goal_allocation(uuid) to authenticated;

commit;
