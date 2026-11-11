-- Non-destructive covering indexes for five FK columns reported 2026-11-10.
-- No changes to owner policies, privileges, data, or calculations.
create index if not exists movo_owner_audit_log_target_user_id_idx
  on public.movo_owner_audit_log (target_user_id);
create index if not exists movo_owner_work_items_created_by_idx
  on public.movo_owner_work_items (created_by);
create index if not exists movo_owner_work_items_updated_by_idx
  on public.movo_owner_work_items (updated_by);
create index if not exists movo_referral_points_ledger_referred_id_idx
  on public.movo_referral_points_ledger (referred_id);
create index if not exists movo_referral_points_ledger_source_entitlement_id_idx
  on public.movo_referral_points_ledger (source_entitlement_id);
