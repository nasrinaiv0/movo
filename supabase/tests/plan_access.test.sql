-- Disposable fixture tests; scripts/test-plan-migration.py creates the database.
select set_config('request.jwt.claim.role','service_role',false);
insert into auth.users values ('00000000-0000-0000-0000-000000000002',now(),null),('00000000-0000-0000-0000-000000000003',now(),null);
do $$ begin
  if public.movo_plan_status('00000000-0000-0000-0000-000000000001')->>'tier' <> 'pro' then raise exception 'Existing cloud user missing grace trial'; end if;
  if public.movo_plan_status('00000000-0000-0000-0000-000000000002')->>'tier' <> 'free' then raise exception 'Unclaimed trial granted access'; end if;
end $$;
select set_config('request.jwt.claim.role','authenticated',false);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
set role authenticated;
do $$ begin
  begin insert into public.financial_accounts(user_id) values(auth.uid()); raise exception 'Free write succeeded'; exception when insufficient_privilege then null; end;
  begin perform public.movo_plan_status('00000000-0000-0000-0000-000000000001'); raise exception 'Cross-user plan read'; exception when insufficient_privilege then null; end;
  begin insert into public.movo_plan_grants(user_id) values(auth.uid()); raise exception 'Client forged grant'; exception when insufficient_privilege then null; end;
end $$;
select public.claim_movo_trial();
do $$ declare first_expiry text; begin
  first_expiry:=public.movo_plan_status()->>'expiresAt';
  perform public.claim_movo_trial();
  if first_expiry is distinct from (public.movo_plan_status()->>'expiresAt') then raise exception 'Trial extended on replay'; end if;
  insert into public.financial_accounts(user_id) values(auth.uid());
  begin insert into public.transactions(user_id,source) values(auth.uid(),'applepay'); raise exception 'Pro bypassed automation API'; exception when insufficient_privilege then null; end;
  begin insert into public.scheduled_transactions(user_id) values(auth.uid()); raise exception 'Pro used Pro+ automation'; exception when insufficient_privilege then null; end;
  begin insert into public.movo_store_entitlements(user_id) values(auth.uid()); raise exception 'Forged store entitlement'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.role','service_role',false);
update public.movo_plan_grants set trial_expires_at=now()-interval '1 second' where user_id='00000000-0000-0000-0000-000000000002';
select set_config('request.jwt.claim.role','authenticated',false);
set role authenticated;
do $$ begin
  if (select count(*) from public.financial_accounts) <> 1 then raise exception 'Read-only data unavailable or tenant leak'; end if;
  begin update public.financial_accounts set id=gen_random_uuid(); raise exception 'Expired trial wrote cloud'; exception when insufficient_privilege then null; end;
  begin delete from public.financial_accounts; raise exception 'Expired trial deleted finance'; exception when insufficient_privilege then null; end;
  begin insert into storage.objects(bucket_id,owner_id) values('movo-receipts',auth.uid()::text); raise exception 'Free storage upload'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.role','service_role',false);
insert into public.movo_store_entitlements(user_id,platform,product_id,tier,store_subscription_key,store_transaction_id,status,expires_at,environment)
values ('00000000-0000-0000-0000-000000000002','apple','com.nasrinai.movo.proplus.monthly','pro_plus','test-sub','test-tx','active',now()+interval '1 month','production');
select set_config('request.jwt.claim.role','authenticated',false);
set role authenticated;
insert into public.scheduled_transactions(user_id) values(auth.uid());
reset role;
select set_config('request.jwt.claim.role','service_role',false);
update public.movo_store_entitlements set status='revoked' where store_subscription_key='test-sub';
do $$ begin
  if public.movo_plan_status('00000000-0000-0000-0000-000000000002')->>'tier' <> 'free' then raise exception 'Refund did not revoke access'; end if;
end $$;
-- Ten distinct actual purchasers, exactly one three-month award.
do $$ declare uid uuid; ent uuid; code text; before_expiry timestamptz; i int; begin
  select referral_code into code from public.movo_plan_grants where user_id='00000000-0000-0000-0000-000000000001';
  for i in 1..10 loop
    uid:=gen_random_uuid();
    insert into auth.users values(uid,now(),null);
    insert into public.movo_plan_grants(user_id,referred_by) values(uid,'00000000-0000-0000-0000-000000000001');
    insert into public.movo_store_entitlements(user_id,platform,product_id,tier,store_subscription_key,store_transaction_id,status,expires_at,environment)
    values(uid,'apple','com.nasrinai.movo.pro.monthly','pro','ref-sub-'||i,'ref-tx-'||i,'active',now()+interval '1 month','production') returning id into ent;
    perform public.record_movo_paid_referral(ent,uid);
    if i<10 and exists(select 1 from public.movo_plan_grants where user_id='00000000-0000-0000-0000-000000000001' and reward_started_at is not null) then raise exception 'Premature referral award'; end if;
  end loop;
  select reward_expires_at into before_expiry from public.movo_plan_grants where user_id='00000000-0000-0000-0000-000000000001';
  if before_expiry is null then raise exception 'Missing 10-referral reward'; end if;
  perform public.record_movo_paid_referral(ent,uid);
  if before_expiry <> (select reward_expires_at from public.movo_plan_grants where user_id='00000000-0000-0000-0000-000000000001') then raise exception 'Duplicate reward'; end if;
  update public.movo_plan_grants set trial_expires_at=now()-interval '1 day',reward_started_at=now()-interval '1 day' where user_id='00000000-0000-0000-0000-000000000001';
  if public.movo_plan_status('00000000-0000-0000-0000-000000000001')->>'source' <> 'referral' then raise exception 'Reward inaccessible'; end if;
  update public.movo_store_entitlements set status='revoked' where id=ent;
  if public.movo_plan_status('00000000-0000-0000-0000-000000000001')->>'tier' <> 'free' then raise exception 'Refunded referral still qualifies'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false);
select set_config('request.jwt.claim.role','authenticated',false);
set role authenticated;
do $$ begin
  begin perform public.claim_movo_trial('ffffffffffffffffffffffff'); raise exception 'Accepted fake referral'; exception when raise_exception then if SQLERRM <> 'invalid_referral_code' then raise; end if; end;
end $$;
reset role;
select 'PASS: grace, expiry, read-only, RLS, forged grants, automation, refund and referral replay checks';
