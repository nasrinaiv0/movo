-- Keep the receiving account separate from the preferred repayment method.
begin;
alter table public.financial_loans add column if not exists payment_account_id uuid;
alter table public.financial_loans add constraint financial_loans_payment_account_owner_fk
  foreign key (payment_account_id, user_id) references public.financial_accounts(id, user_id)
  on delete set null (payment_account_id);
create index financial_loans_payment_account_id_idx on public.financial_loans(payment_account_id, user_id);

create function public.guard_loan_payment_account()
returns trigger language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  if new.payment_account_id is not null and not exists (
    select 1 from public.financial_accounts where id = new.payment_account_id
      and user_id = new.user_id and currency = new.currency and not is_archived
      and account_type in ('bank', 'e_wallet', 'cash', 'card')
  ) then raise exception 'payment_account_owner_or_currency_mismatch' using errcode = '42501'; end if;
  return new;
end
$$;
revoke all on function public.guard_loan_payment_account() from public, anon, authenticated;
create trigger financial_loans_payment_account_guard before insert or update of payment_account_id, user_id, currency
  on public.financial_loans for each row execute function public.guard_loan_payment_account();
comment on column public.financial_loans.payment_account_id is 'Preferred repayment method only. Selecting it does not post or initiate a payment.';
commit;
