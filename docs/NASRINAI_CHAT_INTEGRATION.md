# MOVO × NasrinAI integration

## Request path

The MOVO UI calls the same-origin Vercel function `POST /api/nasrinai/chat`. The function verifies the MOVO Supabase access token, creates a user-scoped Supabase client, and reads only that user's accounts, recent transactions, and active budgets under existing RLS. After the user explicitly opts in, it sends the actual question separately from a bounded financial context to `https://nasrinai.com/v1/chat` using the server-only `context_scope: "movo"` contract. MOVO accepts a reply only when the upstream explicitly returns `context_scope: "movo"`; older upstream deployments fail closed and their reply is not shown or saved. The context contains account labels/types/currency/opening balances, budgets, and a bounded set of recent or question-matching transaction dates, descriptions, categories, types, amounts, and account labels; transaction notes are excluded.


## Financial context normalization

- The server constructs an explicit allowlist of account, transaction, and budget fields; free-form transaction notes and unexpected database columns are never forwarded.
- Account/merchant/category labels have control characters and line breaks normalized before serialization.
- Transaction amounts must be finite numbers and transaction types must be recognized (`income`, `expense`, or `transfer`); malformed entries are excluded rather than converted to zero.
- Missing or invalid balances and budget limits remain `null`, and unknown currencies remain `null` instead of being silently relabeled as PHP. Invalid timestamps/date-only values remain `null` rather than being presented as a valid date.
- These checks improve accuracy and limit accidental context expansion. They do not replace server-derived user identity, owner-scoped queries, Supabase RLS, or the upstream MOVO-only context contract.

## Legacy conversation and account-switch isolation

- On the first cloud-mode visit per authenticated MOVO user after this context-isolation rollout, the UI starts a clean chat instead of restoring the latest legacy thread. The one-time marker is keyed by the signed-in user ID in browser storage; if storage is unavailable, the UI defaults to a clean chat.
- This does not delete historical messages or change database retention. The old conversation remains stored under existing ownership/RLS rules, but is not automatically restored in that browser during the rollout. A new conversation becomes the latest thread after the first successful isolated turn.
- Every upstream request is stateless and omits the provider conversation ID. Previous MOVO replies displayed in a legacy thread are never forwarded as upstream conversation history.
- When the signed-in user changes or cloud mode is disabled, the UI clears visible messages, conversation ID, unsent draft, error, and chat-specific consent in a layout effect before the next paint. The active user's new-chat marker is then re-read before history loading.
- The API rejects a reply unless the upstream explicitly confirms `context_scope: "movo"`. A missing confirmation is shown as a safe error, the assistant reply is not rendered or saved, and the draft is restored for retry.
- Regression coverage is in `src/components/NasrinAIChat.test.js` and `src/lib/nasrinaiChat.test.js`: first-run clean chat, account switching while history is pending, consent, bounded request payload, and fail-closed scope confirmation.
- This is defense in depth, not a replacement for upstream enforcement, authenticated ownership checks, or Supabase RLS. Do not merge/promote the MOVO change until the server-enforced upstream contract is deployed and a live authenticated smoke test passes.

## Required Vercel environment variables

- `SUPABASE_URL` (or existing `REACT_APP_SUPABASE_URL`)
- `SUPABASE_ANON_KEY` (or existing `REACT_APP_SUPABASE_ANON_KEY`)
- `NASRINAI_API_KEY`: a NasrinAI server-side secret service key with permission to call `POST /v1/chat` and use the MOVO context scope. Never use a publishable widget key as a bearer credential and never expose this value through a `REACT_APP_*` variable. The upstream must run the companion MOVO-scope implementation and return `context_scope: "movo"`; otherwise MOVO rejects the reply.
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
- Financial data, conversations and messages are read and written through a Supabase client carrying the authenticated user's JWT; queries also filter by the server-verified `user_id`, and RLS remains active.
- MOVO never sends an upstream NasrinAI `conversation_id`. Each request is stateless. The user question is sent separately from a bounded JSON payload, and the upstream's server-enforced MOVO scope disables platform/founder knowledge, memory, Library, prior-chat recall, shared learning, web search, tools, and answer caches for that turn. The financial JSON is transient and must not be persisted in upstream history.
- The MOVO route fails closed if the upstream response does not explicitly confirm `context_scope: "movo"`. This response marker is not a substitute for the server-side scope enforcement described in the companion upstream change.
- Existing rows in the legacy server-only mapping table are ignored by this route; keep that table inaccessible to browser roles.
- Conversation and message rows include `user_id`, RLS policies use `auth.uid()`, and a composite foreign key prevents attaching messages to another user's conversation. The client cannot supply or select an upstream conversation ID.
- Every conversation lookup/update includes the authenticated user's ID. An unknown or other user's conversation ID returns 404.
- The upstream NasrinAI API key remains server-only. The API forwards a bounded context from the authenticated user's own rows and never exposes raw database access to NasrinAI.
- The UI requires explicit consent before sending finance context. The bounded financial JSON is appended only to the in-memory provider request and is not persisted in the upstream conversation transcript. The upstream still stores the user's question and assistant reply as a separate conversation; confirm that text-message retention policy and communicate it to users before enabling this in production. MOVO also stores the user/assistant messages in its private MOVO chat tables.
- Chat responses are marked `Cache-Control: no-store`; server logs include only stable error codes, never tokens, financial context, or message content.

## Indexing and retrieval

The migrations add user-first indexes for chat history and finance lookups, plus covering indexes for the composite message/conversation ownership foreign keys and the legacy upstream-mapping user foreign key. Each request reads at most 250 recent transactions from the current user's RLS-filtered rows, then sends at most 40 selected transactions, 50 accounts, and 50 active budgets to NasrinAI. This is indexed relational retrieval, not a vector-embedding index.

**Important upstream requirement:** the server-enforced MOVO context scope is implemented in [nasrinAI PR #699](https://github.com/nasrinaiv0/nasrinAI/pull/699). It must be deployed before MOVO chat is enabled; the MOVO route rejects any reply without the explicit scope marker. Use a least-privilege server-side service key with chat permission only, and do not rely on prompt text or tenant separation alone as the context boundary.

## Limits and safety

User messages are capped at 1,600 characters and the separate JSON finance context is trimmed to at most 3,800 characters; upstream requests time out after 25 seconds. The chat is read-only and does not execute transactions or change budgets. Financial records and chat history are private application data and must never be publicly indexed by search engines. Public SEO indexing applies only to public marketing pages, not authenticated MOVO screens or API routes.

## Deployment verification checklist

1. The dedicated MOVO Supabase project has applied `20261029013604_nasrinai_chat_isolation.sql` and `20261029013801_nasrinai_chat_fk_indexes.sql`. Apply these migrations in version order to any other environment.
2. Configure the server-only Vercel variables above and redeploy.
3. Test with two MOVO users: each must see only their own conversations and finance context; using the other user's conversation UUID must return 404.
4. Confirm an unauthenticated request returns 401, a foreign origin returns 403, and an unconfigured upstream returns 503.
5. Verify the Vercel deployment's runtime route can reach `https://nasrinai.com/v1/chat`, that the chosen NasrinAI service credential has chat scope, and that the response includes `context_scope: "movo"`.
