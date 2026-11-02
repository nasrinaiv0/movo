-- Automation inbox: phone automations that could not be logged (no matching account, an unclear voice phrase, a
-- rate limit, a server error) are kept for the person to review in MOVO instead of being lost. The app shows them
-- in "While you were away", where the person picks an account and logs the payment, or dismisses it.
--
-- Security model
--   * Only the server (service_role) writes rows, through record_automation_failure(), which checks that the
--     device key is active and belongs to the user, de-duplicates retries per request and caps volume per person.
--   * A signed-in person can read and delete their own rows, and can only change status / transaction_id /
--     resolved_at (column grants), and only to point at one of their own transactions (policy check).
--   * anon has no access at all.

create table if not exists public.movo_automation_inbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text references public.movo_automation_tokens(token_hash) on delete set null,
  request_id text not null check (request_id ~ '^[a-f0-9]{64}$'),
  source text not null check (source in ('applepay', 'googlepay', 'bank', 'notification', 'siri_shortcut', 'android_assistant')),
  reason text not null check (reason in ('account_match_required', 'account_required', 'account_invalid', 'clarification_required', 'invalid_transaction', 'rate_limited', 'server_error')),
  transaction_type text not null default 'expense' check (transaction_type in ('expense', 'income')),
  amount numeric(20,2) check (amount is null or (amount > 0 and amount < 1000000000)),
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  merchant text check (merchant is null or char_length(merchant) <= 160),
  account_hint text check (account_hint is null or char_length(account_hint) <= 100),
  spoken_text text check (spoken_text is null or char_length(spoken_text) <= 300),
  external_reference text check (external_reference is null or char_length(external_reference) <= 200),
  occurred_at timestamptz not null default now(),
  status text not null default 'failed' check (status in ('failed', 'logged', 'dismissed')),
  transaction_id uuid references public.transactions(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (user_id, request_id)
);
create index if not exists movo_automation_inbox_user_created_idx on public.movo_automation_inbox(user_id, created_at desc);
create index if not exists movo_automation_inbox_token_hash_idx on public.movo_automation_inbox(token_hash);
create index if not exists movo_automation_inbox_transaction_id_idx on public.movo_automation_inbox(transaction_id);

alter table public.movo_automation_inbox enable row level security;
revoke all on public.movo_automation_inbox from public, anon, authenticated;
grant select, delete on public.movo_automation_inbox to authenticated;
grant update (status, transaction_id, resolved_at) on public.movo_automation_inbox to authenticated;
grant all on public.movo_automation_inbox to service_role;

create policy movo_automation_inbox_select_own on public.movo_automation_inbox
  for select to authenticated using ((select auth.uid()) = user_id);
create policy movo_automation_inbox_update_own on public.movo_automation_inbox
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (transaction_id is null or exists (
      select 1 from public.transactions t where t.id = transaction_id and t.user_id = (select auth.uid())
    ))
  );
create policy movo_automation_inbox_delete_own on public.movo_automation_inbox
  for delete to authenticated using ((select auth.uid()) = user_id);
create policy movo_automation_inbox_deny_anon on public.movo_automation_inbox
  for all to anon using (false) with check (false);

create or replace function public.record_automation_failure(
  p_token_hash text,
  p_request_id text,
  p_user_id uuid,
  p_source text,
  p_reason text,
  p_transaction_type text,
  p_amount numeric,
  p_currency text,
  p_merchant text,
  p_account_hint text,
  p_spoken_text text,
  p_external_reference text,
  p_occurred_at timestamptz
) returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_id uuid;
  v_daily integer;
begin
  if p_token_hash !~ '^[a-f0-9]{64}$' or p_request_id !~ '^[a-f0-9]{64}$' or p_user_id is null then
    raise exception 'invalid_request';
  end if;
  if not exists (select 1 from public.movo_automation_tokens where token_hash = p_token_hash and user_id = p_user_id and active) then
    raise exception 'token_invalid';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('movo-inbox:' || p_user_id::text, 0));

  -- Retries of the same request keep the one row.
  select id into v_id from public.movo_automation_inbox where user_id = p_user_id and request_id = p_request_id;
  if found then return v_id; end if;

  -- At most 100 new review items per person per day; beyond that nothing more is stored.
  select count(*) into v_daily from public.movo_automation_inbox
  where user_id = p_user_id and created_at > now() - interval '24 hours';
  if v_daily >= 100 then return null; end if;

  insert into public.movo_automation_inbox(
    user_id, token_hash, request_id, source, reason, transaction_type, amount, currency, merchant,
    account_hint, spoken_text, external_reference, occurred_at
  ) values (
    p_user_id, p_token_hash, p_request_id, p_source, p_reason,
    case when p_transaction_type = 'income' then 'income' else 'expense' end,
    case when p_amount > 0 and p_amount < 1000000000 then round(p_amount, 2) else null end,
    case when p_currency ~ '^[A-Z]{3}$' then p_currency else null end,
    nullif(left(btrim(coalesce(p_merchant, '')), 160), ''),
    nullif(left(btrim(coalesce(p_account_hint, '')), 100), ''),
    nullif(left(btrim(coalesce(p_spoken_text, '')), 300), ''),
    nullif(left(btrim(coalesce(p_external_reference, '')), 200), ''),
    coalesce(p_occurred_at, now())
  ) returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.record_automation_failure(text, text, uuid, text, text, text, numeric, text, text, text, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.record_automation_failure(text, text, uuid, text, text, text, numeric, text, text, text, text, text, timestamptz) to service_role;
