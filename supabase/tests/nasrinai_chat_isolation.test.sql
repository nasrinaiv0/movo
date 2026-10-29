-- Run after applying 20261029013604_nasrinai_chat_isolation.sql, 20261029013801_nasrinai_chat_fk_indexes.sql, and 20261029032314_revoke_excess_table_privileges.sql in a test project.
do $$
declare
  conversations_rls boolean;
  messages_rls boolean;
  mapping_rls boolean;
begin
  select c.relrowsecurity into conversations_rls
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'movo_ai_conversations';
  select c.relrowsecurity into messages_rls
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'movo_ai_messages';
  select c.relrowsecurity into mapping_rls
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'movo_ai_upstream_conversations';

  if conversations_rls is distinct from true or messages_rls is distinct from true or mapping_rls is distinct from true then
    raise exception 'NasrinAI chat tables must all have RLS enabled';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'movo_ai_upstream_conversations'
  ) then
    raise exception 'Upstream conversation mapping must have no client-facing RLS policies';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'movo_ai_conversations'
      and policyname = 'movo_ai_conversations_select_own'
      and qual like '%auth.uid()%'
  ) then
    raise exception 'Conversation select policy must be scoped to auth.uid()';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'movo_ai_messages'
      and policyname = 'movo_ai_messages_select_own'
      and qual like '%auth.uid()%'
  ) then
    raise exception 'Message select policy must be scoped to auth.uid()';
  end if;

  if not exists (select 1 from pg_indexes where schemaname='public' and indexname='movo_ai_messages_user_conversation_created_idx') then
    raise exception 'Expected per-user conversation retrieval index is missing';
  end if;
  if not exists (select 1 from pg_indexes where schemaname='public' and indexname='transactions_user_occurred_at_idx') then
    raise exception 'Expected finance retrieval index is missing';
  end if;

  if has_table_privilege('anon', 'public.movo_ai_conversations', 'SELECT')
    or has_table_privilege('anon', 'public.movo_ai_messages', 'SELECT') then
    raise exception 'Anonymous users must not have SELECT privileges on private chat tables';
  end if;

  if has_table_privilege('authenticated', 'public.movo_ai_upstream_conversations', 'SELECT')
    or has_table_privilege('authenticated', 'public.movo_ai_upstream_conversations', 'INSERT') then
    raise exception 'Authenticated users must not access upstream conversation mappings';
  end if;

  if not exists (select 1 from pg_indexes where schemaname='public' and indexname='movo_ai_messages_conversation_owner_idx') then
    raise exception 'Expected message ownership foreign-key index is missing';
  end if;
  if not exists (select 1 from pg_indexes where schemaname='public' and indexname='movo_ai_upstream_conversations_owner_idx') then
    raise exception 'Expected upstream ownership foreign-key index is missing';
  end if;
  if not exists (select 1 from pg_indexes where schemaname='public' and indexname='movo_ai_upstream_conversations_user_idx') then
    raise exception 'Expected upstream user foreign-key index is missing';
  end if;

  if exists (
    select 1 from information_schema.role_table_grants
    where table_schema = 'public'
      and grantee in ('anon', 'authenticated')
      and privilege_type in ('TRUNCATE', 'TRIGGER', 'REFERENCES')
      and table_name in ('budgets', 'financial_accounts', 'movo_ai_conversations', 'movo_ai_messages', 'profiles', 'transactions')
  ) then
    raise exception 'Browser roles must not have TRUNCATE, TRIGGER, or REFERENCES privileges on private tables';
  end if;
end $$;
