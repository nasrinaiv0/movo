-- Run after applying 20261102020000_automation_inbox.sql (as a superuser / SQL editor).
-- Everything runs inside one transaction and is rolled back.
begin;
do $$
declare
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid();
  acct uuid; tx_a uuid; tx_b uuid;
  tok_a text := repeat('a', 64); tok_b text := repeat('b', 64); tok_off text := repeat('d', 64);
  item uuid; again uuid; b_item uuid; n int; i int;
  sig text := 'public.record_automation_failure(text,text,uuid,text,text,text,numeric,text,text,text,text,text,timestamptz)';
begin
  -- Lockdown: only the server records failures; anon sees nothing; clients cannot insert or edit content columns.
  if has_function_privilege('authenticated', sig, 'EXECUTE') or has_function_privilege('anon', sig, 'EXECUTE') then
    raise exception 'only service_role may record automation failures';
  end if;
  if has_table_privilege('anon', 'public.movo_automation_inbox', 'SELECT') then raise exception 'anon must not read the inbox'; end if;
  if has_table_privilege('authenticated', 'public.movo_automation_inbox', 'INSERT') then raise exception 'clients must not insert inbox rows'; end if;
  if has_column_privilege('authenticated', 'public.movo_automation_inbox', 'amount', 'UPDATE')
     or has_column_privilege('authenticated', 'public.movo_automation_inbox', 'user_id', 'UPDATE') then
    raise exception 'clients may only update status, transaction_id and resolved_at';
  end if;
  if not has_column_privilege('authenticated', 'public.movo_automation_inbox', 'status', 'UPDATE') then
    raise exception 'clients must be able to resolve their own items';
  end if;
  if (select relrowsecurity from pg_class where oid = 'public.movo_automation_inbox'::regclass) is distinct from true then
    raise exception 'RLS must be enabled on movo_automation_inbox';
  end if;

  insert into auth.users (id, email) values (a, a || '@example.test'), (b, b || '@example.test');
  -- Cloud records need Pro or Pro+ (20261104010000_plans_entitlements).
  insert into public.movo_plan_grants (user_id, plan, source, ends_at) values (a, 'pro', 'trial', now() + interval '1 day'), (b, 'pro', 'trial', now() + interval '1 day');
  insert into public.financial_accounts (user_id, name, account_type, currency) values (a, 'BPI Visa', 'card', 'PHP') returning id into acct;
  insert into public.transactions (user_id, account_id, transaction_type, amount, currency, merchant, category, occurred_at)
    values (a, acct, 'expense', 250, 'PHP', 'Grab', 'Transport', now()) returning id into tx_a;
  insert into public.financial_accounts (user_id, name, account_type, currency) values (b, 'B Cash', 'cash', 'PHP');
  insert into public.transactions (user_id, account_id, transaction_type, amount, currency, merchant, category, occurred_at)
    values (b, (select id from public.financial_accounts where user_id = b limit 1), 'expense', 99, 'PHP', 'Other', 'Other', now()) returning id into tx_b;
  insert into public.movo_automation_tokens (token_hash, user_id, label) values (tok_a, a, 'iOS Shortcuts'), (tok_b, b, 'Android');
  insert into public.movo_automation_tokens (token_hash, user_id, label, active) values (tok_off, a, 'revoked', false);

  -- Recording: stores the failure, keeps one row per request, rejects foreign or revoked keys.
  item := public.record_automation_failure(tok_a, repeat('1', 64), a, 'applepay', 'account_match_required', 'expense', 250, 'PHP', 'Grab', 'Wallet Visa', null, null, now());
  again := public.record_automation_failure(tok_a, repeat('1', 64), a, 'applepay', 'account_match_required', 'expense', 250, 'PHP', 'Grab', 'Wallet Visa', null, null, now());
  if item is null or item <> again then raise exception 'a retried request must keep the same inbox row'; end if;
  begin
    perform public.record_automation_failure(tok_b, repeat('2', 64), a, 'applepay', 'server_error', 'expense', 1, 'PHP', 'X', null, null, null, now());
    raise exception 'a device key must only record for its own user';
  exception when raise_exception then
    if sqlerrm <> 'token_invalid' then raise; end if;
  end;
  begin
    perform public.record_automation_failure(tok_off, repeat('3', 64), a, 'applepay', 'server_error', 'expense', 1, 'PHP', 'X', null, null, null, now());
    raise exception 'a revoked key must not record';
  exception when raise_exception then
    if sqlerrm <> 'token_invalid' then raise; end if;
  end;
  -- Unclear voice phrase: no amount is fine, the phrase is kept for review.
  perform public.record_automation_failure(tok_a, repeat('4', 64), a, 'siri_shortcut', 'clarification_required', 'expense', null, null, null, null, 'I spent on lunch', null, now());
  b_item := public.record_automation_failure(tok_b, repeat('5', 64), b, 'googlepay', 'account_required', 'expense', 80, 'PHP', 'Jollibee', null, null, null, now());

  -- Isolation: a person sees and changes only their own items, and can only link their own transactions.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.movo_automation_inbox;
  if n <> 2 then raise exception 'user a must see exactly their 2 items, saw %', n; end if;
  update public.movo_automation_inbox set status = 'dismissed' where id = b_item;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'user a must not change user b''s item'; end if;
  begin
    update public.movo_automation_inbox set status = 'logged', transaction_id = tx_b where id = item;
    raise exception 'linking another person''s transaction must be rejected';
  exception when insufficient_privilege or check_violation then null;
  end;
  update public.movo_automation_inbox set status = 'logged', transaction_id = tx_a, resolved_at = now() where id = item;
  begin
    update public.movo_automation_inbox set amount = 1 where id = item;
    raise exception 'content columns must not be editable by clients';
  exception when insufficient_privilege then null;
  end;
  delete from public.movo_automation_inbox where id = b_item;
  reset role;
  if (select status from public.movo_automation_inbox where id = item) <> 'logged' then raise exception 'own item should be resolved'; end if;
  if not exists (select 1 from public.movo_automation_inbox where id = b_item) then raise exception 'user a must not delete user b''s item'; end if;

  -- anon sees nothing.
  set local role anon;
  begin
    select count(*) into n from public.movo_automation_inbox;
    raise exception 'anon must not read the inbox';
  exception when insufficient_privilege then null;
  end;
  reset role;

  -- Daily cap: beyond 100 new items a day nothing more is stored.
  for i in 1..110 loop
    perform public.record_automation_failure(tok_a, lpad(to_hex(1000 + i), 64, 'e'), a, 'bank', 'server_error', 'expense', i, 'PHP', 'Cap test', null, null, null, now());
  end loop;
  select count(*) into n from public.movo_automation_inbox where user_id = a and created_at > now() - interval '24 hours';
  if n <> 100 then raise exception 'the daily cap must hold at 100 items, found %', n; end if;

  raise notice 'automation_inbox tests passed';
end $$;
rollback;
