-- Run after applying 20261102010000_automation_sources_and_cross_source_dedup.sql (as a superuser / SQL editor).
-- Everything runs inside one transaction and is rolled back.
begin;
do $$
declare
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid();
  acct uuid; acct2 uuid; b_acct uuid; archived uuid;
  tok_ios text := repeat('a', 64); tok_android text := repeat('b', 64); tok_b text := repeat('c', 64); tok_off text := repeat('d', 64);
  r jsonb; first_id uuid; n int; t0 timestamptz := '2026-11-01 12:00:00+08';
  req int := 0;
  function_ok boolean;
begin
  -- Locked down: no client role can execute the logger or touch automation tables.
  if has_function_privilege('authenticated', 'public.log_automation_transaction_v2(text,text,uuid,uuid,text,numeric,text,text,text,timestamptz,text,text,text)', 'EXECUTE')
     or has_function_privilege('anon', 'public.log_automation_transaction_v2(text,text,uuid,uuid,text,numeric,text,text,text,timestamptz,text,text,text)', 'EXECUTE') then
    raise exception 'only service_role may run the automation logger';
  end if;
  if has_table_privilege('authenticated', 'public.movo_automation_events', 'SELECT') or has_table_privilege('anon', 'public.movo_automation_tokens', 'SELECT') then
    raise exception 'automation tables must stay server-only';
  end if;

  insert into auth.users (id, email) values (a, a || '@example.test'), (b, b || '@example.test');
  insert into public.financial_accounts (user_id, name, account_type, currency) values (a, 'BPI Visa', 'card', 'PHP') returning id into acct;
  insert into public.financial_accounts (user_id, name, account_type, currency) values (a, 'BPI Savings', 'bank', 'PHP') returning id into acct2;
  insert into public.financial_accounts (user_id, name, account_type, currency, is_archived) values (a, 'Old', 'cash', 'PHP', true) returning id into archived;
  insert into public.financial_accounts (user_id, name, account_type, currency) values (b, 'B Cash', 'cash', 'PHP') returning id into b_acct;
  insert into public.movo_automation_tokens (token_hash, user_id, label) values (tok_ios, a, 'iOS Shortcuts'), (tok_android, a, 'Android'), (tok_b, b, 'iOS Shortcuts');
  insert into public.movo_automation_tokens (token_hash, user_id, label, active) values (tok_off, a, 'revoked', false);

  -- Every real source is persisted (this failed before the constraint was widened).
  r := public.log_automation_transaction_v2(tok_ios, md5('r1') || md5('r1'), a, acct, 'expense', 109, 'PHP', 'GADC Jollibee', 'Food', t0, 'Logged from Apple Pay', 'applepay', null);
  if (r->>'duplicate')::boolean then raise exception 'first Apple Pay log must create a record: %', r; end if;
  first_id := (r->>'transaction_id')::uuid;
  select count(*) into n from public.transactions where id = first_id and source = 'applepay' and amount = 109 and currency = 'PHP' and merchant = 'GADC Jollibee' and occurred_at = t0 and account_id = acct;
  if n <> 1 then raise exception 'amount, currency, time, merchant, account and source must be preserved'; end if;

  -- a. Same request retried -> same record, nothing new.
  r := public.log_automation_transaction_v2(tok_ios, md5('r1') || md5('r1'), a, acct, 'expense', 109, 'PHP', 'GADC Jollibee', 'Food', t0, '', 'applepay', null);
  if not (r->>'duplicate')::boolean or r->>'matched_by' <> 'request' or (r->>'transaction_id')::uuid <> first_id then raise exception 'retry must be idempotent: %', r; end if;

  -- d. The bank SMS for the same swipe, 2 minutes later, other merchant wording, other account -> duplicate.
  r := public.log_automation_transaction_v2(tok_android, md5('r2') || md5('r2'), a, acct2, 'expense', 109, 'PHP', 'POS PURCHASE GADC-MKT', 'Other', t0 + interval '2 minutes', '', 'bank', null);
  if not (r->>'duplicate')::boolean or r->>'matched_by' <> 'cross_source' or (r->>'transaction_id')::uuid <> first_id then raise exception 'bank echo of an Apple Pay purchase must be a duplicate: %', r; end if;

  -- Google Pay with a similar merchant 10 minutes later -> duplicate (merchant agrees within 15 minutes).
  r := public.log_automation_transaction_v2(tok_android, md5('r3') || md5('r3'), a, acct, 'expense', 109, 'PHP', 'Jollibee', 'Other', t0 + interval '10 minutes', '', 'googlepay', null);
  if not (r->>'duplicate')::boolean or (r->>'transaction_id')::uuid <> first_id then raise exception 'similar merchant within 15 minutes must match: %', r; end if;

  -- Same amount, different merchant, 10 minutes later -> a new purchase.
  r := public.log_automation_transaction_v2(tok_ios, md5('r4') || md5('r4'), a, acct, 'expense', 109, 'PHP', 'Mercury Drug', 'Health', t0 + interval '10 minutes', '', 'applepay', null);
  if (r->>'duplicate')::boolean then raise exception 'different merchant 10 minutes later is a new purchase: %', r; end if;

  -- Same channel, same amount, different merchant 1 minute later -> a new purchase (only cross-channel echoes merge).
  r := public.log_automation_transaction_v2(tok_ios, md5('r5') || md5('r5'), a, acct, 'expense', 109, 'PHP', 'Watsons', 'Health', t0 + interval '1 minute', '', 'applepay', null);
  if (r->>'duplicate')::boolean then raise exception 'same channel, other merchant is a new purchase: %', r; end if;

  -- References: same reference = same payment whatever the time; different references never merge.
  r := public.log_automation_transaction_v2(tok_android, md5('r6') || md5('r6'), a, acct2, 'expense', 500, 'PHP', 'Meralco', 'Bills', t0, '', 'bank', 'REF-123');
  first_id := (r->>'transaction_id')::uuid;
  r := public.log_automation_transaction_v2(tok_ios, md5('r7') || md5('r7'), a, acct, 'expense', 500, 'PHP', 'MERALCO ONLINE', 'Bills', t0 + interval '2 hours', '', 'siri_shortcut', 'REF-123');
  if not (r->>'duplicate')::boolean or (r->>'transaction_id')::uuid <> first_id then raise exception 'same reference must match: %', r; end if;
  r := public.log_automation_transaction_v2(tok_ios, md5('r8') || md5('r8'), a, acct2, 'expense', 500, 'PHP', 'Meralco', 'Bills', t0 + interval '1 minute', '', 'applepay', 'REF-999');
  if (r->>'duplicate')::boolean then raise exception 'different references are different payments: %', r; end if;

  -- A hand-entered record is also found (voice log after a manual entry).
  insert into public.transactions (user_id, account_id, transaction_type, amount, currency, merchant, category, occurred_at, source)
  values (a, acct, 'expense', 3, 'PHP', 'Banana', 'Food', t0, 'manual');
  r := public.log_automation_transaction_v2(tok_ios, md5('r9') || md5('r9'), a, acct, 'expense', 3, 'PHP', 'banana', 'Food', t0 + interval '5 minutes', '', 'siri_shortcut', null);
  if not (r->>'duplicate')::boolean then raise exception 'voice log of a hand-entered purchase must match: %', r; end if;

  -- Income is supported and never merges with an expense of the same amount.
  r := public.log_automation_transaction_v2(tok_android, md5('r10') || md5('r10'), a, acct2, 'income', 109, 'PHP', 'GADC Jollibee', 'Income', t0, '', 'android_assistant', null);
  if (r->>'duplicate')::boolean then raise exception 'income must not merge with an expense: %', r; end if;
  select count(*) into n from public.transactions where id = (r->>'transaction_id')::uuid and transaction_type = 'income' and source = 'android_assistant';
  if n <> 1 then raise exception 'income from the Android assistant must be stored as such'; end if;

  -- Other currencies are kept and do not merge across currencies.
  r := public.log_automation_transaction_v2(tok_ios, md5('r11') || md5('r11'), a, acct, 'expense', 109, 'USD', 'GADC Jollibee', 'Food', t0, '', 'bank', null);
  if (r->>'duplicate')::boolean then raise exception 'different currency is a different payment: %', r; end if;

  -- Isolation: person B's identical purchase is never matched to A's record, and B cannot log into A's account.
  r := public.log_automation_transaction_v2(tok_b, md5('r12') || md5('r12'), b, b_acct, 'expense', 109, 'PHP', 'GADC Jollibee', 'Food', t0, '', 'applepay', null);
  if (r->>'duplicate')::boolean then raise exception 'other people''s records must never match: %', r; end if;
  begin
    perform public.log_automation_transaction_v2(tok_b, md5('r13') || md5('r13'), b, acct, 'expense', 1, 'PHP', 'X', 'Other', t0, '', 'applepay', null);
    raise exception 'logging into another person''s account must fail';
  exception when others then if sqlerrm <> 'account_invalid' then raise; end if; end;
  begin
    perform public.log_automation_transaction_v2(tok_b, md5('r14') || md5('r14'), a, acct, 'expense', 1, 'PHP', 'X', 'Other', t0, '', 'applepay', null);
    raise exception 'a device key may only log for its own person';
  exception when others then if sqlerrm <> 'token_invalid' then raise; end if; end;

  -- Revoked keys, archived accounts and invalid input are rejected.
  begin perform public.log_automation_transaction_v2(tok_off, md5('r15') || md5('r15'), a, acct, 'expense', 1, 'PHP', 'X', 'Other', t0, '', 'applepay', null); raise exception 'revoked key accepted';
  exception when others then if sqlerrm <> 'token_invalid' then raise; end if; end;
  begin perform public.log_automation_transaction_v2(tok_ios, md5('r16') || md5('r16'), a, archived, 'expense', 1, 'PHP', 'X', 'Other', t0, '', 'applepay', null); raise exception 'archived account accepted';
  exception when others then if sqlerrm <> 'account_invalid' then raise; end if; end;
  begin perform public.log_automation_transaction_v2(tok_ios, md5('r17') || md5('r17'), a, acct, 'transfer', 1, 'PHP', 'X', 'Other', t0, '', 'applepay', null); raise exception 'transfer accepted';
  exception when others then if sqlerrm <> 'invalid_transaction' then raise; end if; end;
  begin perform public.log_automation_transaction_v2(tok_ios, md5('r18') || md5('r18'), a, acct, 'expense', 1, 'PHP', 'X', 'Other', t0, '', 'webhook', null); raise exception 'unknown source accepted';
  exception when others then if sqlerrm <> 'invalid_transaction' then raise; end if; end;

  -- Event log: one row per accepted request with its source and outcome.
  select count(*) into n from public.movo_automation_events where user_id = a and outcome = 'duplicate_cross_source';
  if n <> 4 then raise exception 'expected 4 cross-source duplicate events, got %', n; end if;
  select count(*) into n from public.movo_automation_events where user_id = a and source is null;
  if n <> 0 then raise exception 'every new event must carry its source'; end if;

  -- Rate limit: the 11th new request within a minute on one key is refused; a retry of a logged request is not.
  for req in 1..10 loop
    begin
      perform public.log_automation_transaction_v2(tok_b, md5('rl' || req) || md5('rl' || req), b, b_acct, 'expense', 1000 + req, 'PHP', 'Shop ' || req, 'Other', t0 + make_interval(hours => req), '', 'applepay', null);
    exception when others then if sqlerrm <> 'rate_limited' then raise; end if; end;
  end loop;
  begin
    perform public.log_automation_transaction_v2(tok_b, md5('rl-x') || md5('rl-x'), b, b_acct, 'expense', 5000, 'PHP', 'Shop X', 'Other', t0, '', 'applepay', null);
    raise exception 'rate limit not enforced';
  exception when others then if sqlerrm <> 'rate_limited' then raise; end if; end;
  r := public.log_automation_transaction_v2(tok_b, md5('r12') || md5('r12'), b, b_acct, 'expense', 109, 'PHP', 'GADC Jollibee', 'Food', t0, '', 'applepay', null);
  if r->>'matched_by' <> 'request' then raise exception 'retries must succeed even when rate limited: %', r; end if;

  raise notice 'automation_dedup: all checks passed';
end $$;
rollback;
