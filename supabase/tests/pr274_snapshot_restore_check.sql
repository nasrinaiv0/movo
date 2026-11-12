-- Verified pre-upgrade snapshot must restore into a DIFFERENT disposable database.
do $$
begin
  if to_regclass('public.movo_account_erasure_requests') is not null
    or to_regprocedure('public.movo_run_data_retention()') is not null
  then raise exception 'Rollback test accidentally restored upgraded schema'; end if;
  if not has_table_privilege('authenticated','public.transactions','UPDATE')
    or not has_table_privilege('authenticated','public.transactions','DELETE')
  then raise exception 'Old client grants absent from the restored baseline'; end if;
  if (select count(*) from public.transactions
    where id in ('30000000-0000-4000-8000-000000000041','30000000-0000-4000-8000-000000000042')) <> 2
    or (select count(*) from public.financial_accounts
      where id in ('30000000-0000-4000-8000-000000000021','30000000-0000-4000-8000-000000000022')) <> 2
  then raise exception 'Rollback rehearsal failed to restore synthetic finance records'; end if;
  if (select count(*) from public.movo_iap_ack_jobs
      where purchase_token_hash in (repeat('1',64),repeat('2',64),repeat('3',64))) <> 3
  then raise exception 'Rollback rehearsal lost synthetic billing queues'; end if;
end $$;
