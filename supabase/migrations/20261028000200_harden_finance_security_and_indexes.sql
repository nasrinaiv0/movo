-- MOVO hardening: index foreign keys and restrict trigger-only RPC execution.
create index if not exists transactions_account_owner_fk_idx
  on public.transactions(account_id, user_id);

create index if not exists transactions_transfer_target_owner_fk_idx
  on public.transactions(transfer_to_account_id, user_id)
  where transfer_to_account_id is not null;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
