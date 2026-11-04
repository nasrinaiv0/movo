-- Enforce account ownership at the database boundary, not only in client validation.
-- PostgreSQL requires a unique key over the referenced composite columns.
create unique index if not exists financial_accounts_id_user_id_uidx
  on public.financial_accounts(id,user_id);

alter table public.scheduled_transactions
  add constraint scheduled_transactions_source_account_owner_fk
  foreign key (account_id,user_id)
  references public.financial_accounts(id,user_id)
  on delete restrict;
alter table public.scheduled_transactions
  add constraint scheduled_transactions_destination_account_owner_fk
  foreign key (transfer_to_account_id,user_id)
  references public.financial_accounts(id,user_id)
  on delete restrict;
alter table public.payment_attempts
  add constraint payment_attempts_account_owner_fk
  foreign key (account_id,user_id)
  references public.financial_accounts(id,user_id)
  on delete set null (account_id);
