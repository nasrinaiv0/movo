begin;
-- Disposable, synthetic users only. This test never touches production.
insert into auth.users(id,email,email_confirmed_at) values
 ('822ac6b6-7435-43cd-97f1-a01e69665c21','chat-alex@example.test',now()),
 ('822ac6b6-7435-43cd-97f1-a01e69665c22','chat-kai@example.test',now()),
 ('822ac6b6-7435-43cd-97f1-a01e69665c23','chat-outsider@example.test',now());

set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
do $$
declare
  alex constant uuid := '822ac6b6-7435-43cd-97f1-a01e69665c21';
  kai constant uuid := '822ac6b6-7435-43cd-97f1-a01e69665c22';
  outsider constant uuid := '822ac6b6-7435-43cd-97f1-a01e69665c23';
  a_msg constant uuid := '922ac6b6-7435-43cd-97f1-a01e69665c21';
  b_msg constant uuid := '922ac6b6-7435-43cd-97f1-a01e69665c22';
  c_msg constant uuid := '922ac6b6-7435-43cd-97f1-a01e69665c23';
  connection uuid;
  request jsonb;
  first_reply jsonb;
  repeated_reply jsonb;
  packet jsonb;
  inbox jsonb;
begin
  insert into public.movo_friend_connections(member_low,member_high,name_low,name_high)
  values(alex,kai,'Alex','Kai') returning id into connection;
  request := jsonb_build_object('connectionId',connection);
  if public.movo_friend_chat(outsider,'open',request)->>'error' <> 'friend_connection_required' then
    raise exception 'Outsider read a private friend conversation';
  end if;
  if public.movo_friend_chat(outsider,'send',request || jsonb_build_object('clientId',a_msg,'kind','text','body','forged'))->>'error' <> 'friend_connection_required' then
    raise exception 'Outsider sent a message into a private conversation';
  end if;
  if jsonb_array_length(public.movo_friend_chat(outsider,'inbox')->'friends') <> 0 then
    raise exception 'Outsider received friend conversations or photos';
  end if;
  first_reply := public.movo_friend_chat(alex,'send',request || jsonb_build_object('clientId',a_msg,'kind','text','body','Hello Kai'));
  if first_reply->>'ok' <> 'true' then raise exception 'Text message failed to send'; end if;
  repeated_reply := public.movo_friend_chat(alex,'send',request || jsonb_build_object('clientId',a_msg,'kind','text','body','Hello Kai'));
  if repeated_reply->>'id' <> first_reply->>'id' then
    raise exception 'Retry duplicated a text message';
  end if;
  if public.movo_friend_chat(alex,'send',request || jsonb_build_object('clientId',a_msg,'kind','text','body','Changed'))->>'error' <> 'message_duplicate' then
    raise exception 'Idempotency identifier accepted a different message';
  end if;
  packet := '{"type":"expense","amount":123.456,"currency":"PHP","date":"2026-11-23","description":"Lunch","accountId":"do-not-share","cardNumber":"private"}'::jsonb;
  if public.movo_friend_chat(alex,'send',request || jsonb_build_object('clientId',b_msg,'kind','transaction','body','','card',packet))->>'ok' <> 'true' then
    raise exception 'Transaction card send failed';
  end if;
  if (select count(*) from public.movo_friend_messages where connection_id=connection) <> 2 then
    raise exception 'Unexpected stored message count';
  end if;
  if (select card from public.movo_friend_messages where client_id=b_msg) ?
    'accountId' or (select card from public.movo_friend_messages where client_id=b_msg) ? 'cardNumber' then
    raise exception 'Sensitive transaction fields persisted';
  end if;
  if (select card->>'amount' from public.movo_friend_messages where client_id=b_msg) <> '123.46' then
    raise exception 'Shared money precision is incorrect';
  end if;
  if public.movo_friend_chat(alex,'send',request || jsonb_build_object('clientId',c_msg,'kind','transaction','body','','card','{"type":"debit","amount":50,"currency":"PHP","date":"2026-11-23"}'::jsonb))->>'error' <> 'invalid_transaction_card' then
    raise exception 'Invalid transfer-like payment instruction was accepted';
  end if;
  inbox := public.movo_friend_chat(kai,'inbox');
  if (inbox->'friends'->0->>'unread')::int <> 2 then
    raise exception 'Unread messages not calculated for recipient';
  end if;
  if jsonb_array_length(public.movo_friend_chat(kai,'open',request)->'messages') <> 2 then
    raise exception 'Recipient cannot read accepted-friend chat history';
  end if;
  if public.movo_friend_chat(kai,'read',request)->>'ok' <> 'true' then
    raise exception 'Read acknowledgement failed';
  end if;
  if (public.movo_friend_chat(kai,'inbox')->'friends'->0->>'unread')::int <> 0 then
    raise exception 'Read acknowledgement did not clear unread badge';
  end if;
  if public.movo_friend_chat(alex,'send',request || jsonb_build_object('clientId',c_msg,'kind','text','body', 'Hello' || chr(10) || 'Kai'))->>'error' <> 'invalid_message' then
    raise exception 'Multiline control characters bypassed SQL validation';
  end if;
  -- Exercise rate cap without thirty network/API round trips.
  insert into public.movo_friend_rate_limits(owner_id,action,started_at,hits)
  values(alex,'chat_send',now(),30)
  on conflict(owner_id,action) do update set hits=30,started_at=now();
  if public.movo_friend_chat(alex,'send',request || jsonb_build_object('clientId',c_msg,'kind','text','body','Rate limited'))->>'error' <> 'message_rate_limit' then
    raise exception 'Message send rate limit bypassed';
  end if;
  if public.movo_friend_social(alex,'block',request)->>'ok' <> 'true' then
    raise exception 'Block did not remove friend connection';
  end if;
  if exists(select 1 from public.movo_friend_messages where connection_id=connection)
    or exists(select 1 from public.movo_friend_message_reads where connection_id=connection) then
    raise exception 'Blocking friend left chat history or read receipts';
  end if;
  if public.movo_friend_chat(kai,'open',request)->>'error' <> 'friend_connection_required' then
    raise exception 'Blocked friend still reads chat history';
  end if;
end;
$$;
reset role;
set local role authenticated;
do $$ begin
  if has_table_privilege(current_user,'public.movo_friend_messages','select')
     or has_table_privilege(current_user,'public.movo_friend_messages','insert')
     or has_table_privilege(current_user,'public.movo_friend_message_reads','select')
     or has_function_privilege(current_user,'public.movo_friend_chat(uuid,text,jsonb)','execute') then
    raise exception 'Authenticated frontend can bypass private chat API';
  end if;
end $$;
reset role;
rollback;
