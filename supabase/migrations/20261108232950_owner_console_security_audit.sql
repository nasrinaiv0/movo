-- MOVO owner administration: immutable audit rows, transactional manual grants.
-- Must run AFTER 20261108230330_owner_manual_plan_grants.sql.
begin;
create table if not exists public.movo_owner_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users(id),
  target_user_id uuid references auth.users(id),
  action text not null check (action in ('grant','revoke')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists movo_owner_audit_actor_time_idx
  on public.movo_owner_audit_log(actor_user_id,created_at desc);
alter table public.movo_owner_audit_log enable row level security;
revoke all on public.movo_owner_audit_log from public, anon, authenticated;
grant select, insert on public.movo_owner_audit_log to service_role;
-- Forensic logs: app role cannot modify or delete entries, including service_role.
create or replace function public.movo_owner_audit_immutable()
returns trigger language plpgsql security invoker set search_path = ''
as $$ begin
  raise exception 'owner_audit_immutable' using errcode = '42501';
end $$;
drop trigger if exists movo_owner_audit_no_change on public.movo_owner_audit_log;
create trigger movo_owner_audit_no_change before update or delete
on public.movo_owner_audit_log for each row
execute function public.movo_owner_audit_immutable();
revoke all on function public.movo_owner_audit_immutable() from public, anon, authenticated;

create or replace function public.movo_owner_plan_grant(
  p_actor uuid, p_user uuid, p_tier text, p_days integer, p_reason text
) returns uuid language plpgsql security invoker set search_path = ''
as $$
declare v_id uuid;
begin
  if (select auth.jwt()->>'role') is distinct from 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_actor is null or p_user is null or p_tier not in ('pro','pro_plus')
      or p_days not between 1 and 366 or length(btrim(p_reason)) not between 5 and 300 then
    raise exception 'invalid_grant_fields' using errcode = '22023';
  end if;
  if not exists(select 1 from auth.users where id=p_actor)
    or not exists(select 1 from auth.users
      where id=p_user and (email_confirmed_at is not null or phone_confirmed_at is not null)) then
    raise exception 'verified_account_required' using errcode = '22023';
  end if;
  insert into public.movo_manual_plan_grants(user_id,tier,expires_at,reason)
  values(p_user,p_tier,now()+make_interval(days => p_days),btrim(p_reason))
  returning id into v_id;
  insert into public.movo_owner_audit_log(actor_user_id,target_user_id,action,details)
  values(p_actor,p_user,'grant',
     jsonb_build_object('grantId',v_id,'tier',p_tier,'days',p_days,'reason',btrim(p_reason)));
  return v_id;
end $$;
revoke all on function public.movo_owner_plan_grant(uuid,uuid,text,integer,text) from public, anon, authenticated;
grant execute on function public.movo_owner_plan_grant(uuid,uuid,text,integer,text) to service_role;

create or replace function public.movo_owner_plan_revoke(
  p_actor uuid, p_user uuid, p_grant uuid, p_reason text
) returns boolean language plpgsql security invoker set search_path = ''
as $$
declare v_tier text;
begin
  if (select auth.jwt()->>'role') is distinct from 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_actor is null or p_user is null or p_grant is null
    or length(btrim(p_reason)) not between 5 and 300 then
    raise exception 'invalid_revoke_fields' using errcode = '22023';
  end if;
  update public.movo_manual_plan_grants
  set revoked_at=now()
  where id=p_grant and user_id=p_user and revoked_at is null
  returning tier into v_tier;
  if not found then return false; end if;
  insert into public.movo_owner_audit_log(actor_user_id,target_user_id,action,details)
  values(p_actor,p_user,'revoke',
    jsonb_build_object('grantId',p_grant,'tier',v_tier,'reason',btrim(p_reason)));
  return true;
end $$;
revoke all on function public.movo_owner_plan_revoke(uuid,uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.movo_owner_plan_revoke(uuid,uuid,uuid,text) to service_role;
commit;
