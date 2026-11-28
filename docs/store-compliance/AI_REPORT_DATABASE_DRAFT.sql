-- DESIGN DRAFT ONLY. Not a migration. Never execute on a remote or customer DB.
-- Generate the migration using Supabase CLI, then run the full disposable PG matrix.
-- No copy of message content; deletion of the source message or owner cascades.
create table public.movo_ai_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  message_id uuid not null references public.movo_ai_messages(id) on delete cascade,
  reason text not null check (reason in ('harmful','deceptive','privacy','other')),
  created_at timestamptz not null default now(),
  unique(user_id,message_id)
);
create index movo_ai_reports_message_idx on public.movo_ai_reports(message_id);
create index movo_ai_reports_owner_created_idx on public.movo_ai_reports(user_id,created_at);
alter table public.movo_ai_reports enable row level security;
revoke all on public.movo_ai_reports from public,anon,authenticated,service_role;
grant select,insert on public.movo_ai_reports to service_role;
create function public.movo_report_ai_message(p_actor uuid,p_message_id uuid,p_reason text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare receipt uuid;
begin
  if current_user <> 'service_role' then raise exception 'service_role_required' using errcode='42501'; end if;
  if p_actor is null or p_message_id is null or p_reason is null or p_reason not in ('harmful','deceptive','privacy','other') then return jsonb_build_object('error','message_unavailable'); end if;
  perform 1 from auth.users u where u.id=p_actor and not coalesce(u.is_anonymous,false)
    and (u.email_confirmed_at is not null or u.phone_confirmed_at is not null);
  if not found or exists(select 1 from public.movo_account_erasure_requests where user_id=p_actor) then return jsonb_build_object('error','message_unavailable'); end if;
  perform pg_advisory_xact_lock(hashtextextended('movo-ai-report:'||p_actor::text,0));
  if not exists(select 1 from public.movo_ai_messages m where m.id=p_message_id and m.user_id=p_actor and m.role='assistant') then return jsonb_build_object('error','message_unavailable'); end if;
  select id into receipt from public.movo_ai_reports where user_id=p_actor and message_id=p_message_id;
  if receipt is not null then return jsonb_build_object('ok',true,'reportId',receipt); end if;
  if (select count(*) from public.movo_ai_reports where user_id=p_actor and created_at >= now()-interval '1 day') >= 25 then return jsonb_build_object('error','report_rate_limit'); end if;
  insert into public.movo_ai_reports(user_id,message_id,reason) values(p_actor,p_message_id,p_reason) returning id into receipt;
  return jsonb_build_object('ok',true,'reportId',receipt);
end; $$;
revoke all on function public.movo_report_ai_message(uuid,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.movo_report_ai_message(uuid,uuid,text) to service_role;
-- BEFORE PROMOTION: verify service-role visibility under actual hosted defaults;
-- account erasure race, clear-data cascade, FK consistency, concurrent duplicate,
-- rate-limit durability across message deletion, forged assistant rows (legacy clients can insert),
-- owner mismatch and authenticated execute denial. Add bounded retention & review workflow.
-- Never enable MOVO_AI_REPORTS_ENABLED until these are resolved and independent review passes.
