# MOVO Master Implementation Specification

**Repository:** `nasrinaiv0/movo`  
**Related work:** PR #123, `fix/automation-source-persistence-20261101`  
**Purpose:** A single execution brief for MOVO-wide data integrity, automation, voice entry, financial correctness, security, testing, and release verification.  
**Status:** Implementation requirements, not proof that every feature is implemented or production-verified.

## 1. Execution directive

Act as MOVO's senior software architect, backend/database engineer, security engineer, financial-systems engineer, QA engineer, and release engineer. Audit the actual repository and connected environments first, then implement the highest-risk improvements incrementally.

Do not stop at recommendations or documentation. Continue through code, tests, and verification wherever tools and permissions allow. Report exact blockers where credentials, a physical device, external approval, or production authorization are required.

### Non-negotiable rules

- Preserve the existing MOVO UI, layouts, design system, and working behavior.
- Keep all existing automations enabled: Apple Pay, Google Pay, bank/payment notifications, manual entry, imports, and supported integrations.
- Do not create a parallel ledger or rewrite working systems without evidence.
- Reuse existing APIs, database functions, event tables, and idempotency mechanisms when suitable.
- Never merge or delete financial records solely because they look similar.
- Never trust client-supplied user IDs or AI-generated account IDs without server-side authorization.
- Never expose Supabase service-role credentials to browsers, mobile apps, Shortcuts, URLs, logs, or documentation.
- Never claim tests, migrations, deployments, device tests, or production behavior passed without evidence.
- Do not weaken, skip, or delete tests just to get a green result.
- Do not merge or deploy when approval is required.
- Preserve unrelated changes and inspect overlapping PRs before editing.
- Treat unit tests, CI, preview deployment, production migration, and live production verification as separate milestones.

## 2. Mandatory pre-change audit

Before editing files or creating a PR:

1. Inspect the current default branch, repository status, recent commits, and actual app architecture.
2. List relevant open PRs, branches, changed files, mergeability, CI status, and overlapping work.
3. Inspect PR #123 (`Fix MOVO automation source persistence and retry safety`) and its current head before deciding whether changes belong there.
4. Read the existing voice-logging docs and relevant code paths.
5. Inspect the current database schema, migrations, constraints, indexes, RLS policies, grants, triggers, and privileged functions.
6. Inspect the automation registration/revocation/logging flow, transaction model, source allowlist, imports, recurring jobs, AI actions, and financial calculations.
7. Identify pre-existing failures and production-vs-migration discrepancies.
8. Produce a concise file-by-file implementation plan and then continue with implementation. Do not stop after the audit unless a real blocker requires clarification or authorization.

**PR coordination:** Extend the appropriate existing PR if safe and consistent with repository policy. Do not create competing changes to the same endpoint, migration, or component. If this specification is broader than PR #123, keep changes scoped and coordinate the work instead of silently overloading or conflicting with it.

## 3. Known infrastructure to verify, not blindly assume

Previous project investigation identified:

- `public.transactions`
- `public.financial_accounts`
- `public.movo_automation_tokens`
- `public.movo_automation_events`
- `public.log_automation_transaction`

Previously reviewed automation code used `api/log.js` and actions resembling `register`, `revoke`, and `log`. Source values included `applepay`, `googlepay`, `bank`, and `notification`. The database model was reported to support `income`, `expense`, and `transfer`.

Prior work reported hashed device tokens, ownership and active-account checks, rate limiting, per-token request-ID uniqueness, and service-role-only RPC execution. PR #123 addresses source persistence and returning idempotent duplicates before rate-limit checks.

Re-check all of these against the current branch and connected Supabase project. Do not rely on historical status as current proof. The existing docs are:

- `docs/SIRI_SHORTCUT_VOICE_LOGGING_PROGRESS.md`
- `docs/CROSS_PLATFORM_VOICE_LOGGING_ANDROID_UPGRADE.md`

## 4. Target architecture

All input sources must use shared trusted domain services:

```text
MOVO UI / Siri Shortcuts / Android assistant / Apple Pay / Google Pay
Bank notifications / imports / external APIs / scheduled jobs / AI actions
                                  |
                                  v
                       Authenticate + authorize
                                  |
                                  v
                       Validate and normalize input
                                  |
                                  v
                       Identify request/source event
                                  |
                                  v
                          Idempotency check
                                  |
                                  v
                   Domain-specific integrity checks
                                  |
                                  v
                Cross-source matching / conflict handling
                                  |
                                  v
                      Authorized domain service
                                  |
                                  v
                      Atomic database operation
                                  |
                                  v
                    Canonical record + audit trail
                                  |
                                  v
                      Consistent UI and reports
```

Share infrastructure, not one simplistic business rule. Each domain—transactions, transfers, cards, debts, bills, savings, budgets, recurring schedules, and others—must retain its own identity and validation rules.

## 5. Universal integrity requirements

### Idempotency and retries

- Repeated delivery of the same logical operation must not repeat its effects.
- Use stable request identities and database-enforced constraints where appropriate; application-only checks are insufficient for concurrent writes.
- Same request ID + same logical payload returns the original result.
- Same request ID + conflicting payload is rejected without overwriting the original.
- A timeout after a possible successful write must be resolved by looking up the original operation, not by blindly creating a new one.
- Each logical operation gets a stable request ID. Reuse it for retries of that operation, never for a different action.

### Authorization and relationships

- Derive user identity from a trusted session or registered, revocable device credential.
- Validate ownership and eligibility of every referenced account and financial object.
- Enforce referential integrity with suitable constraints, transactions, functions, and server-side validation.
- Prevent cross-user reads and writes.
- Privileged functions that bypass RLS must enforce authorization internally.

### Audit and recovery

Record sufficient safe metadata to explain the operation, source, outcome, canonical record, retry/match decision, and conflict reason. Do not log secrets, raw device credentials, or unnecessary financial/voice data.

Use the existing correction, void, reversal, and adjustment model. Preserve audit history where appropriate. Never silently delete valid financial activity to make totals match.

## 6. Cross-source transaction deduplication

MOVO must distinguish:

1. Duplicate delivery of the same source event.
2. Different sources reporting the same real-world transaction.
3. Legitimately separate transactions with similar details.
4. A lifecycle update to an existing transaction.
5. Refunds, reversals, and corrections.

Keep Apple Pay, Google Pay, bank notifications, payment notifications, Siri, Android, manual entry, imports, and all other working integrations active.

### Exact-event identity

Prefer provider transaction IDs, stable source event IDs, payment references, and request IDs with documented uniqueness guarantees. Scope uniqueness to the appropriate provider/account/user. Where stable identifiers do not exist, use a cautious fallback and never assume amount or merchant alone is unique.

### Cross-source matching

Evidence can include amount, currency, normalized merchant, timestamp, payment account/card, transaction type, external references, lifecycle status, and source-specific evidence. No single weak signal proves a match.

- **Exact same event:** return the existing result.
- **Strong cross-source match:** link the new source event to the existing canonical record.
- **Plausible but uncertain match:** preserve the event and flag for review or ask the user.
- **No plausible match:** create a new record.
- **Multiple plausible matches:** do not choose arbitrarily.
- **Conflicting event identity:** reject and record a safe diagnostic.

A canonical transaction may be supported by multiple source events. Preserve each event's provenance. Reuse `movo_automation_events` if it can represent these relationships; add schema only when a documented gap justifies it. Never silently discard an uncertain event or merge legitimate purchases because amount and merchant match.

## 7. Domain-specific integrity coverage

Audit actual modules and apply rules only to features that exist or are explicitly planned.

| Domain | Integrity requirements |
|---|---|
| Expenses and income | Prevent duplicate events/imports; validate amount, currency, category, account, date, and direction. |
| Transfers | Treat as transfers, not unrelated income plus expense; link paired movements where the model uses them; write atomically. |
| Accounts | Prevent accidental duplicate registration only with strong identity evidence; preserve separate legitimate accounts. |
| Cards | Preserve separate, supplementary, replacement, and tokenized cards; never merge on institution alone; minimize payment credentials. |
| Credit cards | Reconcile purchases, payments, refunds, limits, outstanding and available credit; don't count payment as another purchase. |
| Debts and loans | Prevent duplicate debt/repayment; preserve repayment-to-debt relationships and principal/interest semantics where supported. |
| Bills | Distinguish a bill/contract from each billing period; prevent duplicate payments and wrong-period links. |
| Savings | Prevent duplicate contributions; don't count a transfer and contribution twice. |
| Budgets | Consistent period, categories, transfer/refund treatment, included transaction types, and totals. |
| Subscriptions and recurring items | Distinguish schedule identity from occurrence identity; retries must not repeat one occurrence, but a new period must remain valid. |
| Goals | Distinguish goal identity from contributions and withdrawals; calculate progress consistently. |
| Imports | Safe re-imports, source/batch provenance, conflict reporting, and no silent overwrites. |
| Notifications | Stable event identity and delivery state; distinguish reminder from completed financial action. |
| AI actions | Same authorization, validation, confirmation, idempotency, and domain services as other inputs. |
| Dashboards/reports/exports | Consistent definitions, date ranges, aggregation, refund/transfer handling, and cache freshness. |
| Authentication/settings/device links | Secure isolation, registration, revocation, rotation, and auditability. |

Do not create nonexistent modules just because they appear in this table.

## 8. Voice logging: one shared service

Implement iOS and Android voice logging through the same backend and ledger. Do not create platform-specific financial business logic.

### iOS

Start with Apple Shortcuts; evaluate native App Intents/App Shortcuts if appropriate to the actual app. Capture dictated text, create a stable request ID, call the authenticated MOVO endpoint over HTTPS, and speak/display only the verified response.

### Android

Inspect whether MOVO is native Android, React Native, or web/PWA. Evaluate supported Android app shortcuts, deep links, App Actions, and current Gemini/Google Assistant capabilities for that architecture. Assistant availability and invocation vary by device, account, language, and rollout. Provide a dependable in-app voice-entry fallback. Do not promise arbitrary direct background commands universally.

### Shared request/response

Adapt to existing API conventions; do not introduce a conflicting contract without need. A conceptual request:

```json
{
  "request_id": "stable-id-for-this-logical-operation",
  "source": "siri_shortcut",
  "utterance": "I spent 150 pesos on lunch",
  "locale": "en-PH",
  "timezone": "Asia/Manila"
}
```

Possible dedicated sources include `siri_shortcut` and `android_assistant` (or an existing approved naming convention). Update the database source constraint, shared types, validation, labels, and tests through a safe migration before using new values. Keep these sources distinct from `applepay`, `googlepay`, `bank`, and `notification`. Reject unsupported sources rather than silently mapping them to a misleading default.

### Parsing and validation

Support clear English, Filipino, and Taglish phrases, including:

- “I bought 3 pesos of banana.”
- “I spent 150 pesos on lunch.”
- “I received 2,000 pesos from work.”
- “I paid 500 pesos for electricity yesterday.”
- “I spent 80 pesos on a tricycle using my cash account.”
- Common Philippine peso formats, decimals, and thousands separators.
- Missing amount, ambiguous direction/account/date, and multiple transactions.

Use deterministic parsing for simple clear commands. AI can help with complex phrasing, but its structured output must be validated. It must not invent an amount, currency, account, date, or user identity.

Map intents to supported MOVO semantics: expense, income, transfer, debt repayment, card payment, savings contribution, refund, or reversal where supported. Do not misclassify every action as an expense. Require clarification for ambiguity. Resolve accounts in this order: explicit unambiguous owned active account, configured suitable default, otherwise clarification. Use the configured timezone, defaulting to `Asia/Manila` where appropriate, and honor explicit relative dates.

### Confirmation and outcomes

Use structured outcomes consistent with the API, such as `saved`, `already_recorded`, `needs_confirmation`, `needs_review`, `rejected`, `failed`, or `pending`.

Only report “saved” after backend persistence is confirmed and a transaction ID is available. Never claim success on timeout or non-2xx response. Treat uncertain outcomes as uncertain until the original request is resolved. Use stricter confirmation for ambiguous, sensitive, or irreversible actions.

### Credential and privacy rules

- Pair the integration to an authenticated MOVO user.
- Use high-entropy revocable credentials where needed; store hashes server-side.
- Support revocation and rotation.
- Use HTTPS; never put secrets in URLs.
- Keep service-role keys server-side.
- Validate amounts, currency, source, type, date, account, and category.
- Minimize retention of raw utterances and audio.
- Redact credentials and unnecessary financial details from logs.

## 9. Payment lifecycle and reconciliation

Where source data supports it, distinguish pending authorization, completed payment, settlement, refund, reversal, cancellation, and chargeback/adjustment. Do not count authorization and settlement as separate completed purchases. Link refunds and reversals to original transactions where possible. A scheduled instruction or voice statement alone does not prove a payment completed.

Deduplication prevents repeated effects; reconciliation ensures lifecycle updates keep records consistent. Implement both.

## 10. Financial calculations

Audit and document consistent definitions for income, expenses, transfers, account balances, available balances, card balances/limits, debt/loan balances and repayments, savings, budgets, bills, subscriptions, goals, net worth, dashboards, reports, and exports.

Do not assume every balance is simply the sum of transactions; opening balances, pending states, statement reconciliation, and account-type rules may apply. Check that all screens use consistent date ranges, transaction types, category rules, and refund/transfer treatment.

Add safe reconciliation checks for incoming events versus canonical records, account activity versus balances where supported, card/debt balances versus payments, budgets versus included transactions, goals versus contributions/withdrawals, recurring schedules versus occurrences, and cached aggregates versus authoritative data. Automatically repair only deterministic, safe derived data; report uncertain discrepancies for review.

## 11. Database and migration safety

Before migrations, inspect current migration history and production schema, constraints, indexes, RLS, grants, functions, triggers, and existing data. Use additive/backward-compatible changes where feasible. Protect concurrency-sensitive invariants with database constraints. Avoid redundant tables/columns and destructive changes without a verified plan.

Before using new source values, migrate the constraint and update all validators/types/labels/tests. If historical records may be duplicates, produce a reviewable report; do not automatically merge uncertain records. Verify actual production migration state separately from local test success.

## 12. Security and RLS

Review ownership checks on every CRUD path, RLS policies, table/function grants, service-role usage, token hashing/revocation, input validation, rate limits, request-ID conflict handling, cross-user isolation, privileged functions, and logging. Test unauthorized cross-user access directly. A frontend filter or API-only check is not a substitute for database protection.

## 13. Testing matrix

Use the repository's current test framework and conventions. Add tests for:

- Duplicate request and concurrent duplicate request.
- Same request ID with conflicting payload.
- Duplicate provider event.
- Cross-source match.
- Legitimate similar separate purchases.
- Timeout after successful write and safe retry.
- Failed write and retry.
- Concurrent scheduled occurrence workers.
- Duplicate imports.
- Account/card creation and all existing financial domains.
- Transfers, card payments, debt repayments, bills, savings, budgets, subscriptions, refunds, reversals, reports, and AI actions where supported.
- Missing/invalid/revoked credentials, invalid payload/source/account, cross-user access, rate limits, unauthorized privileged operations.
- Voice amount formats, English/Filipino/Taglish, relative dates, missing/ambiguous fields, explicit/default accounts, multiple transactions, and safe clarification.
- Regression of manual entry, Apple Pay, Google Pay, bank/payment notifications, authentication, dashboards, and existing modules.

Do not skip tests to get green CI. Separate pre-existing failures from regressions caused by this work.

### Device tests

When actual devices are available:

**iOS:** Pair Shortcut; log a low-value test transaction; verify account, amount, date, category, source, ledger row, event row, and response; retry the same request and confirm one effect; revoke token and verify rejection.

**Android:** Record device/OS/assistant/app versions, language, and integration path; invoke supported flow; verify API, source, persistence, retry safety, app fallback, and credential failure behavior.

Never claim device testing without running it on a real device.

## 14. Implementation phases

1. **Audit:** Map repository, PRs, schema, RLS, integrations, financial calculations, and tests. Produce a file-by-file plan.
2. **Integrity contracts:** Define request/source identities, canonical records, idempotency, matching, conflict handling, authorization, correction, audit, and domain rules.
3. **Financial core:** Harden event processing, source persistence, cross-source matching, account ownership, transfers, and the highest-risk financial paths.
4. **Shared voice service:** Implement request/response contracts, parsing, validation, account resolution, clarification, source tracking, and retries.
5. **Platform integrations:** Implement iOS Shortcut and supported Android entry flow with setup/revocation docs.
6. **Other modules:** Extend integrity guarantees to actual accounts/cards, debts/loans, bills/recurrences, savings/goals, budgets/subscriptions, imports, notifications, AI actions, reports, and dashboards.
7. **Security/reconciliation:** Verify calculations, reconciliation, RLS/grants, privileged functions, auditability, and recovery.
8. **Release verification:** Run tests, typecheck, lint, build, CI, preview checks, migration verification, and device tests when possible.
9. **Final review:** Review diff/secrets/deletions, confirm existing automations remain enabled, verify migrations and tests, and update docs with evidence.

Prioritize actual risks found in the code; this plan is not permission to create nonexistent features or perform unrelated rewrites.

## 15. PR and release discipline

Before each commit/PR update: inspect the diff, scan for secrets, check accidental deletions, run relevant tests, verify migrations, and confirm scope. Inspect other open PRs before creating a new one. Do not merge without required approval or deploy production changes without authorization.

Maintain separate status labels:
- **Code implemented**
- **Automated tests passed**
- **CI passed**
- **Preview deployed and checked**
- **Migration applied and verified**
- **Production behavior verified**
- **Real-device test passed**

These are distinct milestones. One does not prove another.

## 16. Acceptance criteria

Mark each applicable criterion **Verified**, **Incomplete**, or **Blocked**, and include evidence:

- Retries cannot repeat successful effects.
- Conflicting request identities are rejected.
- Database constraints protect critical invariants.
- Cross-source events retain provenance and uncertain matches are reviewed.
- Legitimate separate activity is preserved.
- Financial relationships and calculations remain consistent.
- Transfers, card payments, refunds, reversals, debts, bills, and recurring occurrences follow correct semantics.
- Voice parsing validates output and asks about ambiguity.
- iOS and Android use the shared backend where implemented.
- Success is reported only after confirmed persistence.
- Cross-user access is rejected and credentials are protected.
- Existing UI and automations remain functional.
- Relevant automated tests pass.
- Migrations are verified against the actual target environment.
- Device and production behavior are reported honestly.

## 17. Required final report

Provide:

1. Summary of changes and rationale.
2. Files changed.
3. Database migrations, constraints, functions, and policies changed.
4. Exact-event and cross-source duplicate behavior.
5. Actual iOS/Android implementation status.
6. Test commands and actual results.
7. Separate CI, preview, migration, production, and device-test status.
8. PRs updated/created and conflicts.
9. Remaining blockers and approvals needed.
10. Acceptance checklist with Verified/Incomplete/Blocked and evidence.

## Final directive

Start with the repository/PR/schema audit, then implement incrementally. Preserve the current UI and all working automations. Do not stop at recommendations when implementation is possible. Do not claim production readiness without verified production evidence. If a task needs unavailable credentials, a physical device, or authorization, identify the precise blocker and complete all independent work that can safely proceed.

**Outcome:** Every applicable MOVO module follows consistent integrity rules; duplicate events cannot repeat financial effects; legitimate activity is preserved; and financial data remains accurate, secure, and auditable.
