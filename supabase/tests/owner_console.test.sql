-- Disposable owner command-center verification; never run on production.
select set_config('request.jwt.claim.role','service_role',false);
do $$ declare v_grant uuid; v_result boolean; v_before int; begin
  select count(*) into v_before from public.movo_owner_audit_log;
  select public.movo_owner_plan_grant(
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000003',
    'pro_plus',30,'Complimentary audit test') into v_grant;
  if v_grant is null then raise exception 'No grant returned'; end if;
  if (public.movo_plan_status('00000000-0000-0000-0000-000000000003')->>'tier') <> 'pro_plus'
     then raise exception 'Owner grant did not affect effective plan'; end if;
  if (select count(*) from public.movo_owner_audit_log) <> v_before + 1
    then raise exception 'Missing grant audit'; end if;
  select public.movo_owner_plan_revoke(
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000003',
    v_grant,'Access revoked for testing') into v_result;
  if not v_result then raise exception 'Revoke returned false'; end if;
  if (public.movo_plan_status('00000000-0000-0000-0000-000000000003')->>'tier') <> 'free'
    then raise exception 'Revoked owner grant still effective'; end if;
  if (select count(*) from public.movo_owner_audit_log) <> v_before + 2
    then raise exception 'Missing revoke audit'; end if;
  begin
    update public.movo_owner_audit_log set details='{}';
    raise exception 'Audit mutation succeeded';
  exception when insufficient_privilege then null; end;
  begin
    delete from public.movo_owner_audit_log;
    raise exception 'Audit deletion succeeded';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.role','authenticated',false);
set role authenticated;
do $$ begin
 begin
  perform public.movo_owner_plan_grant(
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000003',
    'pro_plus',366,'Forged user grant');
  raise exception 'Client forged grant';
 exception when insufficient_privilege then null; end;
 begin
  select count(*) from public.movo_owner_audit_log;
  raise exception 'User can read admin log';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'PASS: owner grant/revoke atomic audit, immutability and privilege separation';
