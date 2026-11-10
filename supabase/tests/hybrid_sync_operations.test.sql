begin;
insert into auth.users(id,email) values
 ('123e4567-e89b-42d3-a456-426614174000','sync-a@example.test'),
 ('123e4567-e89b-42d3-a456-426614174001','sync-b@example.test');
insert into public.movo_manual_plan_grants(user_id,tier,expires_at,reason) values
 ('123e4567-e89b-42d3-a456-426614174000','pro',now()+interval '1 day','isolated test'),
 ('123e4567-e89b-42d3-a456-426614174001','pro',now()+interval '1 day','isolated test');
select set_config('request.jwt.claim.sub','123e4567-e89b-42d3-a456-426614174001',true);
select set_config('request.jwt.claims','{"role":"authenticated"}',true);
insert into public.financial_accounts(id,user_id,name,account_type,currency,opening_balance)
 values('123e4567-e89b-42d3-a456-426614174002','123e4567-e89b-42d3-a456-426614174001','Other bank','bank','PHP',0);
select set_config('request.jwt.claim.sub','123e4567-e89b-42d3-a456-426614174000',true);
set local role authenticated;
do $$
declare
 owner_id uuid := '123e4567-e89b-42d3-a456-426614174000';
 account_id uuid := '123e4567-e89b-42d3-a456-426614174003';
 tx_id uuid := '123e4567-e89b-42d3-a456-426614174004';
 op_id uuid := '123e4567-e89b-42d3-a456-426614174005';
 response jsonb; retried jsonb; tx_response jsonb; rev timestamptz; rejected boolean;
 loan_id uuid := gen_random_uuid();
 event_id uuid;
 payload jsonb := '{"name":"Bank","account_type":"bank","currency":"PHP","opening_balance":1000}';
begin
 response := public.apply_movo_sync_operation(op_id,'financial_accounts','create',account_id,payload,null,0);
 retried := public.apply_movo_sync_operation(op_id,'financial_accounts','create',account_id,payload,null,0);
 if response is distinct from retried then raise exception 'Replay changed acknowledgement'; end if;
 if (select count(*) from public.financial_accounts where id=account_id)<>1 then raise exception 'Duplicate account'; end if;
 rejected:=false;
 begin perform public.apply_movo_sync_operation(op_id,'financial_accounts','create',account_id,payload||'{"name":"Collision"}',null,0);
 exception when sqlstate '22023' then rejected:=true; end;
 if not rejected then raise exception 'Immutable operation collision accepted'; end if;
 rejected:=false;
 begin insert into public.movo_sync_operations values(owner_id,gen_random_uuid(),'{}','{}',now());
 exception when insufficient_privilege then rejected:=true; end;
 if not rejected then raise exception 'Client forged acknowledgement'; end if;
 rev := (response->'record'->>'updated_at')::timestamptz;
 perform public.apply_movo_sync_operation(gen_random_uuid(),'financial_accounts','update',account_id,'{"name":"Updated"}',rev,1);
 rejected:=false;
 begin perform public.apply_movo_sync_operation(gen_random_uuid(),'financial_accounts','update',account_id,'{"name":"Stale"}',rev,1);
 exception when serialization_failure then rejected:=true; end;
 if not rejected then raise exception 'Stale account CAS accepted'; end if;
 if public.apply_movo_sync_operation(op_id,'financial_accounts','create',account_id,payload,null,0) is distinct from response then
  raise exception 'Later edit changed durable ACK'; end if;
 payload := jsonb_build_object('account_id',account_id,'transaction_type','expense','amount',10.25,'merchant','Coffee','currency','PHP','occurred_at',now());
 tx_response := public.apply_movo_sync_operation(gen_random_uuid(),'transactions','create',tx_id,payload,null,0);
 rejected:=false;
 begin perform public.apply_movo_sync_operation(gen_random_uuid(),'transactions','create',gen_random_uuid(),payload||'{"amount":0.001}',null,0);
 exception when sqlstate '22023' then rejected:=true; end;
 if not rejected then raise exception 'Fractional cents accepted'; end if;
 rejected:=false;
 begin perform public.apply_movo_sync_operation(gen_random_uuid(),'transactions','create',gen_random_uuid(),payload||'{"account_id":"123e4567-e89b-42d3-a456-426614174002"}',null,0);
 exception when insufficient_privilege then rejected:=true; end;
 if not rejected then raise exception 'Cross-tenant account accepted'; end if;
 rejected:=false;
 begin perform public.apply_movo_sync_operation(gen_random_uuid(),'transactions','create',gen_random_uuid(),payload||'{"user_id":"123e4567-e89b-42d3-a456-426614174001"}',null,0);
 exception when insufficient_privilege then rejected:=true; end;
 if not rejected then raise exception 'Forged owner accepted'; end if;
 insert into public.financial_loans(id,user_id,name,currency,opening_principal,principal_amount,outstanding_principal)
  values(loan_id,owner_id,'Loan','PHP',100,100,100);
 select id into event_id from public.record_loan_event(loan_id,'principal_payment',10.25,'PHP',account_id,tx_id);
 if (select outstanding_principal from public.financial_loans where id=loan_id)<>89.75 then raise exception 'Loan payment not posted'; end if;
 rejected:=false;
 begin perform public.apply_movo_sync_operation(gen_random_uuid(),'transactions','update',tx_id,'{"amount":20}',(tx_response->'record'->>'updated_at')::timestamptz,1);
 exception when sqlstate '22023' then rejected:=true; end;
 if not rejected then raise exception 'Linked payment value changed without reversal'; end if;
 rev := (tx_response->'record'->>'updated_at')::timestamptz;
 rejected:=false;
 begin perform public.apply_movo_sync_operation(gen_random_uuid(),'transactions','delete',tx_id,null,rev-interval '1 second',1);
 exception when serialization_failure then rejected:=true; end;
 if not rejected or not exists(select 1 from public.transactions where id=tx_id) then raise exception 'Stale deletion removed transaction'; end if;
 op_id := gen_random_uuid();
 response := public.apply_movo_sync_operation(op_id,'transactions','delete',tx_id,null,rev,1);
 retried := public.apply_movo_sync_operation(op_id,'transactions','delete',tx_id,null,rev,1);
 if response is distinct from retried or exists(select 1 from public.transactions where id=tx_id) then raise exception 'Deletion replay incorrect'; end if;
 if (select outstanding_principal from public.financial_loans where id=loan_id)<>100 then raise exception 'Deletion replay reversed principal incorrectly'; end if;
 if exists(select 1 from public.accounting_postings where source_id=event_id) then raise exception 'Reversed payment left cash posting'; end if;
 if not exists(select 1 from public.loan_events where id=event_id and reversed_at is not null) then raise exception 'Payment audit lost'; end if;
 -- Owner B must not see A's durable acknowledgements.
 perform set_config('request.jwt.claim.sub','123e4567-e89b-42d3-a456-426614174001',true);
 if exists(select 1 from public.movo_sync_operations where user_id=owner_id) then raise exception 'ACK RLS leaked tenant'; end if;
 rejected:=false;
 begin perform public.apply_movo_sync_operation(gen_random_uuid(),'financial_accounts','update',account_id,'{"name":"Stolen"}',rev,0);
 exception when serialization_failure then rejected:=true; end;
 if not rejected then raise exception 'Cross-tenant update accepted'; end if;
end $$;
reset role;
-- Expired plan and missing auth fail closed.
update public.movo_manual_plan_grants set expires_at=now()-interval '1 day' where user_id='123e4567-e89b-42d3-a456-426614174001';
set local role authenticated;
do $$ declare rejected boolean:=false; begin
 begin perform public.apply_movo_sync_operation(gen_random_uuid(),'financial_accounts','create',gen_random_uuid(),'{"name":"Denied","account_type":"bank"}',null,0);
 exception when insufficient_privilege then rejected:=true; end;
 if not rejected then raise exception 'Expired entitlement accepted'; end if;
 perform set_config('request.jwt.claim.sub','',true);rejected:=false;
 begin perform public.apply_movo_sync_operation(gen_random_uuid(),'financial_accounts','create',gen_random_uuid(),'{"name":"Denied","account_type":"bank"}',null,0);
 exception when insufficient_privilege then rejected:=true; end;
 if not rejected then raise exception 'Missing identity accepted'; end if;
end $$;
reset role;
rollback;
