-- Run after applying 20261103020000_harden_trigger_execute_rls_initplan_fk_indexes.sql (as a superuser / SQL editor).
-- Everything runs inside one transaction and is rolled back.
begin;
do $$
declare
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid();
  a_acct uuid; b_acct uuid; a_loan uuid; b_loan uuid; a_goal uuid; b_goal uuid; a_bill uuid; a_rec uuid; a_txn uuid; n int; r record;
begin
  -- 1. The trigger-only owner guard cannot be called by app roles; service_role keeps it, like assert_movo_bill_ownership.
  if has_function_privilege('anon', 'public.assert_movo_finance_child_ownership()', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.assert_movo_finance_child_ownership()', 'EXECUTE') then
    raise exception 'assert_movo_finance_child_ownership must not be executable by anon or authenticated';
  end if;
  if not has_function_privilege('service_role', 'public.assert_movo_finance_child_ownership()', 'EXECUTE') then
    raise exception 'service_role must keep EXECUTE on assert_movo_finance_child_ownership';
  end if;

  -- 2. No public policy evaluates auth.uid() per row; every owner policy still compares user_id (or id) with it.
  for r in select tablename, policyname, coalesce(qual, '') || ' ' || coalesce(with_check, '') as expr
           from pg_policies where schemaname = 'public' loop
    if replace(r.expr, '( SELECT auth.uid() AS uid)', '') ~ 'auth\.uid\(\)' then
      raise exception 'policy %.% calls auth.uid() per row', r.tablename, r.policyname;
    end if;
  end loop;
  select count(*) into n from pg_policies where schemaname = 'public' and roles = '{authenticated}'
    and tablename in ('accounting_postings','bill_occurrences','bill_payments','financial_bills','financial_loans',
                      'financial_receivables','goal_allocations','loan_events','receivable_events','savings_goals')
    and (cmd in ('SELECT','DELETE') and qual = '(user_id = ( SELECT auth.uid() AS uid))' and with_check is null
      or cmd = 'INSERT' and qual is null and with_check = '(user_id = ( SELECT auth.uid() AS uid))'
      or cmd = 'UPDATE' and qual = '(user_id = ( SELECT auth.uid() AS uid))' and with_check = qual);
  if n <> 34 then raise exception 'expected 34 owner policies with user_id = (select auth.uid()), found %', n; end if;

  -- 3. Every foreign key in public has an index that starts with its columns.
  for r in select c.conrelid::regclass as tbl, c.conname from pg_constraint c
           where c.contype = 'f' and c.connamespace = 'public'::regnamespace
             and not exists (select 1 from pg_index i where i.indrelid = c.conrelid
                             and (i.indkey::int2[])[0:array_length(c.conkey, 1) - 1] @> c.conkey
                             and (i.indkey::int2[])[0:array_length(c.conkey, 1) - 1] <@ c.conkey) loop
    raise exception 'foreign key % on % has no covering index', r.conname, r.tbl;
  end loop;

  -- 4. Behaviour is unchanged: the guard still fires for app users, and owners stay isolated.
  insert into auth.users (id, email) values (a, a || '@example.test'), (b, b || '@example.test');
  -- Cloud records need Pro or Pro+ (20261104010000_plans_entitlements).
  insert into public.movo_plan_grants (user_id, plan, source, ends_at) values (a, 'pro', 'trial', now() + interval '1 day'), (b, 'pro', 'trial', now() + interval '1 day');
  insert into public.financial_accounts (user_id, name, account_type, currency, opening_balance) values (a, 'A bank', 'bank', 'PHP', 1000) returning id into a_acct;
  insert into public.financial_accounts (user_id, name, account_type, currency, opening_balance) values (b, 'B bank', 'bank', 'PHP', 1000) returning id into b_acct;
  insert into public.financial_loans (user_id, name, principal_amount, outstanding_principal) values (b, 'B loan', 100, 100) returning id into b_loan;
  insert into public.savings_goals (user_id, name, target_amount) values (b, 'B goal', 100) returning id into b_goal;
  insert into public.transactions (user_id, account_id, transaction_type, amount, currency, merchant, category, occurred_at)
  values (a, a_acct, 'expense', 10, 'PHP', 'Shop', 'Food', now()) returning id into a_txn;
  -- The guard still checks the linked transaction on event tables (direct insert as owner role, so only the trigger decides).
  begin
    insert into public.loan_events (user_id, loan_id, event_type, amount, currency, account_id, transaction_id)
    values (b, b_loan, 'fee', 1, 'PHP', b_acct, a_txn);
    raise exception 'an event must not link another user''s transaction';
  exception when insufficient_privilege then null; end;

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;

  -- The trigger runs for an app user even without EXECUTE on it.
  insert into public.financial_loans (user_id, name, principal_amount, outstanding_principal, account_id) values (a, 'A loan', 500, 500, a_acct) returning id into a_loan;
  begin
    insert into public.financial_loans (user_id, name, principal_amount, outstanding_principal, account_id) values (a, 'Steal', 1, 1, b_acct);
    raise exception 'linking another user''s account must fail';
  exception when insufficient_privilege then null; end;
  begin
    perform public.assert_movo_finance_child_ownership();
    raise exception 'calling the guard directly must fail';
  exception when insufficient_privilege then null; end;

  update public.financial_loans set name = 'A loan renamed' where id = a_loan;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'owners must be able to edit their loan'; end if;
  insert into public.financial_receivables (user_id, name, opening_amount, outstanding_amount, account_id)
  values (a, 'Lent to a friend', 80, 80, a_acct) returning id into a_rec;
  begin
    insert into public.financial_receivables (user_id, name, opening_amount, outstanding_amount, account_id) values (a, 'Steal', 1, 1, b_acct);
    raise exception 'linking another user''s account to a receivable must fail';
  exception when insufficient_privilege then null; end;
  perform public.record_receivable_event(a_rec, 'collected', 30, 'PHP', a_acct);
  if (select outstanding_amount from public.financial_receivables where id = a_rec) <> 50 then raise exception 'collecting must reduce the receivable'; end if;

  -- RPCs that insert guarded rows still work, and still refuse other people's records.
  perform public.record_loan_event(a_loan, 'principal_payment', 200, 'PHP', a_acct);
  if (select outstanding_principal from public.financial_loans where id = a_loan) <> 300 then raise exception 'loan payment must reduce the principal'; end if;
  begin
    perform public.record_loan_event(b_loan, 'principal_payment', 1, 'PHP', a_acct);
    raise exception 'paying another user''s loan must fail';
  exception when no_data_found then null; end;
  insert into public.savings_goals (user_id, name, target_amount) values (a, 'A goal', 100) returning id into a_goal;
  perform public.allocate_goal_funds(a_goal, 50, 'PHP', a_acct);
  begin
    perform public.allocate_goal_funds(b_goal, 1, 'PHP', a_acct);
    raise exception 'funding another user''s goal must fail';
  exception when no_data_found then null; end;
  insert into public.financial_bills (user_id, name, amount, first_due_date) values (a, 'Water', 300, current_date) returning id into a_bill;
  perform public.ensure_bill_occurrences(current_date + 1);

  -- Owners read only their rows, cannot write rows for someone else, and cannot hand a row over.
  if exists (select 1 from public.financial_loans where user_id <> a) or exists (select 1 from public.savings_goals where user_id <> a)
     or exists (select 1 from public.financial_accounts where user_id <> a) then
    raise exception 'another user''s records must stay hidden';
  end if;
  if (select count(*) from public.loan_events) <> 1 or (select count(*) from public.receivable_events) <> 1 or (select count(*) from public.goal_allocations) <> 1
     or (select count(*) from public.bill_occurrences) < 1 or (select count(*) from public.accounting_postings) < 1 then
    raise exception 'owners must still see their own ledger rows';
  end if;
  begin
    insert into public.savings_goals (user_id, name, target_amount) values (b, 'Planted', 1);
    raise exception 'inserting a row for another user must fail';
  exception when insufficient_privilege then null; end;
  begin
    update public.financial_bills set user_id = b where id = a_bill;
    raise exception 'handing a row to another user must fail';
  exception when insufficient_privilege then null; end;
  update public.financial_loans set name = 'Hijacked' where id = b_loan;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'updating another user''s loan must affect no rows'; end if;
  delete from public.savings_goals where id = b_goal;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'deleting another user''s goal must affect no rows'; end if;

  -- Signed out: nothing is visible or writable.
  reset role;
  perform set_config('request.jwt.claims', '', true);
  set local role anon;
  begin
    perform 1 from public.financial_loans;
    raise exception 'anon must not read loans';
  exception when insufficient_privilege then null; end;
  begin
    perform public.record_loan_event(a_loan, 'fee', 1);
    raise exception 'anon must not call finance RPCs';
  exception when insufficient_privilege then null; end;
  reset role;
end $$;
rollback;
