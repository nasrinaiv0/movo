-- Regression checks for atomic cash postings from obligation events.
begin;
do $$
declare
  loan_def text := pg_get_functiondef('public.record_loan_event(uuid,text,numeric,text,uuid,uuid,timestamptz,text)'::regprocedure);
  receivable_def text := pg_get_functiondef('public.record_receivable_event(uuid,text,numeric,text,uuid,uuid,timestamptz,text)'::regprocedure);
  idx text;
begin
  if loan_def not ilike '%insert into public.accounting_postings%'
     or loan_def not ilike '%loan_event%'
     or loan_def not ilike '%principal_payment%'
     or loan_def not ilike '%interest_payment%'
     or loan_def not ilike '%on conflict (source_type,source_id,account_id) do nothing%' then
    raise exception 'loan event cash posting implementation is incomplete';
  end if;
  if receivable_def not ilike '%insert into public.accounting_postings%'
     or receivable_def not ilike '%receivable_event%'
     or receivable_def not ilike '%written_off%'
     or receivable_def not ilike '%on conflict (source_type,source_id,account_id) do nothing%' then
    raise exception 'receivable event cash posting implementation is incomplete';
  end if;
  foreach idx in array array[
    'allocation_events_account_id_idx',
    'payment_attempts_account_id_idx',
    'payment_attempts_account_owner_idx',
    'payment_attempts_transaction_id_idx',
    'plan_funding_allocations_account_id_idx',
    'scheduled_transactions_account_id_idx',
    'scheduled_transactions_destination_account_owner_idx',
    'scheduled_transactions_last_transaction_id_idx',
    'scheduled_transactions_source_account_owner_idx',
    'scheduled_transactions_transfer_to_account_id_idx',
    'transactions_schedule_id_idx'
  ] loop
    if not exists(select 1 from pg_indexes where schemaname='public' and indexname=idx) then
      raise exception 'missing expected index %', idx;
    end if;
  end loop;
  if has_function_privilege('anon','public.record_loan_event(uuid,text,numeric,text,uuid,uuid,timestamptz,text)','EXECUTE')
     or has_function_privilege('anon','public.record_receivable_event(uuid,text,numeric,text,uuid,uuid,timestamptz,text)','EXECUTE') then
    raise exception 'anonymous execution must remain revoked';
  end if;
end $$;
rollback;
