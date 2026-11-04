-- Enforce account ownership at the database boundary, not only in client validation.
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
