-- Automation transfers: "Hey Siri, I transferred 500 from BPI to GCash" logs ONE transfer row
-- (transaction_type = 'transfer', account_id = from, transfer_to_account_id = to), the same shape the app uses.
--
-- Same safeguards as log_automation_transaction_v2 (20261102010000):
--   * service_role only; the device key must be active and belong to the user;
--   * one advisory lock per person, so retries and parallel requests cannot double-book;
--   * a retried request (same device key + request id) returns the first outcome;
--   * the same per-device rate limits (10 a minute, 200 a day, shared with the other loggers);
--   * both accounts must be this person's own open accounts, different, and in the requested currency;
--   * the same transfer already recorded (same reference, or same accounts and amount within 15 minutes)
--     is reported as a duplicate instead of being inserted twice.

create or replace function public.log_automation_transfer(
  p_token_hash text,
  p_request_id text,
  p_user_id uuid,
  p_from_account_id uuid,
  p_to_account_id uuid,
  p_amount numeric,
  p_currency text,
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
  v_from_currency text;
  v_to_currency text;
  v_to_name text;
begin
  if p_token_hash !~ '^[a-f0-9]{64}$' or p_request_id !~ '^[a-f0-9]{64}$' or p_user_id is null then
    raise exception 'invalid_request';
  end if;
  if p_amount is null or p_amount <= 0 or p_amount >= 1000000000
    or p_currency is null or p_currency !~ '^[A-Z]{3}$'
    or p_occurred_at is null
    or p_from_account_id is null or p_to_account_id is null
    or p_source not in ('applepay', 'googlepay', 'bank', 'notification', 'siri_shortcut', 'android_assistant')
    or (v_ref is not null and char_length(v_ref) > 200) then
    raise exception 'invalid_transaction';
  end if;
  if p_from_account_id = p_to_account_id then
    raise exception 'transfer_same_account';
  end if;
  if not exists (select 1 from public.movo_automation_tokens where token_hash = p_token_hash and user_id = p_user_id and active) then
    raise exception 'token_invalid';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('movo-automation:' || p_user_id::text, 0));

  -- a. Retries return the same outcome.
  select transaction_id into v_transaction_id from public.movo_automation_events
  where token_hash = p_token_hash and request_id = p_request_id;
  if found then
    return jsonb_build_object('duplicate', true, 'matched_by', 'request', 'transaction_id', v_transaction_id);
  end if;

  -- b. Rate limits per device key (shared with the other automation loggers).
  select count(*) into v_recent from public.movo_automation_events
  where token_hash = p_token_hash and created_at > now() - interval '1 minute';
  if v_recent >= 10 then raise exception 'rate_limited'; end if;
  select count(*) into v_daily from public.movo_automation_events
  where token_hash = p_token_hash and created_at > now() - interval '24 hours';
  if v_daily >= 200 then raise exception 'rate_limited'; end if;

  -- c. Both accounts are this person's own open accounts, in the transfer's currency.
  select currency into v_from_currency from public.financial_accounts
  where id = p_from_account_id and user_id = p_user_id and is_archived = false;
  if not found then raise exception 'account_invalid'; end if;
  select currency, name into v_to_currency, v_to_name from public.financial_accounts
  where id = p_to_account_id and user_id = p_user_id and is_archived = false;
  if not found then raise exception 'account_invalid'; end if;
  if v_from_currency <> p_currency or v_to_currency <> p_currency then
    raise exception 'transfer_currency_mismatch';
  end if;

  -- d. Same transfer already recorded?
  select t.id into v_match
  from public.transactions t
  where t.user_id = p_user_id
    and t.transaction_type = 'transfer'
    and t.account_id = p_from_account_id
    and t.transfer_to_account_id = p_to_account_id
    and t.amount = v_amount
    and t.currency = p_currency
    and (
      (v_ref is not null and t.external_reference = v_ref)
      or ((v_ref is null or t.external_reference is null)
        and t.occurred_at between p_occurred_at - interval '15 minutes' and p_occurred_at + interval '15 minutes')
    )
  order by abs(extract(epoch from (t.occurred_at - p_occurred_at)))
  limit 1;

  if v_match is not null then
    insert into public.movo_automation_events(token_hash, request_id, user_id, transaction_id, source, outcome)
    values (p_token_hash, p_request_id, p_user_id, v_match, p_source, 'duplicate_cross_source');
    return jsonb_build_object('duplicate', true, 'matched_by', 'cross_source', 'transaction_id', v_match);
  end if;

  -- e. One transfer row.
  insert into public.movo_automation_events(token_hash, request_id, user_id, source, outcome)
  values (p_token_hash, p_request_id, p_user_id, p_source, 'created')
  returning id into v_event_id;

  insert into public.transactions(
    user_id, account_id, transfer_to_account_id, transaction_type, amount, currency, merchant, category,
    note, occurred_at, source, external_reference, is_pending
  ) values (
    p_user_id, p_from_account_id, p_to_account_id, 'transfer', v_amount, p_currency,
    left('Transfer to ' || coalesce(v_to_name, 'account'), 160), 'transfer',
    left(coalesce(p_note, ''), 1000), p_occurred_at, p_source, left(v_ref, 200), false
  ) returning id into v_transaction_id;

  update public.movo_automation_events set transaction_id = v_transaction_id where id = v_event_id;
  return jsonb_build_object('duplicate', false, 'matched_by', null, 'transaction_id', v_transaction_id);
end;
$$;

revoke all on function public.log_automation_transfer(text, text, uuid, uuid, uuid, numeric, text, timestamptz, text, text, text) from public, anon, authenticated;
grant execute on function public.log_automation_transfer(text, text, uuid, uuid, uuid, numeric, text, timestamptz, text, text, text) to service_role;
