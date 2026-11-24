begin;

-- Recipient-controlled decisions are not ledger entries or payment instructions.
-- A shared message has one recipient in a two-person accepted friend connection.
create table public.movo_friend_transaction_decisions (
  message_id uuid primary key references public.movo_friend_messages(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('accepted','declined','imported')),
  imported_transaction_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'imported') = (imported_transaction_id is not null)),
  check (imported_transaction_id is null or imported_transaction_id = message_id)
);
create index movo_friend_transaction_decisions_recipient_idx
  on public.movo_friend_transaction_decisions(recipient_id, updated_at desc);

alter table public.movo_friend_transaction_decisions enable row level security;
revoke all on public.movo_friend_transaction_decisions from public, anon, authenticated;
grant select, insert, update on public.movo_friend_transaction_decisions to service_role;

-- The API passes an identity obtained from a freshly verified Supabase session.
-- This function records decisions only. A separate owner-bound atomic RPC writes
-- the ledger via the existing canonical sync writer.
create function public.movo_friend_transaction_decision(
  p_actor uuid, p_action text, p_data jsonb default '{}'::jsonb
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  c public.movo_friend_connections;
  m public.movo_friend_messages;
  d public.movo_friend_transaction_decisions;
  decisions jsonb;
  v_message_id uuid;
  wanted text;
begin
  if p_actor is null or current_user <> 'service_role' then
    raise exception 'service_role_required' using errcode='42501';
  end if;
  if coalesce(p_data->>'connectionId','') !~
     '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' then
    return jsonb_build_object('error','friend_connection_required');
  end if;

  select * into c from public.movo_friend_connections f
    where f.id=(p_data->>'connectionId')::uuid
      and (f.member_low=p_actor or f.member_high=p_actor)
    for key share;
  if c.id is null then return jsonb_build_object('error','friend_connection_required'); end if;

  if p_action='decisions' then
    select coalesce(jsonb_agg(jsonb_build_object(
      'messageId', decision.message_id, 'status', decision.status
    ) order by decision.message_id), '[]'::jsonb)
    into decisions
    from (
      select decision_row.message_id,decision_row.status
      from public.movo_friend_transaction_decisions decision_row
      join public.movo_friend_messages shared_msg on shared_msg.id=decision_row.message_id
      where decision_row.recipient_id=p_actor and shared_msg.connection_id=c.id
        and shared_msg.sender_id<>p_actor
      order by decision_row.updated_at desc limit 100
    ) decision;
    return jsonb_build_object('decisions',decisions);
  end if;

  if p_action not in ('accept_share','decline_share','confirm_share_import') then
    return jsonb_build_object('error','invalid_action');
  end if;
  if coalesce(p_data->>'messageId','') !~
     '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' then
    return jsonb_build_object('error','shared_transaction_unavailable');
  end if;
  v_message_id := (p_data->>'messageId')::uuid;

  select * into m from public.movo_friend_messages msg
    where msg.id=v_message_id and msg.connection_id=c.id
      and msg.kind='transaction' and msg.sender_id<>p_actor;
  if m.id is null then return jsonb_build_object('error','shared_transaction_unavailable'); end if;

  select * into d from public.movo_friend_transaction_decisions cur
    where cur.message_id=v_message_id and cur.recipient_id=p_actor for update;

  if d.status='imported' then
    return jsonb_build_object('ok',true,'messageId',v_message_id,'status','imported');
  end if;

  if p_action in ('accept_share','decline_share') then
    wanted := case when p_action='accept_share' then 'accepted' else 'declined' end;
    insert into public.movo_friend_transaction_decisions
      (message_id,recipient_id,status)
    values(v_message_id,p_actor,wanted)
    on conflict(message_id) do update set
      status=excluded.status,updated_at=now()
      where public.movo_friend_transaction_decisions.recipient_id=p_actor
        and public.movo_friend_transaction_decisions.status<>'imported';
    if not found then return jsonb_build_object('error','shared_transaction_unavailable'); end if;
    return jsonb_build_object('ok',true,'messageId',v_message_id,'status',wanted);
  end if;

  -- Never attest a ledger write performed outside the consent transaction.
  return jsonb_build_object('error','atomic_import_required');
end;
$$;
revoke all on function public.movo_friend_transaction_decision(uuid,text,jsonb)
  from public,anon,authenticated;
grant execute on function public.movo_friend_transaction_decision(uuid,text,jsonb) to service_role;

-- Staging-only atomic recipient import. SECURITY DEFINER is necessary because
-- the private chat and decisions have no authenticated table grants. Identity
-- always derives from auth.uid(); no caller-controlled actor or service write grant.
create function public.movo_import_friend_transaction(
  p_expected_user_id uuid, p_connection_id uuid, p_message_id uuid,
  p_account_id uuid, p_transfer_to_account_id uuid, p_shared_date date
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  uid uuid := auth.uid();
  c public.movo_friend_connections;
  m public.movo_friend_messages;
  d public.movo_friend_transaction_decisions;
  previous public.movo_sync_operations;
  tx_type text;
  tx_currency text;
  tx_amount numeric;
  payload jsonb;
  ack jsonb;
  account_count integer;
  receipt jsonb;
begin
  if uid is null or uid is distinct from p_expected_user_id
     or coalesce(auth.jwt()->>'is_anonymous','false')='true' then
    raise exception 'share_owner_mismatch' using errcode='42501';
  end if;
  -- Serialize with clear/finish erasure and the FK key-share lock taken by
  -- insertion of an erasure request. Recheck pending status after acquiring it.
  perform 1 from auth.users where id=uid
    and (email_confirmed_at is not null or phone_confirmed_at is not null) for update;
  if not found or public.movo_account_erasure_pending() then
    raise exception 'share_owner_mismatch' using errcode='42501';
  end if;
  if p_connection_id is null or p_message_id is null or p_account_id is null
     or p_shared_date is null then raise exception 'share_invalid_request' using errcode='22023'; end if;
  -- Match decision API lock order: connection -> message -> recipient decision.
  -- The connection lock also fences concurrent removal / cascading deletion.
  select * into c from public.movo_friend_connections
    where id=p_connection_id and (member_low=uid or member_high=uid) for key share;
  if not found then raise exception 'share_unavailable' using errcode='42501'; end if;
  select * into m from public.movo_friend_messages
    where id=p_message_id and connection_id=c.id and kind='transaction' and sender_id<>uid for key share;
  if not found then raise exception 'share_unavailable' using errcode='42501'; end if;
  select * into d from public.movo_friend_transaction_decisions
    where message_id=m.id and recipient_id=uid for update;
  if not found or d.status not in ('accepted','imported') then
    raise exception 'share_acceptance_required' using errcode='42501';
  end if;
  tx_type:=m.card->>'type'; tx_currency:=m.card->>'currency';
  if coalesce(tx_type,'') not in ('expense','income','transfer')
     or coalesce(tx_currency,'') !~ '^[A-Z]{3}$'
     or jsonb_typeof(m.card->'amount') is distinct from 'number'
     or m.card->>'date' is distinct from to_char(p_shared_date,'YYYY-MM-DD')
     or p_shared_date < date '2000-01-01' or p_shared_date >= date '2100-01-01' then
    raise exception 'share_invalid_card' using errcode='22023';
  end if;
  tx_amount:=(m.card->>'amount')::numeric;
  if tx_amount<=0 or tx_amount>1000000000000 or tx_amount<>round(tx_amount,2)
     or (tx_type='transfer' and (p_transfer_to_account_id is null or p_transfer_to_account_id=p_account_id))
     or (tx_type<>'transfer' and p_transfer_to_account_id is not null) then
    raise exception 'share_invalid_mapping' using errcode='22023';
  end if;
  -- Date-only snapshots have no time zone or time of day. This staged contract
  -- stores the exact shared calendar date at 12:00 UTC, explicitly, not server local time.
  -- Client must display the shared calendar date rather than infer the sender's time.
  payload:=jsonb_build_object('account_id',p_account_id,'transfer_to_account_id',p_transfer_to_account_id,
    'transaction_type',tx_type,'amount',tx_amount,'currency',tx_currency,
    'merchant',coalesce(nullif(left(m.card->>'description',100),''),'Shared transaction'),
    'category',coalesce(nullif(left(m.card->>'category',50),''),'Other'),
    'occurred_at',to_char(p_shared_date,'YYYY-MM-DD')||'T12:00:00Z',
    'source','manual','external_reference','movo-friend:'||m.id::text,'is_pending',false);
  receipt:=jsonb_build_object('ownerId',uid,'messageId',m.id,'transactionId',m.id,'status','imported');
  -- Same lock as canonical sync operation: a generic pre-existing request may
  -- not be mistaken for an authorized share import. Replay is only valid when
  -- the private decision was atomically marked imported by this RPC.
  perform pg_advisory_xact_lock(hashtextextended(uid::text||':'||m.id::text,0));
  select * into previous from public.movo_sync_operations where user_id=uid and operation_id=m.id;
  if d.status='imported' then
    if not found or previous.request->'payload' is distinct from payload
       or previous.acknowledgement->>'recordId' is distinct from m.id::text then
      raise exception 'share_receipt_conflict' using errcode='22023';
    end if;
    return receipt;
  end if;
  if found then raise exception 'share_operation_collision' using errcode='22023'; end if;
  -- Lock both accounts in stable order; archive / currency edits cannot race posting.
  perform id from public.financial_accounts where user_id=uid and not is_archived and currency=tx_currency
    and (id=p_account_id or id=p_transfer_to_account_id) order by id for share;
  get diagnostics account_count = row_count;
  if account_count <> (case when tx_type='transfer' then 2 else 1 end) then
    raise exception 'share_account_unavailable' using errcode='42501';
  end if;
  ack:=public.apply_movo_sync_operation(m.id,'transactions','create',m.id,payload,null,0);
  if ack->>'ownerId' is distinct from uid::text or ack->>'recordId' is distinct from m.id::text then
    raise exception 'share_invalid_acknowledgement';
  end if;
  update public.movo_friend_transaction_decisions set status='imported', imported_transaction_id=m.id,updated_at=now()
    where message_id=m.id and recipient_id=uid and status='accepted';
  if not found then raise exception 'share_consent_changed' using errcode='40001'; end if;
  return receipt;
end;
$$;
revoke all on function public.movo_import_friend_transaction(uuid,uuid,uuid,uuid,uuid,date) from public,anon,authenticated,service_role;
grant execute on function public.movo_import_friend_transaction(uuid,uuid,uuid,uuid,uuid,date) to authenticated;
commit;
