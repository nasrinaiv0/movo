-- Forward-compatible constraint update for projects that applied the earlier reminder migrations.
alter table public.payment_reminder_events
  drop constraint if exists payment_reminder_events_source_type_check;
alter table public.payment_reminder_events
  add constraint payment_reminder_events_source_type_check
  check (source_type in ('scheduled','bill','subscription','loan','credit_card','receivable'));

alter table public.payment_attempts
  drop constraint if exists payment_attempts_source_type_check;
alter table public.payment_attempts
  add constraint payment_attempts_source_type_check
  check (source_type in ('scheduled','bill','subscription','loan','credit_card','receivable'));

-- A payment attempt may only reference an account owned by the same user.
drop policy if exists "Users manage their payment attempts" on public.payment_attempts;
create policy "Users manage their payment attempts" on public.payment_attempts
  for all to authenticated
  using (
    auth.uid()=user_id and (
      account_id is null or exists (
        select 1 from public.financial_accounts a
        where a.id=payment_attempts.account_id and a.user_id=auth.uid()
      )
    )
  )
  with check (
    auth.uid()=user_id and (
      account_id is null or exists (
        select 1 from public.financial_accounts a
        where a.id=payment_attempts.account_id and a.user_id=auth.uid()
      )
    )
  );
