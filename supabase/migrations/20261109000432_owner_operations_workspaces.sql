-- Owner work queue for operational tracking. No client grants and no customer ledger access.
-- Requires 20261108232950_owner_console_security_audit.sql.
begin;
create table if not exists public.movo_owner_work_items (
 id uuid primary key default gen_random_uuid(),
 area text not null check (area in ('sync','support','compliance','promotions','settings','health')),
 title text not null check(length(title) between 5 and 140),
 notes text not null default '' check(length(notes)<=3000),
 status text not null default 'pending' check(status in ('pending','in_progress','blocked','complete')),
 priority text not null default 'medium' check(priority in ('low','medium','high','critical')),
 created_by uuid not null references auth.users(id),
 updated_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists movo_owner_work_items_area_updated_idx on public.movo_owner_work_items(area,updated_at desc);
alter table public.movo_owner_work_items enable row level security;
revoke all on public.movo_owner_work_items from public, anon, authenticated;
grant select,insert,update on public.movo_owner_work_items to service_role;
-- Log every privileged task mutation in the immutable owner audit trail.
alter table public.movo_owner_audit_log drop constraint if exists movo_owner_audit_log_action_check;
alter table public.movo_owner_audit_log add constraint movo_owner_audit_log_action_check
  check(action in ('grant','revoke','work_create','work_update'));

create or replace function public.movo_owner_work_create(
 p_actor uuid,p_area text,p_title text,p_notes text,p_priority text
) returns uuid language plpgsql security invoker set search_path = ''
as $$
declare v_id uuid;
begin
 if (select auth.jwt()->>'role') is distinct from 'service_role' then
  raise exception 'service_role_required' using errcode='42501';
 end if;
 if not exists(select 1 from auth.users where id=p_actor)
    or p_area not in ('sync','support','compliance','promotions','settings','health')
    or length(btrim(p_title)) not between 5 and 140
    or length(coalesce(p_notes,''))>3000
    or p_priority not in ('low','medium','high','critical') then
  raise exception 'invalid_work_item' using errcode='22023';
 end if;
 insert into public.movo_owner_work_items(area,title,notes,priority,created_by,updated_by)
 values(p_area,btrim(p_title),coalesce(p_notes,''),p_priority,p_actor,p_actor)
 returning id into v_id;
 insert into public.movo_owner_audit_log(actor_user_id,action,details)
 values(p_actor,'work_create',jsonb_build_object('id',v_id,'area',p_area,'title',btrim(p_title),'priority',p_priority));
 return v_id;
end $$;
revoke all on function public.movo_owner_work_create(uuid,text,text,text,text) from public, anon, authenticated;
grant execute on function public.movo_owner_work_create(uuid,text,text,text,text) to service_role;

create or replace function public.movo_owner_work_update(
 p_actor uuid,p_id uuid,p_expected_updated_at timestamptz,
 p_status text,p_priority text,p_notes text
) returns boolean language plpgsql security invoker set search_path = ''
as $$
declare v_area text;
begin
 if (select auth.jwt()->>'role') is distinct from 'service_role' then
  raise exception 'service_role_required' using errcode='42501';
 end if;
 if not exists(select 1 from auth.users where id=p_actor) or
    p_status not in ('pending','in_progress','blocked','complete') or
    p_priority not in ('low','medium','high','critical') or
    length(coalesce(p_notes,''))>3000 or p_expected_updated_at is null then
  raise exception 'invalid_work_item' using errcode='22023';
 end if;
 update public.movo_owner_work_items
  set status=p_status,priority=p_priority,notes=coalesce(p_notes,''),
      updated_at=clock_timestamp(),updated_by=p_actor
  where id=p_id and updated_at=p_expected_updated_at
  returning area into v_area;
 if not found then return false; end if;
 insert into public.movo_owner_audit_log(actor_user_id,action,details)
 values(p_actor,'work_update',jsonb_build_object('id',p_id,'area',v_area,'status',p_status,'priority',p_priority));
 return true;
end $$;
revoke all on function public.movo_owner_work_update(uuid,uuid,timestamptz,text,text,text) from public, anon, authenticated;
grant execute on function public.movo_owner_work_update(uuid,uuid,timestamptz,text,text,text) to service_role;
-- Weekly signup counts only (no per-user data leaves the database).
create or replace function public.movo_owner_weekly_signups()
returns jsonb language plpgsql stable security invoker set search_path = ''
as $occ$
declare v_series jsonb;
begin
 if (select auth.jwt()->>'role') is distinct from 'service_role' then
  raise exception 'service_role_required' using errcode='42501';
 end if;
 select coalesce(jsonb_agg(jsonb_build_object(
   'week',to_char(w.week_start,'YYYY-MM-DD'),'count',coalesce(n.total,0))
   order by w.week_start),'[]'::jsonb) into v_series
 from pg_catalog.generate_series(
    pg_catalog.date_trunc('week',now()) - interval '11 weeks',
    pg_catalog.date_trunc('week',now()),interval '1 week'
 ) w(week_start)
 left join lateral (
   select count(*)::bigint as total from auth.users u
     where u.created_at >= w.week_start
       and u.created_at < w.week_start + interval '1 week'
 ) n on true;
 return v_series;
end $occ$;
revoke all on function public.movo_owner_weekly_signups() from public, anon, authenticated;
grant execute on function public.movo_owner_weekly_signups() to service_role;
commit;
