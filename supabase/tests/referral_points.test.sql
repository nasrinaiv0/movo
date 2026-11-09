-- Executed only in the disposable local PostgreSQL CI fixture.
select set_config('request.jwt.claim.role','service_role',false);
insert into auth.users(id,email_confirmed_at,phone_confirmed_at,created_at)
values ('00000000-0000-0000-0000-000000000004',now(),null,now()),
       ('00000000-0000-0000-0000-000000000005',now(),null,now());
do $$
declare
  inviter constant uuid := '00000000-0000-0000-0000-000000000001';
  joined constant uuid := '00000000-0000-0000-0000-000000000004';
  second constant uuid := '00000000-0000-0000-0000-000000000005';
  token_hash text := encode(sha256(convert_to(repeat('a',64),'UTF8')),'hex');
  challenge_hash text := encode(sha256(convert_to(repeat('c',64),'UTF8')),'hex');
  inv jsonb; chal jsonb; store_id uuid;
begin
  inv := public.movo_issue_invite(inviter,token_hash);
  if inv->>'inviteId' is null then raise exception 'Invite missing'; end if;
  perform public.movo_claim_invite(joined,token_hash);
  if (select referred_by from public.movo_plan_grants where user_id=joined) is distinct from inviter
    then raise exception 'Referral attribution not recorded'; end if;
  begin
    perform public.movo_claim_invite(second,token_hash);
    raise exception 'Replayed token accepted';
  exception when raise_exception then
    if SQLERRM = 'Replayed token accepted' then raise; end if;
  end;
  begin
    perform public.movo_claim_invite(inviter,token_hash);
    raise exception 'Self referral accepted';
  exception when raise_exception then
    if SQLERRM = 'Self referral accepted' then raise; end if;
  end;
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
  update public.movo_store_entitlements set status='revoked' where id=store_id;
  perform public.movo_reverse_referral_upgrade(joined);
  perform public.movo_reverse_referral_upgrade(joined);
  if (public.movo_referral_points_status(inviter)->>'points')::int <> 5
    then raise exception 'Refund reversal was not idempotent'; end if;
  if (select count(*) from public.movo_referral_points_ledger where referred_id=joined) <> 3
    then raise exception 'Ledger must contain exactly signup, upgrade and reversal'; end if;
end $$;
set role authenticated;
do $$
begin
  begin
    perform public.movo_referral_points_status('00000000-0000-0000-0000-000000000001');
    raise exception 'Client read internal points';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.movo_referral_points_ledger(claim_id,referrer_id,referred_id,event_kind,points)
    values(gen_random_uuid(),'00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000004','native_signup',5);
    raise exception 'Client forged referral credit';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'PASS: unique invite, self referral, native proof replay, +5, production verified +100 once, refund -100 and client isolation';
