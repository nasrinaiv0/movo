-- Synthetic-only financial permission/automation acceptance. Never run on production.
begin;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
insert into auth.users(id,email_confirmed_at)
values ('710b31c1-1111-4111-8111-000000000001',now());
insert into public.movo_manual_plan_grants(user_id,tier,expires_at,reason)
values ('710b31c1-1111-4111-8111-000000000001','pro_plus',now()+interval '1 day','synthetic service ledger fence');
insert into public.financial_accounts(id,user_id,name,account_type,currency,opening_balance)
values ('710b31c1-1111-4111-8111-000000000002','710b31c1-1111-4111-8111-000000000001','Synthetic automation bank','bank','PHP',100);
insert into public.movo_automation_tokens(token_hash,user_id,label)
values (repeat('f',64),'710b31c1-1111-4111-8111-000000000001','synthetic ledger fence');

set local role service_role;
do $test$
declare first_result jsonb; retry_result jsonb; posted_id uuid;
begin
  if not has_table_privilege(current_user,'public.transactions','SELECT')
     or has_table_privilege(current_user,'public.transactions','INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER,REFERENCES,MAINTAIN')
     or has_any_column_privilege(current_user,'public.transactions','INSERT')
     or has_any_column_privilege(current_user,'public.transactions','UPDATE') then
    raise exception 'raw server ledger grants remain or server reads were removed';
  end if;
  -- Authorization is checked even when a statement would affect no rows.
  begin
    update public.transactions set merchant='must never write' where false;
    raise exception 'raw server update allowed';
  exception when insufficient_privilege then null; end;
  begin
    delete from public.transactions where false;
    raise exception 'raw server delete allowed';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.transactions default values;
    raise exception 'raw server insert allowed';
  exception when insufficient_privilege then null; end;

  -- Real token-validated SECURITY DEFINER automation must still post and replay.
  first_result := public.log_automation_transaction_v2(repeat('f',64),repeat('e',64),
    '710b31c1-1111-4111-8111-000000000001','710b31c1-1111-4111-8111-000000000002',
    'expense',12.50,'PHP','Synthetic server fence','Other','2026-11-27T12:00:00Z',
    'Synthetic only','bank',null);
  posted_id := (first_result->>'transaction_id')::uuid;
  if posted_id is null or coalesce((first_result->>'duplicate')::boolean,true) then
    raise exception 'canonical automation did not create its transaction';
  end if;
  retry_result := public.log_automation_transaction_v2(repeat('f',64),repeat('e',64),
    '710b31c1-1111-4111-8111-000000000001','710b31c1-1111-4111-8111-000000000002',
    'expense',12.50,'PHP','Synthetic server fence','Other','2026-11-27T12:00:00Z',
    'Synthetic only','bank',null);
  if (retry_result->>'transaction_id')::uuid is distinct from posted_id
     or (retry_result->>'duplicate')::boolean is distinct from true
     or (select count(*) from public.transactions where user_id='710b31c1-1111-4111-8111-000000000001'
       and account_id='710b31c1-1111-4111-8111-000000000002' and id=posted_id
       and amount=12.50 and currency='PHP' and transaction_type='expense' and source='bank') <> 1 then
    raise exception 'automation retry changed or duplicated its canonical transaction';
  end if;
end $test$;
reset role;

do $clients$
begin
  if not has_table_privilege('authenticated','public.transactions','SELECT')
     or not has_table_privilege('authenticated','public.transactions','INSERT')
     or has_table_privilege('authenticated','public.transactions','UPDATE,DELETE')
     or has_table_privilege('anon','public.transactions','SELECT,INSERT,UPDATE,DELETE') then
    raise exception 'legacy owner/client transaction privileges changed';
  end if;
end $clients$;
rollback;
