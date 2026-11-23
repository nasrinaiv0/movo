# MOVO friend chat and transaction card sharing — 2026-11-23

## Scope and initial progress (documented before implementation commits)
- Source branch: `feat/friend-chat-transaction-cards-20261123` from main `6e626c1164c4300dd8ab19c5e85f46b0dff6bb0e`. No production, main, subscriptions, or financial migrations changed.
- Add private, verified, accepted-friend 1:1 messages and selected transaction snapshots; authenticated sender identity comes from a verified JWT, never request body.
- Messages are **informational** and do not transfer funds or alter either financial ledger. No automatic recipient accounting import; this is intentionally deferred pending double-entry, account-mapping and consent tests.
- Share the existing profile photo with accepted friends in chat only, and reflect current photos on refresh. Limit storage, content size, cadence and access. Block/removal must immediately revoke access and cascade message deletion.
- UX: Friends → Chats, private conversations, profile-photo avatars, Send transaction chooser, explicit share confirmation, error/offline states, safe area, reduced motion.
- Preserve NasrinAI Chat in the center tab, the 1:1 Friends summary flow, existing Android/iOS OAuth, and local-only finance.
- Owner gating: new service-only SQL migration **must not** be applied to production without explicit approval. A deployed API must be reachable; prior public API outage 402 `DEPLOYMENT_DISABLED` is independently unresolved.
- Privacy/legal: assess Terms/Privacy changes before release; messaging disclosures should cover recipient visibility, storage/retention and reporting.

## Planned verification
- API validation tests: rejected outsider, anonymous account, forged sender, invalid content/card, rate limits, idempotent retries.
- SQL policy/privilege checks: RLS, restricted grants, membership checks on every action, cascade on block/remove, no ledger mutation.
- Component tests: send chat, transaction preview/share, friend avatar, no unsolicited sharing, stale-session prevention.
- CI Node 26 tests/typecheck/strict build and Vercel preview at exact PR head. Real-device Android/iOS validation is separately required.

## Release conditions
No merge or live migration before all CI + preview + privacy review + live hosting + real-device tests are confirmed.

## CI remediation 2026-11-23
- First local PostgreSQL migration run in Finance Tenant Isolation CI failed: currency and date regex clauses were missing the terminator in the generated SQL. This is a feature-branch-only bug; no live migration was executed.
- Correct the regex expressions, rerun the isolated DB workflow and full PR checks, then consolidate documentation with implementation into the single required documented PR commit.

- Phase 1 CI's translation coverage check identified one remaining literal, `Chat`, after the 37-string catalogue addition. Add its eleven translations and rerun the full gate.

## Isolated security regression extension
- Extend the existing disposable localhost PostgreSQL test harness with explicit friend chat service-role grants, unauthorized actor denial, opt-in card projection, photo visibility, idempotent sends, rate limiting and deletion cascade. It runs inside the previously existing GitHub Actions postgres service; never targets hosted Supabase.

## Isolated SQL CI discovery (second pass)
- The server-side migration file accidentally contains repeated trailing SQL after its first successful COMMIT, causing psql to parse an orphaned conditional and fail. Remove only this stray post-COMMIT content; retain the complete RLS/service-only function definition and run the existing isolated PostgreSQL regression harness again.
