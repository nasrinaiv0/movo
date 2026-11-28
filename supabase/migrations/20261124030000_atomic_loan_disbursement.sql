-- Staging-only: one request, one liability and at most one initial borrowed posting.
begin;
create table public.loan_creation_requests (
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  payload_digest bytea not null check (octet_length(payload_digest) = 32),
  loan_id uuid references public.financial_loans(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, request_id)
);
alter table public.loan_creation_requests enable row level security;
revoke all on public.loan_creation_requests from public, anon, authenticated;
create index loan_creation_requests_loan_id_idx on public.loan_creation_requests(loan_id);
comment on table public.loan_creation_requests is 'Server-only immutable initial loan request receipt. A deleted loan leaves a tombstone; auth-user erasure cascades. No raw loan metadata duplicated.';

create function public.create_loan_atomic(
  p_request_id uuid, p_expected_user_id uuid, p_name text, p_obligation_type text,
  p_principal numeric, p_currency text, p_new_proceeds boolean, p_account_id uuid,
  p_payment_account_id uuid, p_lender text, p_interest_rate numeric,
  p_interest_schedule jsonb, p_due_date date, p_notes text
) returns public.financial_loans
language plpgsql security definer set search_path = ''
as $loan$
declare
  v_user uuid := auth.uid();
  v_digest bytea;
  v_request public.loan_creation_requests;
  v_loan public.financial_loans;
  v_month jsonb;
  v_index integer := 0;
  v_new boolean;
begin
  if v_user is null or p_expected_user_id is distinct from v_user
    or coalesce(auth.jwt()->>'is_anonymous','false') = 'true' then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  -- Match the recipient-import erasure lock order. Do not return old receipts
  -- or create new ones for anonymous, unverified, deleted or erasing users.
  perform 1 from auth.users where id = v_user and not is_anonymous
    and (email_confirmed_at is not null or phone_confirmed_at is not null) for update;
  if not found or public.movo_account_erasure_pending() then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if p_request_id is null or p_name is null or char_length(btrim(p_name)) not between 1 and 120
    or p_obligation_type is null or p_obligation_type not in ('loan','debt')
    or p_principal is null or p_principal < 0.01 or p_principal >= 1e16 or p_principal <> round(p_principal,2)
    or p_currency is null or p_currency !~ '^[A-Z]{3}$'
    or p_new_proceeds is null or (p_new_proceeds and p_account_id is null)
    or p_interest_rate is null or p_interest_rate < 0 or p_interest_rate > 100 or p_interest_rate <> round(p_interest_rate,5)
    or (p_due_date is not null and not isfinite(p_due_date))
    or char_length(p_lender) > 120 or char_length(p_notes) > 2000
    or p_interest_schedule is null or jsonb_typeof(p_interest_schedule) <> 'array'
  then raise exception 'invalid_loan_request' using errcode = '22023'; end if;
  if jsonb_array_length(p_interest_schedule) > 600
    or (jsonb_array_length(p_interest_schedule) > 0 and p_interest_rate <> 0)
  then raise exception 'invalid_loan_schedule' using errcode = '22023'; end if;
  for v_month in select value from jsonb_array_elements(p_interest_schedule) loop
    v_index := v_index + 1;
    if jsonb_typeof(v_month) <> 'object' or jsonb_typeof(v_month->'month') is distinct from 'number'
      or jsonb_typeof(v_month->'rate') is distinct from 'number'
      or (v_month - 'month' - 'rate') <> '{}'::jsonb
    then raise exception 'invalid_loan_schedule' using errcode = '22023'; end if;
    if (v_month->>'month')::numeric <> v_index or (v_month->>'rate')::numeric not between 0 and 100
      or (v_month->>'rate')::numeric <> round((v_month->>'rate')::numeric,3)
    then raise exception 'invalid_loan_schedule' using errcode = '22023'; end if;
  end loop;
  v_digest := sha256(convert_to(jsonb_build_array(btrim(p_name),p_obligation_type,
    round(p_principal,2),p_currency,p_new_proceeds,p_account_id,p_payment_account_id,p_lender,
    round(p_interest_rate,5),p_interest_schedule,p_due_date,p_notes)::text,'UTF8'));
  insert into public.loan_creation_requests(user_id,request_id,payload_digest)
    values(v_user,p_request_id,v_digest) on conflict (user_id,request_id) do nothing;
  v_new := found;
  select * into strict v_request from public.loan_creation_requests
    where user_id=v_user and request_id=p_request_id for update;
  if v_request.payload_digest <> v_digest then raise exception 'loan_request_payload_conflict' using errcode = '22023'; end if;
  if not v_new then
    select * into v_loan from public.financial_loans where id=v_request.loan_id and user_id=v_user;
    if not found then raise exception 'loan_request_already_consumed' using errcode = '22023'; end if;
    return v_loan;
  end if;
  -- Lock both accounts in deterministic order; recheck owner, currency, status and account type.
  perform id from public.financial_accounts
    where user_id=v_user and id in (p_account_id,p_payment_account_id) order by id for share;
  if p_account_id is not null and not exists (
    select 1 from public.financial_accounts where id=p_account_id and user_id=v_user
      and currency=p_currency and not is_archived and account_type in ('bank','e_wallet','cash')
  ) then raise exception 'receiving_account_owner_currency_or_type_mismatch' using errcode = '42501'; end if;
  if p_payment_account_id is not null and not exists (
    select 1 from public.financial_accounts where id=p_payment_account_id and user_id=v_user
      and currency=p_currency and not is_archived and account_type in ('bank','e_wallet','cash','card')
  ) then raise exception 'payment_account_owner_or_currency_mismatch' using errcode = '42501'; end if;
  insert into public.financial_loans(user_id,name,obligation_type,principal_amount,opening_principal,
    outstanding_principal,currency,account_id,payment_account_id,lender,interest_rate,interest_schedule,due_date,notes)
    values(v_user,btrim(p_name),p_obligation_type,p_principal,case when p_new_proceeds then 0 else p_principal end,
      case when p_new_proceeds then 0 else p_principal end,p_currency,p_account_id,p_payment_account_id,p_lender,
      p_interest_rate,p_interest_schedule,p_due_date,p_notes)
    returning * into v_loan;
  if p_new_proceeds then
    perform public.record_loan_event(v_loan.id,'borrowed',p_principal,p_currency,p_account_id,null,null,'Initial loan proceeds');
  end if;
  update public.loan_creation_requests set loan_id=v_loan.id where user_id=v_user and request_id=p_request_id;
  select * into strict v_loan from public.financial_loans where id=v_loan.id and user_id=v_user;
  return v_loan;
end
$loan$;
revoke all on function public.create_loan_atomic(uuid,uuid,text,text,numeric,text,boolean,uuid,uuid,text,numeric,jsonb,date,text) from public, anon, authenticated, service_role;
grant execute on function public.create_loan_atomic(uuid,uuid,text,text,numeric,text,boolean,uuid,uuid,text,numeric,jsonb,date,text) to authenticated;
commit;
