-- Phone automations: persist every real source and stop the same purchase being logged twice when several
-- channels report it (Apple Pay Shortcut + bank SMS/notification + Google Pay + a voice log).
--
-- 1. transactions.source: the source-aware logger (20261101010000) inserts 'applepay' / 'googlepay' / 'bank', but the
--    original check constraint only allowed ('manual','csv_import','bank_sync','notification','apple_pay_export',
--    'other'), so every such insert failed. Widen the allowlist (old values kept) and add the voice sources.
-- 2. movo_automation_events gains source + outcome so the event log shows what each request did.
-- 3. log_automation_transaction_v2: one shared, idempotent entry point for every automation path:
--      a. same device key + request id            -> the earlier result (safe retries, before rate limits)
--      b. rate limits per device key (10/min, 200/day)
--      c. account must belong to the user and be open
--      d. cross-source duplicate of an existing record of the same user, type, amount and currency:
--           - same external reference, any time; or
--           - within 15 minutes and the merchant agrees (equal, contained, or a shared word of 4+ letters); or
--           - within 3 minutes and the earlier record came from a different automation channel
--             (the same card swipe echoed by Apple Pay and a bank alert often names the merchant differently)
--         -> nothing is inserted; the event points at the existing record.
--      e. otherwise insert one transaction with the real source.
--    A per-user advisory lock serialises concurrent requests from different devices/channels for one person.
-- The earlier function signatures are left in place (service-role only) so a deployed API keeps working during
-- rollout; the API switches to v2 in the same release.

alter table public.transactions drop constraint if exists transactions_source_check;
alter table public.transactions add constraint transactions_source_check check (source in (
  'manual', 'csv_import', 'bank_sync', 'notification', 'apple_pay_export', 'other',
  'applepay', 'googlepay', 'bank', 'siri_shortcut', 'android_assistant'
));

alter table public.movo_automation_events add column if not exists source text
  check (source is null or source in ('applepay', 'googlepay', 'bank', 'notification', 'siri_shortcut', 'android_assistant'));
alter table public.movo_automation_events add column if not exists outcome text
  check (outcome is null or outcome in ('created', 'duplicate_cross_source'));

create index if not exists transactions_user_amount_time_idx
  on public.transactions(user_id, amount, occurred_at desc);

create or replace function public.movo_merchant_key(p_value text)
returns text language sql immutable
set search_path = pg_catalog, public, pg_temp
as $$ select btrim(regexp_replace(lower(coalesce(p_value, '')), '[^[:alnum:]]+', ' ', 'g')) $$;

create or replace function public.movo_same_merchant(p_a text, p_b text)
returns boolean language sql immutable
set search_path = pg_catalog, public, pg_temp
as $$
  with k as (select public.movo_merchant_key(p_a) a, public.movo_merchant_key(p_b) b)
  select case
    when k.a = '' or k.b = '' then false
    when k.a = k.b or strpos(k.a, k.b) > 0 or strpos(k.b, k.a) > 0 then true
    else exists (
      select 1 from regexp_split_to_table(k.a, ' ') w
      where char_length(w) >= 4
        and w not in ('store', 'shop', 'payment', 'purchase', 'online', 'manila', 'philippines', 'corp', 'inc')
        and w = any (regexp_split_to_array(k.b, ' '))
    )
  end from k
$$;

create or replace function public.log_automation_transaction_v2(
  p_token_hash text,
  p_request_id text,
  p_user_id uuid,
  p_account_id uuid,
  p_transaction_type text,
  p_amount numeric,
  p_currency text,
  p_merchant text,
  p_category text,
  p_occurred_at timestamptz,
  p_note text,
  p_source text,
  p_external_reference text default null
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_event_id uuid;
  v_transaction_id uuid;
  v_match uuid;
  v_recent integer;
  v_daily integer;
  v_amount numeric := round(p_amount, 2);
  v_ref text := nullif(btrim(coalesce(p_external_reference, '')), '');
begin
  if p_token_hash !~ '^[a-f0-9]{64}$' or p_request_id !~ '^[a-f0-9]{64}$' or p_user_id is null then
    raise exception 'invalid_request';
  end if;
  if p_transaction_type not in ('expense', 'income')
    or p_amount is null or p_amount <= 0 or p_amount >= 1000000000
    or p_merchant is null or char_length(btrim(p_merchant)) < 1 or char_length(p_merchant) > 160
    or p_currency is null or p_currency !~ '^[A-Z]{3}$'
    or p_occurred_at is null
    or p_source not in ('applepay', 'googlepay', 'bank', 'notification', 'siri_shortcut', 'android_assistant')
    or (v_ref is not null and char_length(v_ref) > 200) then
    raise exception 'invalid_transaction';
  end if;
  if not exists (select 1 from public.movo_automation_tokens where token_hash = p_token_hash and user_id = p_user_id and active) then
    raise exception 'token_invalid';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('movo-automation:' || p_user_id::text, 0));

  -- a. Retries of a request this device already sent return the same outcome.
  select transaction_id into v_transaction_id from public.movo_automation_events
  where token_hash = p_token_hash and request_id = p_request_id;
  if found then
    return jsonb_build_object('duplicate', true, 'matched_by', 'request', 'transaction_id', v_transaction_id);
  end if;

  -- b. Rate limits per device key.
  select count(*) into v_recent from public.movo_automation_events
  where token_hash = p_token_hash and created_at > now() - interval '1 minute';
  if v_recent >= 10 then raise exception 'rate_limited'; end if;
  select count(*) into v_daily from public.movo_automation_events
  where token_hash = p_token_hash and created_at > now() - interval '24 hours';
  if v_daily >= 200 then raise exception 'rate_limited'; end if;

  -- c. The account must be one of this person's open accounts.
  if not exists (select 1 from public.financial_accounts where id = p_account_id and user_id = p_user_id and is_archived = false) then
    raise exception 'account_invalid';
  end if;

  -- d. Same purchase already recorded through another channel (or by hand)?
  select t.id into v_match
  from public.transactions t
  where t.user_id = p_user_id
    and t.transaction_type = p_transaction_type
    and t.amount = v_amount
    and t.currency = p_currency
    and (
      (v_ref is not null and t.external_reference = v_ref)
      or (v_ref is null or t.external_reference is null or t.external_reference = v_ref) and (
        (t.occurred_at between p_occurred_at - interval '15 minutes' and p_occurred_at + interval '15 minutes'
          and public.movo_same_merchant(t.merchant, p_merchant))
        or (t.occurred_at between p_occurred_at - interval '3 minutes' and p_occurred_at + interval '3 minutes'
          and t.source in ('applepay', 'googlepay', 'bank', 'notification', 'siri_shortcut', 'android_assistant')
          and t.source <> p_source)
      )
    )
  order by (v_ref is not null and t.external_reference = v_ref) desc, abs(extract(epoch from (t.occurred_at - p_occurred_at)))
  limit 1;

  if v_match is not null then
    insert into public.movo_automation_events(token_hash, request_id, user_id, transaction_id, source, outcome)
    values (p_token_hash, p_request_id, p_user_id, v_match, p_source, 'duplicate_cross_source');
    return jsonb_build_object('duplicate', true, 'matched_by', 'cross_source', 'transaction_id', v_match);
  end if;

  -- e. New record with its real source.
  insert into public.movo_automation_events(token_hash, request_id, user_id, source, outcome)
  values (p_token_hash, p_request_id, p_user_id, p_source, 'created')
  returning id into v_event_id;

  insert into public.transactions(
    user_id, account_id, transaction_type, amount, currency, merchant, category,
    note, occurred_at, source, external_reference, is_pending
  ) values (
    p_user_id, p_account_id, p_transaction_type, v_amount, p_currency, btrim(p_merchant),
    coalesce(nullif(btrim(p_category), ''), 'Other'), left(coalesce(p_note, ''), 1000),
    p_occurred_at, p_source, left(v_ref, 200), false
  ) returning id into v_transaction_id;

  update public.movo_automation_events set transaction_id = v_transaction_id where id = v_event_id;
  return jsonb_build_object('duplicate', false, 'matched_by', null, 'transaction_id', v_transaction_id);
end;
$$;

revoke all on function public.log_automation_transaction_v2(text, text, uuid, uuid, text, numeric, text, text, text, timestamptz, text, text, text) from public, anon, authenticated;
grant execute on function public.log_automation_transaction_v2(text, text, uuid, uuid, text, numeric, text, text, text, timestamptz, text, text, text) to service_role;
revoke all on function public.movo_merchant_key(text) from public, anon, authenticated;
revoke all on function public.movo_same_merchant(text, text) from public, anon, authenticated;
grant execute on function public.movo_merchant_key(text) to service_role;
grant execute on function public.movo_same_merchant(text, text) to service_role;
