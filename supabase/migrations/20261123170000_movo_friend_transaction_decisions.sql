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
-- This function never inserts/updates a financial ledger row. It confirms an
-- existing owner-owned row only after the normal finance writer persists it.
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

  if d.status is distinct from 'accepted' then
    return jsonb_build_object('error','share_acceptance_required');
  end if;

  -- Cloud confirmation is granted ONLY for the same UUID, owner and provenance,
  -- with exactly the amount/currency/type that the sender actually shared.
  -- A local-only entry remains "accepted" until it has been uploaded.
  if not exists (
    select 1 from public.transactions tx
    join public.financial_accounts a on a.id=tx.account_id and a.user_id=p_actor
    where tx.id=v_message_id
      and tx.user_id=p_actor
      and tx.external_reference='movo-friend:' || v_message_id::text
      and tx.transaction_type=m.card->>'type'
      and tx.currency=m.card->>'currency'
      and tx.amount=(m.card->>'amount')::numeric
      and a.currency=tx.currency
      and a.is_archived=false
      and (tx.transaction_type<>'transfer' or exists (
        select 1 from public.financial_accounts dest
        where dest.id=tx.transfer_to_account_id and dest.user_id=p_actor
          and dest.currency=tx.currency and dest.id<>a.id and dest.is_archived=false
      ))
  ) then
    return jsonb_build_object('error','share_import_not_confirmed');
  end if;

  update public.movo_friend_transaction_decisions
     set status='imported', imported_transaction_id=v_message_id, updated_at=now()
    where public.movo_friend_transaction_decisions.message_id=v_message_id
      and recipient_id=p_actor and status='accepted';
  return jsonb_build_object('ok',true,'messageId',v_message_id,'status','imported');
end;
$$;
revoke all on function public.movo_friend_transaction_decision(uuid,text,jsonb)
  from public,anon,authenticated;
grant execute on function public.movo_friend_transaction_decision(uuid,text,jsonb) to service_role;

-- Least-privilege, read-only verification of a recipient's already committed row.
-- No service-role INSERT/UPDATE/DELETE rights and no authenticated/anon access change.
grant select (id,user_id,account_id,transfer_to_account_id,transaction_type,amount,currency,external_reference)
  on public.transactions to service_role;
grant select (id,user_id,currency,is_archived)
  on public.financial_accounts to service_role;
commit;
