-- Reversible financial effects and account-backed goal/plan allocations.
-- Allocation rows reserve a portion of an account's existing balance; they never post cash movement.
begin;

alter table public.payment_attempts
  add column if not exists transaction_id uuid references public.transactions(id) on delete set null,
  add column if not exists next_due_date date,
  add column if not exists reversed_at timestamptz,
  add column if not exists reversed_transaction_id uuid,
  add column if not exists previous_state jsonb;
alter table public.payment_attempts drop constraint if exists payment_attempts_status_check;
alter table public.payment_attempts add constraint payment_attempts_status_check
  check (status in ('failed','paid','cancelled','reversed'));
create index if not exists payment_attempts_transaction_idx
  on public.payment_attempts(user_id, transaction_id) where transaction_id is not null;

alter table public.bill_payments
  add column if not exists status text not null default 'active',
  add column if not exists reversed_at timestamptz,
  add column if not exists reversed_transaction_id uuid;
alter table public.bill_payments drop constraint if exists bill_payments_status_check;
alter table public.bill_payments add constraint bill_payments_status_check
  check (status in ('active','reversed'));
create index if not exists bill_payments_transaction_idx
  on public.bill_payments(user_id, transaction_id) where transaction_id is not null;
create index if not exists bill_payments_reversed_transaction_idx
  on public.bill_payments(user_id, reversed_transaction_id) where reversed_transaction_id is not null;
create index if not exists payment_attempts_reversed_transaction_idx
  on public.payment_attempts(user_id, reversed_transaction_id) where reversed_transaction_id is not null;

alter table public.loan_events
  add column if not exists reversed_at timestamptz,
  add column if not exists reversed_transaction_id uuid;
alter table public.receivable_events
  add column if not exists reversed_at timestamptz,
  add column if not exists reversed_transaction_id uuid;
create index if not exists loan_events_reversed_transaction_idx
  on public.loan_events(user_id, reversed_transaction_id) where reversed_transaction_id is not null;
create index if not exists receivable_events_reversed_transaction_idx
  on public.receivable_events(user_id, reversed_transaction_id) where reversed_transaction_id is not null;

create table if not exists public.plan_funding_allocations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null check (char_length(trim(plan_id)) between 1 and 120),
  plan_name text not null check (char_length(trim(plan_name)) between 1 and 120),
  legacy_id text,
  account_id uuid references public.financial_accounts(id) on delete set null,
  amount numeric(18,2) not null check (amount > 0 and amount < 1e16),
  currency text not null default 'PHP' check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'allocated' check (status in ('allocated','released')),
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now(),
  released_at timestamptz
);
create index if not exists plan_funding_allocations_user_plan_idx
  on public.plan_funding_allocations(user_id, plan_id, status);
create unique index if not exists plan_funding_allocations_user_plan_legacy_idx
  on public.plan_funding_allocations(user_id, plan_id, legacy_id) where legacy_id is not null;
create index if not exists plan_funding_allocations_user_account_idx
  on public.plan_funding_allocations(user_id, account_id, created_at desc)
  where status = 'allocated';

create table if not exists public.allocation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  allocation_id uuid not null,
  source_type text not null check (source_type in ('goal','plan')),
  source_id text not null,
  source_name text not null,
  account_id uuid references public.financial_accounts(id) on delete set null,
  event_type text not null check (event_type in ('allocated','released','auto_released')),
  amount numeric(18,2) not null check (amount > 0 and amount < 1e16),
  currency text not null default 'PHP' check (currency ~ '^[A-Z]{3}$'),
  note text,
  occurred_at timestamptz not null default now()
);
create index if not exists allocation_events_user_date_idx
  on public.allocation_events(user_id, occurred_at desc);
create index if not exists allocation_events_allocation_idx
  on public.allocation_events(user_id, allocation_id, occurred_at desc);

alter table public.plan_funding_allocations enable row level security;
drop policy if exists plan_funding_allocations_select_own on public.plan_funding_allocations;
create policy plan_funding_allocations_select_own on public.plan_funding_allocations
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists plan_funding_allocations_insert_own on public.plan_funding_allocations;
drop policy if exists plan_funding_allocations_update_own on public.plan_funding_allocations;
revoke all on public.plan_funding_allocations from anon, authenticated;
grant select on public.plan_funding_allocations to authenticated;

alter table public.allocation_events enable row level security;
drop policy if exists allocation_events_select_own on public.allocation_events;
create policy allocation_events_select_own on public.allocation_events
  for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.allocation_events from anon, authenticated;
grant select on public.allocation_events to authenticated;

-- Log every goal allocation and release as a non-cash activity.
create or replace function public.log_goal_allocation_event()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_name text; v_amount numeric; v_type text;
begin
  select name into v_name from public.savings_goals where id = new.goal_id and user_id = new.user_id;
  if tg_op = 'INSERT' then
    insert into public.allocation_events(user_id,allocation_id,source_type,source_id,source_name,account_id,event_type,amount,currency,note,occurred_at)
    values(new.user_id,new.id,'goal',new.goal_id::text,coalesce(v_name,'Savings goal'),new.account_id,'allocated',new.amount,new.currency,new.note,new.created_at);
  elsif old.status = 'allocated' and new.amount < old.amount then
    v_amount := round(old.amount - new.amount, 2);
    insert into public.allocation_events(user_id,allocation_id,source_type,source_id,source_name,account_id,event_type,amount,currency,note)
    values(new.user_id,new.id,'goal',new.goal_id::text,coalesce(v_name,'Savings goal'),new.account_id,'auto_released',v_amount,new.currency,coalesce(new.note,'Released automatically because account balance was low'));
  elsif old.status = 'allocated' and new.status = 'released' then
    insert into public.allocation_events(user_id,allocation_id,source_type,source_id,source_name,account_id,event_type,amount,currency,note)
    values(new.user_id,new.id,'goal',new.goal_id::text,coalesce(v_name,'Savings goal'),new.account_id,'released',old.amount,new.currency,new.note);
  end if;
  return new;
end $$;
revoke all on function public.log_goal_allocation_event() from public, anon, authenticated;
drop trigger if exists goal_allocation_activity on public.goal_allocations;
create trigger goal_allocation_activity after insert or update on public.goal_allocations
for each row execute function public.log_goal_allocation_event();

create or replace function public.log_plan_allocation_event()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_amount numeric;
begin
  if tg_op = 'INSERT' then
    insert into public.allocation_events(user_id,allocation_id,source_type,source_id,source_name,account_id,event_type,amount,currency,note,occurred_at)
    values(new.user_id,new.id,'plan',new.plan_id,new.plan_name,new.account_id,'allocated',new.amount,new.currency,new.note,new.created_at);
  elsif old.status = 'allocated' and new.amount < old.amount then
    v_amount := round(old.amount - new.amount, 2);
    insert into public.allocation_events(user_id,allocation_id,source_type,source_id,source_name,account_id,event_type,amount,currency,note)
    values(new.user_id,new.id,'plan',new.plan_id,new.plan_name,new.account_id,'auto_released',v_amount,new.currency,coalesce(new.note,'Released automatically because account balance was low'));
  elsif old.status = 'allocated' and new.status = 'released' then
    insert into public.allocation_events(user_id,allocation_id,source_type,source_id,source_name,account_id,event_type,amount,currency,note)
    values(new.user_id,new.id,'plan',new.plan_id,new.plan_name,new.account_id,'released',old.amount,new.currency,new.note);
  end if;
  return new;
end $$;
revoke all on function public.log_plan_allocation_event() from public, anon, authenticated;
drop trigger if exists plan_allocation_activity on public.plan_funding_allocations;
create trigger plan_allocation_activity after insert or update on public.plan_funding_allocations
for each row execute function public.log_plan_allocation_event();

-- Existing goal allocations and plan allocations share one reservation ceiling per account.
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
  select * into v_account from public.financial_accounts where id = p_account_id and user_id = v_user for update;
  if not found then raise exception 'account_not_found' using errcode = 'P0002'; end if;
  perform public.reconcile_account_allocations(p_account_id);
  select * into v_goal from public.savings_goals where id = p_goal_id and user_id = v_user for update;
  if not found or v_goal.status in ('archived','paused') then raise exception 'goal_not_available' using errcode = 'P0002'; end if;
  if v_account.account_type not in ('bank','e_wallet','cash') then raise exception 'goal_requires_spendable_account' using errcode = '22023'; end if;
  if v_account.currency <> coalesce(p_currency,'PHP') or v_goal.currency <> coalesce(p_currency,'PHP') then raise exception 'goal_currency_mismatch' using errcode = '22023'; end if;
  if exists(select 1 from public.transactions where user_id=v_user and (account_id=p_account_id or transfer_to_account_id=p_account_id) and currency <> v_account.currency)
     or exists(select 1 from public.accounting_postings where user_id=v_user and account_id=p_account_id and currency <> v_account.currency)
     or exists(select 1 from public.goal_allocations where user_id=v_user and account_id=p_account_id and status='allocated' and currency <> v_account.currency)
     or exists(select 1 from public.plan_funding_allocations where user_id=v_user and account_id=p_account_id and status='allocated' and currency <> v_account.currency) then
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
  select coalesce(sum(amount),0) into v_reserved from public.goal_allocations
    where user_id=v_user and account_id=p_account_id and status='allocated';
  select v_reserved + coalesce(sum(amount),0) into v_reserved from public.plan_funding_allocations
    where user_id=v_user and account_id=p_account_id and status='allocated';
  if v_balance - v_reserved < round(p_amount,2) then raise exception 'insufficient_available_funds' using errcode = '22023'; end if;
  if p_transaction_id is not null and not exists(select 1 from public.transactions where id=p_transaction_id and user_id=v_user) then raise exception 'transaction_owner_mismatch' using errcode = '42501'; end if;
  insert into public.goal_allocations(user_id,goal_id,amount,currency,account_id,transaction_id,note)
  values(v_user,p_goal_id,round(p_amount,2),coalesce(p_currency,'PHP'),p_account_id,p_transaction_id,left(p_note,1000))
  returning * into v_allocation;
  return v_allocation;
end $$;

create or replace function public.allocate_plan_funds(
  p_plan_id text, p_plan_name text, p_amount numeric, p_currency text, p_account_id uuid, p_note text default null
) returns public.plan_funding_allocations
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid := auth.uid(); v_account public.financial_accounts; v_balance numeric; v_reserved numeric; v_row public.plan_funding_allocations;
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_plan_id is null or char_length(trim(p_plan_id)) not between 1 and 120 then raise exception 'invalid_plan' using errcode = '22023'; end if;
  if p_plan_name is null or char_length(trim(p_plan_name)) not between 1 and 120 then raise exception 'invalid_plan_name' using errcode = '22023'; end if;
  if p_amount is null or p_amount <= 0 or p_amount >= 1e16 then raise exception 'invalid_amount' using errcode = '22023'; end if;
  select * into v_account from public.financial_accounts where id=p_account_id and user_id=v_user for update;
  if not found or v_account.account_type not in ('bank','e_wallet','cash') then raise exception 'spendable_account_required' using errcode = '22023'; end if;
  if v_account.currency <> coalesce(p_currency,'PHP') then raise exception 'plan_currency_mismatch' using errcode = '22023'; end if;
  if exists(select 1 from public.transactions where user_id=v_user and (account_id=p_account_id or transfer_to_account_id=p_account_id) and currency <> v_account.currency)
     or exists(select 1 from public.accounting_postings where user_id=v_user and account_id=p_account_id and currency <> v_account.currency)
     or exists(select 1 from public.goal_allocations where user_id=v_user and account_id=p_account_id and status='allocated' and currency <> v_account.currency)
     or exists(select 1 from public.plan_funding_allocations where user_id=v_user and account_id=p_account_id and status='allocated' and currency <> v_account.currency) then
    raise exception 'mixed_currency_account_requires_reconciliation' using errcode = '22023';
  end if;
  perform public.reconcile_account_allocations(p_account_id);
  select v_account.opening_balance
    + coalesce((select sum(case
      when transaction_type='income' and account_id=p_account_id then amount
      when transaction_type='expense' and account_id=p_account_id then -amount
      when transaction_type='transfer' and account_id=p_account_id then -amount
      when transaction_type='transfer' and transfer_to_account_id=p_account_id then amount
      else 0 end) from public.transactions where user_id=v_user and (account_id=p_account_id or transfer_to_account_id=p_account_id)),0)
    + coalesce((select sum(signed_amount) from public.accounting_postings where user_id=v_user and account_id=p_account_id),0)
    into v_balance;
  select coalesce(sum(amount),0) into v_reserved from public.goal_allocations
    where user_id=v_user and account_id=p_account_id and status='allocated';
  select v_reserved + coalesce(sum(amount),0) into v_reserved from public.plan_funding_allocations
    where user_id=v_user and account_id=p_account_id and status='allocated';
  if v_balance - v_reserved < round(p_amount,2) then raise exception 'insufficient_available_funds' using errcode = '22023'; end if;
  insert into public.plan_funding_allocations(user_id,plan_id,plan_name,account_id,amount,currency,note)
  values(v_user,trim(p_plan_id),trim(p_plan_name),p_account_id,round(p_amount,2),coalesce(p_currency,'PHP'),left(p_note,500))
  returning * into v_row;
  return v_row;
end $$;

create or replace function public.release_plan_funding_allocation(p_allocation_id uuid)
returns public.plan_funding_allocations
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid := auth.uid(); v_row public.plan_funding_allocations;
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  update public.plan_funding_allocations set status='released',released_at=now()
  where id=p_allocation_id and user_id=v_user and status='allocated'
  returning * into v_row;
  if not found then raise exception 'active_allocation_not_found' using errcode = 'P0002'; end if;
  return v_row;
end $$;

-- Release the newest reservations first when a real account balance falls below reserved funds.
-- Only reservation amounts change; the financial account and transaction ledger are untouched.
create or replace function public.reconcile_account_allocations(p_account_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid; v_account public.financial_accounts; v_balance numeric; v_reserved numeric; v_deficit numeric; v_take numeric; r record;
begin
  if p_account_id is null then return; end if;
  select * into v_account from public.financial_accounts where id=p_account_id for update;
  if not found or v_account.account_type not in ('bank','e_wallet','cash') then return; end if;
  if auth.uid() is not null and auth.uid() <> v_account.user_id then return; end if;
  v_user := v_account.user_id;
  -- Do not compare unlike currencies. Allocation RPCs already prevent new mixed-currency reservations.
  if exists(select 1 from public.transactions where user_id=v_user and (account_id=p_account_id or transfer_to_account_id=p_account_id) and currency <> v_account.currency)
     or exists(select 1 from public.accounting_postings where user_id=v_user and account_id=p_account_id and currency <> v_account.currency)
     or exists(select 1 from public.goal_allocations where user_id=v_user and account_id=p_account_id and currency <> v_account.currency and status='allocated')
     or exists(select 1 from public.plan_funding_allocations where user_id=v_user and account_id=p_account_id and currency <> v_account.currency and status='allocated') then
    return;
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
  select coalesce(sum(amount),0) into v_reserved from public.goal_allocations
    where user_id=v_user and account_id=p_account_id and status='allocated';
  select v_reserved + coalesce(sum(amount),0) into v_reserved from public.plan_funding_allocations
    where user_id=v_user and account_id=p_account_id and status='allocated';
  v_deficit := greatest(0, v_reserved - greatest(0,v_balance));
  if v_deficit <= 0 then return; end if;
  for r in
    select 'goal' as kind,id,amount,created_at from public.goal_allocations
      where user_id=v_user and account_id=p_account_id and status='allocated'
    union all
    select 'plan' as kind,id,amount,created_at from public.plan_funding_allocations
      where user_id=v_user and account_id=p_account_id and status='allocated'
    order by created_at desc
  loop
    exit when v_deficit <= 0;
    v_take := least(v_deficit, r.amount);
    if r.kind='goal' then
      if v_take >= r.amount then
        update public.goal_allocations set status='released',released_at=now() where id=r.id and user_id=v_user and status='allocated';
      else
        update public.goal_allocations set amount=round(amount-v_take,2) where id=r.id and user_id=v_user and status='allocated';
      end if;
    else
      if v_take >= r.amount then
        update public.plan_funding_allocations set status='released',released_at=now() where id=r.id and user_id=v_user and status='allocated';
      else
        update public.plan_funding_allocations set amount=round(amount-v_take,2) where id=r.id and user_id=v_user and status='allocated';
      end if;
    end if;
    v_deficit := greatest(0, round(v_deficit-v_take,2));
  end loop;
end $$;

create or replace function public.reconcile_account_allocations_after_transaction()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_op='DELETE' then
    perform public.reconcile_account_allocations(old.account_id);
    if old.transfer_to_account_id is not null then perform public.reconcile_account_allocations(old.transfer_to_account_id); end if;
    return old;
  end if;
  if tg_op='UPDATE' and old.account_id is distinct from new.account_id then perform public.reconcile_account_allocations(old.account_id); end if;
  if tg_op='UPDATE' and old.transfer_to_account_id is distinct from new.transfer_to_account_id and old.transfer_to_account_id is not null then
    perform public.reconcile_account_allocations(old.transfer_to_account_id);
  end if;
  perform public.reconcile_account_allocations(new.account_id);
  if new.transfer_to_account_id is not null then perform public.reconcile_account_allocations(new.transfer_to_account_id); end if;
  return new;
end $$;
revoke all on function public.reconcile_account_allocations(uuid) from public, anon, authenticated;
revoke all on function public.reconcile_account_allocations_after_transaction() from public, anon, authenticated;
drop trigger if exists transactions_reconcile_account_allocations on public.transactions;
create trigger transactions_reconcile_account_allocations
after insert or update or delete on public.transactions
for each row execute function public.reconcile_account_allocations_after_transaction();


create or replace function public.reconcile_account_allocations_after_posting()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_op='DELETE' then perform public.reconcile_account_allocations(old.account_id); return old; end if;
  perform public.reconcile_account_allocations(new.account_id);
  return new;
end $$;
revoke all on function public.reconcile_account_allocations_after_posting() from public, anon, authenticated;
drop trigger if exists accounting_postings_reconcile_account_allocations on public.accounting_postings;
create trigger accounting_postings_reconcile_account_allocations
after insert or update or delete on public.accounting_postings
for each row execute function public.reconcile_account_allocations_after_posting();


create or replace function public.reconcile_account_allocations_after_account_update()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform public.reconcile_account_allocations(new.id);
  return new;
end $$;
revoke all on function public.reconcile_account_allocations_after_account_update() from public, anon, authenticated;
drop trigger if exists financial_accounts_reconcile_allocations on public.financial_accounts;
create trigger financial_accounts_reconcile_allocations
after update of opening_balance on public.financial_accounts
for each row when (old.opening_balance is distinct from new.opening_balance)
execute function public.reconcile_account_allocations_after_account_update();

create or replace function public.reverse_allocation_event(p_event_id uuid)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid := auth.uid(); v_event public.allocation_events;
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  select * into v_event from public.allocation_events where id=p_event_id and user_id=v_user for update;
  if not found or v_event.event_type <> 'allocated' then raise exception 'allocation_event_not_reversible' using errcode = '22023'; end if;
  if v_event.source_type='goal' then
    update public.goal_allocations set status='released',released_at=now()
      where id=v_event.allocation_id and user_id=v_user and status='allocated';
  else
    update public.plan_funding_allocations set status='released',released_at=now()
      where id=v_event.allocation_id and user_id=v_user and status='allocated';
  end if;
  if not found then raise exception 'allocation_already_released' using errcode = 'P0002'; end if;
  return v_event.id;
end $$;

-- Delete the cash transaction and reverse every linked financial effect in one database transaction.
create or replace function public.delete_transaction_with_reversals(p_transaction_id uuid)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_user uuid := auth.uid();
  v_tx public.transactions;
  v_payment public.bill_payments;
  v_occ public.bill_occurrences;
  v_due numeric;
  v_paid numeric;
  v_attempt public.payment_attempts;
  v_latest_attempt public.payment_attempts;
  v_oldest_attempt public.payment_attempts;
  v_restore_due date;
  v_has_latest boolean;
  v_subs jsonb;
  v_event public.loan_events;
  v_loan public.financial_loans;
  v_receivable_event public.receivable_events;
  v_receivable public.financial_receivables;
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  select * into v_tx from public.transactions where id=p_transaction_id and user_id=v_user for update;
  if not found then raise exception 'transaction_not_found' using errcode = 'P0002'; end if;

  for v_payment in select * from public.bill_payments where user_id=v_user and transaction_id=v_tx.id and status='active' for update loop
    select * into v_occ from public.bill_occurrences where id=v_payment.occurrence_id and user_id=v_user for update;
    if found then
      v_paid := greatest(0, round(v_occ.paid_amount-v_payment.amount,2));
      v_due := coalesce(v_occ.actual_amount,v_occ.expected_amount)+v_occ.late_fee;
      update public.bill_occurrences set paid_amount=v_paid,
        status=case when status='cancelled' then 'cancelled' when v_paid<=0 then 'scheduled' when v_paid>=v_due then 'paid' else 'partially_paid' end,
        updated_at=now()
        where id=v_occ.id;
    end if;
    update public.bill_payments set status='reversed',reversed_at=now(),reversed_transaction_id=v_tx.id where id=v_payment.id;
  end loop;

  for v_attempt in select * from public.payment_attempts
    where user_id=v_user and transaction_id=v_tx.id and source_type='subscription' and status='paid'
    for update loop
    update public.payment_attempts set status='reversed',reversed_at=now(),reversed_transaction_id=v_tx.id where id=v_attempt.id;

    -- Recalculate from the latest remaining paid attempt, regardless of the order in which
    -- a user deletes historical payments. If none remain, return to the earliest reversed due date.
    select * into v_latest_attempt from public.payment_attempts
      where user_id=v_user and source_type='subscription' and source_id=v_attempt.source_id
        and status='paid' and next_due_date is not null
      order by attempted_at desc,created_at desc limit 1;
    v_has_latest := found;
    if v_has_latest then
      v_restore_due := v_latest_attempt.next_due_date;
    else
      select * into v_oldest_attempt from public.payment_attempts
        where user_id=v_user and source_type='subscription' and source_id=v_attempt.source_id
          and status='reversed' and next_due_date is not null
        order by due_date asc,attempted_at asc,created_at asc limit 1;
      v_restore_due := v_oldest_attempt.due_date;
    end if;

    if v_restore_due is not null then
      select coalesce(jsonb_agg(
        case when item.value->>'id'=v_attempt.source_id
          and exists(select 1 from public.payment_attempts history
            where history.user_id=v_user and history.source_type='subscription'
              and history.source_id=v_attempt.source_id and history.next_due_date::text=item.value->>'start')
          then case when v_has_latest then
            (item.value-'lastPaidAt'-'lastPaidAmount'-'lastPaidCurrency')
              || jsonb_build_object('start',v_restore_due::text,'lastPaidAt',v_latest_attempt.attempted_at,
                'lastPaidAmount',v_latest_attempt.amount,'lastPaidCurrency',v_latest_attempt.currency)
            else (item.value-'start'-'lastPaidAt'-'lastPaidAmount'-'lastPaidCurrency')
              || coalesce(v_oldest_attempt.previous_state,jsonb_build_object('start',v_restore_due::text))
            end
          else item.value end order by item.ordinality
      ),'[]'::jsonb) into v_subs
      from public.user_preferences up
      cross join lateral jsonb_array_elements(coalesce(up.prefs->'subscriptions','[]'::jsonb)) with ordinality as item(value,ordinality)
      where up.user_id=v_user;
      if v_subs is not null then
        update public.user_preferences set prefs=jsonb_set(prefs,'{subscriptions}',v_subs,true),updated_at=now()
        where user_id=v_user;
      end if;
    end if;
  end loop;

  -- The transaction reference is also a recovery path if the informational attempt insert was unavailable.
  if v_tx.external_reference like 'movo-subscription:%' then
    begin
      update public.user_preferences up
      set prefs=jsonb_set(up.prefs,'{subscriptions}',(
        select coalesce(jsonb_agg(
          case when item.value->>'id'=split_part(v_tx.external_reference,':',2)
            and item.value->>'start'=split_part(v_tx.external_reference,':',4)
            then (item.value-'lastPaidAt'-'lastPaidAmount'-'lastPaidCurrency') || jsonb_build_object('start',split_part(v_tx.external_reference,':',3))
            else item.value end order by item.ordinality
        ),'[]'::jsonb)
        from jsonb_array_elements(coalesce(up.prefs->'subscriptions','[]'::jsonb)) with ordinality as item(value,ordinality)
      ),true),updated_at=now()
      where up.user_id=v_user
        and not exists(select 1 from public.payment_attempts pa where pa.user_id=v_user and pa.transaction_id=v_tx.id and pa.status='reversed');
    exception when others then
      raise warning 'Could not restore subscription date from transaction reference for user %', v_user;
    end;
  end if;

  update public.scheduled_transactions set
    scheduled_for=(v_tx.occurred_at at time zone timezone)::date,
    status=case when status in ('paused','cancelled') then status else 'scheduled' end,
    last_logged_at=null,last_transaction_id=null,updated_at=now()
  where user_id=v_user and last_transaction_id=v_tx.id;

  for v_event in select * from public.loan_events where user_id=v_user and transaction_id=v_tx.id and reversed_at is null for update loop
    select * into v_loan from public.financial_loans where id=v_event.loan_id and user_id=v_user for update;
    if found then
      update public.financial_loans set
        outstanding_principal=greatest(0,round(outstanding_principal + case
          when v_event.event_type in ('borrowed','principal_increase') then -v_event.amount
          when v_event.event_type='principal_payment' then v_event.amount else 0 end,2)),
        status=case when greatest(0,round(outstanding_principal + case
          when v_event.event_type in ('borrowed','principal_increase') then -v_event.amount
          when v_event.event_type='principal_payment' then v_event.amount else 0 end,2))<=0 then 'paid_off' else 'active' end,
        updated_at=now() where id=v_loan.id;
    end if;
    update public.loan_events set reversed_at=now(),reversed_transaction_id=v_tx.id where id=v_event.id;
    delete from public.accounting_postings where user_id=v_user and source_type='loan_event' and source_id=v_event.id;
  end loop;

  for v_receivable_event in select * from public.receivable_events where user_id=v_user and transaction_id=v_tx.id and reversed_at is null for update loop
    select * into v_receivable from public.financial_receivables where id=v_receivable_event.receivable_id and user_id=v_user for update;
    if found then
      update public.financial_receivables set
        outstanding_amount=greatest(0,round(outstanding_amount + case
          when v_receivable_event.event_type in ('lent','amount_increased') then -v_receivable_event.amount
          when v_receivable_event.event_type in ('collected','written_off') then v_receivable_event.amount else 0 end,2)),
        status=case when greatest(0,round(outstanding_amount + case
          when v_receivable_event.event_type in ('lent','amount_increased') then -v_receivable_event.amount
          when v_receivable_event.event_type in ('collected','written_off') then v_receivable_event.amount else 0 end,2))<=0 then 'settled' else 'active' end,
        updated_at=now() where id=v_receivable.id;
    end if;
    update public.receivable_events set reversed_at=now(),reversed_transaction_id=v_tx.id where id=v_receivable_event.id;
    delete from public.accounting_postings where user_id=v_user and source_type='receivable_event' and source_id=v_receivable_event.id;
  end loop;

  delete from public.transactions where id=v_tx.id and user_id=v_user;
  return v_tx.id;
end $$;


-- Reattach linked payments and obligation events when a transaction is restored from Archive.
-- The replacement transaction receives a new UUID; reversed_transaction_id preserves the old link.
create or replace function public.restore_transaction_links(
  p_reversed_transaction_id uuid,
  p_restored_transaction_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_user uuid := auth.uid();
  v_tx public.transactions;
  v_payment public.bill_payments;
  v_occ public.bill_occurrences;
  v_attempt public.payment_attempts;
  v_latest_attempt public.payment_attempts;
  v_event public.loan_events;
  v_loan public.financial_loans;
  v_receivable_event public.receivable_events;
  v_receivable public.financial_receivables;
  v_signed numeric;
  v_paid numeric;
  v_due numeric;
  v_subs jsonb;
  v_bill_count integer := 0;
  v_attempt_count integer := 0;
  v_loan_count integer := 0;
  v_receivable_count integer := 0;
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_reversed_transaction_id is null or p_restored_transaction_id is null then
    raise exception 'transaction_id_required' using errcode = '22023';
  end if;

  select * into v_tx from public.transactions
  where id=p_restored_transaction_id and user_id=v_user
  for update;
  if not found then raise exception 'restored_transaction_not_found' using errcode = 'P0002'; end if;

  for v_payment in
    select * from public.bill_payments
    where user_id=v_user and reversed_transaction_id=p_reversed_transaction_id and status='reversed'
    for update
  loop
    update public.bill_payments
    set transaction_id=v_tx.id,status='active',reversed_at=null,reversed_transaction_id=null
    where id=v_payment.id;

    select * into v_occ from public.bill_occurrences
    where id=v_payment.occurrence_id and user_id=v_user
    for update;
    if found then
      select coalesce(sum(amount),0) into v_paid
      from public.bill_payments
      where occurrence_id=v_occ.id and user_id=v_user and status='active';
      v_due := coalesce(v_occ.actual_amount,v_occ.expected_amount)+v_occ.late_fee;
      update public.bill_occurrences
      set paid_amount=v_paid,
          status=case when status='cancelled' then 'cancelled'
            when v_paid<=0 then 'scheduled'
            when v_paid>=v_due then 'paid'
            else 'partially_paid' end,
          updated_at=now()
      where id=v_occ.id;
    end if;
    v_bill_count := v_bill_count + 1;
  end loop;

  for v_attempt in
    select * from public.payment_attempts
    where user_id=v_user and reversed_transaction_id=p_reversed_transaction_id and status='reversed'
    for update
  loop
    update public.payment_attempts
    set transaction_id=v_tx.id,status='paid',reversed_at=null,reversed_transaction_id=null
    where id=v_attempt.id;
    v_attempt_count := v_attempt_count + 1;

    if v_attempt.source_type='subscription' and v_attempt.next_due_date is not null then
      select * into v_latest_attempt
      from public.payment_attempts
      where user_id=v_user and source_type='subscription'
        and source_id=v_attempt.source_id and status='paid'
        and next_due_date is not null
      order by attempted_at desc,created_at desc
      limit 1;

      if found then
        select coalesce(jsonb_agg(
          case when item.value->>'id'=v_attempt.source_id
            and item.value->>'start' in (v_attempt.due_date::text,v_latest_attempt.next_due_date::text)
            then (item.value-'start'-'lastPaidAt'-'lastPaidAmount'-'lastPaidCurrency')
              || jsonb_build_object('start',v_latest_attempt.next_due_date::text,
                'lastPaidAt',v_latest_attempt.attempted_at,
                'lastPaidAmount',v_latest_attempt.amount,
                'lastPaidCurrency',v_latest_attempt.currency)
            else item.value end order by item.ordinality
        ),'[]'::jsonb)
        into v_subs
        from public.user_preferences up
        cross join lateral jsonb_array_elements(coalesce(up.prefs->'subscriptions','[]'::jsonb))
          with ordinality as item(value,ordinality)
        where up.user_id=v_user;
        if v_subs is not null then
          update public.user_preferences
          set prefs=jsonb_set(prefs,'{subscriptions}',v_subs,true),updated_at=now()
          where user_id=v_user;
        end if;
      end if;
    end if;
  end loop;

  -- Fallback for a subscription transaction whose informational payment_attempt insert failed.
  if v_tx.external_reference like 'movo-subscription:%'
     and not exists (
       select 1 from public.payment_attempts
       where user_id=v_user and reversed_transaction_id=p_reversed_transaction_id
     ) then
    update public.user_preferences up
    set prefs=jsonb_set(up.prefs,'{subscriptions}',(
      select coalesce(jsonb_agg(
        case when item.value->>'id'=split_part(v_tx.external_reference,':',2)
          and item.value->>'start'=split_part(v_tx.external_reference,':',3)
          then (item.value-'start'-'lastPaidAt'-'lastPaidAmount'-'lastPaidCurrency')
            || jsonb_build_object('start',split_part(v_tx.external_reference,':',4),
              'lastPaidAt',v_tx.occurred_at,'lastPaidAmount',v_tx.amount,'lastPaidCurrency',v_tx.currency)
          else item.value end order by item.ordinality
      ),'[]'::jsonb)
      from jsonb_array_elements(coalesce(up.prefs->'subscriptions','[]'::jsonb))
        with ordinality as item(value,ordinality)
    ),true),updated_at=now()
    where up.user_id=v_user;
  end if;

  if v_tx.schedule_id is not null then
    update public.scheduled_transactions
    set last_transaction_id=v_tx.id,
        last_logged_at=v_tx.occurred_at,
        scheduled_for=case frequency
          when 'weekly' then (v_tx.occurred_at at time zone timezone)::date + 7
          when 'monthly' then ((v_tx.occurred_at at time zone timezone)::date + interval '1 month')::date
          when 'yearly' then ((v_tx.occurred_at at time zone timezone)::date + interval '1 year')::date
          else (v_tx.occurred_at at time zone timezone)::date end,
        status=case when status in ('paused','cancelled') then status
          when frequency='once' then 'completed' else 'scheduled' end,
        updated_at=now()
    where id=v_tx.schedule_id and user_id=v_user and last_transaction_id is null
      and scheduled_for=(v_tx.occurred_at at time zone timezone)::date;
  end if;

  for v_event in
    select * from public.loan_events
    where user_id=v_user and reversed_transaction_id=p_reversed_transaction_id and reversed_at is not null
    for update
  loop
    select * into v_loan from public.financial_loans
    where id=v_event.loan_id and user_id=v_user for update;
    if found then
      update public.financial_loans
      set outstanding_principal=greatest(0,round(outstanding_principal + case
            when v_event.event_type in ('borrowed','principal_increase') then v_event.amount
            when v_event.event_type='principal_payment' then -v_event.amount
            else 0 end,2)),
          status=case when outstanding_principal + case
            when v_event.event_type in ('borrowed','principal_increase') then v_event.amount
            when v_event.event_type='principal_payment' then -v_event.amount
            else 0 end <= 0 then 'paid_off' else 'active' end,
          updated_at=now()
      where id=v_loan.id;
    end if;

    update public.loan_events
    set transaction_id=v_tx.id,reversed_at=null,reversed_transaction_id=null
    where id=v_event.id;

    v_signed := case
      when v_event.event_type in ('borrowed','principal_increase') then v_event.amount
      when v_event.event_type in ('principal_payment','interest_payment','fee') then -v_event.amount
      else 0 end;
    if v_event.account_id is not null and v_signed <> 0 then
      insert into public.accounting_postings(user_id,account_id,signed_amount,currency,source_type,source_id,occurred_at)
      values(v_user,v_event.account_id,v_signed,v_event.currency,'loan_event',v_event.id,v_event.occurred_at)
      on conflict (source_type,source_id,account_id) do nothing;
    end if;
    v_loan_count := v_loan_count + 1;
  end loop;

  for v_receivable_event in
    select * from public.receivable_events
    where user_id=v_user and reversed_transaction_id=p_reversed_transaction_id and reversed_at is not null
    for update
  loop
    select * into v_receivable from public.financial_receivables
    where id=v_receivable_event.receivable_id and user_id=v_user for update;
    if found then
      update public.financial_receivables
      set outstanding_amount=greatest(0,round(outstanding_amount + case
            when v_receivable_event.event_type in ('lent','amount_increased') then v_receivable_event.amount
            when v_receivable_event.event_type in ('collected','written_off') then -v_receivable_event.amount
            else 0 end,2)),
          status=case when outstanding_amount + case
            when v_receivable_event.event_type in ('lent','amount_increased') then v_receivable_event.amount
            when v_receivable_event.event_type in ('collected','written_off') then -v_receivable_event.amount
            else 0 end <= 0 then 'settled' else 'active' end,
          updated_at=now()
      where id=v_receivable.id;
    end if;

    update public.receivable_events
    set transaction_id=v_tx.id,reversed_at=null,reversed_transaction_id=null
    where id=v_receivable_event.id;

    v_signed := case
      when v_receivable_event.event_type in ('lent','amount_increased') then -v_receivable_event.amount
      when v_receivable_event.event_type='collected' then v_receivable_event.amount
      else 0 end;
    if v_receivable_event.account_id is not null and v_signed <> 0 then
      insert into public.accounting_postings(user_id,account_id,signed_amount,currency,source_type,source_id,occurred_at)
      values(v_user,v_receivable_event.account_id,v_signed,v_receivable_event.currency,'receivable_event',v_receivable_event.id,v_receivable_event.occurred_at)
      on conflict (source_type,source_id,account_id) do nothing;
    end if;
    v_receivable_count := v_receivable_count + 1;
  end loop;

  return jsonb_build_object(
    'transaction_id',v_tx.id,
    'restored_from',p_reversed_transaction_id,
    'bill_payments',v_bill_count,
    'subscription_attempts',v_attempt_count,
    'loan_events',v_loan_count,
    'receivable_events',v_receivable_count
  );
end
$function$;

revoke all on function public.allocate_goal_funds(uuid,numeric,text,uuid,uuid,text) from public, anon;
revoke all on function public.allocate_plan_funds(text,text,numeric,text,uuid,text) from public, anon;
revoke all on function public.release_plan_funding_allocation(uuid) from public, anon;
revoke all on function public.reverse_allocation_event(uuid) from public, anon;
revoke all on function public.delete_transaction_with_reversals(uuid) from public, anon;
revoke all on function public.restore_transaction_links(uuid,uuid) from public, anon;
grant execute on function public.allocate_goal_funds(uuid,numeric,text,uuid,uuid,text) to authenticated;
grant execute on function public.allocate_plan_funds(text,text,numeric,text,uuid,text) to authenticated;
grant execute on function public.release_plan_funding_allocation(uuid) to authenticated;
grant execute on function public.reverse_allocation_event(uuid) to authenticated;
grant execute on function public.delete_transaction_with_reversals(uuid) to authenticated;
grant execute on function public.restore_transaction_links(uuid,uuid) to authenticated;

-- The project uses the Data API; explicitly grant authenticated access because new public tables
-- are no longer automatically exposed by Supabase on projects updated after 2026-10-30.
revoke insert, update, delete on public.plan_funding_allocations from authenticated;
grant select on public.plan_funding_allocations to authenticated;
grant select on public.allocation_events to authenticated;

-- Migrate existing preference-backed plan reservations into the account-linked ledger.
-- Keep the legacy preference entries intact; legacy_id lets the client avoid counting the same
-- saved amount twice while preserving older app versions and the original allocation history.
insert into public.plan_funding_allocations (
  user_id, plan_id, plan_name, legacy_id, account_id, amount, currency, status, note
)
select
  up.user_id,
  left(plan_row.plan->>'id',120),
  left(coalesce(nullif(trim(plan_row.plan->>'name'),''),'Plan'),120),
  left(allocation_row.allocation->>'id',160),
  account.id,
  round((allocation_row.allocation->>'amount')::numeric,2),
  upper(coalesce(nullif(allocation_row.allocation->>'currency',''),nullif(plan_row.plan->>'currency',''),'PHP')),
  'allocated',
  left(nullif(allocation_row.allocation->>'note',''),500)
from public.user_preferences up
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(up.prefs->'plans')='array' then up.prefs->'plans' else '[]'::jsonb end
) as plan_row(plan)
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(plan_row.plan->'fundingAllocations')='array' then plan_row.plan->'fundingAllocations' else '[]'::jsonb end
) as allocation_row(allocation)
join public.financial_accounts account
  on account.id = case
    when char_length(allocation_row.allocation->>'account_id')=36
      and allocation_row.allocation->>'account_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
    then (allocation_row.allocation->>'account_id')::uuid
    else null end
 and account.user_id=up.user_id
where plan_row.plan->>'id' is not null
  and char_length(plan_row.plan->>'id') between 1 and 120
  and allocation_row.allocation->>'id' is not null
  and char_length(allocation_row.allocation->>'id') between 1 and 160
  and allocation_row.allocation->>'status'='allocated'
  and case when regexp_replace(allocation_row.allocation->>'amount','^[0-9]+([.][0-9][0-9]?)','') = ''
    then (allocation_row.allocation->>'amount')::numeric > 0 and (allocation_row.allocation->>'amount')::numeric < 1e16
    else false end
  and account.account_type in ('bank','e_wallet','cash')
  and account.currency=upper(coalesce(nullif(allocation_row.allocation->>'currency',''),nullif(plan_row.plan->>'currency',''),'PHP'))
  and char_length(upper(coalesce(nullif(allocation_row.allocation->>'currency',''),nullif(plan_row.plan->>'currency',''),'PHP')))=3
  and upper(coalesce(nullif(allocation_row.allocation->>'currency',''),nullif(plan_row.plan->>'currency',''),'PHP')) ~ '^[A-Z][A-Z][A-Z]'
on conflict (user_id, plan_id, legacy_id) where legacy_id is not null do nothing;

commit;
