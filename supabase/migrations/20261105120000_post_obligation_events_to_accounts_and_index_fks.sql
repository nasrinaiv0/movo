-- Post loan and receivable events to their selected cash account atomically.
-- The accounting_postings rows are the single source of cash impact for these events.
-- Existing transaction reversal/restoration RPCs already remove/recreate these source-linked postings.
begin;

create or replace function public.record_loan_event(
  p_loan_id uuid,
  p_event_type text,
  p_amount numeric,
  p_currency text default 'PHP',
  p_account_id uuid default null,
  p_transaction_id uuid default null,
  p_occurred_at timestamptz default null,
  p_note text default null
)
returns public.loan_events
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_user uuid := auth.uid();
  v_loan public.financial_loans;
  v_event public.loan_events;
  v_signed numeric;
  v_currency text := coalesce(p_currency, 'PHP');
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_amount is null or p_amount <= 0 or p_amount >= 1e16 then raise exception 'invalid_amount' using errcode = '22023'; end if;
  if p_event_type not in ('borrowed','principal_increase','principal_payment','interest_payment','fee') then raise exception 'invalid_loan_event' using errcode = '22023'; end if;
  if p_account_id is null then raise exception 'loan_event_account_required' using errcode = '22023'; end if;

  select * into v_loan from public.financial_loans
  where id = p_loan_id and user_id = v_user for update;
  if not found then raise exception 'loan_not_found' using errcode = 'P0002'; end if;
  if p_event_type = 'principal_payment' and round(p_amount,2) > v_loan.outstanding_principal then
    raise exception 'payment_exceeds_principal' using errcode = '22023';
  end if;
  if not exists (select 1 from public.financial_accounts
    where id = p_account_id and user_id = v_user and currency = v_currency) then
    raise exception 'account_owner_or_currency_mismatch' using errcode = '42501';
  end if;
  if p_transaction_id is not null and not exists (
    select 1 from public.transactions where id = p_transaction_id and user_id = v_user
  ) then raise exception 'transaction_owner_mismatch' using errcode = '42501'; end if;

  insert into public.loan_events(user_id,loan_id,event_type,amount,currency,account_id,transaction_id,occurred_at,note)
  values(v_user,p_loan_id,p_event_type,round(p_amount,2),v_currency,p_account_id,p_transaction_id,coalesce(p_occurred_at,now()),left(p_note,1000))
  returning * into v_event;

  if p_event_type in ('borrowed','principal_increase') then
    update public.financial_loans set outstanding_principal=outstanding_principal+round(p_amount,2),
      updated_at=now(),status='active' where id=p_loan_id;
  elsif p_event_type='principal_payment' then
    update public.financial_loans set outstanding_principal=greatest(0,outstanding_principal-round(p_amount,2)),
      updated_at=now(),status=case when outstanding_principal-round(p_amount,2)<=0 then 'paid_off' else 'active' end
    where id=p_loan_id;
  end if;

  v_signed := case
    when p_event_type in ('borrowed','principal_increase') then round(p_amount,2)
    when p_event_type in ('principal_payment','interest_payment','fee') then -round(p_amount,2)
    else 0 end;
  if v_signed <> 0 then
    insert into public.accounting_postings(user_id,account_id,signed_amount,currency,source_type,source_id,occurred_at)
    values(v_user,p_account_id,v_signed,v_currency,'loan_event',v_event.id,v_event.occurred_at)
    on conflict (source_type,source_id,account_id) do nothing;
  end if;
  return v_event;
end
$function$;

create or replace function public.record_receivable_event(
  p_receivable_id uuid,
  p_event_type text,
  p_amount numeric,
  p_currency text default 'PHP',
  p_account_id uuid default null,
  p_transaction_id uuid default null,
  p_occurred_at timestamptz default null,
  p_note text default null
)
returns public.receivable_events
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_user uuid := auth.uid();
  v_item public.financial_receivables;
  v_event public.receivable_events;
  v_signed numeric;
  v_currency text := coalesce(p_currency, 'PHP');
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_amount is null or p_amount <= 0 or p_amount >= 1e16 then raise exception 'invalid_amount' using errcode = '22023'; end if;
  if p_event_type not in ('lent','amount_increased','collected','written_off') then raise exception 'invalid_receivable_event' using errcode = '22023'; end if;
  if p_event_type <> 'written_off' and p_account_id is null then
    raise exception 'receivable_event_account_required' using errcode = '22023';
  end if;

  select * into v_item from public.financial_receivables
  where id = p_receivable_id and user_id = v_user for update;
  if not found then raise exception 'receivable_not_found' using errcode = 'P0002'; end if;
  if p_event_type in ('collected','written_off') and round(p_amount,2) > v_item.outstanding_amount then
    raise exception 'event_exceeds_receivable' using errcode = '22023';
  end if;
  if p_account_id is not null and not exists (select 1 from public.financial_accounts
    where id = p_account_id and user_id = v_user and currency = v_currency) then
    raise exception 'account_owner_or_currency_mismatch' using errcode = '42501';
  end if;
  if p_transaction_id is not null and not exists (
    select 1 from public.transactions where id = p_transaction_id and user_id = v_user
  ) then raise exception 'transaction_owner_mismatch' using errcode = '42501'; end if;

  insert into public.receivable_events(user_id,receivable_id,event_type,amount,currency,account_id,transaction_id,occurred_at,note)
  values(v_user,p_receivable_id,p_event_type,round(p_amount,2),v_currency,p_account_id,p_transaction_id,coalesce(p_occurred_at,now()),left(p_note,1000))
  returning * into v_event;

  if p_event_type in ('lent','amount_increased') then
    update public.financial_receivables set outstanding_amount=outstanding_amount+round(p_amount,2),
      updated_at=now(),status='active' where id=p_receivable_id;
  else
    update public.financial_receivables set outstanding_amount=greatest(0,outstanding_amount-round(p_amount,2)),
      updated_at=now(),status=case when outstanding_amount-round(p_amount,2)<=0
        then case when p_event_type='written_off' then 'written_off' else 'settled' end else 'active' end
    where id=p_receivable_id;
  end if;

  v_signed := case
    when p_event_type in ('lent','amount_increased') then -round(p_amount,2)
    when p_event_type='collected' then round(p_amount,2)
    else 0 end;
  if v_signed <> 0 then
    insert into public.accounting_postings(user_id,account_id,signed_amount,currency,source_type,source_id,occurred_at)
    values(v_user,p_account_id,v_signed,v_currency,'receivable_event',v_event.id,v_event.occurred_at)
    on conflict (source_type,source_id,account_id) do nothing;
  end if;
  return v_event;
end
$function$;

-- The first hardening migration already covers scheduled transaction, payment attempt account,
-- and transaction schedule indexes. Add the three remaining FK indexes only.
create index if not exists allocation_events_account_id_idx on public.allocation_events(account_id);
create index if not exists payment_attempts_transaction_id_idx on public.payment_attempts(transaction_id);
create index if not exists plan_funding_allocations_account_id_idx on public.plan_funding_allocations(account_id);

revoke all on function public.record_loan_event(uuid,text,numeric,text,uuid,uuid,timestamptz,text) from public, anon;
revoke all on function public.record_receivable_event(uuid,text,numeric,text,uuid,uuid,timestamptz,text) from public, anon;
grant execute on function public.record_loan_event(uuid,text,numeric,text,uuid,uuid,timestamptz,text) to authenticated;
grant execute on function public.record_receivable_event(uuid,text,numeric,text,uuid,uuid,timestamptz,text) to authenticated;

commit;
