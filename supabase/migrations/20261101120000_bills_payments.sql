-- MOVO Bills & Payments: bill definitions, one occurrence per due date, and payments.
-- Additive. A payment recorded from an account creates exactly one expense transaction
-- (the account balance then follows the normal ledger); a bill paid elsewhere is
-- reconciled without debiting any account a second time. Nothing here moves real money.
begin;

create table if not exists public.financial_bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  category text not null default 'Other' check (char_length(trim(category)) between 1 and 60),
  amount numeric(18,2) not null check (amount > 0 and amount < 1e16),
  amount_type text not null default 'fixed' check (amount_type in ('fixed','variable')),
  currency text not null default 'PHP' check (currency ~ '^[A-Z]{3}$'),
  frequency text not null default 'monthly' check (frequency in ('one_time','weekly','monthly','quarterly','semiannual','annual')),
  first_due_date date not null,
  account_id uuid references public.financial_accounts(id) on delete set null,
  reminder_days smallint[] not null default '{3,1,0}' check (cardinality(reminder_days) <= 6 and 0 <= all(reminder_days) and 30 >= all(reminder_days)),
  status text not null default 'active' check (status in ('active','paused','cancelled')),
  notes text check (notes is null or char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists financial_bills_user_status_idx on public.financial_bills(user_id, status);

create table if not exists public.bill_occurrences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bill_id uuid not null references public.financial_bills(id) on delete cascade,
  due_date date not null,
  expected_amount numeric(18,2) not null check (expected_amount > 0),
  is_estimate boolean not null default false,
  actual_amount numeric(18,2) check (actual_amount is null or actual_amount > 0),
  late_fee numeric(18,2) not null default 0 check (late_fee >= 0),
  paid_amount numeric(18,2) not null default 0 check (paid_amount >= 0),
  currency text not null default 'PHP' check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'scheduled' check (status in ('scheduled','partially_paid','paid','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bill_id, due_date)
);
create index if not exists bill_occurrences_user_due_idx on public.bill_occurrences(user_id, due_date);

create table if not exists public.bill_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  occurrence_id uuid not null references public.bill_occurrences(id) on delete cascade,
  amount numeric(18,2) not null check (amount > 0),
  currency text not null default 'PHP' check (currency ~ '^[A-Z]{3}$'),
  method text not null check (method in ('recorded','external')),
  account_id uuid references public.financial_accounts(id) on delete set null,
  transaction_id uuid references public.transactions(id) on delete set null,
  idempotency_key text not null check (char_length(idempotency_key) between 8 and 100),
  paid_at timestamptz not null default now(),
  note text check (note is null or char_length(note) <= 1000),
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);
create index if not exists bill_payments_user_occurrence_idx on public.bill_payments(user_id, occurrence_id);

do $$
declare t text;
begin
  foreach t in array array['financial_bills','bill_occurrences','bill_payments']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_select_own', t);
    execute format('create policy %I on public.%I for select to authenticated using (user_id = auth.uid())', t || '_select_own', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
  -- Bill definitions are edited directly; occurrences and payments only through the functions below.
  drop policy if exists financial_bills_insert_own on public.financial_bills;
  create policy financial_bills_insert_own on public.financial_bills for insert to authenticated with check (user_id = auth.uid());
  drop policy if exists financial_bills_update_own on public.financial_bills;
  create policy financial_bills_update_own on public.financial_bills for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
  drop policy if exists financial_bills_delete_own on public.financial_bills;
  create policy financial_bills_delete_own on public.financial_bills for delete to authenticated using (user_id = auth.uid());
  grant select, insert, update, delete on public.financial_bills to authenticated;
  grant select on public.bill_occurrences, public.bill_payments to authenticated;
  revoke insert, update, delete, truncate, references, trigger on public.bill_occurrences, public.bill_payments from authenticated;
end $$;

create or replace function public.assert_movo_bill_ownership()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare ref_user uuid;
begin
  if new.account_id is not null then
    select user_id into ref_user from public.financial_accounts where id = new.account_id;
    if ref_user is distinct from new.user_id then raise exception 'account_owner_mismatch' using errcode = '42501'; end if;
  end if;
  return new;
end $$;
revoke all on function public.assert_movo_bill_ownership() from public, anon, authenticated;
drop trigger if exists financial_bills_owner_guard on public.financial_bills;
create trigger financial_bills_owner_guard before insert or update on public.financial_bills
for each row execute function public.assert_movo_bill_ownership();

-- Due date of the n-th occurrence, always counted from the first due date so a bill on the
-- 31st falls on the last day of shorter months and returns to the 31st afterwards.
create or replace function public.movo_bill_due_date(p_first date, p_frequency text, p_n integer)
returns date language sql immutable set search_path = pg_catalog as $$
  select case p_frequency
    when 'weekly' then p_first + (7 * p_n)
    when 'monthly' then (p_first + make_interval(months => p_n))::date
    when 'quarterly' then (p_first + make_interval(months => 3 * p_n))::date
    when 'semiannual' then (p_first + make_interval(months => 6 * p_n))::date
    when 'annual' then (p_first + make_interval(years => p_n))::date
    else p_first end
$$;

-- Creates any missing occurrences up to p_until. Occurrences due more than 31 days ago are not
-- back-filled (an old start date must not flood the list with overdue items), except a one-time bill.
-- Safe to call repeatedly.
create or replace function public.ensure_bill_occurrences(p_until date)
returns integer
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid := auth.uid(); v_bill public.financial_bills; v_due date; v_n integer; v_made integer; v_added integer := 0; v_rows integer;
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_until is null or p_until > current_date + 400 then raise exception 'invalid_horizon' using errcode = '22023'; end if;
  for v_bill in select * from public.financial_bills where user_id = v_user and status = 'active' loop
    v_n := 0; v_made := 0;
    loop
      v_due := public.movo_bill_due_date(v_bill.first_due_date, v_bill.frequency, v_n);
      exit when v_due > p_until or v_made >= 120 or v_n >= 5000;
      if v_bill.frequency = 'one_time' or v_due >= current_date - 31 then
        insert into public.bill_occurrences(user_id, bill_id, due_date, expected_amount, is_estimate, currency)
        values (v_user, v_bill.id, v_due, v_bill.amount, v_bill.amount_type = 'variable', v_bill.currency)
        on conflict (bill_id, due_date) do nothing;
        get diagnostics v_rows = row_count; v_added := v_added + v_rows; v_made := v_made + 1;
      end if;
      exit when v_bill.frequency = 'one_time';
      v_n := v_n + 1;
    end loop;
  end loop;
  return v_added;
end $$;

-- Sets the confirmed amount of a variable bill, a late fee, or cancels one occurrence.
create or replace function public.update_bill_occurrence(p_occurrence_id uuid, p_actual_amount numeric default null, p_late_fee numeric default null, p_cancel boolean default false)
returns public.bill_occurrences
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid := auth.uid(); v_occ public.bill_occurrences; v_due numeric;
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  select * into v_occ from public.bill_occurrences where id = p_occurrence_id and user_id = v_user for update;
  if not found then raise exception 'occurrence_not_found' using errcode = 'P0002'; end if;
  if p_actual_amount is not null and (p_actual_amount <= 0 or p_actual_amount >= 1e16) then raise exception 'invalid_amount' using errcode = '22023'; end if;
  if p_late_fee is not null and (p_late_fee < 0 or p_late_fee >= 1e16) then raise exception 'invalid_amount' using errcode = '22023'; end if;
  if p_cancel then
    if v_occ.paid_amount > 0 then raise exception 'occurrence_has_payments' using errcode = '22023'; end if;
    update public.bill_occurrences set status = 'cancelled', updated_at = now() where id = v_occ.id returning * into v_occ;
    return v_occ;
  end if;
  v_due := coalesce(round(p_actual_amount, 2), v_occ.actual_amount, v_occ.expected_amount) + coalesce(round(p_late_fee, 2), v_occ.late_fee);
  if v_occ.paid_amount > v_due then raise exception 'amount_below_paid' using errcode = '22023'; end if;
  update public.bill_occurrences set
    actual_amount = coalesce(round(p_actual_amount, 2), actual_amount),
    late_fee = coalesce(round(p_late_fee, 2), late_fee),
    status = case when status = 'cancelled' then status when paid_amount >= v_due then 'paid' when paid_amount > 0 then 'partially_paid' else 'scheduled' end,
    updated_at = now()
  where id = v_occ.id returning * into v_occ;
  return v_occ;
end $$;

-- Records a payment once per idempotency key. 'recorded' with an account creates one expense
-- transaction from that account; 'external' only reconciles (optionally linking an existing
-- transaction) and never debits an account.
create or replace function public.record_bill_payment(
  p_occurrence_id uuid, p_amount numeric, p_idempotency_key text, p_method text default 'recorded',
  p_account_id uuid default null, p_transaction_id uuid default null, p_paid_at timestamptz default null, p_note text default null
) returns public.bill_payments
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid := auth.uid(); v_occ public.bill_occurrences; v_bill public.financial_bills; v_account public.financial_accounts;
  v_payment public.bill_payments; v_due numeric; v_txn uuid := p_transaction_id;
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_idempotency_key is null or char_length(p_idempotency_key) not between 8 and 100 then raise exception 'idempotency_key_required' using errcode = '22023'; end if;
  select * into v_payment from public.bill_payments where user_id = v_user and idempotency_key = p_idempotency_key;
  if found then return v_payment; end if;
  if p_amount is null or p_amount <= 0 or p_amount >= 1e16 then raise exception 'invalid_amount' using errcode = '22023'; end if;
  if p_method not in ('recorded','external') then raise exception 'invalid_payment_method' using errcode = '22023'; end if;
  if p_method = 'recorded' and p_account_id is null then raise exception 'payment_account_required' using errcode = '22023'; end if;
  select * into v_occ from public.bill_occurrences where id = p_occurrence_id and user_id = v_user for update;
  if not found then raise exception 'occurrence_not_found' using errcode = 'P0002'; end if;
  -- Re-check after the lock: a concurrent retry with the same key may have just committed.
  select * into v_payment from public.bill_payments where user_id = v_user and idempotency_key = p_idempotency_key;
  if found then return v_payment; end if;
  if v_occ.status = 'cancelled' then raise exception 'occurrence_cancelled' using errcode = '22023'; end if;
  v_due := coalesce(v_occ.actual_amount, v_occ.expected_amount) + v_occ.late_fee;
  if round(p_amount, 2) > v_due - v_occ.paid_amount then raise exception 'payment_exceeds_remaining' using errcode = '22023'; end if;
  select * into v_bill from public.financial_bills where id = v_occ.bill_id and user_id = v_user;
  if p_account_id is not null then
    select * into v_account from public.financial_accounts where id = p_account_id and user_id = v_user;
    if not found then raise exception 'account_owner_mismatch' using errcode = '42501'; end if;
    if v_account.currency <> v_occ.currency then raise exception 'bill_account_currency_mismatch' using errcode = '22023'; end if;
  end if;
  if v_txn is not null and not exists (select 1 from public.transactions where id = v_txn and user_id = v_user) then raise exception 'transaction_owner_mismatch' using errcode = '42501'; end if;
  if p_method = 'recorded' and v_txn is null then
    insert into public.transactions(user_id, account_id, transaction_type, amount, currency, merchant, category, note, occurred_at, source, external_reference, is_pending)
    values (v_user, p_account_id, 'expense', round(p_amount, 2), v_occ.currency, left(btrim(v_bill.name), 160), left(v_bill.category, 60),
      left(coalesce(p_note, ''), 1000), coalesce(p_paid_at, now()), 'manual', left('movo-bill-' || p_idempotency_key, 200), false)
    returning id into v_txn;
  end if;
  insert into public.bill_payments(user_id, occurrence_id, amount, currency, method, account_id, transaction_id, idempotency_key, paid_at, note)
  values (v_user, v_occ.id, round(p_amount, 2), v_occ.currency, p_method, p_account_id, v_txn, p_idempotency_key, coalesce(p_paid_at, now()), left(p_note, 1000))
  returning * into v_payment;
  update public.bill_occurrences set paid_amount = paid_amount + round(p_amount, 2),
    status = case when paid_amount + round(p_amount, 2) >= v_due then 'paid' else 'partially_paid' end, updated_at = now()
  where id = v_occ.id;
  return v_payment;
end $$;

revoke all on function public.movo_bill_due_date(date, text, integer) from public, anon;
revoke all on function public.ensure_bill_occurrences(date) from public, anon;
revoke all on function public.update_bill_occurrence(uuid, numeric, numeric, boolean) from public, anon;
revoke all on function public.record_bill_payment(uuid, numeric, text, text, uuid, uuid, timestamptz, text) from public, anon;
grant execute on function public.movo_bill_due_date(date, text, integer) to authenticated;
grant execute on function public.ensure_bill_occurrences(date) to authenticated;
grant execute on function public.update_bill_occurrence(uuid, numeric, numeric, boolean) to authenticated;
grant execute on function public.record_bill_payment(uuid, numeric, text, text, uuid, uuid, timestamptz, text) to authenticated;

commit;
