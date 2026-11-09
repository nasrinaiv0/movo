-- Disposable owner analytics verification; never run on production.
-- Fixtures: user ...01 (owner, has an account + transactions), ...03 (manual grants revoked earlier), ...04 (trial).
select set_config('request.jwt.claim.role','service_role',false);
insert into auth.users(id,email_confirmed_at,created_at,last_sign_in_at) values
  ('00000000-0000-0000-0000-000000000004',now(),now()-interval '2 days',now()),
  ('00000000-0000-0000-0000-000000000005',null,now()-interval '40 days',null)
on conflict (id) do nothing;
insert into public.movo_plan_grants(user_id,trial_started_at,trial_expires_at)
values ('00000000-0000-0000-0000-000000000004',now()-interval '1 day',now()+interval '29 days')
on conflict (user_id) do update set trial_started_at=excluded.trial_started_at,trial_expires_at=excluded.trial_expires_at;
insert into public.movo_manual_plan_grants(user_id,tier,expires_at,reason)
values ('00000000-0000-0000-0000-000000000005','pro_plus',now()+interval '10 days','Analytics fixture');
insert into public.transactions(user_id,source,created_at) values
  ('00000000-0000-0000-0000-000000000001','manual',now()-interval '1 day'),
  ('00000000-0000-0000-0000-000000000001','manual',now()-interval '3 days'),
  ('00000000-0000-0000-0000-000000000001','csv_import',now()-interval '2 days'),
  ('00000000-0000-0000-0000-000000000004','notification',now()-interval '10 days'),
  ('00000000-0000-0000-0000-000000000004','manual',now()-interval '60 days');
do $$ declare k jsonb; p jsonb; v_total int; begin
  k := public.movo_owner_kpis();
  select count(*) into v_total from auth.users;
  if (k->'users'->>'total')::int <> v_total then raise exception 'user total wrong: %', k->'users'; end if;
  if (k->'users'->>'new7d')::int < 1 then raise exception 'new 7d missing'; end if;
  if (k->'plans'->>'free')::int + (k->'plans'->>'pro')::int + (k->'plans'->>'proPlus')::int <> v_total
    then raise exception 'plan mix must cover every account: %', k->'plans'; end if;
  if (k->'plans'->'bySource'->>'trial')::int < 1 or (k->'plans'->'bySource'->>'manual')::int < 1
    then raise exception 'trial and manual plans must be counted: %', k->'plans'; end if;
  if (k->'trials'->>'active')::int < 1 then raise exception 'active trial missing: %', k->'trials'; end if;
  -- Only the last 30 days count; the 60-day-old record is excluded.
  if (k->'activity'->>'transactions30d')::int <> 4 or (k->'activity'->>'activeUsers30d')::int <> 2
     or (k->'activity'->>'transactions7d')::int <> 3 or (k->'activity'->>'activeUsers7d')::int <> 1
    then raise exception 'activity window wrong: %', k->'activity'; end if;
  if jsonb_array_length(k->'daily') <> 30 then raise exception 'daily series must have 30 days'; end if;
  if (select sum((d->>'transactions')::int) from jsonb_array_elements(k->'daily') d) <> 4
    then raise exception 'daily transactions must match the 30-day total'; end if;
  if k->'sources'->0->>'source' <> 'manual' then raise exception 'sources must be ordered by count: %', k->'sources'; end if;
  if k::text ~ '"amount"' then raise exception 'KPIs must not expose money amounts'; end if;
  p := public.movo_owner_user_plans(array['00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000005']::uuid[]);
  if jsonb_array_length(p) <> 2 then raise exception 'page plans must return each user: %', p; end if;
  if not exists(select 1 from jsonb_array_elements(p) e where e->>'userId'='00000000-0000-0000-0000-000000000004' and e->>'tier'='pro' and e->>'source'='trial')
     or not exists(select 1 from jsonb_array_elements(p) e where e->>'userId'='00000000-0000-0000-0000-000000000005' and e->>'tier'='pro_plus' and e->>'source'='manual')
    then raise exception 'page plans must follow movo_plan_status: %', p; end if;
  begin
    perform public.movo_owner_user_plans(array(select gen_random_uuid() from generate_series(1,101)));
    raise exception 'oversized page accepted';
  exception when invalid_parameter_value then null; end;
end $$;
select set_config('request.jwt.claim.role','authenticated',false);
set role authenticated;
do $$ begin
  begin perform public.movo_owner_kpis(); raise exception 'client read owner KPIs';
  exception when insufficient_privilege then null; end;
  begin perform public.movo_owner_user_plans(array['00000000-0000-0000-0000-000000000004']::uuid[]); raise exception 'client read user plans';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.role','',false);
do $$ begin
  begin perform public.movo_owner_kpis(); raise exception 'missing role read owner KPIs';
  exception when insufficient_privilege then null; end;
end $$;
select 'PASS: owner KPIs are aggregate-only, follow effective plan rules, and are service-role only';
