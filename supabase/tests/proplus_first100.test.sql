-- Local disposable PostgreSQL fixture only. Never apply this test SQL to production.
reset role;
select pg_catalog.set_config('request.jwt.claim.role', 'service_role', false);

do $$
begin
  if (select enabled from public.movo_proplus_launch_control where id='first100_proplus') then
    raise exception 'Founder offer must be disabled by default';
  end if;
  if exists(select 1 from public.movo_proplus_launch_awards) then
    raise exception 'No initial founder grants allowed';
  end if;
  if has_table_privilege('authenticated','public.movo_proplus_launch_awards','INSERT')
     or has_table_privilege('authenticated','public.movo_proplus_launch_control','UPDATE')
     or has_function_privilege('authenticated',
      'public.movo_record_verified_founder_offer(uuid,text,timestamptz,timestamptz)','EXECUTE') then
    raise exception 'Client can forge a founder reward';
  end if;
end $$;

-- One verified user before enabled does not consume the launch allocation.
insert into auth.users(id,email_confirmed_at)
 values('00000000-0000-0000-0000-000000000099',now());
insert into public.movo_store_entitlements
(user_id,platform,product_id,tier,store_subscription_key,store_transaction_id,status,expires_at,environment)
values('00000000-0000-0000-0000-000000000099','apple','proplus.annual','pro_plus',
   'early-before-launch','early-before-launch','active',now()+interval '1 year','production');
do $$ begin
  if exists(select 1 from public.movo_proplus_launch_awards) then
    raise exception 'Founder allocation enabled without approval';
  end if;
end $$;

update public.movo_proplus_launch_control
  set enabled=true, enabled_at=now() where id='first100_proplus';
-- Renewals of subscriptions created before launch do not steal founder spots.
update public.movo_store_entitlements set status='active'
  where store_subscription_key='early-before-launch';
do $$ begin
  if exists(select 1 from public.movo_proplus_launch_awards) then
    raise exception 'Existing pre-launch subscriber took a new-customer launch slot';
  end if;
end $$;

-- 103 distinct users race for only 100 slots; the trigger must hard-cap them.
insert into auth.users(id,email_confirmed_at)
select ('00000000-0000-0000-0000-'||pg_catalog.lpad(i::text,12,'0'))::uuid,now()
from pg_catalog.generate_series(101,203) i;
insert into public.movo_store_entitlements
(user_id,platform,product_id,tier,store_subscription_key,store_transaction_id,status,expires_at,environment)
select ('00000000-0000-0000-0000-'||pg_catalog.lpad(i::text,12,'0'))::uuid,
 'google','proplus.annual','pro_plus','sub-'||i,'tx-'||i,'active',
 now()+interval '1 year','production'
from pg_catalog.generate_series(101,203) i;

do $$
begin
  if (select count(*) from public.movo_proplus_launch_awards) <> 100
     or (select min(slot) from public.movo_proplus_launch_awards) <> 1
     or (select max(slot) from public.movo_proplus_launch_awards) <> 100 then
    raise exception 'Founder slot cap or ordering broken';
  end if;
  if (select count(distinct user_id) from public.movo_proplus_launch_awards) <> 100 then
    raise exception 'One person acquired multiple rewards';
  end if;
end $$;

-- Repeated store update cannot create another slot for the same purchaser.
update public.movo_store_entitlements set status='active' where store_subscription_key='sub-101';
do $$ begin
  if (select count(*) from public.movo_proplus_launch_awards) <> 100 then
    raise exception 'Retry allocated another founder slot';
  end if;
end $$;

-- Empty founder reservation never unlocks a free year.
update public.movo_store_entitlements set status='expired' where store_subscription_key='sub-101';
do $$ begin
  if (public.movo_plan_status('00000000-0000-0000-0000-000000000101')->>'tier') <> 'free' then
    raise exception 'Unredeemed founder reservation granted paid feature';
  end if;
end $$;

-- Simulated externally VERIFIED store redemption is service-only.
select public.movo_record_verified_founder_offer(
  '00000000-0000-0000-0000-000000000101','store-verified-offer-101',
  now(),now()+interval '1 year');
do $$ begin
  if (public.movo_plan_status('00000000-0000-0000-0000-000000000101')->>'tier') <> 'pro_plus'
    or (public.movo_plan_status('00000000-0000-0000-0000-000000000101')->>'source') <> 'founder100' then
    raise exception 'Confirmed founder year not honored';
  end if;
end $$;

-- Direct authenticated users can view their own reservation only.
select pg_catalog.set_config('request.jwt.claim.role','authenticated',false);
select pg_catalog.set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000101',false);
set role authenticated;
do $$ begin
  if (select count(*) from public.movo_proplus_launch_awards) <> 1 then
    raise exception 'Another customer founder record was exposed';
  end if;
  begin
    perform public.movo_record_verified_founder_offer(
      '00000000-0000-0000-0000-000000000102','user-fake-offer',now(),now()+interval '1 year');
    raise exception 'Authenticated customer forged reward';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select pg_catalog.set_config('request.jwt.claim.role','service_role',false);

-- Store refund revokes bonus without recycling slots.
update public.movo_store_entitlements
 set status='revoked' where store_subscription_key='sub-101';
do $$ begin
  if (select status from public.movo_proplus_launch_awards
       where user_id='00000000-0000-0000-0000-000000000101') <> 'revoked'
      or public.movo_plan_status('00000000-0000-0000-0000-000000000101')->>'tier' <> 'free'
      or (select count(*) from public.movo_proplus_launch_awards) <> 100 then
    raise exception 'Store refund failed to revoke promotional entitlement safely';
  end if;
end $$;
