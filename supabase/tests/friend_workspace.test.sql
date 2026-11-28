begin;
do $$ begin
 if not has_column_privilege('service_role','auth.users','is_anonymous','SELECT')
   or has_column_privilege('service_role','auth.users','is_anonymous','UPDATE')
   or has_column_privilege('service_role','auth.users','raw_user_meta_data','SELECT')
   or has_column_privilege('anon','auth.users','is_anonymous','SELECT')
   or has_column_privilege('authenticated','auth.users','is_anonymous','SELECT')
 then raise exception 'Workspace Auth visibility must remain column-scoped and server-only'; end if;
end $$;
insert into auth.users(id,email,email_confirmed_at) values
 ('00000000-0000-4000-8000-00000000a101','workspace-a@example.test',now()),
 ('00000000-0000-4000-8000-00000000a102','workspace-b@example.test',now()),
 ('00000000-0000-4000-8000-00000000a103','workspace-c@example.test',now());
insert into auth.users(id,email,email_confirmed_at,is_anonymous) values
 ('00000000-0000-4000-8000-00000000a104','workspace-unverified@example.test',null,false),
 ('00000000-0000-4000-8000-00000000a105','workspace-anonymous@example.test',now(),true);
set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
do $$
declare
 a constant uuid := '00000000-0000-4000-8000-00000000a101';
 b constant uuid := '00000000-0000-4000-8000-00000000a102';
 c constant uuid := '00000000-0000-4000-8000-00000000a103';
 req uuid; conn uuid; msg uuid; own_msg uuid; receipt uuid; result jsonb; i integer;
begin
 if public.movo_friend_workspace('00000000-0000-4000-8000-00000000a104','outgoing_requests')->>'error' is distinct from 'friend_access_unavailable'
 or public.movo_friend_workspace('00000000-0000-4000-8000-00000000a105','outgoing_requests')->>'error' is distinct from 'friend_access_unavailable'
 or public.movo_friend_workspace(gen_random_uuid(),'outgoing_requests')->>'error' is distinct from 'friend_access_unavailable'
 then raise exception 'Unverified, anonymous or missing actor allowed'; end if;
 if public.movo_friend_workspace(a,'cancel_request','{"requestId":"bad-id"}')->>'error' is distinct from 'friend_request_unavailable'
 or public.movo_friend_workspace(a,'report_message','{}')->>'error' is distinct from 'friend_message_unavailable'
 then raise exception 'Malformed workspace target accepted'; end if;
 perform public.movo_friend_social(a,'set_directory','{"handle":"workspace_a","discoverable":true}');
 perform public.movo_friend_social(b,'set_directory','{"handle":"workspace_b","discoverable":true}');
 perform public.movo_friend_social(c,'set_directory','{"handle":"workspace_c","discoverable":true}');
 perform public.movo_friend_social(a,'request','{"handle":"workspace_b"}');
 result := public.movo_friend_workspace(a,'outgoing_requests');
 if jsonb_array_length(result->'outgoing')<>1 or result->'outgoing'->0->>'handle'<>'workspace_b' then raise exception 'Outgoing state not durable'; end if;
 req := (result->'outgoing'->0->>'id')::uuid;
 if public.movo_friend_workspace(c,'outgoing_requests')->'outgoing' is distinct from '[]'::jsonb then raise exception 'Other owner saw pending requests'; end if;
 if public.movo_friend_workspace(b,'cancel_request',jsonb_build_object('requestId',req))->>'error' is distinct from 'friend_request_unavailable' then raise exception 'Recipient canceled sender request'; end if;
 perform public.movo_friend_social(b,'set_directory','{"handle":"changed_private","discoverable":false}');
 if public.movo_friend_workspace(a,'outgoing_requests')->'outgoing'->0->>'handle' is not null then raise exception 'Private handle change leaked'; end if;
 if public.movo_friend_workspace(a,'cancel_request',jsonb_build_object('requestId',req))->>'canceled' is distinct from 'true' then raise exception 'Sender cancel failed'; end if;
 if public.movo_friend_workspace(a,'cancel_request',jsonb_build_object('requestId',req))->>'canceled' is distinct from 'false' then raise exception 'Lost-response cancellation retry not safe'; end if;
 perform public.movo_friend_social(b,'set_directory','{"handle":"workspace_b","discoverable":true}');
 perform public.movo_friend_social(a,'request','{"handle":"workspace_b"}');
 req := (public.movo_friend_workspace(a,'outgoing_requests')->'outgoing'->0->>'id')::uuid;
 perform public.movo_friend_social(b,'accept_request',jsonb_build_object('requestId',req));
 if public.movo_friend_workspace(a,'outgoing_requests')->'outgoing' is distinct from '[]'::jsonb then raise exception 'Accepted request still pending'; end if;
 conn := (public.movo_friends(a,'list')->'friends'->0->>'id')::uuid;
 insert into public.movo_friend_messages(connection_id,sender_id,client_id,kind,body)
 values(conn,b,gen_random_uuid(),'text','Synthetic reported message') returning id into msg;
 insert into public.movo_friend_messages(connection_id,sender_id,client_id,kind,body)
 values(conn,a,gen_random_uuid(),'text','Own message') returning id into own_msg;
 if public.movo_friend_workspace(c,'report_message',jsonb_build_object('connectionId',conn,'messageId',msg))->>'error' is distinct from 'friend_message_unavailable' then raise exception 'Outsider reported private message'; end if;
 if public.movo_friend_workspace(a,'report_message',jsonb_build_object('connectionId',conn,'messageId',own_msg))->>'error' is distinct from 'friend_message_unavailable' then raise exception 'Own message falsely attributed'; end if;
 if public.movo_friend_workspace(a,'report_message',jsonb_build_object('connectionId',gen_random_uuid(),'messageId',msg))->>'error' is distinct from 'friend_message_unavailable' then raise exception 'Wrong connection accepted'; end if;
 receipt := (public.movo_friend_workspace(a,'report_message',jsonb_build_object('connectionId',conn,'messageId',msg))->>'reportId')::uuid;
 if receipt is null then raise exception 'Message report missing receipt'; end if;
 if public.movo_friend_workspace(a,'report_message',jsonb_build_object('connectionId',conn,'messageId',msg))->>'reportId' is distinct from receipt::text then raise exception 'Report retry duplicated receipt'; end if;
 if (select count(*) from public.movo_friend_reports where reporter=a and message_id=msg)<>1 then raise exception 'Report not unique'; end if;
 if (select hits from public.movo_friend_rate_limits where owner_id=a and action='report_message')<>1 then raise exception 'Retry consumed rate budget'; end if;
 -- Separate message reports share one actor budget, while exact retries remain
 -- recoverable even after the budget has been exhausted.
 for i in 2..26 loop
   insert into public.movo_friend_messages(connection_id,sender_id,client_id,kind,body)
   values(conn,b,gen_random_uuid(),'text','Synthetic rate-limit fixture') returning id into own_msg;
   result := public.movo_friend_workspace(a,'report_message',jsonb_build_object('connectionId',conn,'messageId',own_msg));
   if i<=25 and result->>'reportId' is null then raise exception 'Report budget prematurely exhausted'; end if;
   if i=26 and result->>'error' is distinct from 'friend_rate_limit' then raise exception 'Report budget bypassed'; end if;
 end loop;
 if (select count(*) from public.movo_friend_reports where reporter=a and reason='message')<>25
 or public.movo_friend_workspace(a,'report_message',jsonb_build_object('connectionId',conn,'messageId',msg))->>'reportId' is distinct from receipt::text
 then raise exception 'Rate limit or retry receipt failed'; end if;
 update public.movo_friend_rate_limits set started_at=now()-interval '2 days' where owner_id=a and action='report_message';
 result := public.movo_friend_workspace(a,'report_message',jsonb_build_object('connectionId',conn,'messageId',own_msg));
 if result->>'reportId' is null
 or (select hits from public.movo_friend_rate_limits where owner_id=a and action='report_message')<>1
 then raise exception 'Report budget did not reset'; end if;
 insert into public.movo_friend_messages(connection_id,sender_id,client_id,kind,body,card)
 values(conn,b,gen_random_uuid(),'transaction','',
   '{"type":"expense","amount":42.25,"currency":"PHP","date":"2026-11-27"}') returning id into own_msg;
 result := public.movo_friend_workspace(a,'report_message',jsonb_build_object('connectionId',conn,'messageId',own_msg));
 if result->>'reportId' is null or exists(select 1 from public.movo_friend_transaction_decisions where message_id=own_msg)
 then raise exception 'Card report failed or changed financial consent'; end if;
 -- Legacy report behavior and uniqueness remain intact.
 perform public.movo_friend_social(a,'report',jsonb_build_object('connectionId',conn));
 perform public.movo_friend_social(a,'report',jsonb_build_object('connectionId',conn));
 if (select count(*) from public.movo_friend_reports where reporter=a and reason='summary')<>1 then raise exception 'Legacy reports regressed'; end if;
 insert into public.movo_account_erasure_requests(user_id) values(c);
 if public.movo_friend_workspace(c,'outgoing_requests')->>'error' is distinct from 'friend_access_unavailable' then raise exception 'Erasing actor could read'; end if;
 if public.movo_friend_workspace(c,'report_message',jsonb_build_object('connectionId',conn,'messageId',msg))->>'error' is distinct from 'friend_access_unavailable' then raise exception 'Erasure fence bypass'; end if;
 perform public.movo_friend_social(a,'block',jsonb_build_object('connectionId',conn));
 if exists(select 1 from public.movo_friend_reports where message_id=msg) then raise exception 'Removal retained message report references'; end if;
 if public.movo_friend_workspace(a,'report_message',jsonb_build_object('connectionId',conn,'messageId',msg))->>'error' is distinct from 'friend_message_unavailable' then raise exception 'Revoked membership still reports'; end if;
end; $$;
reset role;
do $$ begin
 if exists(select 1 from public.transactions where user_id in
 ('00000000-0000-4000-8000-00000000a101','00000000-0000-4000-8000-00000000a102'))
 then raise exception 'Reporting created a ledger transaction'; end if;
end $$;
set local role anon;
do $$ begin
 if has_function_privilege(current_user,'public.movo_friend_workspace(uuid,text,jsonb)','execute')
 or has_table_privilege(current_user,'public.movo_friend_reports','select')
 then raise exception 'Anonymous workspace access opened'; end if;
end $$;
reset role;
set local role authenticated;
do $$ begin
 if has_table_privilege(current_user,'public.movo_friend_reports','select')
 or has_table_privilege(current_user,'public.movo_friend_reports','insert')
 or has_function_privilege(current_user,'public.movo_friend_workspace(uuid,text,jsonb)','execute')
 then raise exception 'Client privileges opened'; end if;
end $$;
reset role;
delete from auth.users where email like 'workspace-%@example.test';
do $$ begin
 if exists(select 1 from public.movo_friend_reports where reporter in ('00000000-0000-4000-8000-00000000a101','00000000-0000-4000-8000-00000000a102')) then raise exception 'Erasure retained reports'; end if;
end $$;
rollback;
