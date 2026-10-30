-- Run after applying 20261030160000_user_preferences.sql in a test project (as a superuser / SQL editor).
do $$
declare
  rls boolean;
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  seen int;
begin
  select c.relrowsecurity into rls from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'user_preferences';
  if rls is distinct from true then raise exception 'user_preferences must have RLS enabled'; end if;

  if (select count(*) from pg_policies where schemaname = 'public' and tablename = 'user_preferences' and (qual like '%auth.uid()%' or with_check like '%auth.uid()%')) < 4 then
    raise exception 'All four user_preferences policies must be scoped to auth.uid()';
  end if;

  if has_table_privilege('anon', 'public.user_preferences', 'SELECT') or has_table_privilege('anon', 'public.user_preferences', 'INSERT') then
    raise exception 'Anonymous users must not access user_preferences';
  end if;
  if has_table_privilege('authenticated', 'public.user_preferences', 'TRUNCATE') then
    raise exception 'Authenticated users must not hold TRUNCATE on user_preferences';
  end if;

  -- Two users: each sees only their own row.
  insert into auth.users (id, email) values (a, a || '@example.test'), (b, b || '@example.test');
  insert into public.user_preferences (user_id, prefs) values (a, '{"theme":"dark"}'), (b, '{"theme":"light"}');
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into seen from public.user_preferences;
  if seen <> 1 then raise exception 'A user must see exactly their own preferences row, saw %', seen; end if;
  update public.user_preferences set prefs = '{"theme":"x"}' where user_id = b;
  reset role;
  if (select prefs->>'theme' from public.user_preferences where user_id = b) <> 'light' then
    raise exception 'A user must not be able to change another user''s preferences';
  end if;

  begin
    insert into public.user_preferences (user_id, prefs) values (gen_random_uuid(), '[]'::jsonb);
    raise exception 'Non-object prefs must be rejected';
  exception when check_violation or foreign_key_violation then null;
  end;

  delete from auth.users where id in (a, b);
  raise notice 'user_preferences isolation checks passed';
end $$;
