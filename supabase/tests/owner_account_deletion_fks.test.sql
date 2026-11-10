-- Isolated local PostgreSQL only. All created users are synthetic.
begin;
reset role;
select set_config('request.jwt.claim.role','service_role',true);
insert into auth.users(id,email_confirmed_at,created_at) values
 ('10000000-0000-4000-8000-000000000001',now(),now()),
 ('10000000-0000-4000-8000-000000000002',now(),now());

insert into public.movo_owner_audit_log(
 id,actor_user_id,target_user_id,action,details)
values (
 '10000000-0000-4000-8000-000000000003',
 '10000000-0000-4000-8000-000000000001',
 '10000000-0000-4000-8000-000000000002',
 'grant','{"tier":"pro"}'::jsonb
);
insert into public.movo_owner_work_items(
 id,area,title,created_by,updated_by)
values (
 '10000000-0000-4000-8000-000000000004',
 'support','Delete-user FK regression',
 '10000000-0000-4000-8000-000000000001',
 '10000000-0000-4000-8000-000000000002'
);

do $$
begin
  begin
    update public.movo_owner_audit_log set actor_user_id = null
    where id='10000000-0000-4000-8000-000000000003';
    raise exception 'live audit actor was illegally erased';
  exception when sqlstate '42501' then null;
  end;
  begin
    update public.movo_owner_audit_log
    set details='{"modified":true}'::jsonb
    where id='10000000-0000-4000-8000-000000000003';
    raise exception 'audit details were illegally changed';
  exception when sqlstate '42501' then null;
  end;
  begin
    delete from public.movo_owner_audit_log
    where id='10000000-0000-4000-8000-000000000003';
    raise exception 'audit row was illegally deleted';
  exception when sqlstate '42501' then null;
  end;
end $$;

-- These DELETEs must not be blocked by audit/work-item FK references.
delete from auth.users
where id in ('10000000-0000-4000-8000-000000000001',
             '10000000-0000-4000-8000-000000000002');

do $$
declare a public.movo_owner_audit_log; w public.movo_owner_work_items;
begin
  select * into strict a from public.movo_owner_audit_log
   where id='10000000-0000-4000-8000-000000000003';
  select * into strict w from public.movo_owner_work_items
   where id='10000000-0000-4000-8000-000000000004';
  if a.actor_user_id is not null or a.target_user_id is not null
      or w.created_by is not null or w.updated_by is not null then
    raise exception 'account deletion left linked identifiable user ids';
  end if;
  if a.action <> 'grant' or a.details <> '{"tier":"pro"}'::jsonb then
    raise exception 'owner audit trail was modified';
  end if;
end $$;
rollback;
