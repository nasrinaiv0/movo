-- Runs after the old points tests and all billing migrations in disposable PostgreSQL.
reset role;
select set_config('request.jwt.claim.role','service_role',false);

-- A dedicated verified-account check must work even when service_role cannot read/auth-admin the auth schema.
set role service_role;
do $$ begin
  if not public.movo_referral_verified_account('00000000-0000-0000-0000-000000000001') then
    raise exception 'Verified account lookup denied';
  end if;
  if public.movo_referral_verified_account('00000000-0000-0000-0000-000000000008') then
    raise exception 'Unverified account accepted';
  end if;
end $$;
reset role;

-- Legacy point transactions and redeems survive the schema upgrade at the same value and tier.
do $$ begin
  if not exists(select 1 from public.movo_referral_point_redemptions where request_id is null and tier='pro' and points=500) then
    raise exception 'Legacy Pro redemption changed';
  end if;
  if (select count(*) from public.movo_referral_points_ledger where event_kind like 'invitee_%')<>0 then
    raise exception 'Existing referrals were silently re-awarded';
  end if;
end $$;

insert into auth.users(id,email_confirmed_at) values
  ('00000000-0000-0000-0000-000000000501',now()),
  ('00000000-0000-0000-0000-000000000502',now()),
  ('00000000-0000-0000-0000-000000000503',now()),
  ('00000000-0000-0000-0000-000000000504',now());

do $$
declare
  inviter constant uuid := '00000000-0000-0000-0000-000000000501';
  joined constant uuid := '00000000-0000-0000-0000-000000000502';
  free_period constant uuid := '00000000-0000-0000-0000-000000000503';
  retry constant uuid := '00000000-0000-0000-0000-000000000504';
  code text;
  result jsonb;
  chal jsonb;
  challenge_hash text := repeat('a',64);
  store_id uuid;
  lease_id uuid;
  legacy_trial_end timestamptz;
  payload jsonb;
begin
  -- A verified user receives a share code even when no plan has loaded.
  set local role service_role;
  code := public.movo_referral_points_status(inviter)->>'referralCode';
  if code is null then raise exception 'Verified account did not get a QR code'; end if;
  reset role;

  -- Automatic trial and a code entered afterward preserve both attribution and trial dates.
  perform set_config('request.jwt.claim.role','authenticated',true);
  perform set_config('request.jwt.claim.sub',joined::text,true);
  result := public.claim_movo_trial();
  legacy_trial_end := (result->>'trialExpiresAt')::timestamptz;
  result := public.claim_movo_trial(code);
  if (result->>'trialExpiresAt')::timestamptz is distinct from legacy_trial_end then
    raise exception 'Adding the code restarted the trial';
  end if;
  perform set_config('request.jwt.claim.role','service_role',true);
  if public.movo_referral_points_balance(joined)<>0 then raise exception 'Unattested claim earned points'; end if;
  set local role service_role;
  chal := public.movo_issue_referral_challenge(joined,challenge_hash);
  result := public.movo_record_native_referral(joined,(chal->>'challengeId')::uuid,challenge_hash,'android',repeat('b',64));
  if (result->>'awarded') is distinct from 'true' then raise exception 'Verified signup failed'; end if;
  if public.movo_referral_points_balance(joined)<>20 or public.movo_referral_points_balance(inviter)<>5 then
    raise exception 'Signup did not credit the intended balances';
  end if;
  begin
    perform public.movo_record_native_referral(joined,(chal->>'challengeId')::uuid,challenge_hash,'android',repeat('b',64));
    raise exception 'Replay credited points';
  exception when raise_exception then if sqlerrm<>'invalid_or_replayed_challenge' then raise; end if; end;
  reset role;

  -- Use the real IAP commit to exercise trial, confirmed payment, renewal, duplicate event, and refund.
  payload := jsonb_build_object('platform','google','storeSubscriptionKey',repeat('c',64),'purchaseTokenHash',repeat('c',64),
    'storeTransactionId','reward-order','productId','com.nasrinai.movo.pro.monthly','tier','pro','status','active',
    'eventAt',clock_timestamp(),'environment','production','expiresAt',now()+interval '1 month',
    'paidVerified',false,'referralPointsEnabled',true);
  insert into public.movo_iap_leases(platform,subscription_key,fence,expires_at)
    values('google',repeat('c',64),gen_random_uuid(),now()+interval '5 minutes') returning fence into lease_id;
  result := public.movo_iap_commit(joined,payload,lease_id,'trial-reward');
  store_id := (result->>'entitlementId')::uuid;
  if public.movo_referral_points_balance(joined)<>20 then raise exception 'Store trial earned payment points'; end if;
  update public.movo_store_entitlements set environment='sandbox',paid_verified=true where id=store_id;
  perform public.movo_award_referral_upgrade(store_id,joined);
  if public.movo_referral_points_balance(joined)<>20 then raise exception 'Sandbox earned payment points'; end if;
  update public.movo_store_entitlements set environment='production',paid_verified=false where id=store_id;
  for i in 1..2 loop
    insert into public.movo_iap_leases(platform,subscription_key,fence,expires_at)
      values('google',repeat('c',64),gen_random_uuid(),now()+interval '5 minutes') returning fence into lease_id;
    perform public.movo_iap_commit(joined,payload||jsonb_build_object('paidVerified',true,'eventAt',clock_timestamp()),lease_id,'reward-payment-'||i);
  end loop;
  if public.movo_referral_points_balance(joined)<>120 or public.movo_referral_points_balance(inviter)<>105 then
    raise exception 'First verified payment was not credited once to each beneficiary';
  end if;
  delete from auth.users where id=inviter;
  if public.movo_referral_points_balance(joined)<>120 then raise exception 'Inviter deletion removed invitee points'; end if;
  insert into public.movo_iap_leases(platform,subscription_key,fence,expires_at)
    values('google',repeat('c',64),gen_random_uuid(),now()+interval '5 minutes') returning fence into lease_id;
  perform public.movo_iap_commit(joined,payload||jsonb_build_object('status','revoked','eventAt',clock_timestamp()),lease_id,'reward-refund');
  perform public.movo_reverse_referral_upgrade(joined);
  if public.movo_referral_points_balance(joined)<>20 then raise exception 'Refund did not reverse the invitee bonus once'; end if;

  -- A payment arriving before device proof is applied in the same transaction as subsequent proof.
  perform public.movo_referral_points_status(free_period);
  code := public.movo_referral_points_status(free_period)->>'referralCode';
  set local role service_role;
  result := public.movo_claim_referral_code(retry,code);
  if (result->>'claimed') is distinct from 'true' then raise exception 'Service role failed to link a referral %',result; end if;
  reset role;
  insert into public.movo_store_entitlements(user_id,platform,product_id,tier,store_subscription_key,
    store_transaction_id,original_transaction_id,status,expires_at,environment,paid_verified)
    values(retry,'apple','com.nasrinai.movo.pro.monthly','pro','reward-late-proof','reward-late-proof-tx','reward-late-proof','active',
      now()+interval '1 month','production',true) returning id into store_id;
  perform public.movo_award_referral_upgrade(store_id,retry);
  if public.movo_referral_points_balance(retry)<>0 then raise exception 'Paid claim earned points ahead of proof'; end if;
  challenge_hash := repeat('d',64);
  chal := public.movo_issue_referral_challenge(retry,challenge_hash);
  perform public.movo_record_native_referral(retry,(chal->>'challengeId')::uuid,challenge_hash,'ios',repeat('e',64));
  if public.movo_referral_points_balance(retry)<>120 then raise exception 'A paid claim lost its award before verification'; end if;
end $$;

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
  pro constant uuid := '00000000-0000-0000-0000-000000000502';
  plus constant uuid := '00000000-0000-0000-0000-000000000503';
  subscriber constant uuid := '00000000-0000-0000-0000-000000000504';
  key constant uuid := 'a2cb71de-18de-413f-87d8-ba57ce1ede28';
  result jsonb;
  retry jsonb;
begin
  perform pg_temp.give_points(pro,5); -- 545 total
  perform pg_temp.give_points(plus,6); -- 735 total
  perform pg_temp.give_points(subscriber,7); -- 855 total, with an active store plan
  begin
    perform public.movo_redeem_referral_points(plus,1,'pro_plus',key);
    raise exception 'Underfunded Pro+ redemption succeeded';
  exception when raise_exception then if sqlerrm<>'not_enough_points' then raise; end if; end;
  perform pg_temp.give_points(plus,1);
  begin
    perform public.movo_redeem_referral_points(subscriber,1,'pro_plus',key);
    raise exception 'Active store subscription was allowed to spend points';
  exception when raise_exception then if sqlerrm<>'store_plan_active' then raise; end if; end;
  result := public.movo_redeem_referral_points(pro,1,'pro',key);
  if (result->>'tier') is distinct from 'pro' or (result->>'points')::int<>45 then raise exception 'Pro price was not 500'; end if;
  if (result->>'startsAt')::timestamptz is distinct from (select trial_expires_at from public.movo_plan_grants where user_id=pro) then
    raise exception 'Pro reward overlapped the trial';
  end if;
  result := public.movo_redeem_referral_points(plus,1,'pro_plus',key);
  retry := public.movo_redeem_referral_points(plus,1,'pro_plus',key);
  if result is distinct from retry or (result->>'points')::int<>90 then raise exception 'Pro+ cost or retry was incorrect: %',result; end if;
  if public.movo_plan_status(plus)->>'tier' is distinct from 'pro_plus' or public.movo_plan_status(plus)->>'source' is distinct from 'points' then
    raise exception 'Pro+ reward did not grant Pro+ entitlement';
  end if;
  begin
    perform public.movo_redeem_referral_points(plus,1,'pro',key);
    raise exception 'Request id was reused for a different tier';
  exception when raise_exception then if sqlerrm<>'redemption_request_conflict' then raise; end if; end;
  if has_function_privilege('authenticated','public.movo_redeem_referral_points(uuid,integer,text,uuid)','execute')
    or has_function_privilege('anon','public.movo_referral_verified_account(uuid,boolean)','execute')
    or has_function_privilege('service_role','public.movo_redeem_referral_points(uuid,integer)','execute') then
    raise exception 'Redemption privileges are too broad';
  end if;
end $$;

select 'PASS: QR attribution after trial, +20 invitee signup, +100 first paid charge, no free/test credits, refund/replay protection, 500 Pro, 750 Pro+';
