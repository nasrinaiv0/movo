-- Run after applying 20261103010000_automation_transfers.sql (as a superuser / SQL editor).
-- Everything runs inside one transaction and is rolled back.
begin;
do $$
declare
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid();
  bpi uuid; gcash uuid; usd uuid; archived uuid; b_acct uuid;
  tok text := repeat('a', 64); tok_b text := repeat('b', 64); tok_off text := repeat('d', 64);
  r jsonb; first_id uuid; n int; i int; t0 timestamptz := '2026-11-01 12:00:00+08';
  sig text := 'public.log_automation_transfer(text,text,uuid,uuid,uuid,numeric,text,timestamptz,text,text,text)';
begin
  -- Server only.
  if has_function_privilege('authenticated', sig, 'EXECUTE') or has_function_privilege('anon', sig, 'EXECUTE') then
    raise exception 'only service_role may log automation transfers';
  end if;

  insert into auth.users (id, email) values (a, a || '@example.test'), (b, b || '@example.test');
  -- Cloud records need Pro or Pro+ (20261104010000_plans_entitlements).
  insert into public.movo_plan_grants (user_id, plan, source, ends_at) values (a, 'pro', 'trial', now() + interval '1 day'), (b, 'pro', 'trial', now() + interval '1 day');
  insert into public.financial_accounts (user_id, name, account_type, currency) values (a, 'BPI', 'bank', 'PHP') returning id into bpi;
  insert into public.financial_accounts (user_id, name, account_type, currency) values (a, 'GCash', 'e_wallet', 'PHP') returning id into gcash;
  insert into public.financial_accounts (user_id, name, account_type, currency) values (a, 'Wise USD', 'bank', 'USD') returning id into usd;
  insert into public.financial_accounts (user_id, name, account_type, currency, is_archived) values (a, 'Old', 'cash', 'PHP', true) returning id into archived;
  insert into public.financial_accounts (user_id, name, account_type, currency) values (b, 'B Cash', 'cash', 'PHP') returning id into b_acct;
  insert into public.movo_automation_tokens (token_hash, user_id, label) values (tok, a, 'iOS Shortcuts'), (tok_b, b, 'Android');
  insert into public.movo_automation_tokens (token_hash, user_id, label, active) values (tok_off, a, 'revoked', false);

  -- One transfer row, the same shape the app uses.
  r := public.log_automation_transfer(tok, md5('t1') || md5('t1'), a, bpi, gcash, 500, 'PHP', t0, 'Logged from Siri', 'siri_shortcut', null);
  if (r->>'duplicate')::boolean then raise exception 'first transfer must be created: %', r; end if;
  first_id := (r->>'transaction_id')::uuid;
  select count(*) into n from public.transactions
  where id = first_id and transaction_type = 'transfer' and account_id = bpi and transfer_to_account_id = gcash
    and amount = 500 and currency = 'PHP' and source = 'siri_shortcut' and category = 'transfer' and merchant = 'Transfer to GCash';
  if n <> 1 then raise exception 'transfer must be one row from BPI to GCash'; end if;

  -- Retry -> same row. Same transfer reported again within 15 minutes -> duplicate.
  r := public.log_automation_transfer(tok, md5('t1') || md5('t1'), a, bpi, gcash, 500, 'PHP', t0, '', 'siri_shortcut', null);
  if r->>'matched_by' <> 'request' or (r->>'transaction_id')::uuid <> first_id then raise exception 'retry must be idempotent: %', r; end if;
  r := public.log_automation_transfer(tok, md5('t2') || md5('t2'), a, bpi, gcash, 500, 'PHP', t0 + interval '5 minutes', '', 'bank', null);
  if r->>'matched_by' <> 'cross_source' or (r->>'transaction_id')::uuid <> first_id then raise exception 'same transfer within 15 minutes must be a duplicate: %', r; end if;

  -- Different direction or amount, or an hour later -> a new transfer.
  r := public.log_automation_transfer(tok, md5('t3') || md5('t3'), a, gcash, bpi, 500, 'PHP', t0, '', 'siri_shortcut', null);
  if (r->>'duplicate')::boolean then raise exception 'the opposite direction is a different transfer: %', r; end if;
  r := public.log_automation_transfer(tok, md5('t4') || md5('t4'), a, bpi, gcash, 500, 'PHP', t0 + interval '1 hour', '', 'siri_shortcut', null);
  if (r->>'duplicate')::boolean then raise exception 'an hour later is a different transfer: %', r; end if;

  -- Same reference -> same transfer whatever the time.
  r := public.log_automation_transfer(tok, md5('t5') || md5('t5'), a, bpi, gcash, 750, 'PHP', t0, '', 'bank', 'REF-77');
  first_id := (r->>'transaction_id')::uuid;
  r := public.log_automation_transfer(tok, md5('t6') || md5('t6'), a, bpi, gcash, 750, 'PHP', t0 + interval '3 hours', '', 'notification', 'REF-77');
  if (r->>'transaction_id')::uuid <> first_id then raise exception 'same reference must match: %', r; end if;

  -- Rejections: same account, another person's account, archived, currency mismatch, revoked or foreign key.
  begin perform public.log_automation_transfer(tok, md5('x1') || md5('x1'), a, bpi, bpi, 10, 'PHP', t0, '', 'siri_shortcut', null); raise exception 'same account must be refused';
  exception when raise_exception then if sqlerrm <> 'transfer_same_account' then raise; end if; end;
  begin perform public.log_automation_transfer(tok, md5('x2') || md5('x2'), a, bpi, b_acct, 10, 'PHP', t0, '', 'siri_shortcut', null); raise exception 'another person''s account must be refused';
  exception when raise_exception then if sqlerrm <> 'account_invalid' then raise; end if; end;
  begin perform public.log_automation_transfer(tok, md5('x3') || md5('x3'), a, archived, gcash, 10, 'PHP', t0, '', 'siri_shortcut', null); raise exception 'archived account must be refused';
  exception when raise_exception then if sqlerrm <> 'account_invalid' then raise; end if; end;
  begin perform public.log_automation_transfer(tok, md5('x4') || md5('x4'), a, bpi, usd, 10, 'PHP', t0, '', 'siri_shortcut', null); raise exception 'currency mismatch must be refused';
  exception when raise_exception then if sqlerrm <> 'transfer_currency_mismatch' then raise; end if; end;
  begin perform public.log_automation_transfer(tok_off, md5('x5') || md5('x5'), a, bpi, gcash, 10, 'PHP', t0, '', 'siri_shortcut', null); raise exception 'revoked key must be refused';
  exception when raise_exception then if sqlerrm <> 'token_invalid' then raise; end if; end;
  begin perform public.log_automation_transfer(tok_b, md5('x6') || md5('x6'), a, bpi, gcash, 10, 'PHP', t0, '', 'siri_shortcut', null); raise exception 'another person''s key must be refused';
  exception when raise_exception then if sqlerrm <> 'token_invalid' then raise; end if; end;
  begin perform public.log_automation_transfer(tok, md5('x7') || md5('x7'), a, bpi, gcash, 0, 'PHP', t0, '', 'siri_shortcut', null); raise exception 'zero amount must be refused';
  exception when raise_exception then if sqlerrm <> 'invalid_transaction' then raise; end if; end;
  select count(*) into n from public.transactions where user_id = b;
  if n <> 0 then raise exception 'nothing may be written for another person'; end if;

  -- Rate limit is shared with the other loggers: 10 a minute per device key.
  for i in 1..20 loop
    begin
      perform public.log_automation_transfer(tok, md5('rl' || i) || md5('rl' || i), a, gcash, bpi, 1 + i, 'PHP', t0 + (i || ' days')::interval, '', 'siri_shortcut', null);
    exception when raise_exception then
      if sqlerrm <> 'rate_limited' then raise; end if;
      exit;
    end;
  end loop;
  select count(*) into n from public.movo_automation_events where token_hash = tok and created_at > now() - interval '1 minute';
  if n > 10 then raise exception 'rate limit must hold at 10 a minute, found %', n; end if;

  raise notice 'automation_transfers tests passed';
end $$;
rollback;
