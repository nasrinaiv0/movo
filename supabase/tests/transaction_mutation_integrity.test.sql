-- Run against the disposable local fixture, with real authenticated-role grants/RLS.
begin;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
insert into auth.users(id) values
 ('00000000-0000-0000-0000-00000000d001'), ('00000000-0000-0000-0000-00000000d002');
insert into public.movo_manual_plan_grants(user_id,tier,expires_at,reason)
 select id,'pro',now()+interval '1 day','isolated integrity test' from auth.users
 where id in ('00000000-0000-0000-0000-00000000d001','00000000-0000-0000-0000-00000000d002');
insert into public.financial_accounts(id,user_id,name,account_type,opening_balance) values
 ('10000000-0000-0000-0000-00000000d001','00000000-0000-0000-0000-00000000d001','Owner bank','bank',1000),
 ('10000000-0000-0000-0000-00000000d002','00000000-0000-0000-0000-00000000d002','Other bank','bank',1000);
insert into public.transactions(id,user_id,account_id,transaction_type,amount,merchant,occurred_at)
 select ('20000000-0000-0000-0000-00000000d00'||n)::uuid,
 '00000000-0000-0000-0000-00000000d001','10000000-0000-0000-0000-00000000d001',
 'expense',10,'Payment',now() from generate_series(1,5) n;
insert into public.transactions(id,user_id,account_id,transaction_type,amount,merchant,occurred_at) values
 ('20000000-0000-0000-0000-00000000d006','00000000-0000-0000-0000-00000000d002',
  '10000000-0000-0000-0000-00000000d002','expense',10,'Other owner',now());
insert into public.financial_bills(id,user_id,name,amount,first_due_date) values
 ('30000000-0000-0000-0000-00000000d001','00000000-0000-0000-0000-00000000d001','Bill',10,current_date);
insert into public.financial_loans(id,user_id,name,principal_amount,opening_principal,outstanding_principal) values
 ('30000000-0000-0000-0000-00000000d002','00000000-0000-0000-0000-00000000d001','Loan',100,100,100);
insert into public.financial_receivables(id,user_id,name,opening_amount,outstanding_amount) values
 ('30000000-0000-0000-0000-00000000d003','00000000-0000-0000-0000-00000000d001','Receivable',100,100);
insert into public.payment_attempts(user_id,source_type,source_id,due_date,status,amount,transaction_id) values
 ('00000000-0000-0000-0000-00000000d001','subscription','sub-test',current_date,'paid',10,
  '20000000-0000-0000-0000-00000000d004');
-- Inject a later-row failure to verify that reset rolls earlier reversals back.
create function pg_temp.fail_reset_delete() returns trigger language plpgsql as $$ begin
 if old.id='20000000-0000-0000-0000-00000000d003'
  and current_setting('movo.test_fail_reset',true)='on' then
  raise exception 'injected_reset_failure';
 end if;
 return old;
end $$;
create trigger test_reset_failure before delete on public.transactions
 for each row execute function pg_temp.fail_reset_delete();
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000d001',true);
select set_config('request.jwt.claims','{"role":"authenticated"}',true);
set local role authenticated;
select public.ensure_bill_occurrences(current_date);
select public.record_bill_payment(id,10,'integrity-test-payment','recorded',
 '10000000-0000-0000-0000-00000000d001','20000000-0000-0000-0000-00000000d001')
 from public.bill_occurrences where bill_id='30000000-0000-0000-0000-00000000d001';
select public.record_loan_event('30000000-0000-0000-0000-00000000d002','principal_payment',10,'PHP',
 '10000000-0000-0000-0000-00000000d001','20000000-0000-0000-0000-00000000d002');
select public.record_receivable_event('30000000-0000-0000-0000-00000000d003','collected',10,'PHP',
 '10000000-0000-0000-0000-00000000d001','20000000-0000-0000-0000-00000000d003');
do $$
declare tx public.transactions; rejected boolean; result jsonb; op uuid; payload jsonb;
begin
 rejected := false;
 begin perform public.delete_all_transactions_with_reversals('00000000-0000-0000-0000-00000000d002');
 exception when insufficient_privilege then
  if sqlerrm<>'reset_owner_mismatch' then raise; end if; rejected := true;
 end;
 if not rejected or (select count(*) from public.transactions)<>5 then
  raise exception 'Reset accepted a stale or forged expected owner'; end if;
 if has_table_privilege('authenticated','public.transactions','UPDATE')
  or has_table_privilege('authenticated','public.transactions','DELETE')
  or has_function_privilege('anon','public.delete_all_transactions_with_reversals(uuid)','EXECUTE') then
  raise exception 'Transaction mutation privileges are too broad';
 end if;
 -- Direct writes must fail for linked and ordinary records alike.
 for tx in select * from public.transactions loop
  rejected := false;
  begin update public.transactions set amount=20 where id=tx.id;
  exception when insufficient_privilege then rejected := true; end;
  if not rejected then raise exception 'Direct UPDATE bypassed safeguards'; end if;
  rejected := false;
  begin delete from public.transactions where id=tx.id;
  exception when insufficient_privilege then rejected := true; end;
  if not rejected then raise exception 'Direct DELETE bypassed reversals'; end if;
 end loop;
 -- Every active bill, loan, receivable and subscription link protects posting status.
 for tx in select * from public.transactions where id<>'20000000-0000-0000-0000-00000000d005' loop
  foreach payload in array array['{"is_pending":true}'::jsonb,'{"amount":20}'::jsonb] loop
   rejected := false; op := gen_random_uuid();
   begin
    perform public.apply_movo_sync_operation(op,'transactions','update',tx.id,payload,tx.updated_at,0);
   exception when sqlstate '22023' then
    if sqlerrm <> 'reverse_linked_payment_before_editing' then raise; end if;
    rejected := true;
   end;
   if not rejected then raise exception 'Linked payment accepted unsafe edit: %',tx.id; end if;
   if exists(select 1 from public.movo_sync_operations where operation_id=op) then
    raise exception 'Rejected edit left a durable acknowledgement'; end if;
  end loop;
  result := public.apply_movo_sync_operation(gen_random_uuid(),'transactions','update',tx.id,
   '{"note":"Safe description edit","is_pending":false}',tx.updated_at,0);
  if result->'record'->>'note' <> 'Safe description edit' then raise exception 'Safe edit failed'; end if;
 end loop;
 -- Ordinary pending transactions can still post normally through sync.
 select * into tx from public.transactions where id='20000000-0000-0000-0000-00000000d005';
 result := public.apply_movo_sync_operation(gen_random_uuid(),'transactions','update',tx.id,
  '{"is_pending":true}',tx.updated_at,0);
 if (result->'record'->>'is_pending')::boolean is not true then raise exception 'Ordinary pending edit failed'; end if;
 perform public.delete_transaction_with_reversals('20000000-0000-0000-0000-00000000d001');
 if exists(select 1 from public.bill_occurrences where paid_amount<>0 or status<>'scheduled')
  or not exists(select 1 from public.bill_payments where status='reversed' and reversed_transaction_id='20000000-0000-0000-0000-00000000d001') then
  raise exception 'Single deletion failed to reverse bill payment'; end if;
 perform set_config('movo.test_fail_reset','on',true); rejected := false;
 begin perform public.delete_all_transactions_with_reversals(auth.uid());
 exception when raise_exception then
  if sqlerrm<>'injected_reset_failure' then raise; end if; rejected := true;
 end;
 perform set_config('movo.test_fail_reset','off',true);
 if not rejected or (select count(*) from public.transactions)<>4
  or (select outstanding_principal from public.financial_loans)<>90
  or exists(select 1 from public.loan_events where reversed_at is not null) then
  raise exception 'Failed reset partially committed transaction reversals'; end if;
 if public.delete_all_transactions_with_reversals(auth.uid())<>4 then raise exception 'Reset deleted wrong count'; end if;
 if public.delete_all_transactions_with_reversals(auth.uid())<>0 then raise exception 'Empty reset must be safe'; end if;
 if exists(select 1 from public.transactions) then raise exception 'Reset left owner transactions'; end if;
 if (select outstanding_principal from public.financial_loans)<>100
  or (select outstanding_amount from public.financial_receivables)<>100
  or exists(select 1 from public.accounting_postings)
  or exists(select 1 from public.loan_events where reversed_at is null)
  or exists(select 1 from public.receivable_events where reversed_at is null) then
  raise exception 'Reset left inconsistent linked financial effects'; end if;
end $$;
reset role;
do $$ begin
 if exists(select 1 from public.payment_attempts where status<>'reversed') then
  raise exception 'Reset left a paid subscription attempt'; end if;
 if not exists(select 1 from public.transactions where id='20000000-0000-0000-0000-00000000d006') then
  raise exception 'Reset deleted another tenant transaction'; end if;
end $$;
update public.movo_manual_plan_grants set expires_at=now()-interval '1 day'
 where user_id='00000000-0000-0000-0000-00000000d002';
set local role authenticated;
do $$ declare rejected boolean := false; begin
 perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000d002',true);
 begin perform public.delete_all_transactions_with_reversals(auth.uid());
 exception when insufficient_privilege then rejected := true; end;
 if not rejected or not exists(select 1 from public.transactions) then raise exception 'Expired reset did not fail closed'; end if;
 perform set_config('request.jwt.claim.sub','',true); rejected := false;
 begin perform public.delete_all_transactions_with_reversals(auth.uid());
 exception when insufficient_privilege then rejected := true; end;
 if not rejected then raise exception 'Reset accepted missing identity'; end if;
end $$;
reset role;
rollback;
