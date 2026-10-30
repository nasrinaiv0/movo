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

## Google sign-in (Supabase OAuth)

MOVO uses Supabase Auth with Google as the OAuth provider. The sign-in screen includes a **Continue with Google** action; it starts `signInWithOAuth({ provider: 'google' })` and returns to the current MOVO origin. The chat API independently requires `consent: true` on every POST and explicitly filters finance queries by the authenticated `user_id` in addition to relying on RLS. Supabase owns the OAuth code exchange and browser session persistence; the client uses the PKCE flow and Google tokens are not stored in MOVO application tables.

Configure this in the dedicated MOVO Supabase project (`cjsjmorqvuvvwbfyztiz`):

1. In **Authentication → Sign In / Providers → Google**, enable Google and enter the Google OAuth **Web application** client ID and client secret. Use a dedicated Google OAuth client for MOVO or add the callback to an existing client only if you intentionally want to share that OAuth app.
2. In Google Cloud Console → APIs & Services → Credentials → that OAuth client, add this **Authorized redirect URI** exactly: `https://cjsjmorqvuvvwbfyztiz.supabase.co/auth/v1/callback`. This is Supabase's callback—not MOVO's domain.
3. In Supabase **Authentication → URL Configuration**, set the Site URL to `https://movo.nasrinai.com` and add these allowed redirect URLs:
   - `https://movo.nasrinai.com/`
   - `https://movo-lime.vercel.app/`
   - `http://localhost:3000/` (local development only; do not use localhost as a production redirect)
4. Save, then test a brand-new Google session and a returning session on the production domain. Confirm sign-out clears the session and that each Google identity maps to a separate Supabase user ID.

The repository implementation is complete for initiating Google OAuth, but enabling the provider requires the Google client ID/secret and Supabase dashboard settings. Those credentials are not stored in source control or in browser environment variables. Do not put the Google client secret in Vercel `REACT_APP_*` variables; Supabase stores it in the Auth provider configuration.

## Data isolation

- The server verifies the bearer token against MOVO Supabase Auth; client-provided user IDs are never trusted.
- The API creates a Supabase client carrying the user's JWT for financial data, conversations, and messages, so RLS applies to those queries. A server-only service-role client is used only for the opaque upstream-conversation mapping table, which has RLS enabled and no policies or grants for `anon`/`authenticated`.
- Conversation and message rows include `user_id`, RLS policies use `auth.uid()`, and a composite foreign key prevents attaching messages to another user's conversation. The upstream NasrinAI conversation ID is stored in a separate server-only mapping table so clients cannot alter it to point the proxy at another user's upstream conversation.
- Every conversation lookup/update includes the authenticated user's ID. An unknown or other user's conversation ID returns 404.
- The upstream NasrinAI API key remains server-only. The API forwards a bounded context from the authenticated user's own rows and never exposes raw database access to NasrinAI.
- The UI requires explicit consent before sending finance context. The upstream NasrinAI chat service may retain the prompt/context as part of its conversation history under NasrinAI's configured retention policy; confirm that policy and communicate it to users before enabling this in production. MOVO also stores the user/assistant messages in the private MOVO chat tables.
- Chat responses are marked `Cache-Control: no-store`; server logs include only stable error codes, never tokens, financial context, or message content.

## Indexing and retrieval

The migrations add user-first indexes for chat history and finance lookups, plus covering indexes for the composite message/conversation ownership foreign keys and the upstream-mapping user foreign key. Each request reads at most 250 recent transactions from the current user's RLS-filtered rows, then sends at most 40 selected transactions, 50 accounts, and 50 active budgets to NasrinAI. This is indexed relational retrieval, not a vector-embedding index; semantic vector indexing should only be added with a separately reviewed per-user embedding schema and retrieval policies.

## Limits and safety

User messages are capped at 1,600 characters and the full upstream prompt is trimmed to 3,800 characters to stay below NasrinAI's default 4,000-character limit; upstream requests time out after 25 seconds. The chat is read-only and does not execute transactions or change budgets. Financial records and chat history are private application data and must never be publicly indexed by search engines. Public SEO indexing applies only to public marketing pages, not authenticated MOVO screens or API routes.

## Deployment verification checklist

1. The dedicated MOVO Supabase project has applied `20261029013604_nasrinai_chat_isolation.sql` and `20261029013801_nasrinai_chat_fk_indexes.sql`. Apply these migrations in version order to any other environment.
2. Configure the server-only Vercel variables above and redeploy.
3. Test with two MOVO users: each must see only their own conversations and finance context; using the other user's conversation UUID must return 404.
4. Confirm an unauthenticated request returns 401, a foreign origin returns 403, and an unconfigured upstream returns 503.
5. Verify the Vercel deployment's runtime route can reach `https://nasrinai.com/v1/chat` and that the chosen NasrinAI credential has chat scope.


## Context-isolation release gate — 2026-10-31

- The API handler sends the user question separately from a bounded, sanitized MOVO financial-context payload and explicitly sets `context_scope: "movo"`.
- Financial values are validated before serialization. Invalid amounts/limits are rejected or represented as unknown; currencies are not silently relabeled as PHP. Notes and unexpected columns are excluded.
- Upstream replies are accepted only when the response explicitly confirms `context_scope: "movo"`; absent confirmation fails closed and must not be saved or displayed as an accepted answer.
- Requests remain stateless at the upstream boundary; no upstream conversation ID is sent.
- Regression tests cover malformed context, context-payload shape, scope confirmation, and relevant-transaction selection.
- This branch was rebuilt from current `main` to avoid overwriting unrelated newer MOVO features. Keep the release blocked until exact-head CI and authenticated end-to-end synthetic-canary verification pass. A successful unit/build suite does not prove production isolation.
