begin;

-- Updates and deletes must pass through the existing CAS and reversal RPCs.
revoke update, delete on public.transactions from public, anon, authenticated;
drop policy if exists transactions_update_own on public.transactions;
drop policy if exists transactions_delete_own on public.transactions;

-- Keep legitimate legacy inserts, but validate ownership of their schedule
-- as well as their two accounts. Deleting a schedule clears only schedule_id.
alter table public.scheduled_transactions
  add constraint scheduled_transactions_id_owner_key unique (id, user_id);

alter table public.transactions
  add constraint transactions_schedule_owner_fk
  foreign key (schedule_id, user_id) references public.scheduled_transactions(id, user_id)
  on delete set null (schedule_id) not valid;

alter table public.transactions drop constraint transactions_schedule_id_fkey;

alter table public.transactions
  add constraint transactions_id_owner_key unique (id, user_id);

alter table public.scheduled_transactions
  add constraint scheduled_transactions_last_transaction_owner_fk
  foreign key (last_transaction_id, user_id) references public.transactions(id, user_id)
  on delete set null (last_transaction_id) not valid;

alter table public.scheduled_transactions drop constraint scheduled_transactions_last_transaction_id_fkey;

alter table public.transactions
  add constraint transactions_safe_cents
  check (amount > 0 and amount < 90071992547409.91) not valid;

commit;
