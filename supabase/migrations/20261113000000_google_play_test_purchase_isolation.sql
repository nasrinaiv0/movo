-- Review only: migrate on disposable CI before any independent production approval.
begin;
create or replace function public.movo_iap_commit(p_user_id uuid,p_verified jsonb,p_fence uuid,p_event_id text default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
  v_platform text:=p_verified->>'platform'; v_key text:=p_verified->>'storeSubscriptionKey';
  v_link text:=p_verified->>'linkedPurchaseTokenHash'; v_status text:=p_verified->>'status';
  v_tx text:=p_verified->>'storeTransactionId'; v_event timestamptz:=(p_verified->>'eventAt')::timestamptz;
  v_purchase timestamptz:=(p_verified->>'purchasedAt')::timestamptz;
  old public.movo_store_entitlements; v_id uuid; k text; v_duplicate boolean:=false; v_blocked boolean;
  v_environment text:=p_verified->>'environment';
begin
  -- Sorted locks prevent upgrade/deadlock cycles; the lease fences network calls across requests.
  for k in select distinct x from unnest(array[v_key,v_link]) x where x is not null order by x loop
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_platform||':'||k,0));
  end loop;
  if not exists(select 1 from public.movo_iap_leases where platform=v_platform and subscription_key=v_key
    and fence=p_fence and expires_at>clock_timestamp() for update) then raise exception 'iap_lease_expired'; end if;
  if p_event_id is not null then
    insert into public.movo_iap_events(platform,event_id) values(v_platform,p_event_id) on conflict do nothing;
    v_duplicate:=not found;
  end if;
  if v_duplicate then
    delete from public.movo_iap_leases where platform=v_platform and subscription_key=v_key and fence=p_fence;
    return jsonb_build_object('duplicate',true);
  end if;
  if v_environment is null or v_environment not in ('production','sandbox')
     or v_event is null or v_event>clock_timestamp()+interval '5 minutes' then raise exception 'invalid_store_state'; end if;
  if v_environment='sandbox' and (v_platform<>'google' or p_user_id is null
    or not exists(select 1 from public.movo_store_test_users where user_id=p_user_id)) then raise exception 'test_account_not_enabled'; end if;
  select * into old from public.movo_store_entitlements where platform=v_platform and store_subscription_key=v_key for update;
  if old.id is not null and old.user_id is distinct from p_user_id then raise exception 'purchase_already_linked'; end if;
  if old.id is not null and old.environment is distinct from v_environment then raise exception 'invalid_store_state'; end if;
  if v_status='revoked' then
    insert into public.movo_iap_revocations values(v_platform,case when v_platform='apple' then v_tx else v_key end,v_event)
      on conflict(platform,identity_key) do update set revoked_at=greatest(public.movo_iap_revocations.revoked_at,excluded.revoked_at);
  end if;
  -- Unknown-owner revocations must still be saved; positive unknown-owner events retry instead.
  if p_user_id is null then
    if v_status<>'revoked' then raise exception 'iap_owner_unknown'; end if;
    delete from public.movo_iap_leases where platform=v_platform and subscription_key=v_key and fence=p_fence;
    return jsonb_build_object('status','revoked');
  end if;
  if v_link is not null and v_link<>v_key then
    if exists(select 1 from public.movo_store_entitlements where platform='google' and store_subscription_key=v_link and user_id<>p_user_id) then raise exception 'purchase_already_linked'; end if;
    if exists(select 1 from public.movo_store_entitlements where platform='google' and store_subscription_key=v_link and environment<>v_environment) then raise exception 'invalid_store_state'; end if;
    -- A pending replacement does not invalidate the paid predecessor.
    if coalesce((p_verified->>'replaceLinked')::boolean, v_status in ('active','grace_period')) then
      insert into public.movo_iap_revocations values('google',v_link,v_event) on conflict do nothing;
      update public.movo_store_entitlements set status='revoked',paid_verified=false,updated_at=now()
        where platform='google' and store_subscription_key=v_link;
    end if;
  end if;
  select exists(select 1 from public.movo_iap_revocations where platform=v_platform
    and identity_key=case when v_platform='apple' then v_tx else v_key end) into v_blocked;
  if v_blocked then v_status:='revoked'; end if;
  if old.id is not null and (
    (v_platform='apple' and old.store_transaction_id<>v_tx and (v_status='revoked' or v_purchase is null or old.purchased_at>v_purchase or old.expires_at>(p_verified->>'expiresAt')::timestamptz))
    or (not v_blocked and old.store_event_at>v_event)
  ) then
    v_id:=old.id;
  else
    insert into public.movo_store_entitlements as e(user_id,platform,product_id,tier,store_subscription_key,store_transaction_id,
      original_transaction_id,purchase_token_hash,status,expires_at,environment,store_event_at,purchased_at,paid_verified)
    values(p_user_id,v_platform,p_verified->>'productId',p_verified->>'tier',v_key,v_tx,p_verified->>'originalTransactionId',
      p_verified->>'purchaseTokenHash',v_status,(p_verified->>'expiresAt')::timestamptz,v_environment,v_event,v_purchase,
      coalesce((p_verified->>'paidVerified')::boolean,false) and v_environment='production' and v_status in ('active','grace_period'))
    on conflict(platform,store_subscription_key) do update set product_id=excluded.product_id,tier=excluded.tier,
      store_transaction_id=excluded.store_transaction_id,status=excluded.status,expires_at=excluded.expires_at,
      store_event_at=excluded.store_event_at,purchased_at=excluded.purchased_at,paid_verified=excluded.paid_verified,
      verified_at=now(),updated_at=now() returning id into v_id;
  end if;
  select * into old from public.movo_store_entitlements where id=v_id;
  if v_platform='google' and old.status in ('active','grace_period') and (p_verified->>'needsAcknowledgement')::boolean then
    if p_verified->>'encryptedToken' is null then raise exception 'iap_ack_not_configured'; end if;
    insert into public.movo_iap_ack_jobs(purchase_token_hash,product_id,encrypted_token)
      values(v_key,old.product_id,p_verified->>'encryptedToken') on conflict do nothing;
  end if;
  if old.paid_verified and old.status in ('active','grace_period') then
    perform public.record_movo_paid_referral(old.id,old.user_id);
    if coalesce((p_verified->>'referralPointsEnabled')::boolean,false) then
      perform public.movo_award_referral_upgrade(old.id,old.user_id);
    end if;
  end if;
  if old.status='revoked' and coalesce((p_verified->>'referralPointsEnabled')::boolean,false) then
    perform public.movo_reverse_referral_upgrade(old.user_id);
  end if;
  delete from public.movo_iap_leases where platform=v_platform and subscription_key=v_key and fence=p_fence;
  return jsonb_build_object('entitlementId',old.id,'status',old.status,'tier',old.tier,'expiresAt',old.expires_at,'environment',old.environment);
end $$;
create or replace function public.movo_plan_status(p_user_id uuid default auth.uid()) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare g public.movo_plan_grants; v_tier text; v_expiry timestamptz; v_source text; v_count integer;
begin
  if p_user_id is null or ((select auth.jwt()->>'role') is distinct from 'service_role' and p_user_id is distinct from (select auth.uid())) then
    raise exception 'sign_in_required' using errcode = '42501';
  end if;
  select * into g from public.movo_plan_grants where user_id = p_user_id;
  select count(*) into v_count from public.movo_plan_grants r where r.referred_by = p_user_id
    and exists(select 1 from public.movo_store_entitlements e where e.user_id = r.user_id
      and e.environment = 'production' and e.paid_verified and e.status <> 'revoked');
  select tier, expires_at, source into v_tier, v_expiry, v_source from (
    select case when e.tier in ('max','ultra') then 'pro_plus' else e.tier end as tier, e.expires_at, 'store'::text as source
      from public.movo_store_entitlements e where e.user_id = p_user_id
      and (e.environment = 'production' or (e.environment = 'sandbox'
        and exists(select 1 from public.movo_store_test_users t where t.user_id=p_user_id)))
      and e.status in ('active','grace_period') and e.expires_at > now()
    union all select mg.tier, mg.expires_at, 'manual'::text from public.movo_manual_plan_grants mg
      where mg.user_id = p_user_id and mg.revoked_at is null and mg.expires_at > now()
    union all select 'pro', g.trial_expires_at, 'trial' where g.trial_expires_at > now()
    union all select 'pro', g.reward_expires_at, 'referral' where g.reward_started_at <= now() and g.reward_expires_at > now() and v_count >= 10
    union all select 'pro', pr.expires_at, 'points' from public.movo_referral_point_redemptions pr
      where pr.user_id = p_user_id and pr.starts_at <= now() and pr.expires_at > now()
  ) a order by (tier = 'pro_plus') desc, expires_at desc limit 1;
  return jsonb_build_object('tier',coalesce(v_tier,'free'),'active',v_tier is not null,'expiresAt',v_expiry,'source',v_source,
    'trialEligible',g.trial_started_at is null and not exists(select 1 from public.movo_store_entitlements where user_id=p_user_id and environment='production'),
    'trialExpiresAt',g.trial_expires_at,'referralCode',g.referral_code,'qualifiedReferrals',v_count,
    'rewardStartsAt',g.reward_started_at,'rewardExpiresAt',g.reward_expires_at);
end $$;
revoke all on function public.movo_iap_commit(uuid,jsonb,uuid,text), public.movo_plan_status(uuid) from public,anon;
revoke all on function public.movo_iap_commit(uuid,jsonb,uuid,text) from authenticated;
grant execute on function public.movo_iap_commit(uuid,jsonb,uuid,text) to service_role;
grant execute on function public.movo_plan_status(uuid) to authenticated,service_role;
commit;
