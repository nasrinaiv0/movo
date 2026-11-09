-- Work queue integration/privilege tests against disposable fixture only.
select set_config('request.jwt.claim.role','service_role',false);
do $$
declare v_id uuid; v_time timestamptz; v_count integer;
begin
 v_id:=public.movo_owner_work_create('00000000-0000-0000-0000-000000000001'::uuid,
   'support','Investigate import confirmation','Record a reproducible test case','high');
 if v_id is null then raise exception 'Work create failed'; end if;
 select updated_at into v_time from public.movo_owner_work_items where id=v_id;
 if v_time is null then raise exception 'Work row missing'; end if;
 if not public.movo_owner_work_update('00000000-0000-0000-0000-000000000001'::uuid,
   v_id,v_time,'in_progress','critical','Regression test attached')
 then raise exception 'Work update failed'; end if;
 if public.movo_owner_work_update('00000000-0000-0000-0000-000000000001'::uuid,
   v_id,v_time,'complete','low','Stale write')
 then raise exception 'Stale work update overwrote newer data'; end if;
 select count(*) into v_count from public.movo_owner_audit_log
 where action in ('work_create','work_update') and (details->>'id')=v_id::text;
 if v_count <> 2 then raise exception 'Missing or duplicate audit events: %',v_count; end if;
end $$;
select set_config('request.jwt.claim.role','authenticated',false);
set role authenticated;
do $$
begin
 begin
  insert into public.movo_owner_work_items(area,title,created_by,updated_by)
  values('support','Client forged owner task','00000000-0000-0000-0000-000000000002'::uuid,'00000000-0000-0000-0000-000000000002'::uuid);
  raise exception 'Authenticated client wrote owner work';
 exception when insufficient_privilege then null;
 end;
 begin
  perform public.movo_owner_work_create('00000000-0000-0000-0000-000000000002'::uuid,
     'compliance','Fake compliance approval','','low');
  raise exception 'Authenticated client called privileged owner RPC';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
select 'PASS: audited owner work create/update, optimistic write conflict, client deny';
