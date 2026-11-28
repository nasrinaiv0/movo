-- Synthetic atomic consent / ledger / recovery tests; never run on production.
begin;
insert into auth.users(id,email,email_confirmed_at) values
 ('510b31c1-1111-4111-8111-000000000001','share-alice@example.test',now()),
 ('510b31c1-1111-4111-8111-000000000002','share-bob@example.test',now()),
 ('510b31c1-1111-4111-8111-000000000003','share-outsider@example.test',now());
select set_config('request.jwt.claims','{"role":"service_role"}',true);
select set_config('request.jwt.claim.sub','510b31c1-1111-4111-8111-000000000002',true);
insert into public.movo_manual_plan_grants(user_id,tier,expires_at,reason)
values('510b31c1-1111-4111-8111-000000000002','pro',now()+interval '1 day','isolated atomic import');
insert into public.financial_accounts(id,user_id,name,account_type,currency,opening_balance) values
 ('510b31c1-1111-4111-8111-000000000004','510b31c1-1111-4111-8111-000000000002','Bob bank','bank','PHP',1000),
 ('510b31c1-1111-4111-8111-000000000006','510b31c1-1111-4111-8111-000000000002','Bob savings','bank','PHP',0),
 ('510b31c1-1111-4111-8111-000000000007','510b31c1-1111-4111-8111-000000000001','Alice bank','bank','PHP',1000);
insert into public.movo_friend_connections(id,member_low,member_high,name_low,name_high)
values('510b31c1-1111-4111-8111-000000000008','510b31c1-1111-4111-8111-000000000001','510b31c1-1111-4111-8111-000000000002','Alice','Bob');
insert into public.movo_friend_messages(id,connection_id,sender_id,client_id,kind,body,card)
values('510b31c1-1111-4111-8111-000000000005','510b31c1-1111-4111-8111-000000000008','510b31c1-1111-4111-8111-000000000001',gen_random_uuid(),'transaction','',
 '{"type":"expense","amount":42.25,"currency":"PHP","date":"2026-11-23","description":"Lunch","accountNumber":"private"}');
set local role service_role;
do $$ declare
 bob constant uuid:='510b31c1-1111-4111-8111-000000000002';
 alice constant uuid:='510b31c1-1111-4111-8111-000000000001';
 outsider constant uuid:='510b31c1-1111-4111-8111-000000000003';
 p constant jsonb:='{"connectionId":"510b31c1-1111-4111-8111-000000000008","messageId":"510b31c1-1111-4111-8111-000000000005"}';
begin
 if has_table_privilege(current_user,'public.transactions','INSERT') or has_table_privilege(current_user,'public.transactions','UPDATE')
 or has_function_privilege(current_user,'public.movo_import_friend_transaction(uuid,uuid,uuid,uuid,uuid,date)','EXECUTE')
 then raise exception 'service can bypass canonical owner write'; end if;
 if public.movo_friend_transaction_decision(outsider,'accept_share',p)->>'error' is distinct from 'friend_connection_required'
 or public.movo_friend_transaction_decision(alice,'accept_share',p)->>'error' is distinct from 'shared_transaction_unavailable'
 then raise exception 'unauthorized consent'; end if;
 if public.movo_friend_transaction_decision(bob,'accept_share',p)->>'status' is distinct from 'accepted'
 or public.movo_friend_transaction_decision(bob,'confirm_share_import',p)->>'error' is distinct from 'atomic_import_required'
 or public.movo_friend_transaction_decision(bob,'decline_share',p)->>'status' is distinct from 'declined'
 then raise exception 'consent or legacy denial failed'; end if;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"role":"authenticated"}',true);
select set_config('request.jwt.claim.sub','510b31c1-1111-4111-8111-000000000002',true);
do $$ declare
 b constant uuid:='510b31c1-1111-4111-8111-000000000002';
 c constant uuid:='510b31c1-1111-4111-8111-000000000008';
 m constant uuid:='510b31c1-1111-4111-8111-000000000005';
 a constant uuid:='510b31c1-1111-4111-8111-000000000004';
 denied boolean:=false;
begin
 if has_table_privilege(current_user,'public.movo_friend_transaction_decisions','SELECT')
 or has_function_privilege(current_user,'public.movo_friend_transaction_decision(uuid,text,jsonb)','EXECUTE')
 then raise exception 'decision bypass'; end if;
 begin perform public.movo_import_friend_transaction(b,c,m,a,null,'2026-11-23'); exception when insufficient_privilege then denied:=true; end;
 if not denied or exists(select 1 from public.transactions where id=m) then raise exception 'declined import posted'; end if;
end $$;
reset role;
set local role service_role;
select public.movo_friend_transaction_decision('510b31c1-1111-4111-8111-000000000002','accept_share',
 '{"connectionId":"510b31c1-1111-4111-8111-000000000008","messageId":"510b31c1-1111-4111-8111-000000000005"}');
reset role;
set local role authenticated;
do $$ declare
 b constant uuid:='510b31c1-1111-4111-8111-000000000002';
 c constant uuid:='510b31c1-1111-4111-8111-000000000008';
 m constant uuid:='510b31c1-1111-4111-8111-000000000005';
 a constant uuid:='510b31c1-1111-4111-8111-000000000004';
 alt constant uuid:='510b31c1-1111-4111-8111-000000000006';
 foreign_a constant uuid:='510b31c1-1111-4111-8111-000000000007';
 denied boolean; ack jsonb;
begin
 denied:=false;
 begin perform public.movo_import_friend_transaction(b,c,m,foreign_a,null,'2026-11-23'); exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'foreign account accepted'; end if;
 denied:=false;
 begin perform public.movo_import_friend_transaction(b,c,m,a,null,'2026-11-24'); exception when invalid_parameter_value then denied:=true; end;
 if not denied then raise exception 'wrong date accepted'; end if;
 denied:=false;
 begin perform public.movo_import_friend_transaction('510b31c1-1111-4111-8111-000000000003',c,m,a,null,'2026-11-23'); exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'stale owner accepted'; end if;
 -- Roll back the entire RPC using a subtransaction after the successful posting.
 begin
   perform public.movo_import_friend_transaction(b,c,m,a,null,'2026-11-23');
   raise exception 'fixture_rollback' using errcode='P0002';
 exception when no_data_found then null; end;
 if exists(select 1 from public.transactions where id=m) or exists(select 1 from public.movo_sync_operations where operation_id=m) then raise exception 'partial rollback'; end if;
 ack:=public.movo_import_friend_transaction(b,c,m,a,null,'2026-11-23');
 if ack->>'status' is distinct from 'imported' or ack is distinct from public.movo_import_friend_transaction(b,c,m,a,null,'2026-11-23')
 then raise exception 'lost response recovery failed'; end if;
 denied:=false;
 begin perform public.movo_import_friend_transaction(b,c,m,alt,null,'2026-11-23'); exception when invalid_parameter_value then denied:=true; end;
 if not denied then raise exception 'changed replay mapping accepted'; end if;
 if (select count(*) from public.transactions where id=m and amount=42.25 and currency='PHP' and account_id=a
  and (occurred_at at time zone 'UTC')::date='2026-11-23' and not is_pending and external_reference='movo-friend:'||m::text)<>1
 or (select count(*) from public.movo_sync_operations where operation_id=m)<>1 then raise exception 'canonical entry mismatch'; end if;
end $$;
reset role;
set local role service_role;
do $$ declare
 b constant uuid:='510b31c1-1111-4111-8111-000000000002';
 a constant uuid:='510b31c1-1111-4111-8111-000000000001';
 c constant uuid:='510b31c1-1111-4111-8111-000000000008';
 p constant jsonb:='{"connectionId":"510b31c1-1111-4111-8111-000000000008","messageId":"510b31c1-1111-4111-8111-000000000005"}';
begin
 if public.movo_friend_transaction_decision(b,'decline_share',p)->>'status' is distinct from 'imported'
 or public.movo_friend_transaction_decision(a,'decisions',p)->'decisions' <> '[]'::jsonb then raise exception 'receipt overwritten or leaked'; end if;
 perform public.movo_friends(a,'remove',null,null,c);
 if exists(select 1 from public.movo_friend_transaction_decisions where recipient_id=b) then raise exception 'decision retained after removal'; end if;
end $$;
reset role;
do $$ begin
 if (select count(*) from public.transactions where id='510b31c1-1111-4111-8111-000000000005')<>1 then raise exception 'recipient ledger lost'; end if;
end $$;
set local role anon;
do $$ begin
 if has_function_privilege(current_user,'public.movo_import_friend_transaction(uuid,uuid,uuid,uuid,uuid,date)','EXECUTE')
 or has_table_privilege(current_user,'public.movo_friend_transaction_decisions','SELECT') then raise exception 'anonymous access'; end if;
end $$;
reset role;
rollback;
