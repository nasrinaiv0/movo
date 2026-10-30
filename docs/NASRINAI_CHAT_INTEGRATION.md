# MOVO × NasrinAI integration

## Request path

The MOVO UI calls the same-origin Vercel function `POST /api/nasrinai/chat`. The function verifies the MOVO Supabase access token, creates a user-scoped Supabase client, and reads only that user's accounts, recent transactions, and active budgets under existing RLS. After the user explicitly opts in, it sends the actual question separately from a bounded financial context to `https://nasrinai.com/v1/chat` using the server-only `context_scope: "movo"` contract. MOVO accepts a reply only when the upstream explicitly returns `context_scope: "movo"`; older upstream deployments fail closed and their reply is not shown or saved. The context contains account labels/types/currency/opening balances, budgets, and a bounded set of recent or question-matching transaction dates, descriptions, categories, types, amounts, and account labels; transaction notes are excluded.


## Financial context normalization

- The server constructs an explicit allowlist of account, transaction, and budget fields; free-form transaction notes and unexpected database columns are never forwarded.
- Account/merchant/category labels have control characters and line breaks normalized before serialization.
- Transaction amounts must be finite numbers and transaction types must be recognized (`income`, `expense`, or `transfer`); malformed entries are excluded rather than converted to zero.
- Missing or invalid balances and budget limits remain `null`. Missing or malformed currency values remain `null`; syntactically valid three-letter codes are normalized to uppercase rather than silently relabeled as PHP. Invalid timestamps/date-only values remain `null` rather than being presented as a valid date.
- These checks improve accuracy and limit accidental context expansion. They do not replace server-derived user identity, owner-scoped queries, Supabase RLS, or the upstream MOVO-only context contract.

## Legacy conversation and account-switch isolation

- On the first cloud-mode visit per authenticated MOVO user after this context-isolation rollout, the UI starts a clean chat instead of restoring the latest legacy thread. The one-time marker is keyed by the signed-in user ID in browser storage; if storage is unavailable, the UI defaults to a clean chat.
- This does not delete historical messages or change database retention. The old conversation remains stored under existing ownership/RLS rules, but is not automatically restored in that browser during the rollout. A new conversation becomes the latest thread after the first successful isolated turn.
- Every upstream request is stateless and omits the provider conversation ID. Previous MOVO replies displayed in a legacy thread are never forwarded as upstream conversation history.
- When the signed-in user changes or cloud mode is disabled, the UI clears visible messages, conversation ID, unsent draft, error, and chat-specific consent in a layout effect before the next paint. The active user's new-chat marker is then re-read before history loading.
- Each outbound request captures the active user ID and a request epoch. An identity/mode change invalidates the epoch; the response path checks it after session lookup and after reading the response body. Stale success and failure paths cannot append an old reply, restore an old draft/error, change the next user's conversation ID, or alter the next user's busy state. The composer is unblocked for the new identity. Regression tests cover late success and late failure after an account switch.
- The API rejects a reply unless the upstream explicitly confirms `context_scope: "movo"`. A missing confirmation is shown as a safe error, the assistant reply is not rendered or saved, and the draft is restored for retry.
- Regression coverage is in `src/components/NasrinAIChat.test.js` and `src/lib/nasrinaiChat.test.js`: first-run clean chat, account switching while history is pending, consent, bounded request payload, and fail-closed scope confirmation.
- This is defense in depth, not a replacement for upstream enforcement, authenticated ownership checks, or Supabase RLS. Do not merge/promote the MOVO change until the server-enforced upstream contract is deployed and a live authenticated smoke test passes.

## Required Vercel environment variables

- `SUPABASE_URL` (or existing `REACT_APP_SUPABASE_URL`)
- `SUPABASE_ANON_KEY` (or existing `REACT_APP_SUPABASE_ANON_KEY`)
- `NASRINAI_API_KEY`: a NasrinAI server-side secret service key with permission to call `POST /v1/chat` and use the MOVO context scope. Never use a publishable widget key as a bearer credential and never expose this value through a `REACT_APP_*` variable. The upstream must run the companion MOVO-scope implementation and return `context_scope: "movo"`; otherwise MOVO rejects the reply.
- Optional `NASRINAI_BASE_URL` (defaults to `https://nasrinai.com`)
- Optional `MOVO_ALLOWED_ORIGINS` (comma-separated exact origins; default allowlist includes the documented production domain `https://movo.nasrinai.com` and `https://movo-lime.vercel.app`). Set this variable explicitly to the exact deployed origins if the deployment uses different aliases.

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


## User-facing context-isolation disclosure — 2026-10-30

- The chat disclosure no longer states the absolute guarantee “Your account stays isolated.” The prior wording exceeded what MOVO can independently prove before the upstream service's scope enforcement is verified in production.
- The UI now says MOVO sends a bounded snapshot of the signed-in user's MOVO records and that a reply is accepted only when NasrinAI explicitly confirms `context_scope: "movo"`; a missing confirmation is rejected by the API.
- Added a regression assertion requiring this qualified explanation and rejecting the old absolute claim.
- Source commit: `c57df91d9695afd63c07725105d542a9196d47f4`. Test commit: `f0e350bd5d851bd9a32936caa0d1051bf4b5fe11`.
- **Validation for these latest commits is pending** until CI completes on the resulting branch head. Earlier passing tests do not count as validation for this new change.
- This is a MOVO-only UI/documentation change. It does not alter the upstream NasrinAI repository, production data, Supabase schema/RLS/grants, authentication configuration, or provider secrets.
- The disclosure is not evidence that upstream enforcement is deployed. Keep the live authenticated request and unrelated-document canary release gate open until tested against the deployed service.


## Current-main reconciliation and disclosure regression — 2026-10-30

- Merged current `main` commit `ca1a680c78baf7c87347c960d56c7bc207041bc3` into the existing context-isolation branch without force-pushing. The branch now has zero commits behind current main; the merge commit is `1eef5cded5ca6dfa2548e5d4ed3d010253837cff`.
- The first preview build after this reconciliation failed because `src/App.test.js` still asserted the removed “Your account stays isolated” wording. The build log reported 1 failed test and 102 passed; this failure was not ignored or recorded as success.
- Updated the App-level regression assertion to require the qualified scope-confirmation wording and reject the old guarantee. Change commit: `e7f51fc2c9cbd336510db7f6ddffd283065b421f`.
- **Fresh validation is pending for the updated branch head.** The previous preview failure remains part of the audit history; it is not a passing result. The new preview was still initializing when this note was written.
- No changes were made to the separate NasrinAI repository, Supabase schema/RLS/grants, production data, auth configuration, or provider secrets.
- The live authenticated POST and unrelated-document canary test remain the release gate. A passing UI test or preview build does not prove that the upstream service enforces the MOVO scope.


## Validation after disclosure correction — 2026-10-30

- Validated implementation head: `e026c5e747f3b605f55b375541564d2d210fce3b`.
- GitHub Actions run [40988571759](https://github.com/nasrinaiv0/movo/actions/runs/40988571759) passed **18 suites / 103 tests**, TypeScript typecheck, production-only dependency audit, and production build.
- The production-only audit reported **0 vulnerabilities**; this does not clear the full development/build-tool dependency findings.
- Vercel preview deployment [dpl_JD4cZZ6KHMvifDk5B1PiVqeJmkdb](https://vercel.com/nasrin-ai/movo/JD4cZZ6KHMvifDk5B1PiVqeJmkdb) reached **READY** for that head.
- The previous preview failure at `1eef5cd` was caused by a stale App-level assertion expecting the removed absolute guarantee. That assertion was updated in `e7f51fc2c9cbd336510db7f6ddffd283065b421f`; the reconciled implementation subsequently passed.
- This validates MOVO's unit/integration checks and deployment build only. Authenticated production POST and unrelated-document canary testing remain unverified and are required before merge.
- This documentation-only follow-up changes the branch head; rerun exact-head CI and preview checks before merge.
