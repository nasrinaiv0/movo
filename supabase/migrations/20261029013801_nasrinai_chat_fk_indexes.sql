-- Cover referencing columns for the chat ownership foreign keys.
-- These complement the user-first indexes used by the chat-history queries.
create index if not exists movo_ai_messages_conversation_owner_idx
  on public.movo_ai_messages(conversation_id, user_id);

create index if not exists movo_ai_upstream_conversations_owner_idx
  on public.movo_ai_upstream_conversations(conversation_id, user_id);

create index if not exists movo_ai_upstream_conversations_user_idx
  on public.movo_ai_upstream_conversations(user_id);
