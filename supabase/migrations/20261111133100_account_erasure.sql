begin;

-- The Storage API can fail independently of PostgreSQL. Keep an account-scoped
-- request across retries so new receipt and QR uploads cannot restart cleanup.
create table public.movo_account_erasure_requests (
  user_id uuid primary key references auth.users(id) on delete cascade,
  requested_at timestamptz not null default now()
);
alter table public.movo_account_erasure_requests enable row level security;
revoke all on public.movo_account_erasure_requests from public, anon, authenticated;
grant select, insert on public.movo_account_erasure_requests to service_role;

create function public.movo_account_erasure_pending()
returns boolean language sql stable security definer set search_path = '' as $$
  -- Access tokens may remain JWT-valid after auth.users deletion. A stale
  -- token must not recreate private files after the erasure request cascades.
  select (select auth.uid()) is null
    or not exists (
      select 1 from auth.users where id = (select auth.uid())
    )
    or exists (
      select 1 from public.movo_account_erasure_requests where user_id = (select auth.uid())
    )
$$;
revoke all on function public.movo_account_erasure_pending() from public, anon, authenticated;
grant execute on function public.movo_account_erasure_pending() to authenticated;

create policy movo_erasure_block_new_upload on storage.objects
as restrictive for insert to authenticated
with check (
  bucket_id not in ('movo-account-qrs', 'movo-receipts')
  or not (select public.movo_account_erasure_pending())
);
create policy movo_erasure_block_upload_changes on storage.objects
as restrictive for update to authenticated
using (
  bucket_id not in ('movo-account-qrs', 'movo-receipts')
  or not (select public.movo_account_erasure_pending())
)
with check (
  bucket_id not in ('movo-account-qrs', 'movo-receipts')
  or not (select public.movo_account_erasure_pending())
);

-- Shared by the authenticated HTTP flows for clearing records and deleting the
-- account. The HTTP server derives p_user_id from the verified access token.
create function public.movo_clear_cloud_records(p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from auth.users where id = p_user_id for update;
  if not found then raise exception 'account_not_found'; end if;

  delete from public.movo_automation_events where user_id = p_user_id;
  delete from public.movo_automation_inbox where user_id = p_user_id;
  delete from public.movo_automation_tokens where user_id = p_user_id;
  delete from public.payment_attempts where user_id = p_user_id;
  delete from public.payment_reminder_events where user_id = p_user_id;
  delete from public.payment_reminder_preferences where user_id = p_user_id;
  delete from public.bill_payments where user_id = p_user_id;
  delete from public.bill_occurrences where user_id = p_user_id;
  delete from public.financial_bills where user_id = p_user_id;
  delete from public.loan_events where user_id = p_user_id;
  delete from public.financial_loans where user_id = p_user_id;
  delete from public.receivable_events where user_id = p_user_id;
  delete from public.financial_receivables where user_id = p_user_id;
  delete from public.goal_allocations where user_id = p_user_id;
  delete from public.savings_goals where user_id = p_user_id;
  delete from public.plan_funding_allocations where user_id = p_user_id;
  delete from public.allocation_events where user_id = p_user_id;
  delete from public.accounting_postings where user_id = p_user_id;
  delete from public.scheduled_transactions where user_id = p_user_id;
  delete from public.transactions where user_id = p_user_id;
  delete from public.financial_accounts where user_id = p_user_id;
  delete from public.budgets where user_id = p_user_id;
  delete from public.movo_sync_operations where user_id = p_user_id;
  delete from public.movo_ai_conversations where user_id = p_user_id;
  delete from public.user_preferences where user_id = p_user_id;
end
$$;

-- Relational cleanup and Auth deletion commit together. Call only after the
-- Storage API confirms the user's private files were removed.
create function public.movo_finish_account_erasure(p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from auth.users where id = p_user_id for update;
  if not found then return; end if;
  if not exists (
    select 1 from public.movo_account_erasure_requests where user_id = p_user_id
  ) then raise exception 'account_erasure_not_requested'; end if;
  if exists (
    select 1 from storage.objects
    where bucket_id in ('movo-account-qrs', 'movo-receipts')
      and name like p_user_id::text || '/%'
  ) then raise exception 'account_storage_cleanup_incomplete'; end if;

  delete from public.movo_iap_ack_jobs as job
  using public.movo_store_entitlements as entitlement
  where entitlement.user_id = p_user_id
    and entitlement.platform = 'google'
    and entitlement.purchase_token_hash = job.purchase_token_hash;

  perform public.movo_clear_cloud_records(p_user_id);
  delete from auth.users where id = p_user_id;
end
$$;
revoke all on function public.movo_clear_cloud_records(uuid), public.movo_finish_account_erasure(uuid)
  from public, anon, authenticated;
grant execute on function public.movo_clear_cloud_records(uuid), public.movo_finish_account_erasure(uuid)
  to service_role;

commit;
