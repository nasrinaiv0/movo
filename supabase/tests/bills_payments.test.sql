-- Run after applying 20261101120000_bills_payments.sql in a test project (as a superuser / SQL editor).
-- Everything runs inside one transaction and is rolled back.
begin;
do $$
declare
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid();
  acct uuid; usd_acct uuid; card uuid; bill uuid; occ uuid; occ2 uuid; p1 uuid; p2 uuid; n int; v_status text; v_paid numeric; v_bal numeric;
begin
  foreach v_status in array array['financial_bills','bill_occurrences','bill_payments'] loop
    if not (select relrowsecurity from pg_class where oid = ('public.' || v_status)::regclass) then raise exception '% must have RLS enabled', v_status; end if;
    if has_table_privilege('anon', 'public.' || v_status, 'SELECT') then raise exception 'anon must not read %', v_status; end if;
  end loop;
  if has_table_privilege('authenticated', 'public.bill_payments', 'INSERT') or has_table_privilege('authenticated', 'public.bill_occurrences', 'UPDATE') then
    raise exception 'occurrences and payments must only change through functions';
  end if;
  if has_function_privilege('anon', 'public.record_bill_payment(uuid,numeric,text,text,uuid,uuid,timestamptz,text)', 'EXECUTE') then raise exception 'anon must not record payments'; end if;

  -- Month-end rule: Jan 31 monthly → Feb 29 (2028 leap year), Mar 31, Apr 30.
  if public.movo_bill_due_date('2028-01-31', 'monthly', 1) <> '2028-02-29' or public.movo_bill_due_date('2028-01-31', 'monthly', 2) <> '2028-03-31'
     or public.movo_bill_due_date('2028-01-31', 'monthly', 3) <> '2028-04-30' or public.movo_bill_due_date('2028-02-29', 'annual', 1) <> '2029-02-28' then
    raise exception 'due dates must clamp to month end and recover';
  end if;

  insert into auth.users (id, email) values (a, a || '@example.test'), (b, b || '@example.test');
  insert into public.financial_accounts (user_id, name, account_type, currency, opening_balance) values (a, 'Bank', 'bank', 'PHP', 10000) returning id into acct;
  insert into public.financial_accounts (user_id, name, account_type, currency, opening_balance) values (a, 'USD', 'bank', 'USD', 100) returning id into usd_acct;
  insert into public.financial_accounts (user_id, name, account_type, currency, opening_balance) values (b, 'B bank', 'bank', 'PHP', 500) returning id into card;

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.financial_bills (user_id, name, category, amount, amount_type, currency, frequency, first_due_date)
  values (a, 'Electricity', 'Utilities', 2500, 'variable', 'PHP', 'monthly', current_date - 10) returning id into bill;
  begin
    insert into public.financial_bills (user_id, name, amount, first_due_date, account_id) values (a, 'Steal', 1, current_date, card);
    raise exception 'linking another user''s account must fail';
  exception when insufficient_privilege then null; end;

  insert into public.financial_bills (user_id, name, amount, frequency, first_due_date) values (a, 'Old weekly', 50, 'weekly', current_date - 700);
  n := public.ensure_bill_occurrences(current_date + 50);
  if (select min(o.due_date) from public.bill_occurrences o join public.financial_bills f on f.id = o.bill_id where f.name = 'Old weekly') < current_date - 31 then
    raise exception 'old schedules must not be back-filled';
  end if;
  if n < 2 then raise exception 'expected at least 2 occurrences, got %', n; end if;
  if public.ensure_bill_occurrences(current_date + 50) <> 0 then raise exception 'occurrence generation must be idempotent'; end if;
  select id into occ from public.bill_occurrences where bill_id = bill order by due_date limit 1;
  if not (select is_estimate from public.bill_occurrences where id = occ) then raise exception 'variable bill occurrences are estimates'; end if;

  -- The actual amount replaces the estimate; a partial payment from the bank creates one expense.
  perform public.update_bill_occurrence(occ, 2800, 200);
  select id into p1 from public.record_bill_payment(occ, 1000, 'key-partial-0001', 'recorded', acct);
  select id into p2 from public.record_bill_payment(occ, 1000, 'key-partial-0001', 'recorded', acct);
  if p1 <> p2 then raise exception 'the same idempotency key must return the same payment'; end if;
  if (select count(*) from public.transactions where account_id = acct and transaction_type = 'expense') <> 1 then raise exception 'a retried payment must create exactly one expense'; end if;
  select status, paid_amount into v_status, v_paid from public.bill_occurrences where id = occ;
  if v_status <> 'partially_paid' or v_paid <> 1000 then raise exception 'expected partially_paid 1000, got % %', v_status, v_paid; end if;

  begin perform public.record_bill_payment(occ, 2500, 'key-overpay-0001', 'recorded', acct); raise exception 'overpayment must fail';
  exception when invalid_parameter_value then null; end;
  begin perform public.record_bill_payment(occ, 100, 'key-currency-001', 'recorded', usd_acct); raise exception 'currency mismatch must fail';
  exception when invalid_parameter_value then null; end;
  begin perform public.update_bill_occurrence(occ, null, null, true); raise exception 'cancelling a part-paid occurrence must fail';
  exception when invalid_parameter_value then null; end;

  -- Paid elsewhere: settles the rest without a second account debit.
  perform public.record_bill_payment(occ, 2000, 'key-external-001', 'external');
  select status into v_status from public.bill_occurrences where id = occ;
  if v_status <> 'paid' then raise exception 'expected paid, got %', v_status; end if;
  if (select count(*) from public.transactions where account_id = acct) <> 1 then raise exception 'external reconciliation must not debit an account'; end if;
  select sum(amount) into v_bal from public.transactions where account_id = acct;
  if v_bal <> 1000 then raise exception 'only the recorded 1000 may reach the ledger, got %', v_bal; end if;

  select id into occ2 from public.bill_occurrences where bill_id = bill order by due_date desc limit 1;
  perform public.update_bill_occurrence(occ2, null, null, true);
  begin perform public.record_bill_payment(occ2, 10, 'key-cancelled-01', 'external'); raise exception 'paying a cancelled occurrence must fail';
  exception when invalid_parameter_value then null; end;

  -- User b sees none of a's bills and cannot pay them.
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  set local role authenticated;
  if (select count(*) from public.financial_bills) <> 0 or (select count(*) from public.bill_occurrences) <> 0 or (select count(*) from public.bill_payments) <> 0 then
    raise exception 'bills must be isolated per user';
  end if;
  begin perform public.record_bill_payment(occ, 1, 'key-otheruser-01', 'external'); raise exception 'another user must not pay this bill';
  exception when no_data_found then null; end;
  reset role;
end $$;
rollback;
