-- Executed only in the disposable local PostgreSQL CI fixture (scripts/test-plan-migration.py).
reset role;
select set_config('request.jwt.claim.role','service_role',false);
-- 04 joined, 05 second, 06 old account, 07 already bought, 08 unverified, 09 trial with code, 10 linked then trial,
-- 11 trial with a wrong code, 12 fresh account that has not entered anything.
insert into auth.users(id,email_confirmed_at,phone_confirmed_at,created_at) values
  ('00000000-0000-0000-0000-000000000004',now(),null,now()),
  ('00000000-0000-0000-0000-000000000005',now(),null,now()),
  ('00000000-0000-0000-0000-000000000006',now(),null,now()-interval '30 days'),
  ('00000000-0000-0000-0000-000000000007',now(),null,now()),
  ('00000000-0000-0000-0000-000000000008',null,null,now()),
  ('00000000-0000-0000-0000-000000000009',now(),null,now()),
  ('00000000-0000-0000-0000-000000000010',now(),null,now()),
  ('00000000-0000-0000-0000-000000000011',now(),null,now()),
  ('00000000-0000-0000-0000-000000000012',now(),null,now());
insert into public.movo_store_entitlements(user_id,platform,product_id,tier,store_subscription_key,store_transaction_id,status,expires_at,environment,paid_verified)
values('00000000-0000-0000-0000-000000000007','apple','com.nasrinai.movo.pro.monthly','pro','bought-before','bought-before-tx','active',now()+interval '1 month','production',true);

-- Short codes: every existing 24-character code was replaced, new rows get one, and the format is enforced.
do $$ declare v_code text; i int; begin
  if exists(select 1 from public.movo_plan_grants where referral_code !~ '^M[0-9A-HJ-NP-Z]{5}$') then raise exception 'A long referral code survived'; end if;
  if not exists(select 1 from public.movo_plan_grants where referral_code ~ '^M[0-9]{5}$') then raise exception 'Codes are not M + 5 digits'; end if;
  if (select count(*) from public.movo_plan_grants) < 100 then raise exception 'Fixture grants missing'; end if;
  for i in 1..200 loop
    v_code := public.movo_new_referral_code();
    if v_code !~ '^M[0-9]{5}$' then raise exception 'Generated code % has the wrong format', v_code; end if;
  end loop;
  begin
    update public.movo_plan_grants set referral_code = 'abcdefabcdefabcdefabcdef' where user_id = '00000000-0000-0000-0000-000000000001';
    raise exception 'Long code accepted';
  exception when check_violation then null; end;
end $$;

do $$
declare
  inviter constant uuid := '00000000-0000-0000-0000-000000000001';
  joined constant uuid := '00000000-0000-0000-0000-000000000004';
  second constant uuid := '00000000-0000-0000-0000-000000000005';
  code text; missing text; result jsonb; i int;
begin
  select referral_code into code from public.movo_plan_grants where user_id = inviter;
  missing := public.movo_new_referral_code();
  -- Lower case and spaces are accepted; the referral is recorded once.
  result := public.movo_claim_referral_code(joined, '  ' || lower(code) || ' ');
  if result->>'claimed' <> 'true' then raise exception 'Valid code rejected: %', result; end if;
  if (select referred_by from public.movo_plan_grants where user_id = joined) is distinct from inviter then raise exception 'Referral attribution not recorded'; end if;
  if not exists(select 1 from public.movo_referral_claims where referred_id = joined and referrer_id = inviter) then raise exception 'Points claim not recorded'; end if;
  result := public.movo_claim_referral_code(joined, code);
  if result->>'error' <> 'already_referred' then raise exception 'Second referral accepted: %', result; end if;
  -- Own code, wrong codes, accounts that are too old, already paid or unverified.
  if public.movo_claim_referral_code(inviter, code)->>'claimed' <> 'false' then raise exception 'Self referral accepted'; end if;
  if public.movo_claim_referral_code(second, missing)->>'error' <> 'invalid_referral_code' then raise exception 'Unknown code accepted'; end if;
  if public.movo_claim_referral_code(second, 'XYZ')->>'error' <> 'invalid_referral_code' then raise exception 'Malformed code accepted'; end if;
  if public.movo_claim_referral_code('00000000-0000-0000-0000-000000000006', code)->>'error' <> 'account_not_new' then raise exception 'Old account linked'; end if;
  if public.movo_claim_referral_code('00000000-0000-0000-0000-000000000007', code)->>'error' <> 'already_purchased' then raise exception 'Paid account linked'; end if;
  if public.movo_claim_referral_code('00000000-0000-0000-0000-000000000008', code)->>'error' <> 'verified_account_required' then raise exception 'Unverified account linked'; end if;
  -- Ten entries an hour: guessing stops even for a correct code, and the count survives the wrong answers.
  for i in 1..8 loop perform public.movo_claim_referral_code(second, missing); end loop;
  if (select count(*) from public.movo_referral_code_attempts where user_id = second) <> 10 then raise exception 'Attempts not counted'; end if;
  if public.movo_claim_referral_code(second, code)->>'error' <> 'too_many_attempts' then raise exception 'Guessing was not limited'; end if;
  if exists(select 1 from public.movo_plan_grants where user_id = second and referred_by is not null) then raise exception 'Limited attempt linked'; end if;
  update public.movo_referral_code_attempts set attempted_at = now() - interval '2 hours' where user_id = second;
  if public.movo_claim_referral_code(second, code)->>'claimed' <> 'true' then raise exception 'Limit did not reset after an hour'; end if;
end $$;

-- The free month accepts the short code, never clears an existing referral and keeps wrong attempts counted.
do $$ declare code text; begin
  select referral_code into code from public.movo_plan_grants where user_id = '00000000-0000-0000-0000-000000000001';
  if public.movo_claim_referral_code('00000000-0000-0000-0000-000000000010', code)->>'claimed' <> 'true' then raise exception 'Link before trial failed'; end if;
end $$;
select set_config('request.jwt.claim.role','authenticated',false);
set role authenticated;
do $$ declare result jsonb; begin
  perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000011',true);
  result := public.claim_movo_trial('M' || 'ZZZZZ');
  if result->>'error' <> 'invalid_referral_code' then raise exception 'Wrong code started a trial: %', result; end if;
  perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000010',true);
  result := public.claim_movo_trial();
  if result->>'source' <> 'trial' then raise exception 'Trial did not start: %', result; end if;
end $$;
reset role;
select set_config('request.jwt.claim.role','service_role',false);
do $$ declare code text; begin
  select referral_code into code from public.movo_plan_grants where user_id = '00000000-0000-0000-0000-000000000001';
  if (select trial_started_at from public.movo_plan_grants where user_id = '00000000-0000-0000-0000-000000000011') is not null then raise exception 'Wrong code left a trial behind'; end if;
  if (select count(*) from public.movo_referral_code_attempts where user_id = '00000000-0000-0000-0000-000000000011') <> 1 then raise exception 'Trial attempt not counted'; end if;
  if (select referred_by from public.movo_plan_grants where user_id = '00000000-0000-0000-0000-000000000010') is distinct from '00000000-0000-0000-0000-000000000001'::uuid
    then raise exception 'Starting the free month cleared the referral'; end if;
  perform set_config('movo.test_code', code, false);
end $$;
select set_config('request.jwt.claim.role','authenticated',false);
set role authenticated;
do $$ declare result jsonb; begin
  perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000009',true);
  result := public.claim_movo_trial(lower(current_setting('movo.test_code')));
  if result->>'source' <> 'trial' then raise exception 'Trial with code did not start: %', result; end if;
end $$;
reset role;
select set_config('request.jwt.claim.role','service_role',false);
do $$ begin
  if (select referred_by from public.movo_plan_grants where user_id = '00000000-0000-0000-0000-000000000009') is distinct from '00000000-0000-0000-0000-000000000001'::uuid
    then raise exception 'Trial code did not link the referral'; end if;
  if not exists(select 1 from public.movo_referral_claims where referred_id = '00000000-0000-0000-0000-000000000009') then raise exception 'Trial code did not record a points claim'; end if;
  if (public.movo_referral_points_status('00000000-0000-0000-0000-000000000012')->>'canClaim')::boolean is not true then raise exception 'New account cannot claim'; end if;
  if (public.movo_referral_points_status('00000000-0000-0000-0000-000000000004')->>'canClaim')::boolean then raise exception 'Referred account can claim again'; end if;
  if (public.movo_referral_points_status('00000000-0000-0000-0000-000000000006')->>'canClaim')::boolean then raise exception 'Old account can claim'; end if;
  if public.movo_referral_points_status('00000000-0000-0000-0000-000000000001')->>'referralCode' <> current_setting('movo.test_code') then raise exception 'Status code mismatch'; end if;
  if (public.movo_referral_points_status('00000000-0000-0000-0000-000000000001')->>'referredUsers')::int
    <> (select count(*) from public.movo_plan_grants where referred_by = '00000000-0000-0000-0000-000000000001') then raise exception 'Referred count mismatch'; end if;
end $$;

-- Points: +5 after native proof, +100 once after a verified production purchase, -100 once after a refund.
do $$
declare
  inviter constant uuid := '00000000-0000-0000-0000-000000000001';
  joined constant uuid := '00000000-0000-0000-0000-000000000004';
  challenge_hash text := encode(sha256(convert_to(repeat('c',64),'UTF8')),'hex');
  chal jsonb; store_id uuid;
begin
  if (public.movo_referral_points_status(joined)->>'pendingNativeProof')::boolean is not true then raise exception 'Native proof not pending'; end if;
  chal := public.movo_issue_referral_challenge(joined,challenge_hash);
  perform public.movo_record_native_referral(joined,(chal->>'challengeId')::uuid,challenge_hash,'ios',repeat('f',64));
  if (public.movo_referral_points_status(inviter)->>'points')::int <> 5
    then raise exception 'Missing 5 point signup reward'; end if;
  begin
    perform public.movo_record_native_referral(joined,(chal->>'challengeId')::uuid,challenge_hash,'ios',repeat('f',64));
    raise exception 'Replayed attestation challenge accepted';
  exception when raise_exception then
    if SQLERRM = 'Replayed attestation challenge accepted' then raise; end if;
  end;
  begin
    perform public.movo_issue_referral_challenge('00000000-0000-0000-0000-000000000012',encode(sha256(convert_to(repeat('d',64),'UTF8')),'hex'));
    raise exception 'Challenge issued without a referral';
  exception when raise_exception then
    if SQLERRM <> 'no_pending_referral' then raise; end if;
  end;
  insert into public.movo_store_entitlements(user_id,platform,product_id,tier,store_subscription_key,store_transaction_id,
    status,expires_at,environment,paid_verified)
  values(joined,'apple','com.nasrinai.movo.pro.monthly','pro','new-referral-sandbox','new-referral-tx-1',
    'active',now()+interval '1 month','sandbox',true) returning id into store_id;
  perform public.movo_award_referral_upgrade(store_id,joined);
  if (public.movo_referral_points_status(inviter)->>'points')::int <> 5 then raise exception 'Sandbox purchase awarded points'; end if;
  update public.movo_store_entitlements set environment='production',paid_verified=false where id=store_id;
  perform public.movo_award_referral_upgrade(store_id,joined);
  if (public.movo_referral_points_status(inviter)->>'points')::int <> 5 then raise exception 'Unverified purchase awarded points'; end if;
  update public.movo_store_entitlements set paid_verified=true where id=store_id;
  perform public.movo_award_referral_upgrade(store_id,joined);
  perform public.movo_award_referral_upgrade(store_id,joined);
  if (public.movo_referral_points_status(inviter)->>'points')::int <> 105
    then raise exception 'Missing or duplicated paid upgrade'; end if;
  -- Unverified referred accounts never earn the 100.
  perform public.movo_award_referral_upgrade(store_id,'00000000-0000-0000-0000-000000000009');
  if (public.movo_referral_points_status(inviter)->>'points')::int <> 105 then raise exception 'Unattested account awarded points'; end if;
  update public.movo_store_entitlements set status='revoked' where id=store_id;
  perform public.movo_reverse_referral_upgrade(joined);
  perform public.movo_reverse_referral_upgrade(joined);
  if (public.movo_referral_points_status(inviter)->>'points')::int <> 5
    then raise exception 'Refund reversal was not idempotent'; end if;
  if (select count(*) from public.movo_referral_points_ledger where referred_id=joined) <> 3
    then raise exception 'Ledger must contain exactly signup, upgrade and reversal'; end if;
end $$;

-- Points to Pro: every 500 points convert to one month of Pro, queued after any current plan.
create function pg_temp.give_points(p_referrer uuid, p_friends int) returns void language plpgsql as $$
declare v_user uuid; v_claim uuid; i int; begin
  for i in 1..p_friends loop
    v_user := gen_random_uuid();
    insert into auth.users(id,email_confirmed_at,phone_confirmed_at,created_at) values (v_user, now(), null, now());
    insert into public.movo_referral_claims(referrer_id,referred_id,native_verified_at,platform) values (p_referrer, v_user, now(), 'ios') returning id into v_claim;
    insert into public.movo_referral_points_ledger(claim_id,referrer_id,referred_id,event_kind,points) values
      (v_claim, p_referrer, v_user, 'native_signup', 5), (v_claim, p_referrer, v_user, 'paid_upgrade', 100);
  end loop;
end $$;
do $$
declare
  saver constant uuid := '00000000-0000-0000-0000-000000000012';
  on_trial constant uuid := '00000000-0000-0000-0000-000000000010';
  first jsonb; second jsonb; status jsonb; v_trial timestamptz;
begin
  perform pg_temp.give_points(saver, 5); -- 525 points
  if (public.movo_referral_points_status(saver)->>'monthsAvailable')::int <> 1 then raise exception 'Months available miscounted'; end if;
  begin perform public.movo_redeem_referral_points(saver, 2); raise exception 'Redeemed more than the balance';
  exception when raise_exception then if SQLERRM <> 'not_enough_points' then raise; end if; end;
  begin perform public.movo_redeem_referral_points(saver, 0); raise exception 'Zero months accepted';
  exception when raise_exception then if SQLERRM <> 'invalid_months' then raise; end if; end;
  begin perform public.movo_redeem_referral_points(saver, 13); raise exception 'Thirteen months accepted';
  exception when raise_exception then if SQLERRM <> 'invalid_months' then raise; end if; end;
  begin perform public.movo_redeem_referral_points('00000000-0000-0000-0000-000000000008', 1); raise exception 'Unverified account redeemed';
  exception when raise_exception then if SQLERRM <> 'verified_account_required' then raise; end if; end;

  first := public.movo_redeem_referral_points(saver, 1);
  if (first->>'points')::int <> 25 then raise exception 'Redemption did not spend 500 points: %', first; end if;
  if (first->>'startsAt')::timestamptz > now() + interval '1 second' then raise exception 'First month did not start now'; end if;
  if (first->>'expiresAt')::timestamptz <> (first->>'startsAt')::timestamptz + interval '1 month' then raise exception 'Not one calendar month'; end if;
  status := public.movo_plan_status(saver);
  if status->>'tier' <> 'pro' or status->>'source' <> 'points' then raise exception 'Points did not give Pro: %', status; end if;
  begin perform public.movo_redeem_referral_points(saver, 1); raise exception 'Spent the same points twice';
  exception when raise_exception then if SQLERRM <> 'not_enough_points' then raise; end if; end;

  perform pg_temp.give_points(saver, 5); -- 550 points
  second := public.movo_redeem_referral_points(saver, 1);
  if (second->>'startsAt')::timestamptz <> (first->>'expiresAt')::timestamptz then raise exception 'Second month did not queue after the first'; end if;
  if (public.movo_plan_status(saver)->>'expiresAt')::timestamptz <> (first->>'expiresAt')::timestamptz then raise exception 'Queued month counted early'; end if;
  if (public.movo_referral_points_status(saver)->>'pointsProUntil')::timestamptz <> (second->>'expiresAt')::timestamptz then raise exception 'Pro-until date wrong'; end if;
  if (select count(*) from public.movo_referral_points_ledger where referrer_id = saver) <> 20 then raise exception 'Redemption edited the ledger'; end if;

  -- During the free month, points start when the free month ends.
  select trial_expires_at into v_trial from public.movo_plan_grants where user_id = on_trial;
  if v_trial is null or v_trial <= now() then raise exception 'Fixture trial missing'; end if;
  perform pg_temp.give_points(on_trial, 5);
  first := public.movo_redeem_referral_points(on_trial, 1);
  if (first->>'startsAt')::timestamptz <> v_trial then raise exception 'Points month overlapped the free month'; end if;
  if public.movo_plan_status(on_trial)->>'source' <> 'trial' then raise exception 'Trial replaced early'; end if;

  -- A refund after a redemption takes the balance down; nothing more can be redeemed until it is positive again.
  insert into public.movo_referral_points_ledger(claim_id,referrer_id,referred_id,event_kind,points)
  select claim_id, referrer_id, referred_id, 'paid_reversal', -100 from public.movo_referral_points_ledger
   where referrer_id = saver and event_kind = 'paid_upgrade' limit 1;
  if (public.movo_referral_points_status(saver)->>'points')::int <> -50 then raise exception 'Clawback not applied'; end if;
  if (public.movo_referral_points_status(saver)->>'monthsAvailable')::int <> 0 then raise exception 'Negative balance offers months'; end if;
end $$;

-- Signed-in and anonymous clients cannot read, write or call any of it.
set role authenticated;
do $$ begin
  begin perform public.movo_redeem_referral_points('00000000-0000-0000-0000-000000000012', 1); raise exception 'Client redeemed points';
  exception when insufficient_privilege then null; end;
  begin perform public.movo_referral_points_balance('00000000-0000-0000-0000-000000000012'); raise exception 'Client read a balance';
  exception when insufficient_privilege then null; end;
  begin perform 1 from public.movo_referral_point_redemptions limit 1; raise exception 'Client read redemptions';
  exception when insufficient_privilege then null; end;
end $$;
do $$
begin
  begin
    perform public.movo_referral_points_status('00000000-0000-0000-0000-000000000001');
    raise exception 'Client read internal points';
  exception when insufficient_privilege then null; end;
  begin
    perform public.movo_claim_referral_code('00000000-0000-0000-0000-000000000012', current_setting('movo.test_code'));
    raise exception 'Client called the claim RPC';
  exception when insufficient_privilege then null; end;
  begin
    perform public.movo_referral_lookup('00000000-0000-0000-0000-000000000012', current_setting('movo.test_code'));
    raise exception 'Client resolved a code to an account';
  exception when insufficient_privilege then null; end;
  begin
    perform public.movo_new_referral_code();
    raise exception 'Client generated a code';
  exception when insufficient_privilege then null; end;
  begin
    perform 1 from public.movo_referral_claims limit 1;
    raise exception 'Client read referral claims';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.movo_referral_code_attempts(user_id) values('00000000-0000-0000-0000-000000000012');
    raise exception 'Client wrote attempts';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.movo_referral_points_ledger(claim_id,referrer_id,referred_id,event_kind,points)
    values(gen_random_uuid(),'00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000004','native_signup',5);
    raise exception 'Client forged referral credit';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set role anon;
do $$ begin
  begin
    perform public.claim_movo_trial(current_setting('movo.test_code'));
    raise exception 'Anonymous trial claim';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'PASS: short codes, attempt limit, self/old/paid/unverified referrals, trial keeps referral, native proof replay, +5, production verified +100 once, refund -100, 500 points to 1 month of Pro (queued, no double spend) and client isolation';
