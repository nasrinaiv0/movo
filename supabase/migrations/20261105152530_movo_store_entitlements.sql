-- Store-verified subscriptions. The store is the source of truth; client state never grants access.
create table if not exists public.movo_store_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('apple', 'google')),
  product_id text not null,
  tier text not null check (tier in ('pro', 'max', 'ultra')),
  store_subscription_key text not null,
  store_transaction_id text not null,
  original_transaction_id text,
  purchase_token_hash text,
  status text not null check (status in ('active', 'grace_period', 'canceled', 'paused', 'on_hold', 'pending', 'expired', 'revoked')),
  expires_at timestamptz not null,
  environment text not null check (environment in ('production', 'sandbox')),
  verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint movo_store_entitlements_platform_key unique (platform, store_subscription_key),
  constraint movo_store_entitlements_transaction_key unique (platform, store_transaction_id),
  constraint movo_store_entitlements_token_key unique (platform, purchase_token_hash)
);
create index if not exists movo_store_entitlements_user_expiry_idx on public.movo_store_entitlements (user_id, expires_at desc);
create index if not exists movo_store_entitlements_active_idx on public.movo_store_entitlements (user_id, tier, expires_at desc) where status in ('active', 'grace_period', 'canceled');
alter table public.movo_store_entitlements enable row level security;
revoke all on public.movo_store_entitlements from anon, authenticated;
grant select on public.movo_store_entitlements to authenticated;
grant all on public.movo_store_entitlements to service_role;
drop policy if exists "Users can read their own store entitlements" on public.movo_store_entitlements;
create policy "Users can read their own store entitlements" on public.movo_store_entitlements for select to authenticated using ((select auth.uid()) = user_id);
create or replace function public.upsert_movo_store_entitlement(
  p_user_id uuid, p_platform text, p_product_id text, p_tier text,
  p_store_subscription_key text, p_store_transaction_id text,
  p_original_transaction_id text, p_purchase_token_hash text,
  p_status text, p_expires_at timestamptz, p_environment text
) returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare v_id uuid;
begin
  if (select auth.jwt() ->> 'role') is distinct from 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  -- Serialize updates per store subscription, so an old restore cannot undo a refund.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_platform || ':' || p_store_subscription_key, 0));
  select id into v_id from public.movo_store_entitlements
    where platform = p_platform and store_subscription_key = p_store_subscription_key;
  if v_id is not null then
    if exists(select 1 from public.movo_store_entitlements where id = v_id and user_id <> p_user_id) then
      raise exception 'purchase_already_linked' using errcode = '23505';
    end if;
    if exists(select 1 from public.movo_store_entitlements where id = v_id and
      (expires_at > p_expires_at or (status = 'revoked' and store_transaction_id = p_store_transaction_id))) then
      return v_id;
    end if;
  end if;
  insert into public.movo_store_entitlements (
    user_id, platform, product_id, tier, store_subscription_key,
    store_transaction_id, original_transaction_id, purchase_token_hash,
    status, expires_at, environment, verified_at, updated_at
  ) values (
    p_user_id, p_platform, p_product_id, p_tier, p_store_subscription_key,
    p_store_transaction_id, p_original_transaction_id, p_purchase_token_hash,
    p_status, p_expires_at, p_environment, now(), now()
  )
  on conflict (platform, store_subscription_key) do update set
    product_id = excluded.product_id, tier = excluded.tier,
    store_transaction_id = excluded.store_transaction_id,
    original_transaction_id = excluded.original_transaction_id,
    purchase_token_hash = excluded.purchase_token_hash,
    status = excluded.status, expires_at = excluded.expires_at,
    environment = excluded.environment, verified_at = now(), updated_at = now()
  where public.movo_store_entitlements.user_id = excluded.user_id
  returning id into v_id;
  if v_id is null then
    raise exception 'purchase_already_linked' using errcode = '23505';
  end if;
  return v_id;
end;
$$;
revoke all on function public.upsert_movo_store_entitlement(uuid,text,text,text,text,text,text,text,text,timestamptz,text) from public, anon, authenticated;
grant execute on function public.upsert_movo_store_entitlement(uuid,text,text,text,text,text,text,text,text,timestamptz,text) to service_role;


-- Remove the writable public schema from privileged automation RPC search paths.
-- These function bodies schema-qualify their public tables and helper functions.
alter function public.log_automation_transaction_v2(text,text,uuid,uuid,text,numeric,text,text,text,timestamptz,text,text,text)
  set search_path = pg_catalog, pg_temp;
alter function public.log_automation_transfer(text,text,uuid,uuid,uuid,numeric,text,timestamptz,text,text,text)
  set search_path = pg_catalog, pg_temp;
