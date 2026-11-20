-- Exercise the three PR #274 migrations after upgrading the disposable baseline.
-- This must not be pointed at Supabase or any non-disposable PostgreSQL database.
begin;
do $$
begin
  if to_regclass('public.movo_account_erasure_requests') is null
    or to_regprocedure('public.movo_clear_cloud_records(uuid)') is null
    or to_regprocedure('public.movo_finish_account_erasure(uuid)') is null
    or to_regprocedure('public.movo_run_data_retention()') is null
  then raise exception 'Account erasure or retention migration was not installed'; end if;
  if has_table_privilege('authenticated','public.transactions','UPDATE')
    or has_table_privilege('authenticated','public.transactions','DELETE')
  then raise exception 'Unsafe raw transaction write grants remain'; end if;
  if (select count(*) from public.transactions
      where id in ('30000000-0000-4000-8000-000000000041','30000000-0000-4000-8000-000000000042')) <> 2
  then raise exception 'Upgrade mutated existing financial transactions'; end if;
end $$;
select set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000011',true);
select set_config('request.jwt.claims','{"role":"authenticated"}',true);
set local role authenticated;
do $$
begin
  begin
    update public.transactions set merchant='Should be blocked'
      where id='30000000-0000-4000-8000-000000000041';
    raise exception 'Legacy raw update still works after hardening';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.transactions where id='30000000-0000-4000-8000-000000000041';
    raise exception 'Legacy raw delete still works after hardening';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
-- Billing work that is *pending* must survive regardless of creation age.
select set_config('request.jwt.claims','{"role":"service_role"}',true);
set local role service_role;
select public.movo_run_data_retention();
reset role;
do $$
begin
  if not exists(select 1 from public.movo_iap_ack_jobs where purchase_token_hash=repeat('1',64) and completed_at is null)
    or exists(select 1 from public.movo_iap_ack_jobs where purchase_token_hash=repeat('2',64))
    or not exists(select 1 from public.movo_iap_ack_jobs where purchase_token_hash=repeat('3',64))
  then raise exception 'Retention lost pending Google acknowledgement or did not prune completed work'; end if;
  if (select jsonb_array_length(prefs->'archive') from public.user_preferences
      where user_id='30000000-0000-4000-8000-000000000011') <> 1
  then raise exception 'Archive cleanup did not preserve the recent item'; end if;
end $$;
-- A staged cloud clear must preserve the owning login and the other tenant.
set local role service_role;
select public.movo_clear_cloud_records('30000000-0000-4000-8000-000000000011');
reset role;
do $$
begin
  if not exists(select 1 from auth.users where id='30000000-0000-4000-8000-000000000011')
    or exists(select 1 from public.financial_accounts where id='30000000-0000-4000-8000-000000000021')
    or not exists(select 1 from public.financial_accounts where id='30000000-0000-4000-8000-000000000022')
    or not exists(select 1 from public.transactions where id='30000000-0000-4000-8000-000000000042')
  then raise exception 'Cloud clear deleted the identity or another tenant'; end if;
end $$;
rollback;
