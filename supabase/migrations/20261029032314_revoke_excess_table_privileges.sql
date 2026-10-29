-- Remove table-level privileges that are not needed by the browser/API roles.
-- RLS does not constrain TRUNCATE, so authenticated clients must not hold it.
revoke truncate, references, trigger on table
  public.budgets,
  public.financial_accounts,
  public.movo_ai_conversations,
  public.movo_ai_messages,
  public.profiles,
  public.transactions
from anon, authenticated;

-- The upstream NasrinAI conversation mapping is server-only.
revoke all on table public.movo_ai_upstream_conversations from anon, authenticated;
