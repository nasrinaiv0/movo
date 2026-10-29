# MOVO × NasrinAI integration

## Request path

The MOVO UI calls the same-origin Vercel function `POST /api/nasrinai/chat`. The function verifies the MOVO Supabase access token, creates a user-scoped Supabase client, and reads only that user's accounts, recent transactions, and active budgets under existing RLS. After the user explicitly opts in, it sends a bounded financial context and the message to `https://nasrinai.com/v1/chat` through a server-only API credential. The context contains account labels/types/currency/opening balances, budgets, and a bounded set of recent or question-matching transaction dates, descriptions, categories, types, amounts, and account labels; transaction notes are excluded.

## Required Vercel environment variables

- `SUPABASE_URL` (or existing `REACT_APP_SUPABASE_URL`)
- `SUPABASE_ANON_KEY` (or existing `REACT_APP_SUPABASE_ANON_KEY`)
- `SUPABASE_SERVICE_ROLE_KEY`: server-only key used exclusively to write/read the opaque upstream conversation mapping table. Never use it for finance queries and never expose it to the browser.
- `NASRINAI_API_KEY`: a NasrinAI server-side credential with permission to call `POST /v1/chat`. Never use a publishable widget key as a bearer credential and never expose this value through a `REACT_APP_*` variable.
- Optional `NASRINAI_BASE_URL` (defaults to `https://nasrinai.com`)
- Optional `MOVO_ALLOWED_ORIGINS` (comma-separated exact origins; default production origin is `https://movo-lime.vercel.app`).

After setting variables, redeploy the Vercel project. The repository change cannot set or inspect deployment secrets.

## Data isolation

- The server verifies the bearer token against MOVO Supabase Auth; client-provided user IDs are never trusted.
- The API creates a Supabase client carrying the user's JWT for financial data, conversations, and messages, so RLS applies to those queries. A server-only service-role client is used only for the opaque upstream-conversation mapping table, which has RLS enabled and no policies or grants for `anon`/`authenticated`.
- Conversation and message rows include `user_id`, RLS policies use `auth.uid()`, and a composite foreign key prevents attaching messages to another user's conversation. The upstream NasrinAI conversation ID is stored in a separate server-only mapping table so clients cannot alter it to point the proxy at another user's upstream conversation.
- Every conversation lookup/update includes the authenticated user's ID. An unknown or other user's conversation ID returns 404.
- The upstream NasrinAI API key remains server-only. The API forwards a bounded context from the authenticated user's own rows and never exposes raw database access to NasrinAI.
- The UI requires explicit consent before sending finance context. The upstream NasrinAI chat service may retain the prompt/context as part of its conversation history under NasrinAI's configured retention policy; confirm that policy and communicate it to users before enabling this in production. MOVO also stores the user/assistant messages in the private MOVO chat tables.
- Chat responses are marked `Cache-Control: no-store`; server logs include only stable error codes, never tokens, financial context, or message content.

## Indexing and retrieval

The migration adds composite indexes for user-scoped conversation/message retrieval and idempotently ensures the existing transaction-by-user/date/category/account and account/budget indexes. Each chat request retrieves at most 80 recent transactions, 50 accounts, and 50 active budgets. This is indexed relational retrieval, not a vector-embedding index; semantic vector indexing should only be added with a separately reviewed per-user embedding schema and retrieval policies.

## Limits and safety

Messages are capped at 4,000 characters; upstream requests time out after 25 seconds. The chat is read-only and does not execute transactions or change budgets. Financial records and chat history are private application data and must never be publicly indexed by search engines. Public SEO indexing applies only to public marketing pages, not authenticated MOVO screens or API routes.

## Deployment verification checklist

1. Apply `supabase/migrations/20261029000100_nasrinai_chat_isolation.sql` to the dedicated MOVO Supabase project.
2. Configure the server-only Vercel variables above and redeploy.
3. Test with two MOVO users: each must see only their own conversations and finance context; using the other user's conversation UUID must return 404.
4. Confirm an unauthenticated request returns 401, a foreign origin returns 403, and an unconfigured upstream returns 503.
5. Verify the Vercel deployment's runtime route can reach `https://nasrinai.com/v1/chat` and that the chosen NasrinAI credential has chat scope.
