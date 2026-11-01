# Handoff — Financial Planning & Bills (continue in the MOVO project)

Date: 2026-11-01. Handed over from a NasrinAI-repo session; all work below is in `nasrinaiv0/movo`.
Spec: [`docs/specs/FINANCIAL_PLANNING_AND_BILLS_SPEC.md`](../specs/FINANCIAL_PLANNING_AND_BILLS_SPEC.md). Read it and `CLAUDE.md` first.

## Status by spec phase (verify against live GitHub before acting)

| Phase | State | Where |
|---|---|---|
| 0 Audit | Done 2026-11-01: only #93 open before this work; no overlap | this file |
| 1 Ledger correctness | On main: routing matrix, transfers, balances | `src/lib/financeCalculations.js`, `docs/engineering/updates/2026-11-01-transaction-routing-audit.md` |
| 2 Obligations (loans, debts, receivables) | On main; migration applied to Supabase per its doc | `20261031170235_obligations_receivables_goals.sql`, `src/lib/accounting.js`, `src/lib/obligationsRepository.js`, `src/screens/FinancialPlanning.js` |
| 3 Goals & savings | On main (allocation RPC, no double allocation). Interest estimates not built | same as phase 2 |
| 4 Spending limits | Partly: category budgets exist (`src/components/Budgets.js`). Missing: account/merchant scopes, configurable warning %, refund rule | — |
| 5 Bills | **PR #127 open** (`feature/bills-payments`) | `docs/engineering/updates/2026-11-01-bills-payments.md` |
| 6 Home dashboard | Not started (Net worth, Bills due, Debt, Owed to you cards + drill-down) | — |
| 7 Currency & crypto | Not started (rate cache with staleness, historical rates, crypto valuation) | — |
| 8 Production readiness | Not started | — |

## Open PRs from this session

- **#127 Bills & Payments** — head `2e6ff12` + register commit. 264 tests, typecheck, build pass locally; `supabase/tests/bills_payments.test.sql` passed on local Postgres 16 with all migrations applied (and on replay).
  - **Owner step:** apply `supabase/migrations/20261101120000_bills_payments.sql` in the Supabase SQL editor, then check the Bills tab on the preview.
  - Follow-ups: wire `reminderFor` (src/lib/bills.js) to notifications (7/3/1/0 days, overdue); edit bill after creation; attachments; bill paid by credit card statement flow on the card liability side once credit-card details exist.
- **#126 First-run welcome + CSV/JSON import** — local-only import; unrelated to the spec except that file import does not yet cover loans/receivables/bills.
- **#93** legal verification draft (not from this session).

## Other owner requests still queued (from 2026-10-31)

1. Profile photo crop + cloud sync on/off for signed-in users.
2. Plans: Quick (free), Pro, Max, Ultra shared with NasrinAI. Pro: 3-month free trial then ₱149/month auto-billed, cancel anytime; lifetime Pro ₱999; Max/Ultra prices from NasrinAI env. Apple Pay, Google Pay, PayMongo. Quick limits: no NasrinAI Pro/Max/Ultra or NasrinAI-space features, no brief/summary, no automation, limited scenery and stickers, no upload, no badges, no cloud sync, no subscription tracker, no reminders, generic local replies instead of NasrinAI, no receipt scan. Needs a NasrinAI-side subscription/entitlement design; recurring card billing and wallet support through PayMongo cannot be verified from the repo — confirm before building. Legal docs must change with it.

## Recommended next step

Phase 6 Home dashboard: add Net worth, Bills due/overdue, Debt and Owed-to-you cards using `financialPosition` (src/lib/accounting.js) and `billsSummary` (src/lib/bills.js), each drilling into its screen; keep the existing Home layout; cloud-only data shows a sign-in hint in local mode. Then reminders for bills, then phase 4 limits.

## How this session validated database work

No Postgres service in CI. Locally: start Postgres 16 (`/usr/lib/postgresql/16/bin`), create roles `anon`, `authenticated`, `service_role`, schema `auth` with `users(id uuid, email text, raw_user_meta_data jsonb)` and `auth.uid()` reading `request.jwt.claims`, apply `supabase/migrations/*.sql` in order (`20261028000200_harden...` fails only on Supabase's `rls_auto_enable()`), then run `supabase/tests/*.test.sql`.
