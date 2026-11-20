-- Synthetic records represent the current production contract, NOT real customer data.
-- The preflight runs BEFORE PR #274 SQL changes on an isolated temporary database.
insert into auth.users(id,email) values
  ('30000000-0000-4000-8000-000000000011','staged-a@example.test'),
  ('30000000-0000-4000-8000-000000000012','staged-b@example.test');
-- Seed synthetic owner records as the service role: the real cloud-plan trigger
-- requires an authenticated paid user, even when tests create their own data.
select set_config('request.jwt.claims','{"role":"service_role"}',false);
insert into public.movo_manual_plan_grants(user_id,tier,expires_at,reason) values
  ('30000000-0000-4000-8000-000000000011','pro_plus',now()+interval '1 day','disposable staged fixture'),
  ('30000000-0000-4000-8000-000000000012','pro_plus',now()+interval '1 day','disposable staged fixture');
insert into public.financial_accounts(id,user_id,name,account_type,currency,opening_balance) values
  ('30000000-0000-4000-8000-000000000021','30000000-0000-4000-8000-000000000011','Staged A','bank','PHP',500),
  ('30000000-0000-4000-8000-000000000022','30000000-0000-4000-8000-000000000012','Staged B','bank','PHP',700);
insert into public.scheduled_transactions(id,user_id,title,transaction_type,amount,account_id,scheduled_for)
values ('30000000-0000-4000-8000-000000000031','30000000-0000-4000-8000-000000000011','Legacy schedule','expense',10,
 '30000000-0000-4000-8000-000000000021',current_date);
insert into public.transactions(id,user_id,account_id,transaction_type,amount,merchant,schedule_id,occurred_at) values
  ('30000000-0000-4000-8000-000000000041','30000000-0000-4000-8000-000000000011','30000000-0000-4000-8000-000000000021','expense',10,'Preflight A','30000000-0000-4000-8000-000000000031',now()),
  ('30000000-0000-4000-8000-000000000042','30000000-0000-4000-8000-000000000012','30000000-0000-4000-8000-000000000022','expense',12,'Preflight B',null,now());
insert into public.user_preferences(user_id,prefs)
values ('30000000-0000-4000-8000-000000000011',
  jsonb_build_object('archive',jsonb_build_array(
    jsonb_build_object('id','old','archivedAt',now()-interval '92 days'),
    jsonb_build_object('id','keep','archivedAt',now()-interval '1 day')
  ),'theme','dark'));
insert into public.movo_iap_ack_jobs(purchase_token_hash,product_id,encrypted_token,created_at,completed_at) values
  (repeat('1',64),'sandbox.product','pending-old',now()-interval '10 days',null),
  (repeat('2',64),'sandbox.product','',now()-interval '10 days',now()-interval '9 days'),
  (repeat('3',64),'sandbox.product','',now()-interval '10 days',now()-interval '1 day');
-- The deployed #328 baseline already blocks raw writes; #274 must preserve that.
do $$ begin
  if has_table_privilege('authenticated','public.transactions','UPDATE')
    or has_table_privilege('authenticated','public.transactions','DELETE')
  then raise exception 'Pre-upgrade baseline reopened #328 transaction writes'; end if;
end $$;
begin;
select set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000011',true);
select set_config('request.jwt.claims','{"role":"authenticated"}',true);
set local role authenticated;
do $$ begin
  begin
    update public.transactions set merchant='Old app edit' where id='30000000-0000-4000-8000-000000000041';
    raise exception 'Pre-upgrade raw UPDATE bypassed #328';
  exception when insufficient_privilege then null; end;
  begin
    delete from public.transactions where id='30000000-0000-4000-8000-000000000041';
    raise exception 'Pre-upgrade raw DELETE bypassed #328';
  exception when insufficient_privilege then null; end;
end $$;
rollback;
