begin;

-- Private friend-to-friend conversations. A message is not a payment or a finance-ledger row.
create table public.movo_friend_messages (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.movo_friend_connections(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null,
  kind text not null check (kind in ('text', 'transaction')),
  body text not null default '' check (char_length(body) <= 2000),
  card jsonb,
  created_at timestamptz not null default now(),
  unique (sender_id, client_id),
  check ((kind = 'text' and char_length(body) > 0 and card is null)
      or (kind = 'transaction' and body = '' and jsonb_typeof(card) = 'object'))
);
create index movo_friend_messages_thread_idx
  on public.movo_friend_messages (connection_id, created_at desc, id desc);
create index movo_friend_messages_sender_idx on public.movo_friend_messages (sender_id);
create table public.movo_friend_message_reads (
  connection_id uuid not null references public.movo_friend_connections(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (connection_id, owner_id)
);
create index movo_friend_message_reads_owner_idx on public.movo_friend_message_reads (owner_id);

alter table public.movo_friend_messages enable row level security;
alter table public.movo_friend_message_reads enable row level security;
revoke all on public.movo_friend_messages, public.movo_friend_message_reads from public, anon, authenticated;
grant select, insert on public.movo_friend_messages to service_role;
grant select, insert, update on public.movo_friend_message_reads to service_role;

-- Calls are only allowed through the server's verified-user boundary.
-- All actions recheck accepted connection membership. Block/removal cascades the history.
create function public.movo_friend_chat(p_actor uuid, p_action text, p_data jsonb default '{}'::jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  c public.movo_friend_connections;
  peer uuid;
  peer_name text;
  peer_photo text;
  output_rows jsonb;
  new_message public.movo_friend_messages;
  message_kind text;
  message_body text;
  selected_card jsonb;
  message_hits integer;
  nonce uuid;
begin
  if p_actor is null or current_user <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_action = 'inbox' then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', recent.id, 'name', recent.name, 'photo', coalesce(recent.photo, ''),
      'lastMessage', coalesce(recent.last_message, ''), 'updatedAt', recent.updated_at,
      'unread', recent.unread
    ) order by recent.updated_at desc, recent.id), '[]'::jsonb) into output_rows
    from (
      select f.id, case when f.member_low=p_actor then f.name_high else f.name_low end as name,
        avatar.photo,
        coalesce((select case when m.kind='transaction' then 'Transaction shared' else left(m.body, 80) end
          from public.movo_friend_messages m where m.connection_id=f.id
          order by m.created_at desc,m.id desc limit 1), '') as last_message,
        coalesce((select max(m.created_at) from public.movo_friend_messages m where m.connection_id=f.id),
          f.created_at) as updated_at,
        (select count(*) from public.movo_friend_messages m
          where m.connection_id=f.id and m.sender_id<>p_actor
          and m.created_at>coalesce(reads.last_read_at, 'epoch'::timestamptz)) as unread
      from public.movo_friend_connections f
      left join public.movo_profile_avatars avatar
        on avatar.owner_id=case when f.member_low=p_actor then f.member_high else f.member_low end
      left join public.movo_friend_message_reads reads on reads.connection_id=f.id and reads.owner_id=p_actor
      where f.member_low=p_actor or f.member_high=p_actor
      order by updated_at desc,f.id limit 100
    ) recent;
    return jsonb_build_object('friends', output_rows);
  end if;
  if p_data->>'connectionId' is null or
     p_data->>'connectionId' !~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' then
    return jsonb_build_object('error', 'friend_connection_required');
  end if;
  select * into c from public.movo_friend_connections f where f.id=(p_data->>'connectionId')::uuid
    and (f.member_low=p_actor or f.member_high=p_actor) for key share;
  if c.id is null then return jsonb_build_object('error','friend_connection_required'); end if;
  peer := case when c.member_low=p_actor then c.member_high else c.member_low end;
  peer_name := case when c.member_low=p_actor then c.name_high else c.name_low end;
  if p_action='open' then
    select photo into peer_photo from public.movo_profile_avatars where owner_id=peer;
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', row_data.id, 'senderId', row_data.sender_id, 'kind', row_data.kind,
      'body', row_data.body, 'card', row_data.card, 'createdAt', row_data.created_at
    ) order by row_data.created_at, row_data.id), '[]'::jsonb) into output_rows
    from (select id,sender_id,kind,body,card,created_at
      from public.movo_friend_messages where connection_id=c.id
      order by created_at desc,id desc limit 80) row_data;
    return jsonb_build_object('name',peer_name,'photo',coalesce(peer_photo,''),'messages',output_rows);
  elsif p_action='read' then
    insert into public.movo_friend_message_reads (connection_id,owner_id,last_read_at) values(c.id,p_actor,now())
      on conflict(connection_id,owner_id) do update set last_read_at=greatest(
        public.movo_friend_message_reads.last_read_at, excluded.last_read_at);
    return jsonb_build_object('ok',true);
  elsif p_action='send' then
    message_kind := p_data->>'kind';
    message_body := p_data->>'body';
    if p_data->>'clientId' is null or
       p_data->>'clientId' !~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' then
      return jsonb_build_object('error','invalid_message');
    end if;
    nonce := (p_data->>'clientId')::uuid;
    if message_kind='text' then
      if message_body is null or char_length(message_body) not between 1 and 2000
         or octet_length(message_body)>6000 or message_body ~ '[[:cntrl:]]'
         or p_data->'card' is not null then
        return jsonb_build_object('error','invalid_message');
      end if;
      selected_card := null;
    elsif message_kind='transaction' then
      selected_card := p_data->'card';
      if message_body is distinct from '' or jsonb_typeof(selected_card) is distinct from 'object'
         or coalesce(selected_card->>'type','') not in ('expense','income','transfer')
         or jsonb_typeof(selected_card->'amount') is distinct from 'number'
         or (selected_card->>'amount')::numeric <= 0
         or (selected_card->>'amount')::numeric > 1000000000000
         or coalesce(selected_card->>'currency','') !~ '^[A-Z]{3}$'
         or coalesce(selected_card->>'date','') !~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$'
         or length(coalesce(selected_card->>'description',''))>100
         or length(coalesce(selected_card->>'category',''))>50 then
        return jsonb_build_object('error','invalid_transaction_card');
      end if;
      -- Explicit projection, even for requests that bypass the application validator.
      selected_card := jsonb_strip_nulls(jsonb_build_object(
        'type',selected_card->>'type','amount',round((selected_card->>'amount')::numeric,2),
        'currency',selected_card->>'currency','date',selected_card->>'date',
        'description',nullif(selected_card->>'description',''),
        'category',nullif(selected_card->>'category','')));
      message_body := '';
    else
      return jsonb_build_object('error','invalid_message');
    end if;

    -- Idempotency check before rate count avoids penalizing network retries.
    select * into new_message from public.movo_friend_messages
      where sender_id=p_actor and client_id=nonce;
    if new_message.id is not null then
      if new_message.connection_id<>c.id or new_message.kind<>message_kind
        or new_message.body<>message_body or new_message.card is distinct from selected_card then
        return jsonb_build_object('error','message_duplicate');
      end if;
      return jsonb_build_object('ok',true,'id',new_message.id,'createdAt',new_message.created_at);
    end if;

    insert into public.movo_friend_rate_limits as limits (owner_id,action,started_at,hits)
    values(p_actor,'chat_send',now(),1)
    on conflict(owner_id,action) do update set
      hits=case when limits.started_at < now()-interval '1 minute' then 1 else limits.hits+1 end,
      started_at=case when limits.started_at < now()-interval '1 minute' then now() else limits.started_at end
    returning hits into message_hits;
    if message_hits>30 then return jsonb_build_object('error','message_rate_limit'); end if;

    insert into public.movo_friend_messages(connection_id,sender_id,client_id,kind,body,card)
    values(c.id,p_actor,nonce,message_kind,message_body,selected_card)
    on conflict(sender_id,client_id) do nothing returning * into new_message;
    if new_message.id is null then
      select * into new_message from public.movo_friend_messages where sender_id=p_actor and client_id=nonce;
      if new_message.connection_id<>c.id or new_message.kind<>message_kind
         or new_message.body<>message_body or new_message.card is distinct from selected_card then
        return jsonb_build_object('error','message_duplicate');
      end if;
    end if;
    return jsonb_build_object('ok',true,'id',new_message.id,'createdAt',new_message.created_at);
  end if;
  return jsonb_build_object('error','invalid_action');
end;
$$;
revoke all on function public.movo_friend_chat(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.movo_friend_chat(uuid,text,jsonb) to service_role;

commit;
