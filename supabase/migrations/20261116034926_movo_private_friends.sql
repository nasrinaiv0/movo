begin;

-- Invite tokens are bearer capabilities. Keep only SHA-256 and expose the data through the verified API.
create table public.movo_friend_invites (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  display_name text not null check (char_length(display_name) between 1 and 40),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by uuid references auth.users(id) on delete set null
);
create index movo_friend_invites_used_by_idx on public.movo_friend_invites(used_by);

create table public.movo_friend_connections (
  id uuid primary key default gen_random_uuid(),
  member_low uuid not null references auth.users(id) on delete cascade,
  member_high uuid not null references auth.users(id) on delete cascade,
  name_low text not null check (char_length(name_low) between 1 and 40),
  name_high text not null check (char_length(name_high) between 1 and 40),
  created_at timestamptz not null default now(),
  unique (member_low, member_high),
  check (member_low < member_high)
);
create index movo_friend_connections_high_idx on public.movo_friend_connections(member_high);

alter table public.movo_friend_invites enable row level security;
alter table public.movo_friend_connections enable row level security;
revoke all on public.movo_friend_invites, public.movo_friend_connections from public, anon, authenticated;
grant select, insert, update, delete on public.movo_friend_invites, public.movo_friend_connections to service_role;

create function public.movo_friends(
  p_actor uuid, p_action text, p_token_hash text default null, p_name text default null, p_connection uuid default null
) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  invitation public.movo_friend_invites;
  connection public.movo_friend_connections;
  friend_low uuid;
  friend_high uuid;
  deadline timestamptz;
  friend_list jsonb;
begin
  if p_actor is null or (select auth.jwt()->>'role') is distinct from 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;

  if p_action = 'list' then
    select coalesce(jsonb_agg(jsonb_build_object('id', c.id,
      'name', case when c.member_low = p_actor then c.name_high else c.name_low end)
      order by c.created_at desc, c.id), '[]'::jsonb)
    into friend_list from public.movo_friend_connections c
    where c.member_low = p_actor or c.member_high = p_actor;
    select expires_at into deadline from public.movo_friend_invites
    where owner_id = p_actor and used_at is null and expires_at > clock_timestamp();
    return jsonb_build_object('friends', friend_list, 'activeInviteUntil', deadline);
  end if;

  if p_action = 'revoke' then
    delete from public.movo_friend_invites where owner_id = p_actor and used_at is null;
    return jsonb_build_object('ok', true);
  end if;

  if p_action = 'remove' then
    delete from public.movo_friend_connections
    where id = p_connection and (member_low = p_actor or member_high = p_actor);
    return jsonb_build_object('ok', true);
  end if;

  if p_action is null or p_action not in ('create', 'preview', 'accept') then
    return jsonb_build_object('error', 'invalid_action');
  end if;
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('error', 'invalid_invite');
  end if;
  if p_action in ('create', 'accept')
    and (p_name is null or p_name <> btrim(p_name) or char_length(p_name) not between 1 and 40
      or p_name ~ '[[:cntrl:]]') then
    return jsonb_build_object('error', 'invalid_friend_name');
  end if;

  if p_action = 'create' then
    deadline := clock_timestamp() + interval '24 hours';
    insert into public.movo_friend_invites(owner_id, token_hash, display_name, expires_at)
      values(p_actor, p_token_hash, p_name, deadline)
    on conflict (owner_id) do update set
      token_hash = excluded.token_hash, display_name = excluded.display_name,
      created_at = excluded.created_at, expires_at = excluded.expires_at, used_at = null, used_by = null;
    return jsonb_build_object('expiresAt', deadline);
  end if;

  -- Lock the capability on accept. Rotation, revocation and a second recipient must wait for this decision.
  if p_action = 'accept' then
    select * into invitation from public.movo_friend_invites where token_hash = p_token_hash for update;
  else
    select * into invitation from public.movo_friend_invites where token_hash = p_token_hash;
  end if;
  if invitation.owner_id is null or invitation.expires_at <= clock_timestamp() then
    return jsonb_build_object('error', 'invite_unavailable');
  end if;
  if invitation.owner_id = p_actor then
    return jsonb_build_object('error', 'own_invite');
  end if;
  if invitation.used_at is not null and invitation.used_by is distinct from p_actor then
    return jsonb_build_object('error', 'invite_unavailable');
  end if;

  friend_low := least(p_actor, invitation.owner_id);
  friend_high := greatest(p_actor, invitation.owner_id);
  if p_action = 'accept' then
    -- Lock account IDs in a consistent order so reciprocal invites and capacity checks are safe.
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('movo-friends:' || friend_low::text, 0));
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('movo-friends:' || friend_high::text, 0));
  end if;
  select * into connection from public.movo_friend_connections
    where member_low = friend_low and member_high = friend_high;
  if connection.id is not null then
    if p_action = 'accept' and invitation.used_at is null then
      update public.movo_friend_invites set used_at = clock_timestamp(), used_by = p_actor where owner_id = invitation.owner_id;
    end if;
    return jsonb_build_object('name', case when connection.member_low = p_actor then connection.name_high else connection.name_low end,
      'connected', true);
  end if;
  if invitation.used_at is not null or invitation.expires_at <= clock_timestamp() then
    return jsonb_build_object('error', 'invite_unavailable');
  end if;
  if p_action = 'preview' then
    return jsonb_build_object('name', invitation.display_name, 'connected', false);
  end if;

  if (select count(*) from public.movo_friend_connections where member_low = friend_low or member_high = friend_low) >= 200
    or (select count(*) from public.movo_friend_connections where member_low = friend_high or member_high = friend_high) >= 200 then
    return jsonb_build_object('error', 'friend_limit');
  end if;
  insert into public.movo_friend_connections(member_low, member_high, name_low, name_high)
  values (friend_low, friend_high,
    case when friend_low = p_actor then p_name else invitation.display_name end,
    case when friend_high = p_actor then p_name else invitation.display_name end);
  update public.movo_friend_invites set used_at = clock_timestamp(), used_by = p_actor where owner_id = invitation.owner_id;
  return jsonb_build_object('name', invitation.display_name, 'connected', true);
end;
$$;
revoke all on function public.movo_friends(uuid, text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.movo_friends(uuid, text, text, text, uuid) to service_role;

commit;
