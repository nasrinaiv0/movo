-- MOVO hardening (security audit, 2026-11-03). No policy, role or grant is loosened.
--
-- 1. assert_movo_finance_child_ownership() is a trigger function (owner guard on loans, receivables, their events and
--    goal allocations). Nobody needs to call it directly, so it gets the same EXECUTE privileges as
--    assert_movo_bill_ownership(): owner and service_role only. Triggers keep firing; Postgres does not check EXECUTE
--    when a trigger runs.
--
--    Fix found while testing: the guard read new.transaction_id for every table, but financial_loans and
--    financial_receivables have no such column, so every loan or receivable insert/update failed with
--    'record "new" has no field "transaction_id"'. The transaction check now runs only on the tables that have the
--    column (loan_events, receivable_events, goal_allocations). Every ownership check is otherwise unchanged.
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
  -- Nested so new.transaction_id is only resolved on tables that have the column.
  if tg_table_name in ('loan_events', 'receivable_events', 'goal_allocations') then
    if new.transaction_id is not null then
      select user_id into ref_user from public.transactions where id = new.transaction_id;
      if ref_user is distinct from new.user_id then raise exception 'transaction_owner_mismatch' using errcode = '42501'; end if;
    end if;
  end if;
  return new;
end $$;

revoke execute on function public.assert_movo_finance_child_ownership() from public, anon, authenticated;
grant execute on function public.assert_movo_finance_child_ownership() to service_role;

-- 2. Owner policies call auth.uid() once per statement instead of once per row (Supabase lint 0003). Each policy keeps
--    its name, command, roles and meaning: the row's user_id must equal the signed-in user.
alter policy accounting_postings_delete_own on public.accounting_postings using (user_id = (select auth.uid()));
alter policy accounting_postings_insert_own on public.accounting_postings with check (user_id = (select auth.uid()));
alter policy accounting_postings_select_own on public.accounting_postings using (user_id = (select auth.uid()));
alter policy accounting_postings_update_own on public.accounting_postings using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy bill_occurrences_select_own on public.bill_occurrences using (user_id = (select auth.uid()));
alter policy bill_payments_select_own on public.bill_payments using (user_id = (select auth.uid()));
alter policy financial_bills_delete_own on public.financial_bills using (user_id = (select auth.uid()));
alter policy financial_bills_insert_own on public.financial_bills with check (user_id = (select auth.uid()));
alter policy financial_bills_select_own on public.financial_bills using (user_id = (select auth.uid()));
alter policy financial_bills_update_own on public.financial_bills using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy financial_loans_delete_own on public.financial_loans using (user_id = (select auth.uid()));
alter policy financial_loans_insert_own on public.financial_loans with check (user_id = (select auth.uid()));
alter policy financial_loans_select_own on public.financial_loans using (user_id = (select auth.uid()));
alter policy financial_loans_update_own on public.financial_loans using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy financial_receivables_delete_own on public.financial_receivables using (user_id = (select auth.uid()));
alter policy financial_receivables_insert_own on public.financial_receivables with check (user_id = (select auth.uid()));
alter policy financial_receivables_select_own on public.financial_receivables using (user_id = (select auth.uid()));
alter policy financial_receivables_update_own on public.financial_receivables using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy goal_allocations_delete_own on public.goal_allocations using (user_id = (select auth.uid()));
alter policy goal_allocations_insert_own on public.goal_allocations with check (user_id = (select auth.uid()));
alter policy goal_allocations_select_own on public.goal_allocations using (user_id = (select auth.uid()));
alter policy goal_allocations_update_own on public.goal_allocations using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy loan_events_delete_own on public.loan_events using (user_id = (select auth.uid()));
alter policy loan_events_insert_own on public.loan_events with check (user_id = (select auth.uid()));
alter policy loan_events_select_own on public.loan_events using (user_id = (select auth.uid()));
alter policy loan_events_update_own on public.loan_events using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy receivable_events_delete_own on public.receivable_events using (user_id = (select auth.uid()));
alter policy receivable_events_insert_own on public.receivable_events with check (user_id = (select auth.uid()));
alter policy receivable_events_select_own on public.receivable_events using (user_id = (select auth.uid()));
alter policy receivable_events_update_own on public.receivable_events using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy savings_goals_delete_own on public.savings_goals using (user_id = (select auth.uid()));
alter policy savings_goals_insert_own on public.savings_goals with check (user_id = (select auth.uid()));
alter policy savings_goals_select_own on public.savings_goals using (user_id = (select auth.uid()));
alter policy savings_goals_update_own on public.savings_goals using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- 3. Cover the foreign keys that had no index (Supabase lint 0001), so deletes of accounts, transactions, loans,
--    receivables and bill occurrences do not scan the child tables.
create index if not exists accounting_postings_account_id_idx on public.accounting_postings(account_id);
create index if not exists bill_payments_account_id_idx on public.bill_payments(account_id);
create index if not exists bill_payments_occurrence_id_idx on public.bill_payments(occurrence_id);
create index if not exists bill_payments_transaction_id_idx on public.bill_payments(transaction_id);
create index if not exists financial_bills_account_id_idx on public.financial_bills(account_id);
create index if not exists financial_loans_account_id_idx on public.financial_loans(account_id);
create index if not exists financial_receivables_account_id_idx on public.financial_receivables(account_id);
create index if not exists goal_allocations_account_id_idx on public.goal_allocations(account_id);
create index if not exists goal_allocations_transaction_id_idx on public.goal_allocations(transaction_id);
create index if not exists loan_events_account_id_idx on public.loan_events(account_id);
create index if not exists loan_events_loan_id_idx on public.loan_events(loan_id);
create index if not exists loan_events_transaction_id_idx on public.loan_events(transaction_id);
create index if not exists receivable_events_account_id_idx on public.receivable_events(account_id);
create index if not exists receivable_events_receivable_id_idx on public.receivable_events(receivable_id);
create index if not exists receivable_events_transaction_id_idx on public.receivable_events(transaction_id);
