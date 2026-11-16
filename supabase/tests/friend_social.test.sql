begin;
insert into auth.users(id,email,email_confirmed_at) values
 ('2ddc22e5-f113-4a9b-977f-d7b8cdf09f41','social-owner@example.test',now()),
 ('415de7b4-80f8-47ae-beee-0f76c9951c84','social-friend@example.test',now()),
 ('b4cbe545-acf5-4728-9a72-43d597033c08','social-other@example.test',now());

set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
do $$
declare
  alex constant uuid := '2ddc22e5-f113-4a9b-977f-d7b8cdf09f41';
  kai constant uuid := '415de7b4-80f8-47ae-beee-0f76c9951c84';
  other constant uuid := 'b4cbe545-acf5-4728-9a72-43d597033c08';
  req uuid;
  conn uuid;
  block_id uuid;
  photo constant text := 'data:image/jpeg;base64,/9j/4QAAAAAA/9k=';
  packet constant jsonb := '{"month":"2026-11","note":"I track spending weekly","totals":{"currency":"PHP","income":1000,"expenses":150}}';
  payload jsonb;
begin
  perform public.movo_friend_social(alex,'set_directory','{"handle":"ale_x","discoverable":false}');
  perform public.movo_friend_social(kai,'set_directory','{"handle":"kai_money","discoverable":true}');
  perform public.movo_friend_social(other,'set_directory','{"handle":"kaiXmoney","discoverable":true}');
  perform public.movo_friend_social(other,'set_directory','{"handle":"kaixmoney","discoverable":true}');
  if public.movo_friend_social(alex,'search','{"handle":"kai_"}') <> '{"people":[{"handle":"kai_money"}]}' then raise exception 'Search leaked fields or matched wildcard'; end if;
  if public.movo_friend_social(kai,'search','{"handle":"ale"}') <> '{"people":[]}' then raise exception 'Private member appeared in directory'; end if;
  if public.movo_friend_social(other,'set_directory','{"handle":"kai_money","discoverable":true}')->>'error' <> 'friend_handle_taken' then raise exception 'Handle collision allowed'; end if;
  if public.movo_friend_social(alex,'request','{"handle":"kai_money"}') <> '{"ok":true}' then raise exception 'Request failed'; end if;
  perform public.movo_friend_social(alex,'request','{"handle":"kai_money"}');
  if public.movo_friend_social(other,'directory')->'requests' <> '[]' then raise exception 'Outsider saw requests'; end if;
  if jsonb_array_length(public.movo_friend_social(kai,'directory')->'requests') <> 1 then raise exception 'Request not unique'; end if;
  req := (public.movo_friend_social(kai,'directory')->'requests'->0->>'id')::uuid;
  payload := jsonb_build_object('requestId',req);
  if public.movo_friend_social(alex,'accept_request',payload)->>'error' <> 'friend_request_unavailable' then raise exception 'Sender accepted request'; end if;
  if public.movo_friend_social(other,'accept_request',payload)->>'error' <> 'friend_request_unavailable' then raise exception 'Outsider accepted request'; end if;
  if public.movo_friend_social(kai,'accept_request',payload) <> '{"ok":true}' then raise exception 'Recipient could not accept'; end if;
  conn := (public.movo_friends(alex,'list')->'friends'->0->>'id')::uuid;
  payload := jsonb_build_object('connectionId',conn);
  if public.movo_friend_social(kai,'summary',payload) <> '{"sharedWithYou":null,"yourShare":false}' then raise exception 'Connection granted access automatically'; end if;
  if public.movo_friend_social(alex,'share_summary',payload||jsonb_build_object('summary',packet)) <> '{"ok":true}' then raise exception 'Share failed'; end if;
  if (public.movo_friend_social(kai,'summary',payload)->'sharedWithYou')-'sharedAt' <> packet then raise exception 'Approved summary unavailable'; end if;
  if public.movo_friend_social(other,'summary',payload)->>'error' <> 'friend_connection_required' then raise exception 'Outsider saw summary'; end if;
  perform public.movo_friend_social(kai,'revoke_summary',payload);
  if public.movo_friend_social(kai,'summary',payload)->'sharedWithYou' = 'null' then raise exception 'Recipient revoked owner share'; end if;
  perform public.movo_friend_social(alex,'revoke_summary',payload);
  if public.movo_friend_social(kai,'summary',payload)->'sharedWithYou' <> 'null' then raise exception 'Revoked summary is visible'; end if;
  perform public.movo_friend_social(alex,'share_summary',payload||jsonb_build_object('summary',packet));
  if public.movo_friend_social(other,'report',payload)->>'error' <> 'friend_request_unavailable' then raise exception 'Outsider could report private connection'; end if;
  perform public.movo_friend_social(kai,'report',payload);
  if (select count(*) from public.movo_friend_reports where reporter=kai and reported=alex)<>1 then raise exception 'Report did not queue'; end if;
  perform public.movo_friend_social(kai,'block',payload);
  if public.movo_friend_social(alex,'request','{"handle":"kai_money"}')->>'error' <> 'friend_request_unavailable' then raise exception 'Block allowed another request'; end if;
  perform public.movo_friends(alex,'create',repeat('a',64),'Alex');
  if public.movo_friends(kai,'accept',repeat('a',64),'Kai')->>'error' <> 'invite_unavailable' then raise exception 'Block bypassed by invite'; end if;
  block_id := (public.movo_friend_social(kai,'directory')->'blocked'->0->>'id')::uuid;
  if block_id is null then raise exception 'Blocked entry missing'; end if;
  perform public.movo_friend_social(alex,'unblock',jsonb_build_object('blockId',block_id));
  if public.movo_friend_social(kai,'directory')->'blocked' = '[]' then raise exception 'Outsider removed block'; end if;
  perform public.movo_friend_social(kai,'unblock',jsonb_build_object('blockId',block_id));
  if public.movo_friend_social(kai,'directory')->'blocked' <> '[]' then raise exception 'Unblock failed'; end if;
  if exists (select 1 from public.movo_friend_summaries where connection_id=conn) then raise exception 'Unfriend left a snapshot'; end if;
  perform public.movo_friend_social(alex,'set_avatar',jsonb_build_object('photo',photo));
  if public.movo_friend_social(alex,'avatar')->>'photo' <> photo then raise exception 'Photo did not round trip'; end if;
  if public.movo_friend_social(kai,'avatar',jsonb_build_object('ownerId',alex))->>'photo' <> '' then raise exception 'Other profile photo leaked'; end if;
  perform public.movo_friend_social(alex,'set_avatar','{"photo":""}');
  if public.movo_friend_social(alex,'avatar')->>'photo' <> '' then raise exception 'Photo removal failed'; end if;
  for n in 1..25 loop
    perform public.movo_friend_social(other,'search','{"handle":"alex"}');
  end loop;
  if public.movo_friend_social(other,'search','{"handle":"alex"}')->>'error' <> 'friend_rate_limit' then raise exception 'Search rate limit bypassed'; end if;
end;
$$;
reset role;
set local role authenticated;
do $$ begin
  if has_table_privilege(current_user,'public.movo_friend_directory','select')
    or has_table_privilege(current_user,'public.movo_profile_avatars','select')
    or has_table_privilege(current_user,'public.movo_friend_summaries','select')
    or has_function_privilege(current_user,'public.movo_friend_social(uuid,text,jsonb)','execute') then
    raise exception 'Direct client access is open';
  end if;
end; $$;
reset role;
delete from auth.users where email like 'social-%@example.test';
do $$ begin
  if exists (select 1 from public.movo_friend_directory) or exists (select 1 from public.movo_friend_rate_limits) or exists (select 1 from public.movo_friend_reports) then
    raise exception 'Account deletion left social data';
  end if;
end; $$;
rollback;
