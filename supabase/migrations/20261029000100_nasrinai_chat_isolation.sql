-- MOVO ↔ NasrinAI private chat, ownership, and retrieval indexes.
-- Chat data is stored separately from financial records. Every row is owned by
-- exactly one authenticated MOVO user; clients never receive the NasrinAI API key.

create table if not exists public.movo_ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New conversation' check (char_length(title) <= 120),
  nasrinai_conversation_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create unique index if not exists movo_ai_conversations_upstream_id_unique
  on public.movo_ai_conversations(nasrinai_conversation_id)
  where nasrinai_conversation_id is not null;
create index if not exists movo_ai_conversations_user_updated_idx
  on public.movo_ai_conversations(user_id, updated_at desc);

create table if not exists public.movo_ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) <= 12000),
  created_at timestamptz not null default now(),
  constraint movo_ai_messages_conversation_owner_fk
    foreign key (conversation_id, user_id)
    references public.movo_ai_conversations(id, user_id) on delete cascade
);

create index if not exists movo_ai_messages_user_conversation_created_idx
  on public.movo_ai_messages(user_id, conversation_id, created_at asc);
create index if not exists movo_ai_messages_user_created_idx
  on public.movo_ai_messages(user_id, created_at desc);

-- The finance repository already has these indexes on fresh installs. Repeat
-- them idempotently here so older deployed databases get the retrieval indexes.
create index if not exists transactions_user_occurred_at_idx
  on public.transactions(user_id, occurred_at desc);
create index if not exists transactions_user_category_date_idx
  on public.transactions(user_id, category, occurred_at desc);
create index if not exists transactions_user_account_date_idx
  on public.transactions(user_id, account_id, occurred_at desc);
create index if not exists financial_accounts_user_display_idx
  on public.financial_accounts(user_id, display_order, created_at);
create index if not exists budgets_user_active_idx
  on public.budgets(user_id, is_active);

alter table public.movo_ai_conversations enable row level security;
alter table public.movo_ai_messages enable row level security;

drop policy if exists movo_ai_conversations_select_own on public.movo_ai_conversations;
create policy movo_ai_conversations_select_own on public.movo_ai_conversations
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists movo_ai_conversations_insert_own on public.movo_ai_conversations;
create policy movo_ai_conversations_insert_own on public.movo_ai_conversations
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists movo_ai_conversations_update_own on public.movo_ai_conversations;
create policy movo_ai_conversations_update_own on public.movo_ai_conversations
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
drop policy if exists movo_ai_conversations_delete_own on public.movo_ai_conversations;
create policy movo_ai_conversations_delete_own on public.movo_ai_conversations
  for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists movo_ai_messages_select_own on public.movo_ai_messages;
create policy movo_ai_messages_select_own on public.movo_ai_messages
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists movo_ai_messages_insert_own on public.movo_ai_messages;
create policy movo_ai_messages_insert_own on public.movo_ai_messages
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists movo_ai_messages_delete_own on public.movo_ai_messages;
create policy movo_ai_messages_delete_own on public.movo_ai_messages
  for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.movo_ai_conversations, public.movo_ai_messages from anon;
grant select, insert, update, delete on public.movo_ai_conversations to authenticated;
grant select, insert, delete on public.movo_ai_messages to authenticated;
