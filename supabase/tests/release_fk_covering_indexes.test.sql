-- Executed against an isolated local PostgreSQL database after all migrations.
begin;
do $$
declare required_index record;
begin
  for required_index in
    select * from (values
      ('movo_owner_audit_log','movo_owner_audit_log_target_user_id_idx','target_user_id'),
      ('movo_owner_work_items','movo_owner_work_items_created_by_idx','created_by'),
      ('movo_owner_work_items','movo_owner_work_items_updated_by_idx','updated_by'),
      ('movo_referral_points_ledger','movo_referral_points_ledger_referred_id_idx','referred_id'),
      ('movo_referral_points_ledger','movo_referral_points_ledger_source_entitlement_id_idx','source_entitlement_id')
    ) as expected(table_name,index_name,column_name)
  loop
    if not exists (
      select 1 from pg_indexes i
      where i.schemaname='public' and i.tablename=required_index.table_name
        and i.indexname=required_index.index_name
        and i.indexdef like '%(' || required_index.column_name || ')%'
    ) then
      raise exception 'Missing verified covering FK index %.%',
        required_index.table_name,required_index.index_name;
    end if;
  end loop;
end $$;
rollback;
