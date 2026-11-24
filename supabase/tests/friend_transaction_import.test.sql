-- Synthetic acceptance and accounting receipt tests; runs only against disposable CI PostgreSQL.
begin;
insert into auth.users(id,email,email_confirmed_at) values
 ('510b31c1-1111-4111-8111-000000000001','share-alice@example.test',now()),
 ('510b31c1-1111-4111-8111-000000000002','share-bob@example.test',now()),
 ('510b31c1-1111-4111-8111-000000000003','share-outsider@example.test',now());

-- Only the disposable owner receives a test subscription; this never touches a live account.
select set_config('request.jwt.claims','{"role":"service_role"}',true);
select set_config('request.jwt.claim.sub','510b31c1-1111-4111-8111-000000000002',true);
insert into public.movo_manual_plan_grants(user_id,tier,expires_at,reason)
values('510b31c1-1111-4111-8111-000000000002','pro',now()+interval '1 day','disposable friend import test');
-- Financial fixtures are created by the disposable database owner, not by MOVO's restricted service role.
insert into public.financial_accounts(id,user_id,name,account_type,currency,opening_balance)
values('510b31c1-1111-4111-8111-000000000004','510b31c1-1111-4111-8111-000000000002','Bob bank','bank','PHP',1000);

set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
do $$
declare
  alice constant uuid := '510b31c1-1111-4111-8111-000000000001';
  bob constant uuid := '510b31c1-1111-4111-8111-000000000002';
  outsider constant uuid := '510b31c1-1111-4111-8111-000000000003';
  bank_id constant uuid := '510b31c1-1111-4111-8111-000000000004';
  conn_id uuid;
  msg_id uuid;
  payload jsonb;
  result jsonb;
  saved_count integer;
begin
  -- Service-only receipt verification must not add financial mutation privileges.
  if has_table_privilege(current_user,'public.transactions','INSERT')
     or has_table_privilege(current_user,'public.transactions','UPDATE')
     or has_table_privilege(current_user,'public.financial_accounts','INSERT')
     or not has_column_privilege(current_user,'public.transactions','amount','SELECT')
     or not has_column_privilege(current_user,'public.financial_accounts','currency','SELECT') then
    raise exception 'Receipt verification widened financial privileges or lacks narrow read rights';
  end if;
  insert into public.movo_friend_connections(member_low,member_high,name_low,name_high)
    values(alice,bob,'Alice','Bob') returning id into conn_id;
  insert into public.movo_friend_messages(id,connection_id,sender_id,client_id,kind,body,card)
    values('510b31c1-1111-4111-8111-000000000005',conn_id,alice,gen_random_uuid(),'transaction','',
      '{"type":"expense","amount":42.25,"currency":"PHP","date":"2026-11-23","description":"Lunch","accountNumber":"private"}'::jsonb)
    returning id into msg_id;
  payload := jsonb_build_object('connectionId',conn_id,'messageId',msg_id);

  if public.movo_friend_transaction_decision(outsider,'decisions',payload)->>'error' is distinct from 'friend_connection_required'
    or public.movo_friend_transaction_decision(outsider,'accept_share',payload)->>'error' is distinct from 'friend_connection_required'
    or public.movo_friend_transaction_decision(alice,'accept_share',payload)->>'error' is distinct from 'shared_transaction_unavailable'
    then raise exception 'Sender/outsider can review recipient transaction'; end if;
  if public.movo_friend_transaction_decision(bob,'decisions',payload)->'decisions' <> '[]'::jsonb
    then raise exception 'Unreviewed message had a decision'; end if;

  if public.movo_friend_transaction_decision(bob,'confirm_share_import',payload)->>'error'
       is distinct from 'share_acceptance_required' then
    raise exception 'Import confirmed before acceptance'; end if;
  if public.movo_friend_transaction_decision(bob,'accept_share',payload)->>'status'
      is distinct from 'accepted' then raise exception 'Accept failed'; end if;
  if public.movo_friend_transaction_decision(bob,'decline_share',payload)->>'status'
      is distinct from 'declined' then raise exception 'Decline failed'; end if;
  if public.movo_friend_transaction_decision(bob,'confirm_share_import',payload)->>'error'
      is distinct from 'share_acceptance_required' then
    raise exception 'Declined message accepted ledger import'; end if;
  perform public.movo_friend_transaction_decision(bob,'accept_share',payload);

  if public.movo_friend_transaction_decision(bob,'confirm_share_import',payload)->>'error'
      is distinct from 'share_import_not_confirmed' then
    raise exception 'Import receipt confirmed before ledger commit'; end if;

  -- Recipient remains unimported until a matching owner transaction is posted.
  if public.movo_friend_transaction_decision(bob,'confirm_share_import',payload)->>'error'
      is distinct from 'share_import_not_confirmed' then
    raise exception 'Import confirmed without a ledger record'; end if;
end;
$$;
reset role;
-- Only the disposable fixture owner can populate/update ledger tables.
do $$ begin
  if (select count(*) from public.transactions where user_id='510b31c1-1111-4111-8111-000000000002')<>0 then
    raise exception 'Acceptance or rejection changed recipient ledger'; end if;
end $$;
insert into public.transactions(id,user_id,account_id,transaction_type,amount,currency,merchant,category,occurred_at,source,external_reference)
values('510b31c1-1111-4111-8111-000000000005','510b31c1-1111-4111-8111-000000000002',
       '510b31c1-1111-4111-8111-000000000004','expense',41.00,'PHP','Lunch','food',now(),
       'manual','movo-friend:510b31c1-1111-4111-8111-000000000005');
set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
do $$
declare
  bob constant uuid := '510b31c1-1111-4111-8111-000000000002';
  conn_id uuid;
  msg_id constant uuid := '510b31c1-1111-4111-8111-000000000005';
  payload jsonb;
begin
  select id into conn_id from public.movo_friend_connections
    where member_low='510b31c1-1111-4111-8111-000000000001'
      and member_high=bob;
  payload:=jsonb_build_object('connectionId',conn_id,'messageId',msg_id);
  if public.movo_friend_transaction_decision(bob,'confirm_share_import',payload)->>'error'
      is distinct from 'share_import_not_confirmed' then
    raise exception 'Incorrect amount confirmed as imported'; end if;
end;
$$;
reset role;
update public.transactions set amount=42.25
  where id='510b31c1-1111-4111-8111-000000000005';
set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
do $$
declare
  alice constant uuid := '510b31c1-1111-4111-8111-000000000001';
  bob constant uuid := '510b31c1-1111-4111-8111-000000000002';
  conn_id uuid;
  msg_id constant uuid := '510b31c1-1111-4111-8111-000000000005';
  payload jsonb;
  saved_count integer;
begin
  select id into conn_id from public.movo_friend_connections where member_low=alice and member_high=bob;
  payload:=jsonb_build_object('connectionId',conn_id,'messageId',msg_id);
  if public.movo_friend_transaction_decision(bob,'confirm_share_import',payload)->>'status'
      is distinct from 'imported' then raise exception 'Valid persisted receipt did not confirm'; end if;
  if public.movo_friend_transaction_decision(bob,'confirm_share_import',payload)->>'status'
      is distinct from 'imported' then raise exception 'Import retry not idempotent'; end if;
  if public.movo_friend_transaction_decision(bob,'decline_share',payload)->>'status'
      is distinct from 'imported' then raise exception 'Imported receipt was overwritten by decline'; end if;
  if public.movo_friend_transaction_decision(alice,'decisions',payload)->'decisions' <> '[]'::jsonb
      then raise exception 'Sender saw recipient-only decision'; end if;
  if public.movo_friend_transaction_decision(bob,'decisions',payload)->'decisions'->0->>'status'
      is distinct from 'imported' then raise exception 'Recipient cannot see completed import'; end if;

  perform public.movo_friends(alice,'remove',null,null,conn_id);
  if exists(select 1 from public.movo_friend_transaction_decisions where recipient_id=bob)
      then raise exception 'Friend removal retained decision record'; end if;
end;
$$;

reset role;
do $$ begin
  if (select count(*) from public.transactions
      where user_id='510b31c1-1111-4111-8111-000000000002')<>1 then
    raise exception 'Import duplicated or deletion removed the recipient ledger entry'; end if;
  if exists(select 1 from public.movo_friend_transaction_decisions
      where recipient_id='510b31c1-1111-4111-8111-000000000002') then
    raise exception 'Deleted friendship retained private import decisions'; end if;
end $$;
set local role authenticated;
do $$
begin
  if has_table_privilege(current_user,'public.movo_friend_transaction_decisions','select')
     or has_table_privilege(current_user,'public.movo_friend_transaction_decisions','insert')
     or has_function_privilege(current_user,'public.movo_friend_transaction_decision(uuid,text,jsonb)','execute') then
    raise exception 'Authenticated client bypasses decision API'; end if;
end;
$$;
reset role;
set local role anon;
do $$
begin
  if has_table_privilege(current_user,'public.movo_friend_transaction_decisions','select')
     or has_function_privilege(current_user,'public.movo_friend_transaction_decision(uuid,text,jsonb)','execute') then
    raise exception 'Anonymous client bypasses decision API'; end if;
end;
$$;
reset role;
rollback;
