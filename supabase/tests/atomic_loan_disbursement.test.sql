
-- Atomic create and replay, including no side effects after a rejected request.
begin;
select set_config('request.jwt.claims','{"role":"service_role"}',false);
insert into auth.users(id) values ('00000000-0000-0000-0000-00000000d101'),('00000000-0000-0000-0000-00000000d102');
insert into public.financial_accounts(id,user_id,name,account_type,currency,opening_balance) values
 ('10000000-0000-0000-0000-00000000d101','00000000-0000-0000-0000-00000000d101','Receiving','bank','PHP',1000),
 ('20000000-0000-0000-0000-00000000d101','00000000-0000-0000-0000-00000000d101','Card','card','PHP',-100),
 ('30000000-0000-0000-0000-00000000d101','00000000-0000-0000-0000-00000000d101','Foreign','bank','USD',1000),
 ('40000000-0000-0000-0000-00000000d102','00000000-0000-0000-0000-00000000d102','Other','bank','PHP',1000);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000d101',false);
do $test$
declare
  u uuid := '00000000-0000-0000-0000-00000000d101';
  k uuid := '50000000-0000-0000-0000-00000000d101';
  bank uuid := '10000000-0000-0000-0000-00000000d101';
  card uuid := '20000000-0000-0000-0000-00000000d101';
  a public.financial_loans;
  b public.financial_loans;
begin
  a := public.create_loan_atomic(k,u,'Loan','loan',500,'PHP',true,bank,card,null,0,'[]',null,null);
  b := public.create_loan_atomic(k,u,'Loan','loan',500,'PHP',true,bank,card,null,0,'[]',null,null);
  if a.id is distinct from b.id or a.outstanding_principal is distinct from 500 then raise exception 'bad replay or stale balance'; end if;
  begin
    perform public.create_loan_atomic(k,u,'Loan','loan',501,'PHP',true,bank,card,null,0,'[]',null,null);
    raise exception 'changed payload accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.create_loan_atomic('60000000-0000-0000-0000-00000000d101',u,'Debt','debt',300,'PHP',true,'40000000-0000-0000-0000-00000000d102',null,null,0,'[]',null,null);
    raise exception 'cross owner accepted';
  exception when insufficient_privilege then null; end;
  begin
    perform public.create_loan_atomic('60000000-0000-0000-0000-00000000d101',u,'Debt','debt',300,'PHP',true,'30000000-0000-0000-0000-00000000d101',null,null,0,'[]',null,null);
    raise exception 'foreign currency accepted';
  exception when insufficient_privilege then null; end;
  b := public.create_loan_atomic('60000000-0000-0000-0000-00000000d101',u,'Debt','debt',300,'PHP',true,bank,null,null,0,'[]',null,null);
  if b.outstanding_principal is distinct from 300 then raise exception 'bad debt principal'; end if;
  b := public.create_loan_atomic('70000000-0000-0000-0000-00000000d101',u,'Historical','debt',200,'PHP',false,null,card,null,0,'[]',null,null);
  if b.opening_principal is distinct from 200 or b.outstanding_principal is distinct from 200 then raise exception 'bad historical debt'; end if;
  if (select count(*) from public.financial_loans where user_id=u) <> 3 then raise exception 'duplicate or orphan liability'; end if;
  if (select count(*) from public.loan_creation_requests where user_id=u) <> 3 then raise exception 'failed request retained or replay duplicated'; end if;
  if (select count(*) from public.accounting_postings where user_id=u) <> 2 or
     (select sum(signed_amount) from public.accounting_postings where user_id=u and account_id=bank) is distinct from 800 then raise exception 'bad proceeds'; end if;
  if exists(select 1 from public.accounting_postings where account_id=card) then raise exception 'payment preference posted cash'; end if;
  if exists(select 1 from public.transactions where user_id=u) then raise exception 'loan counted as transaction income'; end if;
  if has_table_privilege('authenticated','public.loan_creation_requests','SELECT') or has_table_privilege('authenticated','public.loan_creation_requests','INSERT')
    or has_function_privilege('anon','public.create_loan_atomic(uuid,uuid,text,text,numeric,text,boolean,uuid,uuid,text,numeric,jsonb,date,text)','EXECUTE')
  then raise exception 'request receipt access leak'; end if;
end
$test$;
rollback;
