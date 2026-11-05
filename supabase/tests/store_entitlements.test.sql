-- Run after the MOVO store-entitlements migration as a superuser / SQL editor.
-- Catalogue/privilege assertions; purchase verification is exercised by API unit tests.
begin;
do $$
declare
  v_table oid;
  v_policy_count integer;
  v_function oid;
begin
  select c.oid into v_table
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'movo_store_entitlements';
  if v_table is null then raise exception 'movo_store_entitlements table missing'; end if;
  if not (select relrowsecurity from pg_class where oid = v_table) then
    raise exception 'RLS must be enabled on movo_store_entitlements';
  end if;
  if has_table_privilege('anon', 'public.movo_store_entitlements', 'SELECT')
    or has_table_privilege('anon', 'public.movo_store_entitlements', 'INSERT')
    or has_table_privilege('authenticated', 'public.movo_store_entitlements', 'INSERT')
    or has_table_privilege('authenticated', 'public.movo_store_entitlements', 'UPDATE')
    or has_table_privilege('authenticated', 'public.movo_store_entitlements', 'DELETE') then
    raise exception 'store entitlements must be read-only for authenticated users and inaccessible to anon';
  end if;
  if not has_table_privilege('authenticated', 'public.movo_store_entitlements', 'SELECT') then
    raise exception 'authenticated users need SELECT to read their own entitlements';
  end if;
  select count(*) into v_policy_count from pg_policies
  where schemaname = 'public' and tablename = 'movo_store_entitlements'
    and roles = '{authenticated}' and cmd = 'SELECT'
    and coalesce(qual, '') like '%auth.uid%';
  if v_policy_count <> 1 then raise exception 'expected exactly one authenticated owner-scoped SELECT policy'; end if;

  select p.oid into v_function from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'upsert_movo_store_entitlement';
  if v_function is null then raise exception 'store entitlement RPC missing'; end if;
  if has_function_privilege('anon', v_function, 'EXECUTE')
    or has_function_privilege('authenticated', v_function, 'EXECUTE')
    or not has_function_privilege('service_role', v_function, 'EXECUTE') then
    raise exception 'entitlement RPC must be executable only by service_role';
  end if;
  if not exists (
    select 1 from pg_proc p, unnest(coalesce(p.proconfig, array[]::text[])) setting
    where p.oid = v_function and setting = 'search_path=""'
  ) then raise exception 'entitlement RPC must use an empty search_path'; end if;
end;
$$;
rollback;
