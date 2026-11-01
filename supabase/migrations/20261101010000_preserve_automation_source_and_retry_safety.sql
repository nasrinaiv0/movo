-- Add a source-aware overload while retaining the old service-role-only signature during rollout.
-- This avoids a gap where the currently deployed API calls a function that was just dropped.
-- Preserve the actual source supplied by the iOS Shortcut and make retries idempotent
-- before applying rate limits.

create function public.log_automation_transaction(
  p_token_hash text,
  p_request_id text,
  p_user_id uuid,
  p_account_id uuid,
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
  v_recent_count integer;
  v_daily_count integer;
begin
  if p_token_hash !~ '^[a-f0-9]{64}$'
    or p_request_id !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid_request';
  end if;

  if p_amount is null or p_amount <= 0 or p_amount >= 1000000000
    or p_merchant is null or char_length(btrim(p_merchant)) < 1
    or char_length(p_merchant) > 160
    or p_currency !~ '^[A-Z]{3}$'
    or p_source not in ('applepay', 'googlepay', 'bank', 'notification') then
    raise exception 'invalid_transaction';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_token_hash, 0));

  -- Return an existing transaction before rate-limit checks so retries of a
  -- successful request remain safe even when the device is near its quota.
  select transaction_id into v_transaction_id
  from public.movo_automation_events
  where token_hash = p_token_hash and request_id = p_request_id;

  if found then
    return jsonb_build_object('duplicate', true, 'transaction_id', v_transaction_id);
  end if;

  select count(*) into v_recent_count
  from public.movo_automation_events
  where token_hash = p_token_hash and created_at > now() - interval '1 minute';
  if v_recent_count >= 10 then raise exception 'rate_limited'; end if;

  select count(*) into v_daily_count
  from public.movo_automation_events
  where token_hash = p_token_hash and created_at > now() - interval '24 hours';
  if v_daily_count >= 200 then raise exception 'rate_limited'; end if;

  if not exists (
    select 1 from public.financial_accounts
    where id = p_account_id and user_id = p_user_id and is_archived = false
  ) then
    raise exception 'account_invalid';
  end if;

  insert into public.movo_automation_events(token_hash, request_id, user_id)
  values (p_token_hash, p_request_id, p_user_id)
  on conflict (token_hash, request_id) do nothing
  returning id into v_event_id;

  if v_event_id is null then
    select transaction_id into v_transaction_id
    from public.movo_automation_events
    where token_hash = p_token_hash and request_id = p_request_id;
    return jsonb_build_object('duplicate', true, 'transaction_id', v_transaction_id);
  end if;

  insert into public.transactions(
    user_id, account_id, transaction_type, amount, currency, merchant, category,
    note, occurred_at, source, external_reference, is_pending
  ) values (
    p_user_id, p_account_id, 'expense', round(p_amount, 2), p_currency,
    btrim(p_merchant), coalesce(nullif(btrim(p_category), ''), 'Other'),
    left(coalesce(p_note, ''), 1000), p_occurred_at, p_source,
    left(nullif(p_external_reference, ''), 200), false
  ) returning id into v_transaction_id;

  update public.movo_automation_events
  set transaction_id = v_transaction_id
  where id = v_event_id;

  return jsonb_build_object('duplicate', false, 'transaction_id', v_transaction_id);
end;
$$;

revoke all on function public.log_automation_transaction(text, text, uuid, uuid, numeric, text, text, text, timestamptz, text, text, text) from public, anon, authenticated;
grant execute on function public.log_automation_transaction(text, text, uuid, uuid, numeric, text, text, text, timestamptz, text, text, text) to service_role;
