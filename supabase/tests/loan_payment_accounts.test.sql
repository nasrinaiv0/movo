begin;
select set_config('request.jwt.claims','{"role":"service_role"}',false);
insert into auth.users(id) values ('00000000-0000-0000-0000-00000000c101'), ('00000000-0000-0000-0000-00000000c102');
insert into public.financial_accounts(id,user_id,name,account_type,currency,opening_balance) values
 ('10000000-0000-0000-0000-00000000c101','00000000-0000-0000-0000-00000000c101','Receiving bank','bank','PHP',1000),
 ('20000000-0000-0000-0000-00000000c101','00000000-0000-0000-0000-00000000c101','Payment card','card','PHP',-100),
 ('30000000-0000-0000-0000-00000000c101','00000000-0000-0000-0000-00000000c101','Foreign bank','bank','USD',1000),
 ('40000000-0000-0000-0000-00000000c102','00000000-0000-0000-0000-00000000c102','Other owner','bank','PHP',1000);
insert into public.financial_loans(id,user_id,name,currency,principal_amount,opening_principal,outstanding_principal,account_id,payment_account_id) values
 ('50000000-0000-0000-0000-00000000c101','00000000-0000-0000-0000-00000000c101','Loan','PHP',500,500,500,
  '10000000-0000-0000-0000-00000000c101','20000000-0000-0000-0000-00000000c101');
do $$ begin
 begin
  update public.financial_loans set payment_account_id='40000000-0000-0000-0000-00000000c102' where id='50000000-0000-0000-0000-00000000c101';
  raise exception 'cross-owner preference accepted';
 exception when insufficient_privilege or foreign_key_violation then null; end;
 begin
  update public.financial_loans set payment_account_id='30000000-0000-0000-0000-00000000c101' where id='50000000-0000-0000-0000-00000000c101';
  raise exception 'foreign currency preference accepted';
 exception when insufficient_privilege then null; end;
 if exists(select 1 from public.accounting_postings where account_id='20000000-0000-0000-0000-00000000c101') then
  raise exception 'choosing a payment preference posted money'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000c101',false);
select public.record_loan_event('50000000-0000-0000-0000-00000000c101','principal_payment',200,'PHP','20000000-0000-0000-0000-00000000c101');
do $$ begin
 if (select outstanding_principal from public.financial_loans where id='50000000-0000-0000-0000-00000000c101') <> 300 then raise exception 'principal not reduced'; end if;
 if (select sum(signed_amount) from public.accounting_postings where account_id='20000000-0000-0000-0000-00000000c101') <> -200 then raise exception 'card payment posting incorrect'; end if;
 if exists(select 1 from public.accounting_postings where account_id='10000000-0000-0000-0000-00000000c101') then raise exception 'receiving account debited twice'; end if;
end $$;

-- New loan and other-debt draws use the same canonical borrowed-event posting.
insert into public.financial_loans(id,user_id,name,obligation_type,currency,principal_amount,opening_principal,outstanding_principal,account_id,payment_account_id) values
 ('60000000-0000-0000-0000-00000000c101','00000000-0000-0000-0000-00000000c101','New loan','loan','PHP',500,0,0,'10000000-0000-0000-0000-00000000c101','20000000-0000-0000-0000-00000000c101'),
 ('70000000-0000-0000-0000-00000000c101','00000000-0000-0000-0000-00000000c101','New debt','debt','PHP',300,0,0,'10000000-0000-0000-0000-00000000c101',null);
select public.record_loan_event('60000000-0000-0000-0000-00000000c101','borrowed',500,'PHP','10000000-0000-0000-0000-00000000c101');
select public.record_loan_event('70000000-0000-0000-0000-00000000c101','borrowed',300,'PHP','10000000-0000-0000-0000-00000000c101');
do $$ begin
 if (select outstanding_principal from public.financial_loans where id='60000000-0000-0000-0000-00000000c101') is distinct from 500 then raise exception 'loan principal incorrect'; end if;
 if (select outstanding_principal from public.financial_loans where id='70000000-0000-0000-0000-00000000c101') is distinct from 300 then raise exception 'debt principal incorrect'; end if;
 if (select sum(signed_amount) from public.accounting_postings where account_id='10000000-0000-0000-0000-00000000c101') is distinct from 800 then raise exception 'receiving balance increase incorrect'; end if;
 if (select count(*) from public.accounting_postings where account_id='10000000-0000-0000-0000-00000000c101') <> 2 then raise exception 'unexpected duplicate proceeds'; end if;
 if (select sum(signed_amount) from public.accounting_postings where account_id='20000000-0000-0000-0000-00000000c101') is distinct from -200 then raise exception 'repayment preference affected by new draws'; end if;
end $$;
rollback;
