\set ON_ERROR_STOP on
insert into auth.users(id) values('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');
set role service_role;
do $$
declare u uuid:='11111111-1111-4111-8111-111111111111'; other_user uuid:='22222222-2222-4222-8222-222222222222';
 v jsonb; f uuid; r jsonb; oldf uuid; key text:=repeat('a',64); linked text:=repeat('b',64); n integer;
begin
 v:=jsonb_build_object('platform','google','storeSubscriptionKey',key,'purchaseTokenHash',key,'storeTransactionId','order1',
 'productId','com.nasrinai.movo.pro.monthly','tier','pro','status','active','environment','production','eventAt',now(),
 'expiresAt',now()+interval '30 days','paidVerified',false,'needsAcknowledgement',false);
 f:=public.movo_iap_acquire('google',key);
 begin perform public.movo_iap_acquire('google',key); raise exception 'TEST: concurrent lease accepted'; exception when others then if sqlerrm<>'iap_busy' then raise; end if; end;
 r:=public.movo_iap_commit(u,v,f,'first');
 if r->>'status'<>'active' then raise exception 'TEST: active missing'; end if;
 f:=public.movo_iap_acquire('google',key);
 r:=public.movo_iap_commit(u,v,f,'first');
 if r->>'duplicate'<>'true' then raise exception 'TEST: duplicate accepted'; end if;
 f:=public.movo_iap_acquire('google',key);
 begin perform public.movo_iap_commit(other_user,v,f,null); raise exception 'TEST: receipt transferred'; exception when others then if sqlerrm<>'purchase_already_linked' then raise; end if; end;
 delete from public.movo_iap_leases;
 -- A shorter expiry must not discard a revocation.
 f:=public.movo_iap_acquire('google',key);
 r:=public.movo_iap_commit(u,v||jsonb_build_object('status','revoked','expiresAt',now()),f,'refund');
 if r->>'status'<>'revoked' then raise exception 'TEST: refund ignored'; end if;
 -- A new order ID and fresh timestamp cannot revive a voided Google token.
 f:=public.movo_iap_acquire('google',key);
 r:=public.movo_iap_commit(u,v||jsonb_build_object('storeTransactionId','order2','eventAt',now()+interval '1 second'),f,null);
 if r->>'status'<>'revoked' then raise exception 'TEST: revoked token resurrected'; end if;
 -- Expired worker loses its fencing token after another worker takes ownership.
 oldf:=public.movo_iap_acquire('google',key);
 update public.movo_iap_leases set expires_at=now()-interval '1 second';
 f:=public.movo_iap_acquire('google',key);
 begin perform public.movo_iap_commit(u,v,oldf,null); raise exception 'TEST: expired fence accepted'; exception when others then if sqlerrm<>'iap_lease_expired' then raise; end if; end;
 delete from public.movo_iap_leases;
 -- Upgrade invalidates predecessor even if it has never reached this backend.
 v:=v||jsonb_build_object('storeSubscriptionKey',linked,'purchaseTokenHash',linked,'storeTransactionId','replacement','linkedPurchaseTokenHash',repeat('c',64));
 f:=public.movo_iap_acquire('google',linked); perform public.movo_iap_commit(u,v,f,'upgrade');
 if not exists(select 1 from public.movo_iap_revocations where identity_key=repeat('c',64)) then raise exception 'TEST: missing predecessor tombstone'; end if;
 -- Atomic rollback: a failure must not mark the event processed.
 f:=public.movo_iap_acquire('google',linked);
 begin perform public.movo_iap_commit(u,v||'{"environment":"sandbox"}',f,'bad-env'); raise exception 'TEST: sandbox accepted'; exception when others then if sqlerrm<>'test_account_not_enabled' then raise; end if; end;
 if exists(select 1 from public.movo_iap_events where event_id='bad-env') then raise exception 'TEST: event survived rollback'; end if;

 -- Synthetic license-test account: service-role only; does not count as revenue.
 insert into public.movo_store_test_users(user_id) values(u);
 v:=jsonb_build_object('platform','google','storeSubscriptionKey',repeat('d',64),'purchaseTokenHash',repeat('d',64),
 'storeTransactionId','license-test-order','productId','com.nasrinai.movo.proplus.monthly','tier','pro_plus',
 'status','active','environment','sandbox','eventAt',now(),'expiresAt',now()+interval '1 hour',
 'paidVerified',true,'needsAcknowledgement',false);
 f:=public.movo_iap_acquire('google',repeat('d',64)); r:=public.movo_iap_commit(u,v,f,'license-verified');
 if r->>'environment'<>'sandbox' or r->>'status'<>'active' then raise exception 'TEST: sandbox receipt not stored'; end if;
 if not exists(select 1 from public.movo_store_entitlements where store_subscription_key=repeat('d',64)
    and environment='sandbox' and not paid_verified) then raise exception 'TEST: sandbox credited as revenue'; end if;
 if public.movo_plan_status(u)->>'tier'<>'pro_plus' then raise exception 'TEST: allowlisted sandbox tier not recognized'; end if;
 f:=public.movo_iap_acquire('google',repeat('a',64));
 begin perform public.movo_iap_commit(u,v||jsonb_build_object('storeSubscriptionKey',repeat('a',64),
   'purchaseTokenHash',repeat('a',64)),f,'cross-env'); raise exception 'TEST: production token downgraded';
 exception when others then if sqlerrm<>'invalid_store_state' then raise; end if; end;
 delete from public.movo_iap_leases;
 delete from public.movo_store_test_users where user_id=u;
 if public.movo_plan_status(u)->>'tier'<>'pro' then raise exception 'TEST: sandbox privilege survived allowlist removal'; end if;

 -- Apple revocation before registration survives replay; a genuinely later purchase can succeed.
 delete from public.movo_iap_leases;
 v:=jsonb_build_object('platform','apple','storeSubscriptionKey','apple-original','originalTransactionId','apple-original',
 'storeTransactionId','apple-tx-1','productId','com.nasrinai.movo.pro.monthly','tier','pro','status','revoked',
 'environment','production','eventAt',now(),'purchasedAt',now()-interval '10 days','expiresAt',now()+interval '20 days','paidVerified',false);
 f:=public.movo_iap_acquire('apple','apple-original');
 perform public.movo_iap_commit(null,v,f,'unknown-refund');
 f:=public.movo_iap_acquire('apple','apple-original');
 r:=public.movo_iap_commit(u,v||'{"status":"active"}',f,null);
 if r->>'status'<>'revoked' then raise exception 'TEST: unknown-owner refund lost'; end if;
 v:=v||jsonb_build_object('storeTransactionId','apple-tx-2','status','active','purchasedAt',now(),'expiresAt',now()+interval '30 days');
 f:=public.movo_iap_acquire('apple','apple-original'); r:=public.movo_iap_commit(u,v,f,'new-purchase');
 if r->>'status'<>'active' then raise exception 'TEST: legitimate new Apple transaction rejected'; end if;
 f:=public.movo_iap_acquire('apple','apple-original');
 r:=public.movo_iap_commit(u,v||jsonb_build_object('storeTransactionId','apple-tx-1','status','revoked','purchasedAt',now()-interval '10 days'),f,'delayed-old-refund');
 if r->>'status'<>'active' then raise exception 'TEST: old refund revoked newer purchase'; end if;
 f:=public.movo_iap_acquire('apple','apple-original');
 r:=public.movo_iap_commit(u,v||jsonb_build_object('status','expired','eventAt',now()+interval '1 second'),f,'expired');
 f:=public.movo_iap_acquire('apple','apple-original'); r:=public.movo_iap_commit(u,v,f,'delayed-renewal');
 if r->>'status'<>'expired' then raise exception 'TEST: out-of-order renewal resurrected expiry'; end if;

 -- Preserve PR258: award and reverse paid referral points in the entitlement transaction.
 insert into public.movo_referral_claims(referrer_id,referred_id,native_verified_at) values(other_user,u,now());
 v:=v||jsonb_build_object('storeTransactionId','apple-tx-3','status','active','purchasedAt',now()+interval '1 second',
 'eventAt',now()+interval '2 seconds','expiresAt',now()+interval '31 days','paidVerified',true,'referralPointsEnabled',true);
 f:=public.movo_iap_acquire('apple','apple-original'); perform public.movo_iap_commit(u,v,f,'points-purchase');
 if (select coalesce(sum(points),0) from public.movo_referral_points_ledger where referred_id=u)<>100 then raise exception 'TEST: referral points lost'; end if;
 f:=public.movo_iap_acquire('apple','apple-original'); perform public.movo_iap_commit(u,v||'{"status":"revoked","paidVerified":false}',f,'points-refund');
 if (select coalesce(sum(points),0) from public.movo_referral_points_ledger where referred_id=u)<>0 then raise exception 'TEST: referral reversal lost'; end if;
 insert into public.movo_referral_point_redemptions(user_id,months,points,starts_at,expires_at) values(other_user,1,500,now()-interval '1 second',now()+interval '1 month');
 if public.movo_plan_status(other_user)->>'source'<>'points' then raise exception 'TEST: redeemed points plan lost'; end if;
 for n in 1..10 loop if not public.movo_iap_rate_limit(u) then raise exception 'TEST: early rate limit'; end if; end loop;
 if public.movo_iap_rate_limit(u) then raise exception 'TEST: rate limit bypass'; end if;
 if has_function_privilege('authenticated','public.movo_iap_commit(uuid,jsonb,uuid,text)','EXECUTE') then raise exception 'TEST: public RPC'; end if;
 raise notice 'PASS: leases, fencing, replay, revocation, linked tokens, atomic dedup, environment isolation, rate limit, grants';
end $$;
