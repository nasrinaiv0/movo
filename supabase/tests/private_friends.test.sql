begin;
insert into auth.users(id,email,email_confirmed_at) values
 ('2ddc22e5-f113-4a9b-977f-d7b8cdf09f41','invite-owner@example.test',now()),
 ('415de7b4-80f8-47ae-beee-0f76c9951c84','invite-friend@example.test',now()),
 ('b4cbe545-acf5-4728-9a72-43d597033c08','invite-other@example.test',now());

set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);

do $$
declare
  owner constant uuid := '2ddc22e5-f113-4a9b-977f-d7b8cdf09f41';
  member constant uuid := '415de7b4-80f8-47ae-beee-0f76c9951c84';
  outsider constant uuid := 'b4cbe545-acf5-4728-9a72-43d597033c08';
  token constant text := repeat('a',64);
  replacement constant text := repeat('b',64);
  reciprocal constant text := repeat('c',64);
  listed jsonb;
  deleted uuid;
begin
  perform public.movo_friends(owner,'create',token,'Sender');
  if public.movo_friends(owner,'preview',token)->>'error' is distinct from 'own_invite' then raise exception 'Own invite accepted'; end if;
  if public.movo_friends(member,'preview',token) <> '{"name":"Sender","connected":false}' then raise exception 'Preview has missing or excess fields'; end if;
  if public.movo_friends(owner,'list')->'friends' <> '[]' then raise exception 'Preview created a connection'; end if;
  perform public.movo_friends(owner,'create',replacement,'Sender');
  if public.movo_friends(member,'accept',token,'Recipient')->>'error' is distinct from 'invite_unavailable' then raise exception 'Old invite still active'; end if;
  if public.movo_friends(member,'accept',replacement,'Recipient')->>'connected' is distinct from 'true' then raise exception 'Accept failed'; end if;
  if public.movo_friends(member,'accept',replacement,'Recipient')->>'connected' is distinct from 'true' then raise exception 'Accept retry did not return connection'; end if;
  if public.movo_friends(outsider,'accept',replacement,'Other Person')->>'error' is distinct from 'invite_unavailable' then raise exception 'Invite accepted twice'; end if;
  listed := public.movo_friends(owner,'list')->'friends';
  if jsonb_array_length(listed)<>1 or listed->0->>'name' is distinct from 'Recipient' then raise exception 'Wrong list shown %',listed; end if;
  if public.movo_friends(member,'list')->'friends'->0->>'name' is distinct from 'Sender' then raise exception 'Reciprocal friend missing'; end if;
  if public.movo_friends(outsider,'list')->'friends' <> '[]' then raise exception 'Outsider saw a connection'; end if;
  deleted := (listed->0->>'id')::uuid;
  perform public.movo_friends(outsider,'remove',null,null,deleted);
  if jsonb_array_length(public.movo_friends(owner,'list')->'friends')<>1 then raise exception 'Outsider removed a friend'; end if;
  perform public.movo_friends(member,'create',reciprocal,'Recipient');
  perform public.movo_friends(owner,'accept',reciprocal,'Sender');
  if jsonb_array_length(public.movo_friends(owner,'list')->'friends')<>1 then raise exception 'Duplicate reciprocal connection'; end if;
  perform public.movo_friends(member,'remove',null,null,deleted);
  if public.movo_friends(owner,'list')->'friends' <> '[]' then raise exception 'Removal failed'; end if;
  if public.movo_friends(member,'accept',replacement,'Recipient')->>'error' is distinct from 'invite_unavailable' then raise exception 'Used invite reconnected after removal'; end if;
  perform public.movo_friends(owner,'create',token,'New Name');
  update public.movo_friend_invites set expires_at=clock_timestamp()-interval '1 second' where owner_id=owner;
  if public.movo_friends(member,'accept',token,'Recipient')->>'error' is distinct from 'invite_unavailable' then raise exception 'Expired invite accepted'; end if;
  perform public.movo_friends(owner,'create',replacement,'New Name');
  perform public.movo_friends(owner,'revoke');
  if public.movo_friends(member,'preview',replacement)->>'error' is distinct from 'invite_unavailable' then raise exception 'Revoked invite visible'; end if;
  perform public.movo_friends(owner,'create',token,'New Name');
  perform public.movo_friends(member,'accept',token,'Recipient');
end;
$$;

reset role;
set local role authenticated;
do $$
begin
  if has_table_privilege(current_user,'public.movo_friend_invites','select')
    or has_table_privilege(current_user,'public.movo_friend_connections','select')
    or has_function_privilege(current_user,'public.movo_friends(uuid,text,text,text,uuid)','execute') then
    raise exception 'Client can access private friend storage';
  end if;
end;
$$;
reset role;
delete from auth.users where id='2ddc22e5-f113-4a9b-977f-d7b8cdf09f41';
do $$ begin
  if (select count(*) from public.movo_friend_connections)<>0 then raise exception 'Connection survived deletion'; end if;
  if exists(select 1 from public.movo_friend_invites where owner_id='2ddc22e5-f113-4a9b-977f-d7b8cdf09f41') then raise exception 'Invite survived deletion'; end if;
end; $$;
rollback;
