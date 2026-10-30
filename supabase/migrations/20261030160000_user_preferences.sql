-- Per-user MOVO preferences and custom card-sticker artwork, so a signed-in person sees the same card styles,
-- layouts, theme, subscriptions and plans on every device. One row per user; only that user can read or change it.
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  prefs jsonb not null default '{}'::jsonb,
  stickers jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  constraint user_preferences_prefs_object check (jsonb_typeof(prefs) = 'object'),
  constraint user_preferences_stickers_array check (jsonb_typeof(stickers) = 'array'),
  constraint user_preferences_prefs_size check (octet_length(prefs::text) <= 262144),
  constraint user_preferences_stickers_size check (octet_length(stickers::text) <= 4194304)
);

alter table public.user_preferences enable row level security;

create policy user_preferences_select_own on public.user_preferences
  for select to authenticated using ((select auth.uid()) = user_id);
create policy user_preferences_insert_own on public.user_preferences
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy user_preferences_update_own on public.user_preferences
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy user_preferences_delete_own on public.user_preferences
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on table public.user_preferences from anon;
revoke all on table public.user_preferences from authenticated;
grant select, insert, update, delete on table public.user_preferences to authenticated;
