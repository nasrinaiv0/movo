begin;

-- Add references, never a second copy of message or financial content. Existing
-- summary/request reports retain their original behavior and deletion policy.
alter table public.movo_friend_reports
  add column connection_id uuid references public.movo_friend_connections(id) on delete cascade,
  add column message_id uuid references public.movo_friend_messages(id) on delete cascade;
alter table public.movo_friend_reports drop constraint movo_friend_reports_reason_check;
alter table public.movo_friend_reports add constraint movo_friend_reports_reason_check
  check (reason in ('summary','request','message'));
alter table public.movo_friend_reports add constraint movo_friend_report_message_target_check
  check ((reason = 'message' and connection_id is not null and message_id is not null)
    or (reason <> 'message' and connection_id is null and message_id is null));
alter table public.movo_friend_reports drop constraint movo_friend_reports_reporter_reported_reason_key;
create unique index movo_friend_report_legacy_unique
  on public.movo_friend_reports(reporter,reported,reason) where message_id is null;
create unique index movo_friend_report_message_unique
  on public.movo_friend_reports(reporter,message_id) where message_id is not null;
create index movo_friend_report_message_idx on public.movo_friend_reports(message_id) where message_id is not null;
create index movo_friend_report_connection_idx on public.movo_friend_reports(connection_id) where connection_id is not null;

-- This extension is called only behind the existing verified-user API boundary.
-- It neither exposes client table grants nor changes any ledger/consent writer.
create function public.movo_friend_workspace(p_actor uuid, p_action text, p_data jsonb default '{}'::jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  rows jsonb;
  target_request public.movo_friend_requests;
  target_connection public.movo_friend_connections;
  target_message public.movo_friend_messages;
  request_id uuid;
  v_message_id uuid;
  receipt uuid;
  hits integer;
  deleted_count integer;
begin
  if p_actor is null or current_user <> 'service_role' then
    raise exception 'service_role_required' using errcode='42501';
  end if;
  -- Check current access without granting UPDATE on the Auth table. Existing
  -- foreign keys serialize report insertion with account/message deletion.
  perform 1 from auth.users u where u.id=p_actor and not coalesce(u.is_anonymous,false)
    and (u.email_confirmed_at is not null or u.phone_confirmed_at is not null);
  if not found or exists(select 1 from public.movo_account_erasure_requests where user_id=p_actor) then
    return jsonb_build_object('error','friend_access_unavailable');
  end if;

  if p_action='outgoing_requests' then
    select coalesce(jsonb_agg(jsonb_build_object('id',r.id,
      'handle',case when d.discoverable then d.handle else null end,'createdAt',r.created_at)
      order by r.created_at desc,r.id),'[]'::jsonb) into rows
    from (select * from public.movo_friend_requests where sender=p_actor
      and created_at>now()-interval '30 days' order by created_at desc,id limit 100) r
    join public.movo_friend_directory d on d.owner_id=r.recipient
    where not exists(select 1 from public.movo_friend_connections c
      where c.member_low=least(p_actor,r.recipient) and c.member_high=greatest(p_actor,r.recipient))
      and not exists(select 1 from public.movo_friend_blocks b
        where (b.blocker=p_actor and b.blocked=r.recipient) or (b.blocker=r.recipient and b.blocked=p_actor));
    return jsonb_build_object('outgoing',rows);
  elsif p_action='cancel_request' then
    if coalesce(p_data->>'requestId','') !~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' then
      return jsonb_build_object('error','friend_request_unavailable');
    end if;
    request_id := (p_data->>'requestId')::uuid;
    select * into target_request from public.movo_friend_requests where id=request_id;
    if target_request.id is null then return jsonb_build_object('ok',true,'canceled',false); end if;
    if target_request.sender<>p_actor then return jsonb_build_object('error','friend_request_unavailable'); end if;
    -- Serialize with acceptance, decline, block and removal using their existing pair locks.
    perform pg_advisory_xact_lock(hashtextextended('movo-friends:'||least(p_actor,target_request.recipient)::text,0));
    perform pg_advisory_xact_lock(hashtextextended('movo-friends:'||greatest(p_actor,target_request.recipient)::text,0));
    delete from public.movo_friend_requests where id=request_id and sender=p_actor;
    get diagnostics deleted_count=row_count;
    return jsonb_build_object('ok',true,'canceled',deleted_count=1);
  elsif p_action='report_message' then
    if coalesce(p_data->>'connectionId','') !~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
      or coalesce(p_data->>'messageId','') !~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' then
      return jsonb_build_object('error','friend_message_unavailable');
    end if;
    v_message_id := (p_data->>'messageId')::uuid;
    select * into target_connection from public.movo_friend_connections c
      where c.id=(p_data->>'connectionId')::uuid and (c.member_low=p_actor or c.member_high=p_actor)
      for key share;
    if target_connection.id is null then return jsonb_build_object('error','friend_message_unavailable'); end if;
    select * into target_message from public.movo_friend_messages m where m.id=v_message_id
      and m.connection_id=target_connection.id and m.sender_id<>p_actor;
    if target_message.id is null then return jsonb_build_object('error','friend_message_unavailable'); end if;
    perform pg_advisory_xact_lock(hashtextextended('movo-report:'||p_actor::text||':'||v_message_id::text,0));
    select r.id into receipt from public.movo_friend_reports r where r.reporter=p_actor and r.message_id=v_message_id;
    if receipt is not null then return jsonb_build_object('ok',true,'reportId',receipt); end if;
    insert into public.movo_friend_rate_limits as limits(owner_id,action,started_at,hits)
      values(p_actor,'report_message',now(),1) on conflict(owner_id,action) do update set
      hits=case when limits.started_at<=now()-interval '1 day' then 1 else limits.hits+1 end,
      started_at=case when limits.started_at<=now()-interval '1 day' then now() else limits.started_at end
      returning limits.hits into hits;
    if hits>25 then return jsonb_build_object('error','friend_rate_limit'); end if;
    insert into public.movo_friend_reports(reporter,reported,reason,connection_id,message_id)
      values(p_actor,target_message.sender_id,'message',target_connection.id,v_message_id)
      on conflict(reporter,message_id) where message_id is not null do nothing returning id into receipt;
    if receipt is null then select r.id into receipt from public.movo_friend_reports r where r.reporter=p_actor and r.message_id=v_message_id; end if;
    return jsonb_build_object('ok',true,'reportId',receipt);
  end if;
  return jsonb_build_object('error','invalid_action');
exception when foreign_key_violation then
  -- A deletion may finish between the access read and FK-protected insertion.
  return jsonb_build_object('error','friend_message_unavailable');
end;
$$;
revoke all on function public.movo_friend_workspace(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.movo_friend_workspace(uuid,text,jsonb) to service_role;
comment on function public.movo_friend_workspace(uuid,text,jsonb) is
  'Service-only owner-scoped outgoing requests/cancellation and message report references. No message/ledger snapshot or new retention hold.';
commit;
