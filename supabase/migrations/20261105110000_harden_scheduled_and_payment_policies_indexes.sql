-- Follow-up hardening from the live MOVO Supabase advisor review (2026-11-05).
-- Keeps the existing authenticated owner boundary while avoiding per-row auth.uid() evaluation.
begin;

alter policy "Users manage their scheduled transactions" on public.scheduled_transactions
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy "Users manage their payment reminder preferences" on public.payment_reminder_preferences
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy "Users manage their payment reminder events" on public.payment_reminder_events
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- The ALL policy already covers SELECT. Removing this duplicate permissive policy preserves access
-- while ensuring the planner evaluates one owner predicate rather than two.
drop policy if exists "Users read their payment reminder events" on public.payment_reminder_events;
alter policy "Users manage their payment attempts" on public.payment_attempts
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Cover the FK indexes reported by the original advisor review. Account ownership constraints
-- reference (account_id,user_id) and (transfer_to_account_id,user_id), not nonexistent columns.
create index if not exists payment_attempts_account_id_idx
  on public.payment_attempts(account_id);
create index if not exists payment_attempts_account_owner_idx
  on public.payment_attempts(account_id, user_id);
create index if not exists scheduled_transactions_account_id_idx
  on public.scheduled_transactions(account_id);
create index if not exists scheduled_transactions_destination_account_owner_idx
  on public.scheduled_transactions(transfer_to_account_id, user_id);
create index if not exists scheduled_transactions_last_transaction_id_idx
  on public.scheduled_transactions(last_transaction_id);
create index if not exists scheduled_transactions_source_account_owner_idx
  on public.scheduled_transactions(account_id, user_id);
create index if not exists scheduled_transactions_transfer_to_account_id_idx
  on public.scheduled_transactions(transfer_to_account_id);
create index if not exists transactions_schedule_id_idx
  on public.transactions(schedule_id);

commit;
