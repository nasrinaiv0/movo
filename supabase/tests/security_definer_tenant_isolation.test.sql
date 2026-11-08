-- Local-only adversarial coverage for all twelve client-callable financial
-- SECURITY DEFINER RPCs. Run ONLY on a disposable local PostgreSQL fixture.
-- The entire test runs within one transaction and rolls back on success.
BEGIN;
SELECT set_config('request.jwt.claims','{"role":"service_role"}',false);

-- Prevent false positives if migrations or privileges drift.
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n
  FROM pg_proc p JOIN pg_namespace ns ON ns.oid=p.pronamespace
  WHERE ns.nspname='public' AND p.prosecdef
    AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
    AND p.proname = ANY(ARRAY[
      'allocate_goal_funds','allocate_plan_funds','delete_transaction_with_reversals',
      'ensure_bill_occurrences','record_bill_payment','record_loan_event',
      'record_receivable_event','release_goal_allocation','release_plan_funding_allocation',
      'restore_transaction_links','reverse_allocation_event','update_bill_occurrence'
    ]);
  IF n <> 12 THEN RAISE EXCEPTION 'Expected all 12 privileged finance functions, found %', n; END IF;
END $$;

INSERT INTO auth.users(id) VALUES
('00000000-0000-0000-0000-00000000a001'),
('00000000-0000-0000-0000-00000000b002');

INSERT INTO public.movo_plan_grants(user_id,trial_started_at,trial_expires_at) VALUES
('00000000-0000-0000-0000-00000000a001',now(),now()+interval '1 month'),
('00000000-0000-0000-0000-00000000b002',now(),now()+interval '1 month');

INSERT INTO public.financial_accounts(id,user_id,name,account_type,opening_balance) VALUES
('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000a001','Alice bank','bank',10000),
('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000b002','Bob bank','bank',10000);

INSERT INTO public.financial_loans(id,user_id,name,principal_amount,outstanding_principal,account_id) VALUES
('21000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000b002','Bob loan',500,500,'20000000-0000-0000-0000-000000000001');
INSERT INTO public.financial_receivables(id,user_id,name,opening_amount,outstanding_amount,account_id) VALUES
('22000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000b002','Bob receivable',500,500,'20000000-0000-0000-0000-000000000001');
INSERT INTO public.savings_goals(id,user_id,name,target_amount) VALUES
('23000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000b002','Bob goal',1000);
INSERT INTO public.financial_bills(id,user_id,name,amount,first_due_date) VALUES
('26000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000b002','Bob bill',90,current_date);
INSERT INTO public.bill_occurrences(id,user_id,bill_id,due_date,expected_amount) VALUES
('27000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000b002','26000000-0000-0000-0000-000000000001',current_date,90);
INSERT INTO public.transactions(id,user_id,account_id,transaction_type,amount,merchant,occurred_at) VALUES
('28000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000b002','20000000-0000-0000-0000-000000000001','expense',15,'Bob merchant',now());

INSERT INTO public.goal_allocations(id,user_id,goal_id,account_id,amount) VALUES
('24000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000b002','23000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',100);
INSERT INTO public.plan_funding_allocations(id,user_id,plan_id,plan_name,account_id,amount) VALUES
('25000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000b002','bob-plan','Bob plan','20000000-0000-0000-0000-000000000001',100);
INSERT INTO public.allocation_events(id,user_id,allocation_id,source_type,source_id,source_name,event_type,amount,account_id) VALUES
('29000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000b002','25000000-0000-0000-0000-000000000001','plan','bob-plan','Bob plan','allocated',100,'20000000-0000-0000-0000-000000000001');

SELECT set_config('request.jwt.claims','{"role":"authenticated"}',false);
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000a001',false);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  call_sql text;
  checks text[] := ARRAY[
    'SELECT public.allocate_goal_funds(''23000000-0000-0000-0000-000000000001'',10,''PHP'',''20000000-0000-0000-0000-000000000001'')',
    'SELECT public.allocate_plan_funds(''bob-plan'',''Bob plan'',10,''PHP'',''20000000-0000-0000-0000-000000000001'')',
    'SELECT public.delete_transaction_with_reversals(''28000000-0000-0000-0000-000000000001'')',
    'SELECT public.record_bill_payment(''27000000-0000-0000-0000-000000000001'',10,''unique-idempotency-a'', ''external'')',
    'SELECT public.record_loan_event(''21000000-0000-0000-0000-000000000001'',''fee'',10,''PHP'',''20000000-0000-0000-0000-000000000001'')',
    'SELECT public.record_receivable_event(''22000000-0000-0000-0000-000000000001'',''collected'',10,''PHP'',''20000000-0000-0000-0000-000000000001'')',
    'SELECT public.release_goal_allocation(''24000000-0000-0000-0000-000000000001'')',
    'SELECT public.release_plan_funding_allocation(''25000000-0000-0000-0000-000000000001'')',
    'SELECT public.restore_transaction_links(''28000000-0000-0000-0000-000000000001'',''28000000-0000-0000-0000-000000000001'')',
    'SELECT public.reverse_allocation_event(''29000000-0000-0000-0000-000000000001'')',
    'SELECT public.update_bill_occurrence(''27000000-0000-0000-0000-000000000001'',100)'
  ];
  sqlstate text; permitted integer := 0;
BEGIN
  FOREACH call_sql IN ARRAY checks LOOP
    BEGIN
      EXECUTE call_sql;
      permitted := permitted+1;
      RAISE EXCEPTION 'CROSS_TENANT_ALLOWED: %', call_sql;
    EXCEPTION
      WHEN SQLSTATE '42501' OR SQLSTATE 'P0002' OR SQLSTATE '22023' THEN NULL;
    END;
  END LOOP;
  IF permitted > 0 THEN RAISE EXCEPTION 'Unauthorized RPC calls were permitted: %', permitted; END IF;
  -- The only global-scope RPC must act only on the JWT owner.
  IF public.ensure_bill_occurrences(current_date + 30) <> 0 THEN
    RAISE EXCEPTION 'ensure_bill_occurrences generated non-owner rows';
  END IF;
END $$;

RESET ROLE;
-- A successful authorized operation proves denials above are not simply
-- broken RPCs or absent privileges; only the genuine owner can modify rows.
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000b002',false);
SET LOCAL ROLE authenticated;
DO $$
DECLARE
  item public.bill_occurrences;
  goal public.goal_allocations;
  plan public.plan_funding_allocations;
BEGIN
  SELECT * INTO item FROM public.update_bill_occurrence('27000000-0000-0000-0000-000000000001',100);
  IF item.actual_amount <> 100 THEN RAISE EXCEPTION 'Owner cannot update own bill'; END IF;
  SELECT * INTO goal FROM public.release_goal_allocation('24000000-0000-0000-0000-000000000001');
  IF goal.status <> 'released' THEN RAISE EXCEPTION 'Owner cannot release own goal allocation'; END IF;
  SELECT * INTO plan FROM public.release_plan_funding_allocation('25000000-0000-0000-0000-000000000001');
  IF plan.status <> 'released' THEN RAISE EXCEPTION 'Owner cannot release own plan allocation'; END IF;
END $$;
RESET ROLE;
-- Record contents must not have changed, including effects on child records.
DO $$
BEGIN
  IF (SELECT outstanding_principal FROM public.financial_loans WHERE id='21000000-0000-0000-0000-000000000001') <> 500 THEN
    RAISE EXCEPTION 'Foreign loan balance modified';
  END IF;
  IF (SELECT outstanding_amount FROM public.financial_receivables WHERE id='22000000-0000-0000-0000-000000000001') <> 500 THEN
    RAISE EXCEPTION 'Foreign receivable balance modified';
  END IF;
  IF (SELECT count(*) FROM public.transactions WHERE id='28000000-0000-0000-0000-000000000001') <> 1 THEN
    RAISE EXCEPTION 'Foreign transaction removed';
  END IF;
  IF (SELECT count(*) FROM public.bill_occurrences WHERE user_id='00000000-0000-0000-0000-00000000b002') <> 1 THEN
    RAISE EXCEPTION 'Foreign bill occurrences changed';
  END IF;
  -- The owner-only control operations above are expected to change statuses.
  IF (SELECT count(*) FROM public.goal_allocations WHERE id='24000000-0000-0000-0000-000000000001' AND status='released') <> 1 THEN
    RAISE EXCEPTION 'Owner goal allocation release failed';
  END IF;
  IF (SELECT count(*) FROM public.plan_funding_allocations WHERE id='25000000-0000-0000-0000-000000000001' AND status='released') <> 1 THEN
    RAISE EXCEPTION 'Owner plan allocation release failed';
  END IF;
END $$;

ROLLBACK;
