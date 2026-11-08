-- Run after applying 20261104010000_plans_entitlements.sql (as a superuser / SQL editor).
-- Everything runs inside one transaction and is rolled back.
begin;
do $$
declare
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); c uuid := gen_random_uuid(); p uuid := gen_random_uuid();
  dev_a text := repeat('a', 64); dev_b text := repeat('b', 64);
  acct uuid; loan uuid; info jsonb; code text; n int; t text; r record; refs uuid[] := '{}'; u uuid; ends timestamptz;
begin
  -- Privileges: nobody in the app can write a plan, and the referral/trial tables are function-only.
  foreach t in array array['movo_plan_grants', 'movo_trial_claims', 'movo_trial_devices', 'movo_referral_codes', 'movo_referrals', 'movo_referral_rewards'] loop
    if not (select relrowsecurity from pg_class where oid = ('public.' || t)::regclass) then raise exception '% must have RLS enabled', t; end if;
    if has_table_privilege('anon', 'public.' || t, 'SELECT') or has_table_privilege('anon', 'public.' || t, 'INSERT') then raise exception 'anon must not touch %', t; end if;
    if has_table_privilege('authenticated', 'public.' || t, 'INSERT') or has_table_privilege('authenticated', 'public.' || t, 'UPDATE')
       or has_table_privilege('authenticated', 'public.' || t, 'DELETE') then raise exception 'authenticated must not write %', t; end if;
  end loop;
  foreach t in array array['movo_trial_claims', 'movo_trial_devices', 'movo_referral_codes', 'movo_referrals', 'movo_referral_rewards'] loop
    if has_table_privilege('authenticated', 'public.' || t, 'SELECT') then raise exception 'authenticated must not read %', t; end if;
  end loop;
  if has_function_privilege('authenticated', 'public.movo_active_plan(uuid)', 'EXECUTE') or has_function_privilege('anon', 'public.my_movo_plan()', 'EXECUTE')
     or has_function_privilege('anon', 'public.claim_pro_trial(text)', 'EXECUTE') or has_function_privilege('anon', 'public.apply_referral_code(text)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.movo_require_cloud_plan()', 'EXECUTE') or has_function_privilege('authenticated', 'public.movo_qualify_referral()', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.movo_referral_code_for(uuid)', 'EXECUTE') then
    raise exception 'plan functions have the wrong EXECUTE privileges';
  end if;
  if not has_function_privilege('service_role', 'public.movo_active_plan(uuid)', 'EXECUTE') then raise exception 'the server must read plans'; end if;

  insert into auth.users (id, email) values (a, a || '@example.test'), (b, b || '@example.test'), (c, c || '@example.test'), (p, p || '@example.test');
  -- a already has cloud records from before the plan existed (written by the server, which the guard does not block).
  insert into public.financial_accounts (user_id, name, account_type, currency, opening_balance) values (a, 'Bank', 'bank', 'PHP', 1000) returning id into acct;
  insert into public.financial_loans (user_id, name, principal_amount, outstanding_principal, account_id) values (a, 'Loan', 100, 100, acct) returning id into loan;
  if public.movo_active_plan(a) <> 'free' then raise exception 'no grant means Free'; end if;

  -- Free: cloud records are readable, not writable; deleting stays possible.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  if public.movo_current_plan() <> 'free' then raise exception 'caller plan must be Free'; end if;
  if (select count(*) from public.financial_accounts) <> 1 then raise exception 'Free users keep reading their cloud records'; end if;
  begin
    insert into public.financial_accounts (user_id, name, account_type, currency) values (a, 'New', 'cash', 'PHP');
    raise exception 'Free users must not add cloud records';
  exception when insufficient_privilege then null; end;
  begin
    update public.financial_accounts set name = 'Renamed' where id = acct;
    raise exception 'Free users must not edit cloud records';
  exception when insufficient_privilege then null; end;
  begin
    perform public.record_loan_event(loan, 'fee', 1, 'PHP', acct);
    raise exception 'Free users must not write through finance functions either';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.user_preferences (user_id, prefs) values (a, '{}'::jsonb);
    raise exception 'Free users must not sync preferences to the cloud';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.movo_plan_grants (user_id, plan, source, ends_at) values (a, 'pro_plus', 'trial', now() + interval '1 year');
    raise exception 'nobody may grant themselves a plan';
  exception when insufficient_privilege then null; end;
  begin
    perform public.movo_active_plan(b);
    raise exception 'users must not read other people''s plans';
  exception when insufficient_privilege then null; end;

  -- my_movo_plan: Free, trial available, a shareable referral code.
  info := public.my_movo_plan();
  if info->>'plan' <> 'free' or not (info->>'trial_available')::boolean or info->>'referral_code' !~ '^[A-HJ-NP-Z2-9]{8}$' then raise exception 'unexpected plan info %', info; end if;
  if (public.my_movo_plan())->>'referral_code' <> info->>'referral_code' then raise exception 'the referral code must stay the same'; end if;

  -- The trial: once per account, once per device, 30 days of Pro; then cloud writes work.
  begin perform public.claim_pro_trial('not-a-hash'); raise exception 'bad device ids must fail'; exception when invalid_parameter_value then null; end;
  info := public.claim_pro_trial(dev_a);
  if info->>'plan' <> 'pro' or info->>'source' <> 'trial' or (info->>'trial_available')::boolean then raise exception 'trial did not start: %', info; end if;
  if abs(extract(epoch from ((info->>'ends_at')::timestamptz - (now() + interval '30 days')))) > 60 then raise exception 'the trial lasts 30 days'; end if;
  begin perform public.claim_pro_trial(repeat('c', 64)); raise exception 'a second trial must fail'; exception when raise_exception then
    get stacked diagnostics t = message_text; if t <> 'trial_already_claimed' then raise exception 'wrong error %', t; end if; end;
  update public.financial_accounts set name = 'Renamed' where id = acct;
  perform public.record_loan_event(loan, 'fee', 1, 'PHP', acct);
  if (select count(*) from public.movo_plan_grants) <> 1 then raise exception 'users see only their own grants'; end if;

  -- Another account on the same device gets no second trial.
  reset role; perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true); set local role authenticated;
  if (select count(*) from public.movo_plan_grants) <> 0 or (select count(*) from public.financial_accounts) <> 0 then raise exception 'plans and records stay private'; end if;
  begin perform public.claim_pro_trial(dev_a); raise exception 'a used device must not give another trial'; exception when raise_exception then
    get stacked diagnostics t = message_text; if t <> 'trial_device_used' then raise exception 'wrong error %', t; end if; end;
  if public.movo_current_plan() <> 'free' then raise exception 'a failed claim must not grant anything'; end if;

  -- Referrals: a valid code once, never your own, never after subscribing.
  code := (public.my_movo_plan())->>'referral_code';
  begin perform public.apply_referral_code(code); raise exception 'self-referral must fail'; exception when raise_exception then null; end;
  begin perform public.apply_referral_code('ZZZZZZZZ'); raise exception 'unknown codes must fail'; exception when raise_exception then null; end;
  reset role;
  code := (select rc.code from public.movo_referral_codes rc where rc.user_id = a);
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true); set local role authenticated;
  info := public.apply_referral_code(lower(code));
  if not (info->>'referred_by')::boolean then raise exception 'the referral must be recorded'; end if;
  begin perform public.apply_referral_code(code); raise exception 'a second referral must fail'; exception when raise_exception then null; end;
  reset role;
  insert into public.movo_plan_grants (user_id, plan, source, ends_at, external_id) values (p, 'pro', 'app_store', now() + interval '1 month', 'apple-p-1');
  perform set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true); set local role authenticated;
  begin perform public.apply_referral_code(code); raise exception 'subscribers can no longer be referred'; exception when raise_exception then
    get stacked diagnostics t = message_text; if t <> 'referral_too_late' then raise exception 'wrong error %', t; end if; end;
  if public.movo_current_plan() <> 'pro' then raise exception 'a store subscription gives Pro'; end if;
  reset role;

  -- b subscribes to Pro+: plan is Pro+, the referral qualifies, but one is not enough for a reward.
  insert into public.movo_plan_grants (user_id, plan, source, ends_at, external_id) values (b, 'pro_plus', 'app_store', now() + interval '1 month', 'apple-b-1');
  if public.movo_active_plan(b) <> 'pro_plus' then raise exception 'Pro+ wins over Pro'; end if;
  if (select qualified_at from public.movo_referrals where referee_id = b) is null then raise exception 'a subscription qualifies the referral'; end if;
  if exists (select 1 from public.movo_plan_grants where user_id = a and source = 'referral') then raise exception 'no reward before 10'; end if;
  -- Nine more referred people subscribe (Pro or Pro+): the 10th gives a three-month Pro reward, starting after a's trial.
  for n in 1..9 loop
    u := gen_random_uuid(); refs := refs || u;
    insert into auth.users (id, email) values (u, u || '@example.test');
    insert into public.movo_referrals (referee_id, referrer_id) values (u, a);
    insert into public.movo_plan_grants (user_id, plan, source, ends_at, external_id) values (u, case when n % 2 = 0 then 'pro_plus' else 'pro' end, 'google_play', now() + interval '1 month', 'gp-' || n);
  end loop;
  select ends_at into ends from public.movo_plan_grants where user_id = a and source = 'trial';
  select * into r from public.movo_plan_grants where user_id = a and source = 'referral';
  if not found or r.plan <> 'pro' or r.starts_at <> ends or r.ends_at <> ends + interval '3 months' then raise exception 'the reward is three months of Pro after the current plan: %', r; end if;
  -- More subscriptions or a renewal do not add a second reward.
  insert into public.movo_plan_grants (user_id, plan, source, ends_at, external_id) values (b, 'pro_plus', 'app_store', now() + interval '2 months', 'apple-b-2');
  u := gen_random_uuid(); insert into auth.users (id, email) values (u, u || '@example.test');
  insert into public.movo_referrals (referee_id, referrer_id) values (u, a);
  insert into public.movo_plan_grants (user_id, plan, source, ends_at, external_id) values (u, 'pro', 'app_store', now() + interval '1 month', 'apple-u-11');
  if (select count(*) from public.movo_plan_grants where user_id = a and source = 'referral') <> 1 then raise exception 'the reward is given once'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true); set local role authenticated;
  info := public.my_movo_plan();
  if (info->>'referrals_subscribed')::int <> 11 or not (info->>'referral_reward_granted')::boolean then raise exception 'referral progress: %', info; end if;
  reset role;

  -- Expired plans fall back to Free; store grants need a transaction id and trial grants must not carry one.
  insert into public.movo_plan_grants (user_id, plan, source, starts_at, ends_at) values (c, 'pro_plus', 'trial', now() - interval '40 days', now() - interval '10 days');
  if public.movo_active_plan(c) <> 'free' then raise exception 'an expired plan is Free'; end if;
  begin insert into public.movo_plan_grants (user_id, plan, source, ends_at) values (c, 'pro', 'app_store', now() + interval '1 day'); raise exception 'store grants need an id';
  exception when check_violation then null; end;

  -- When the plan ends, a Free user can still delete everything, including accounts other records point to.
  delete from public.movo_plan_grants where user_id = a;
  if public.movo_active_plan(a) <> 'free' then raise exception 'a is Free again'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true); set local role authenticated;
  delete from public.transactions; delete from public.financial_accounts;
  if exists (select 1 from public.financial_accounts) then raise exception 'Free users can clear their cloud data'; end if;
  if (select account_id from public.financial_loans where id = loan) is not null then raise exception 'the loan keeps no account'; end if;
  delete from public.financial_loans;
  reset role;
end $$;
rollback;
