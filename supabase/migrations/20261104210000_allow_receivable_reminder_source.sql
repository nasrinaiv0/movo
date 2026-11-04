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
