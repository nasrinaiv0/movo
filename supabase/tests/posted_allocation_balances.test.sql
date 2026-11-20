begin;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
insert into auth.users(id) values ('00000000-0000-0000-0000-00000000e001');
insert into public.movo_manual_plan_grants(user_id,tier,expires_at,reason) values
 ('00000000-0000-0000-0000-00000000e001','pro',now()+interval '1 day','isolated pending test');
insert into public.financial_accounts(id,user_id,name,account_type,opening_balance) values
 ('10000000-0000-0000-0000-00000000e001','00000000-0000-0000-0000-00000000e001','Bank','bank',100),
 ('10000000-0000-0000-0000-00000000e002','00000000-0000-0000-0000-00000000e001','Empty bank','bank',0);
insert into public.savings_goals(id,user_id,name,target_amount) values
 ('30000000-0000-0000-0000-00000000e001','00000000-0000-0000-0000-00000000e001','Goal',1000);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000e001',true);
select set_config('request.jwt.claims','{"role":"authenticated"}',true);
set local role authenticated;
do $$
declare
 bank uuid := '10000000-0000-0000-0000-00000000e001';
 empty_bank uuid := '10000000-0000-0000-0000-00000000e002';
 goal uuid := '30000000-0000-0000-0000-00000000e001';
 pending_id uuid := gen_random_uuid();
 rejected boolean; allocation public.goal_allocations; plan public.plan_funding_allocations; rev timestamptz;
begin
 -- Pending income and incoming transfers cannot fund reservations.
 insert into public.transactions(user_id,account_id,transfer_to_account_id,transaction_type,amount,merchant,occurred_at,is_pending) values
  (auth.uid(),empty_bank,null,'income',1000,'Pending income',now(),true),
  (auth.uid(),bank,empty_bank,'transfer',1000,'Pending transfer',now(),true);
 rejected := false;
 begin perform public.allocate_goal_funds(goal,1,'PHP',empty_bank);
 exception when sqlstate '22023' then
  if sqlerrm<>'insufficient_available_funds' then raise; end if; rejected := true;
 end;
 if not rejected then raise exception 'Goal reserved pending funds'; end if;
 rejected := false;
 begin perform public.allocate_plan_funds('plan','Plan',1,'PHP',empty_bank);
 exception when sqlstate '22023' then
  if sqlerrm<>'insufficient_available_funds' then raise; end if; rejected := true;
 end;
 if not rejected then raise exception 'Plan reserved pending funds'; end if;
 allocation := public.allocate_goal_funds(goal,60,'PHP',bank);
 -- A pending expense, outgoing transfer or foreign-currency record cannot release
 -- existing reservations or prevent allocating the remaining posted cash.
 insert into public.transactions(id,user_id,account_id,transaction_type,amount,merchant,occurred_at,is_pending) values
  (pending_id,auth.uid(),bank,'expense',80,'Pending expense',now(),true);
 insert into public.transactions(user_id,account_id,transaction_type,amount,currency,merchant,occurred_at,is_pending) values
  (auth.uid(),bank,'income',500,'USD','Pending foreign income',now(),true);
 plan := public.allocate_plan_funds('plan','Plan',40,'PHP',bank);
 if (select amount from public.goal_allocations where id=allocation.id)<>60
  or (select status from public.goal_allocations where id=allocation.id)<>'allocated'
  or (select amount from public.plan_funding_allocations where id=plan.id)<>40 then
  raise exception 'Pending transaction changed reservations'; end if;
 -- Posting the expense must release the newest reservations down to real cash (20).
 select updated_at into rev from public.transactions where id=pending_id;
 perform public.apply_movo_sync_operation(gen_random_uuid(),'transactions','update',pending_id,
  '{"is_pending":false}',rev,0);
 if coalesce((select sum(amount) from public.goal_allocations where status='allocated'),0)
  + coalesce((select sum(amount) from public.plan_funding_allocations where status='allocated'),0)<>20 then
  raise exception 'Posted expense did not reconcile reservations to posted balance'; end if;
 -- The goal path must also ignore pending foreign-currency records.
 perform public.release_plan_funding_allocation(id) from public.plan_funding_allocations where status='allocated';
 perform public.release_goal_allocation(id) from public.goal_allocations where status='allocated';
 perform public.allocate_goal_funds(goal,20,'PHP',bank);
end $$;
reset role;
rollback;
