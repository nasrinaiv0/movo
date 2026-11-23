# MOVO — recipient decision and transaction import (2026-11-23)
## Staging-only scope and constraints — written before implementation
- **Base:** stacked on unmerged friend-chat PR #339, exact source `221a9ec3f7646865b5922435457b4789136f4217`; use PR target `feat/friend-chat-transaction-cards-20261123`, not main.
- **Change:** only the recipient of an accepted-friend transaction card may accept or decline it. Acceptance does **not** change finances; the user must then explicitly select a compatible owner-controlled account and review the normal transaction form before tapping Save.
- **Imported ledger record:** preserve the shared card's original numeric amount, ISO date and currency, default transaction type, and optional description/category. Never copy the sender's account identifiers, card numbers, receipts, payment references or beneficiary. A transfer requires distinct owner accounts in the **same** currency; never auto-exchange.
- **Double-write safety:** recipient ledger ID is the message's immutable UUID, and external reference is `movo-friend:<message_id>`. Repeated clicks/reconnects/devices may not create a second ledger row. Use the existing RLS/owner-authorized hybrid transaction writer and its offline durability; no direct service-role writes to financial tables.
- **Decision API:** verified actor on the server; SQL checks accepted-friend membership, message kind, actual recipient, and persisted ledger row before allowing the `imported` state. Idempotent accept/decline/imported transitions; imported is terminal.
- **Offline:** previously opened chat is not considered available offline; an accepted card may enter a **device-only** ledger through existing offline-first writer. Do not mark the server record imported until its cloud row has actually arrived; surface pending/sync status truthfully.
- **Privacy / safety:** no money is transmitted, no ledger auto-import on acceptance; recipient-specific status must not leak to sender or outsiders. Friend removal must revoke decisions (cascade) without deleting an already imported ledger row.
- **Release gates:** no production change, migrations, main change, merge, store upload, or preview promotion. Exact-head GitHub CI, synthetic PostgreSQL cross-tenant/access/receipt tests, browser/mobile staging review, hosting restoration and real-device OAuth/receipt tests must all pass first.
- **Cross-platform UX:** iPhone Safari/Android keyboard/safe-area, 44px targets, accessible form labels, no gradients, reduced motion, readable two-decimal currency and predictable error recovery.
- **Review:** request Claude Opus 5.5 independent security/accounting and responsive frontend review (available reviewer not assumed). Do not claim review has happened without evidence.

## Planned file changes
1. Service-only decision migration + existing chat endpoint dispatch and narrow validators.
2. Chat received-card decision controls, account picker, two-step manual review.
3. Deterministic friend-import writer integration through existing MOVO save path.
4. Localized labels, component/unit/integration and isolated PostgreSQL security/ledger tests.

## Rollback / release
Revert the feature PR before deployment, or remove the new decision route/UI and keep historical transaction rows unchanged. Server decision rows are child-of-message records and are deleted on friendship/message deletion. Production migration and rollout require a separate explicit approval.

## Progress
- 2026-11-23: Design and acceptance gates recorded before code changes.

- Initial Vercel build at exact PR head `df41f88` stopped in the i18n prebuild step: two existing keys (`Decline`, `Destination account`) were duplicated in the new catalogue. Remove only the redundant entries and keep the existing, already-translated keys. Rerun CI and Vercel; no production or main writes.

- The first disposable PostgreSQL isolation run rejected synthetic account setup with `permission denied for table financial_accounts`, correctly reflecting MOVO's restricted service role. Fix the *test fixture* by creating and updating synthetic ledger rows only while running as the disposable database owner; use the service role only to invoke authorized chat-decision procedures. Production grants remain untouched.

- Second disposable PostgreSQL run reached existing `enforce_movo_cloud_plan()` trigger and stopped with `sign_in_required` for the synthetic recipient bank account. Model a verified test-only Pro entitlement and owner JWT claims before creating synthetic financial fixtures, as MOVO's existing financial isolation test does. Retain production plan guard unchanged.

- Third isolated PostgreSQL run reached the synthetic test SQL but detected malformed `DO` dollar-quote delimiters, caused by JavaScript replacement-string `$$` expansion while editing the test. Repair and statically assert matched delimiters before re-running; no production code/privilege change.

- Phase 1/typecheck/container CI pinpointed a JSX parse error in the recipient conversation error notice (one missing closing expression brace). Correct that small component syntax error and rerun the exact-head build; no unrelated UI or backend changes.

- Fourth isolated PostgreSQL run: decision RPC's `SELECT ... FOR KEY SHARE` on `movo_friend_messages` required stronger table privileges than MOVO intentionally grants the service role. Keep the accepted friendship's key-share lock (which prevents cascade deletion), but read the associated immutable message without a row lock. Do not expand message-table write permissions.

- Fifth isolated PostgreSQL run revealed ambiguous SQL aliases `m`/`d` inside the `decisions` subquery because PL/pgSQL has message and decision record variables with those names. Replace subquery aliases with `shared_msg` and `decision_row` so no query identifier conflicts with procedural variables. No change to authorization or ledger semantics.

- The receipt-confirmation RPC runs as the restricted server service role. The finance tables currently grant financial access to authenticated user roles, not the service role; receipt verification therefore needs **column-level read-only grants** for the minimal fields of the saved transaction and recipient-selected account. Add exactly those projected `SELECT` grants in the staging migration, and assert the service role still lacks INSERT/UPDATE/DELETE on financial tables. No blanket SELECT, financial mutations, authenticated client privilege changes, or production migration.

## 2026-11-23 — Staging parent integration (no production)
- #339 integrated current main Android AGP/Gradle build settings; all 17 friend-chat code blobs and seven newer Android/tooling file blobs verified identical to their original source.
- #341 is replayed as a single implementation commit on integrated #339 head `bdcf44485d0672b91cb2d926e58e00b30edc68a4`, preserving 18 implementation/test files byte-identically to prior tested head; this engineering record is amended `0967d7fb30b0056d65382b7e75c840983f383835`.
- Hosted preview at prior exact head `0967d7fb30b0056d65382b7e75c840983f383835` was Vercel READY and its signed-out HTML shell served HTTP 200 with CSP, HSTS, noindex and nosniff. This does **not** verify a signed-in recipient import; the required private chat/decision migrations were not applied.
- The iOS PR workflow was pending with zero jobs (path/base-filtered), so no current-head iOS build acceptance was proven. A Vercel cloud sandbox smoke attempt returned HTTP 402 payment_required; no sandbox, billing change, hosted setting or production mutation was made.
- PR #339 and #341 remain unmerged. Confirm new-head CI, Vercel preview, iOS, real two-user and offline→cloud acceptance before recommending any rollout.
