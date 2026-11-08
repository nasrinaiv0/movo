-- Disposable test users only; run through scripts/test-plan-migration.py.
reset role;
select set_config('request.jwt.claim.role','service_role',false);
insert into auth.users(id,email_confirmed_at,phone_confirmed_at)
select ('10000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,now(),null
from generate_series(1,150) i;
insert into auth.users values ('20000000-0000-0000-0000-000000000001',null,null);
select set_config('request.jwt.claim.role','authenticated',false);
set role authenticated;
do $$ declare uid uuid; result jsonb; initial_expiry timestamptz; i integer; begin
  for i in 1..150 loop
    uid := ('10000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid;
    perform set_config('request.jwt.claim.sub',uid::text,true);
    result := public.claim_movo_trial();
    if result->>'tier' <> 'pro' or result->>'source' <> 'trial' then
      raise exception 'First-time user % did not receive Pro', i;
    end if;
    initial_expiry := (result->>'expiresAt')::timestamptz;
    if initial_expiry <> now()+interval '1 month' then
      raise exception 'Trial was not exactly one calendar month';
    end if;
    result := public.claim_movo_trial();
    if (result->>'expiresAt')::timestamptz <> initial_expiry then
      raise exception 'Replay extended the free month';
    end if;
    if (select count(*) from public.movo_plan_grants) <> 1 then
      raise exception 'A user can see another user trial grant';
    end if;
  end loop;
  perform set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',true);
  begin
    perform public.claim_movo_trial();
    raise exception 'Unverified account received trial';
  exception when raise_exception then
    if sqlerrm <> 'verified_account_required' then raise; end if;
  end;
end $$;
reset role;
select set_config('request.jwt.claim.role','service_role',false);
do $$ begin
  if (select count(*) from public.movo_plan_grants where user_id::text like '10000000-%' and trial_expires_at is not null) <> 150 then
    raise exception 'Missing uncapped first-time grants';
  end if;
end $$;
set role anon;
do $$ begin
  begin
    perform public.claim_movo_trial();
    raise exception 'Anonymous trial claim succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select 'PASS: 150 first-time users, calendar-month duration, replay, grant isolation and verified-account requirement';
