-- Explicitly document the no-client-access model for automation credentials/events.
create policy movo_automation_tokens_deny_client_access
  on public.movo_automation_tokens for all to anon, authenticated
  using (false) with check (false);
create policy movo_automation_events_deny_client_access
  on public.movo_automation_events for all to anon, authenticated
  using (false) with check (false);
create index if not exists movo_automation_events_transaction_id_idx
  on public.movo_automation_events(transaction_id);
