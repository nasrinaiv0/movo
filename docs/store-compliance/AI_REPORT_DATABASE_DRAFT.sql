-- ISOLATED CI CANDIDATE ONLY. Not a migration. Never execute on a remote or customer DB.
-- Generate the migration using Supabase CLI, then run the full disposable PG matrix.
-- No copy of message content; deletion of the source message or owner cascades.
alter table public.movo_ai_messages add column server_generated boolean not null default false;
alter table public.movo_ai_messages add constraint movo_ai_messages_provenance_role check (not server_generated or role='assistant');
create function public.movo_ai_message_provenance_guard() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if tg_op='UPDATE' then
    if old.server_generated and new is distinct from old then raise exception 'verified_message_immutable' using errcode='42501'; end if;
  end if;
  if new.server_generated and current_user<>'service_role' then
    raise exception 'server_provenance_required' using errcode='42501';
  end if;
  return new;
end $$;
revoke all on function public.movo_ai_message_provenance_guard() from public,anon,authenticated,service_role;
create trigger movo_ai_message_provenance_guard before insert or update on public.movo_ai_messages
for each row execute function public.movo_ai_message_provenance_guard();

-- Serialize freeze initiation with report and server-turn writes. The existing
-- erasure routine still owns final deletion and all ledger/account cleanup.
create function public.movo_ai_report_freeze_lock() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('movo-ai-report:'||new.user_id::text,0));
  return new;
end $$;
revoke all on function public.movo_ai_report_freeze_lock() from public,anon,authenticated,service_role;
create trigger movo_ai_report_freeze_lock before insert on public.movo_account_erasure_requests
for each row execute function public.movo_ai_report_freeze_lock();

grant select,insert on public.movo_ai_messages to service_role;
grant select,insert on public.movo_ai_conversations to service_role;
grant update(updated_at) on public.movo_ai_conversations to service_role;

create function public.movo_save_reportable_ai_turn(p_actor uuid,p_conversation uuid,p_prompt text,p_reply text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare c public.movo_ai_conversations; u public.movo_ai_messages; a public.movo_ai_messages; plan jsonb; stamp timestamptz := clock_timestamp();
begin
  if current_user<>'service_role' or (select auth.jwt()->>'role') is distinct from 'service_role' then raise exception 'service_role_required' using errcode='42501'; end if;
  if p_actor is null or p_prompt is null or char_length(p_prompt) not between 1 and 1600 or p_reply is null or char_length(p_reply) not between 1 and 12000 then return jsonb_build_object('error','invalid_turn'); end if;
  perform pg_advisory_xact_lock(hashtextextended('movo-ai-report:'||p_actor::text,0));
  if not exists(select 1 from auth.users where id=p_actor and not coalesce(is_anonymous,false) and (email_confirmed_at is not null or phone_confirmed_at is not null))
    or exists(select 1 from public.movo_account_erasure_requests where user_id=p_actor) then return jsonb_build_object('error','message_unavailable'); end if;
  plan:=public.movo_plan_status(p_actor);
  if (plan->>'active') is distinct from 'true' or coalesce(plan->>'tier','') not in ('pro','pro_plus') or coalesce((plan->>'expiresAt')::timestamptz,'-infinity'::timestamptz)<=now() then return jsonb_build_object('error','pro_required'); end if;
  if p_conversation is null then
    insert into public.movo_ai_conversations(user_id,title) values(p_actor,left(regexp_replace(p_prompt,'\s+',' ','g'),80)) returning * into c;
  else
    select * into c from public.movo_ai_conversations where id=p_conversation and user_id=p_actor;
    if not found then return jsonb_build_object('error','conversation_not_found'); end if;
  end if;
  insert into public.movo_ai_messages(conversation_id,user_id,role,content,created_at)
    values(c.id,p_actor,'user',p_prompt,stamp) returning * into u;
  insert into public.movo_ai_messages(conversation_id,user_id,role,content,created_at,server_generated)
    values(c.id,p_actor,'assistant',p_reply,stamp+interval '1 millisecond',true) returning * into a;
  update public.movo_ai_conversations set updated_at=greatest(updated_at,stamp) where id=c.id and user_id=p_actor;
  return jsonb_build_object('conversationId',c.id,'title',c.title,'messages',jsonb_build_array(
    jsonb_build_object('id',u.id,'role',u.role,'content',u.content,'created_at',u.created_at,'server_generated',false),
    jsonb_build_object('id',a.id,'role',a.role,'content',a.content,'created_at',a.created_at,'server_generated',true)));
end $$;
revoke all on function public.movo_save_reportable_ai_turn(uuid,uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function public.movo_save_reportable_ai_turn(uuid,uuid,text,text) to service_role;

alter table public.movo_ai_messages add constraint movo_ai_messages_report_owner_unique unique(id,user_id);
create table public.movo_ai_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  message_id uuid not null,
  foreign key(message_id,user_id) references public.movo_ai_messages(id,user_id) on delete cascade,
  reason text not null check (reason in ('harmful','deceptive','privacy','other')),
  created_at timestamptz not null default now(),
  status text not null default 'pending' check(status in ('pending','reviewed','dismissed','escalated')),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  unique(user_id,message_id)
);
create table public.movo_ai_report_rate (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_start timestamptz not null default now(),
  hits integer not null check(hits between 1 and 25)
);
alter table public.movo_ai_report_rate enable row level security;
revoke all on public.movo_ai_report_rate from public,anon,authenticated,service_role;
grant select,insert,update on public.movo_ai_report_rate to service_role;
grant select(id,user_id,role) on public.movo_ai_messages to service_role;
create index movo_ai_reports_message_idx on public.movo_ai_reports(message_id);
create index movo_ai_reports_owner_created_idx on public.movo_ai_reports(user_id,created_at);
alter table public.movo_ai_reports enable row level security;
revoke all on public.movo_ai_reports from public,anon,authenticated,service_role;
grant select,insert,delete on public.movo_ai_reports to service_role;
grant update(status,reviewed_at,reviewed_by) on public.movo_ai_reports to service_role;
grant delete on public.movo_ai_report_rate to service_role;
create function public.movo_report_ai_message(p_actor uuid,p_message_id uuid,p_reason text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare receipt uuid;
begin
  if current_user <> 'service_role' then raise exception 'service_role_required' using errcode='42501'; end if;
  if p_actor is null or p_message_id is null or p_reason is null or p_reason not in ('harmful','deceptive','privacy','other') then return jsonb_build_object('error','message_unavailable'); end if;
  perform pg_advisory_xact_lock(hashtextextended('movo-ai-report:'||p_actor::text,0));
  perform 1 from auth.users u where u.id=p_actor and not coalesce(u.is_anonymous,false)
    and (u.email_confirmed_at is not null or u.phone_confirmed_at is not null);
  if not found or exists(select 1 from public.movo_account_erasure_requests where user_id=p_actor) then return jsonb_build_object('error','message_unavailable'); end if;
  if not exists(select 1 from public.movo_ai_messages m where m.id=p_message_id and m.user_id=p_actor and m.role='assistant' and m.server_generated) then return jsonb_build_object('error','message_unavailable'); end if;
  select id into receipt from public.movo_ai_reports where user_id=p_actor and message_id=p_message_id;
  if receipt is not null then return jsonb_build_object('ok',true,'reportId',receipt); end if;
  insert into public.movo_ai_report_rate as r(user_id,window_start,hits) values(p_actor,now(),1)
  on conflict(user_id) do update set
    hits=case when r.window_start <= now()-interval '1 day' then 1 else r.hits+1 end,
    window_start=case when r.window_start <= now()-interval '1 day' then now() else r.window_start end
  where r.window_start <= now()-interval '1 day' or r.hits<25;
  if not found then return jsonb_build_object('error','report_rate_limit'); end if;
  insert into public.movo_ai_reports(user_id,message_id,reason) values(p_actor,p_message_id,p_reason) returning id into receipt;
  return jsonb_build_object('ok',true,'reportId',receipt);
end; $$;
revoke all on function public.movo_report_ai_message(uuid,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.movo_report_ai_message(uuid,uuid,text) to service_role;

-- Moderator access is mediated by the existing MFA owner API plus its dedicated
-- moderation allowlist. No direct browser role receives table/function access.
create table public.movo_ai_moderation_access (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.movo_ai_reports(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null check(action in ('inspect','reviewed','dismissed','escalated')),
  created_at timestamptz not null default now()
);
create index movo_ai_moderation_access_report_idx on public.movo_ai_moderation_access(report_id);
create index movo_ai_moderation_access_actor_idx on public.movo_ai_moderation_access(actor_id);
create index movo_ai_moderation_access_age_idx on public.movo_ai_moderation_access(created_at,id);
create index movo_ai_reports_queue_idx on public.movo_ai_reports(status,created_at,id);
create index movo_ai_reports_age_idx on public.movo_ai_reports(created_at,id);
create index movo_ai_reports_reviewer_idx on public.movo_ai_reports(reviewed_by);
create index movo_ai_report_rate_age_idx on public.movo_ai_report_rate(window_start,user_id);
alter table public.movo_ai_moderation_access enable row level security;
revoke all on public.movo_ai_moderation_access from public,anon,authenticated,service_role;
grant select,insert,delete on public.movo_ai_moderation_access to service_role;

create function public.movo_ai_moderation_action(p_actor uuid,p_action text,p_report uuid default null,p_expected text default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r public.movo_ai_reports; response_text text; rows jsonb;
begin
  if current_user<>'service_role' then raise exception 'service_role_required' using errcode='42501'; end if;
  if p_actor is null or not exists(select 1 from auth.users where id=p_actor and not coalesce(is_anonymous,false) and (email_confirmed_at is not null or phone_confirmed_at is not null))
    or exists(select 1 from public.movo_account_erasure_requests where user_id=p_actor) then return jsonb_build_object('error','moderator_unavailable'); end if;
  if p_action='list' then
    select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at,q.id),'[]'::jsonb) into rows from
      (select id,reason,status,created_at from public.movo_ai_reports where status in ('pending','escalated') and user_id<>p_actor order by created_at,id limit 50) q;
    return jsonb_build_object('reports',rows);
  end if;
  if p_report is null or p_action not in ('inspect','reviewed','dismissed','escalated') then return jsonb_build_object('error','invalid_action'); end if;
  select * into r from public.movo_ai_reports where id=p_report and user_id<>p_actor;
  if not found or exists(select 1 from public.movo_account_erasure_requests where user_id=r.user_id) then return jsonb_build_object('error','report_unavailable'); end if;
  perform pg_advisory_xact_lock(hashtextextended('movo-ai-report:'||r.user_id::text,0));
  select * into r from public.movo_ai_reports where id=p_report and user_id<>p_actor;
  if not found or exists(select 1 from public.movo_account_erasure_requests where user_id=r.user_id) then return jsonb_build_object('error','report_unavailable'); end if;
  if p_action='inspect' then
    select content into response_text from public.movo_ai_messages where id=r.message_id and user_id=r.user_id and server_generated;
    if not found then return jsonb_build_object('error','report_unavailable'); end if;
    insert into public.movo_ai_moderation_access(report_id,actor_id,action) values(r.id,p_actor,'inspect');
    return jsonb_build_object('id',r.id,'response',response_text,'reason',r.reason,'status',r.status);
  end if;
  update public.movo_ai_reports set status=p_action,reviewed_at=clock_timestamp(),reviewed_by=p_actor
    where id=r.id and status=p_expected and status in ('pending','escalated') and status<>p_action;
  if not found then return jsonb_build_object('error','report_changed'); end if;
  insert into public.movo_ai_moderation_access(report_id,actor_id,action) values(r.id,p_actor,p_action);
  return jsonb_build_object('ok',true);
end $$;
revoke all on function public.movo_ai_moderation_action(uuid,text,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.movo_ai_moderation_action(uuid,text,uuid,text) to service_role;

-- Draft retention: reviewed/dismissed reports 90d after review, access events
-- 30d, rate windows 2d. Unresolved reports are not silently purged. The owner
-- must approve retention, unresolved backlog escalation and legal hold policy.
create function public.movo_prune_ai_moderation(p_limit integer default 200)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare n integer; reports integer; rates integer; events integer;
begin
  if current_user<>'service_role' then raise exception 'service_role_required' using errcode='42501'; end if;
  if p_limit is null or p_limit not between 1 and 500 then raise exception 'invalid_limit' using errcode='22023'; end if;
  n:=p_limit;
  -- Serialize prune batches without granting UPDATE on immutable access logs.
  -- PostgreSQL row-locking SELECT requires UPDATE even when only reading IDs.
  if not pg_try_advisory_xact_lock(hashtextextended('movo-ai-moderation-prune',0)) then
    return jsonb_build_object('reports',0,'events',0,'rates',0,'skipped',true);
  end if;
  delete from public.movo_ai_moderation_access where id in
    (select id from public.movo_ai_moderation_access where created_at<now()-interval '30 days' order by created_at,id limit n);
  get diagnostics events=row_count;
  delete from public.movo_ai_reports where id in
    (select id from public.movo_ai_reports where status in ('reviewed','dismissed') and reviewed_at<now()-interval '90 days' order by reviewed_at,id limit n for update skip locked);
  get diagnostics reports=row_count;
  delete from public.movo_ai_report_rate where user_id in
    (select user_id from public.movo_ai_report_rate where window_start<now()-interval '2 days' order by window_start,user_id limit n for update skip locked);
  get diagnostics rates=row_count;
  return jsonb_build_object('reports',reports,'events',events,'rates',rates);
end $$;
revoke all on function public.movo_prune_ai_moderation(integer) from public,anon,authenticated,service_role;
grant execute on function public.movo_prune_ai_moderation(integer) to service_role;
-- No remote migration or flag activation. Full matrix, compatibility,
-- operational access, retention/legal approval and independent review required.
