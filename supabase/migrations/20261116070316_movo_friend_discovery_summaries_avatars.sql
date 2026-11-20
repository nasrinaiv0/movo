begin;

create table public.movo_friend_directory (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  handle text not null unique check (handle ~ '^[a-z0-9_]{3,24}$'),
  discoverable boolean not null default false
);
create index movo_friend_directory_prefix_idx on public.movo_friend_directory (handle text_pattern_ops) where discoverable;

create table public.movo_friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender uuid not null references public.movo_friend_directory(owner_id) on delete cascade,
  recipient uuid not null references public.movo_friend_directory(owner_id) on delete cascade,
  created_at timestamptz not null default now(),
  check (sender <> recipient)
);
create unique index movo_friend_request_pair_idx on public.movo_friend_requests (least(sender, recipient), greatest(sender, recipient));
create index movo_friend_request_sender_idx on public.movo_friend_requests(sender);
create index movo_friend_request_recipient_idx on public.movo_friend_requests(recipient, created_at desc);

create table public.movo_friend_rate_limits (
  owner_id uuid references auth.users(id) on delete cascade,
  action text not null,
  started_at timestamptz not null,
  hits integer not null,
  primary key (owner_id, action)
);

create table public.movo_friend_summaries (
  connection_id uuid references public.movo_friend_connections(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete cascade,
  snapshot jsonb not null,
  shared_at timestamptz not null default now(),
  primary key (connection_id, owner_id)
);
create index movo_friend_summary_owner_idx on public.movo_friend_summaries (owner_id);

create table public.movo_profile_avatars (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  photo text not null check (octet_length(photo) <= 90000 and photo ~ '^data:image/jpeg;base64,/[a-zA-Z0-9+/]+={0,2}$')
);

create table public.movo_friend_blocks (
  id uuid not null unique default gen_random_uuid(),
  blocker uuid references auth.users(id) on delete cascade,
  blocked uuid references auth.users(id) on delete cascade,
  primary key (blocker, blocked),
  check (blocker <> blocked)
);
create index movo_friend_blocked_idx on public.movo_friend_blocks(blocked);

create table public.movo_friend_reports (
  id uuid primary key default gen_random_uuid(),
  reporter uuid references auth.users(id) on delete cascade,
  reported uuid references auth.users(id) on delete cascade,
  reason text not null check (reason in ('summary', 'request')),
  created_at timestamptz not null default now(),
  unique(reporter, reported, reason),
  check (reporter <> reported)
);
create index movo_friend_report_subject_idx on public.movo_friend_reports(reported);
create index movo_friend_report_created_idx on public.movo_friend_reports(created_at desc);

alter table public.movo_friend_blocks enable row level security;
alter table public.movo_friend_reports enable row level security;
revoke all on public.movo_friend_blocks, public.movo_friend_reports from public, anon, authenticated;
grant select, insert, delete on public.movo_friend_blocks to service_role;
grant select, insert on public.movo_friend_reports to service_role;

alter table public.movo_friend_directory enable row level security;
alter table public.movo_friend_requests enable row level security;
alter table public.movo_friend_rate_limits enable row level security;
alter table public.movo_friend_summaries enable row level security;
alter table public.movo_profile_avatars enable row level security;
revoke all on public.movo_friend_directory, public.movo_friend_requests, public.movo_friend_rate_limits,
  public.movo_friend_summaries, public.movo_profile_avatars from public, anon, authenticated;
grant select, insert, update, delete on public.movo_friend_directory, public.movo_friend_requests, public.movo_friend_rate_limits,
  public.movo_friend_summaries, public.movo_profile_avatars to service_role;

-- The API reconstructs the request from validated fields and gets the actor from Auth.
-- Returns only projected data. This function never reads an account's financial ledger.
create function public.movo_friend_social(p_actor uuid, p_action text, p_data jsonb default '{}'::jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  own_handle text;
  is_discoverable boolean;
  other_handle text;
  target_id uuid;
  pair_low uuid;
  pair_high uuid;
  people jsonb;
  requests jsonb;
  request_row public.movo_friend_requests;
  connection public.movo_friend_connections;
  selected_summary jsonb;
  avatar_data text;
  request_hits integer;
  window_size interval;
  lookup_handle text;
  report_kind text;
begin
  if p_actor is null or current_user <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;

  if p_action in ('search', 'request') then
    window_size := case when p_action = 'search' then interval '1 minute' else interval '1 hour' end;
    insert into public.movo_friend_rate_limits as limits (owner_id, action, started_at, hits)
    values (p_actor, p_action, now(), 1)
    on conflict (owner_id, action) do update set
      hits = case when limits.started_at <= now()-window_size then 1 else limits.hits+1 end,
      started_at = case when limits.started_at <= now()-window_size then now() else limits.started_at end
    returning limits.hits into request_hits;
    if request_hits > (case when p_action = 'search' then 25 else 15 end) then
      return jsonb_build_object('error', 'friend_rate_limit');
    end if;
  end if;

  if p_action = 'directory' then
    select handle, discoverable into own_handle, is_discoverable from public.movo_friend_directory where owner_id = p_actor;
    select coalesce(jsonb_agg(jsonb_build_object('id', item.id, 'handle', item.handle) order by item.created_at desc), '[]'::jsonb)
      into requests from (
        select r.id, d.handle, r.created_at from public.movo_friend_requests r
        join public.movo_friend_directory d on d.owner_id = r.sender
        where r.recipient = p_actor and r.created_at > now()-interval '30 days'
          and not exists (select 1 from public.movo_friend_connections c
            where c.member_low = least(r.sender, r.recipient) and c.member_high = greatest(r.sender,r.recipient))
        order by r.created_at desc limit 100
      ) item;
    select coalesce(jsonb_agg(jsonb_build_object('id', b.id, 'handle', d.handle) order by d.handle),'[]'::jsonb) into people
      from public.movo_friend_blocks b left join public.movo_friend_directory d on d.owner_id=b.blocked
      where b.blocker=p_actor;
    return jsonb_build_object('handle', own_handle, 'discoverable', coalesce(is_discoverable,false), 'requests', requests, 'blocked', people);
  elsif p_action = 'set_directory' then
    own_handle := p_data->>'handle';
    if own_handle is null or own_handle !~ '^[a-z0-9_]{3,24}$' or jsonb_typeof(p_data->'discoverable') is distinct from 'boolean' then
      return jsonb_build_object('error','invalid_friend_handle');
    end if;
    begin
      insert into public.movo_friend_directory(owner_id,handle,discoverable) values (p_actor,own_handle,(p_data->>'discoverable')::boolean)
      on conflict (owner_id) do update set handle = excluded.handle, discoverable = excluded.discoverable;
    exception when unique_violation then
      return jsonb_build_object('error','friend_handle_taken');
    end;
    return jsonb_build_object('ok',true);
  elsif p_action = 'search' then
    lookup_handle := p_data->>'handle';
    if lookup_handle is null or lookup_handle !~ '^[a-z0-9_]{3,24}$' then return jsonb_build_object('error','invalid_friend_handle'); end if;
    select coalesce(jsonb_agg(jsonb_build_object('handle', item.handle) order by item.handle), '[]'::jsonb)
      into people from (
        select d.handle from public.movo_friend_directory d where d.discoverable and d.owner_id <> p_actor
          and not exists (select 1 from public.movo_friend_blocks b
            where (b.blocker=p_actor and b.blocked=d.owner_id) or (b.blocker=d.owner_id and b.blocked=p_actor))
          and d.handle like (replace(lookup_handle,'_',chr(92)||'_') || '%') escape '\'
        order by d.handle limit 12
      ) item;
    return jsonb_build_object('people',people);
  elsif p_action = 'request' then
    select d.handle into own_handle from public.movo_friend_directory d where d.owner_id = p_actor;
    if own_handle is null then return jsonb_build_object('error','friend_handle_required'); end if;
    select d.owner_id into target_id from public.movo_friend_directory d where d.handle = p_data->>'handle' and d.discoverable;
    if target_id is null or target_id=p_actor then return jsonb_build_object('error','friend_request_unavailable'); end if;
    pair_low := least(p_actor,target_id);
    pair_high := greatest(p_actor,target_id);
    perform pg_advisory_xact_lock(hashtextextended('movo-friends:'||pair_low::text,0));
    perform pg_advisory_xact_lock(hashtextextended('movo-friends:'||pair_high::text,0));
    if not exists (select 1 from public.movo_friend_directory where owner_id=target_id and handle=p_data->>'handle' and discoverable)
      or exists (select 1 from public.movo_friend_blocks where (blocker=p_actor and blocked=target_id) or (blocker=target_id and blocked=p_actor)) then
      return jsonb_build_object('error','friend_request_unavailable');
    end if;
    if exists(select 1 from public.movo_friend_connections where member_low=pair_low and member_high=pair_high) then
      return jsonb_build_object('error','already_friends');
    end if;
    delete from public.movo_friend_requests where least(sender,recipient)=pair_low and greatest(sender,recipient)=pair_high
      and created_at <= now()-interval '30 days';
    if exists(select 1 from public.movo_friend_requests where sender=target_id and recipient=p_actor) then
      return jsonb_build_object('error','friend_request_received');
    end if;
    if (select count(*) from public.movo_friend_requests where sender=p_actor and created_at > now()-interval '30 days') >= 100
      or (select count(*) from public.movo_friend_requests where recipient=target_id and created_at > now()-interval '30 days') >= 100 then
      return jsonb_build_object('error','friend_request_unavailable');
    end if;
    insert into public.movo_friend_requests(sender,recipient) values(p_actor,target_id) on conflict do nothing;
    return jsonb_build_object('ok',true);
  elsif p_action in ('accept_request','decline_request') then
    select * into request_row from public.movo_friend_requests where id=(p_data->>'requestId')::uuid and recipient=p_actor;
    if request_row.id is null then return jsonb_build_object('error','friend_request_unavailable'); end if;
    pair_low := least(p_actor,request_row.sender);
    pair_high := greatest(p_actor,request_row.sender);
    perform pg_advisory_xact_lock(hashtextextended('movo-friends:'||pair_low::text,0));
    perform pg_advisory_xact_lock(hashtextextended('movo-friends:'||pair_high::text,0));
    select * into request_row from public.movo_friend_requests where id=(p_data->>'requestId')::uuid and recipient=p_actor
      and created_at > now()-interval '30 days' for update;
    if request_row.id is null then return jsonb_build_object('error','friend_request_unavailable'); end if;
    if p_action='accept_request' and not exists(select 1 from public.movo_friend_connections where member_low=pair_low and member_high=pair_high) then
      if (select count(*) from public.movo_friend_connections where member_low=pair_low or member_high=pair_low) >= 200
        or (select count(*) from public.movo_friend_connections where member_low=pair_high or member_high=pair_high) >= 200 then
        return jsonb_build_object('error','friend_limit');
      end if;
      select handle into own_handle from public.movo_friend_directory where owner_id=pair_low;
      select handle into other_handle from public.movo_friend_directory where owner_id=pair_high;
      insert into public.movo_friend_connections(member_low,member_high,name_low,name_high)
      values (pair_low,pair_high,'@'||own_handle,'@'||other_handle);
    end if;
    delete from public.movo_friend_requests where id=request_row.id;
    return jsonb_build_object('ok',true);
  elsif p_action = 'unblock' then
    delete from public.movo_friend_blocks b where b.blocker=p_actor and b.id=(p_data->>'blockId')::uuid;
    return jsonb_build_object('ok',true);
  elsif p_action in ('block','report') then
    if p_data ? 'connectionId' then
      select case when c.member_low=p_actor then c.member_high else c.member_low end into target_id
      from public.movo_friend_connections c where c.id=(p_data->>'connectionId')::uuid and (c.member_low=p_actor or c.member_high=p_actor);
      report_kind := 'summary';
    elsif p_data ? 'requestId' then
      select sender into target_id from public.movo_friend_requests where id=(p_data->>'requestId')::uuid and recipient=p_actor;
      report_kind := 'request';
    end if;
    if target_id is null then return jsonb_build_object('error','friend_request_unavailable'); end if;
    pair_low := least(p_actor,target_id);
    pair_high := greatest(p_actor,target_id);
    perform pg_advisory_xact_lock(hashtextextended('movo-friends:'||pair_low::text,0));
    perform pg_advisory_xact_lock(hashtextextended('movo-friends:'||pair_high::text,0));
    if p_action='report' then
      insert into public.movo_friend_reports(reporter,reported,reason) values(p_actor,target_id,report_kind) on conflict do nothing;
    else
      insert into public.movo_friend_blocks(blocker,blocked) values (p_actor,target_id) on conflict do nothing;
      delete from public.movo_friend_requests where least(sender,recipient)=pair_low and greatest(sender,recipient)=pair_high;
      delete from public.movo_friend_connections where member_low=pair_low and member_high=pair_high;
    end if;
    return jsonb_build_object('ok',true);
  elsif p_action in ('summary','share_summary','revoke_summary') then
    select * into connection from public.movo_friend_connections where id=(p_data->>'connectionId')::uuid
      and (member_low=p_actor or member_high=p_actor) for key share;
    if connection.id is null then return jsonb_build_object('error','friend_connection_required'); end if;
    if p_action='share_summary' then
      selected_summary := p_data->'summary';
      if jsonb_typeof(selected_summary) is distinct from 'object' or octet_length(selected_summary::text)>4000 then
        return jsonb_build_object('error','invalid_friend_summary');
      end if;
      insert into public.movo_friend_summaries(connection_id,owner_id,snapshot) values(connection.id,p_actor,selected_summary)
      on conflict(connection_id,owner_id) do update set snapshot=excluded.snapshot, shared_at=now();
      return jsonb_build_object('ok',true);
    elsif p_action='revoke_summary' then
      delete from public.movo_friend_summaries where connection_id=connection.id and owner_id=p_actor;
      return jsonb_build_object('ok',true);
    end if;
    select s.snapshot || jsonb_build_object('sharedAt', s.shared_at) into selected_summary from public.movo_friend_summaries s
      where s.connection_id=connection.id and s.owner_id<>p_actor;
    return jsonb_build_object('sharedWithYou',selected_summary,'yourShare',exists(select 1 from public.movo_friend_summaries
      where connection_id=connection.id and owner_id=p_actor));
  elsif p_action = 'avatar' then
    select a.photo into avatar_data from public.movo_profile_avatars a where a.owner_id=p_actor;
    return jsonb_build_object('photo',coalesce(avatar_data,''));
  elsif p_action = 'set_avatar' then
    avatar_data := p_data->>'photo';
    if avatar_data = '' then
      delete from public.movo_profile_avatars where owner_id=p_actor;
    elsif avatar_data is null or octet_length(avatar_data)>90000 or avatar_data !~ '^data:image/jpeg;base64,/[a-zA-Z0-9+/]+={0,2}$' then
      return jsonb_build_object('error','invalid_profile_photo');
    else
      insert into public.movo_profile_avatars(owner_id,photo) values(p_actor,avatar_data)
      on conflict(owner_id) do update set photo=excluded.photo;
    end if;
    return jsonb_build_object('ok',true);
  end if;
  return jsonb_build_object('error','invalid_action');
end;
$$;
revoke all on function public.movo_friend_social(uuid,text,jsonb) from public, anon, authenticated;
grant execute on function public.movo_friend_social(uuid,text,jsonb) to service_role;
-- Preserve the existing invite RPC contract while enforcing blocks for older clients.
create or replace function public.movo_friends(
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
  if p_actor is null or current_user <> 'service_role' then
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
  if exists(select 1 from public.movo_friend_blocks b
    where (b.blocker=p_actor and b.blocked=invitation.owner_id) or (b.blocker=invitation.owner_id and b.blocked=p_actor)) then
    return jsonb_build_object('error','invite_unavailable');
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
notify pgrst, 'reload schema';
commit;
