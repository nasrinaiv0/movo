# Handoff — Financial Planning & Bills (continue in the MOVO project)

Date: 2026-11-01 (status refreshed 2026-11-02). Handed over from a NasrinAI-repo session; all work below is in `nasrinaiv0/movo`.
Spec: [`docs/specs/FINANCIAL_PLANNING_AND_BILLS_SPEC.md`](../specs/FINANCIAL_PLANNING_AND_BILLS_SPEC.md). Read it and `CLAUDE.md` first.

## Status by spec phase (checked against code and GitHub on 2026-11-02; verify again before acting)

| Phase | State | Where |
|---|---|---|
| 0 Audit | Done 2026-11-01 | this file |
| 1 Ledger correctness | On main: routing matrix, transfers, balances | `src/lib/financeCalculations.js`, `docs/engineering/updates/2026-11-01-transaction-routing-audit.md` |
| 2 Obligations (loans, debts, receivables) | On main; migration applied in production | `20261031170235_obligations_receivables_goals.sql`, `src/lib/accounting.js`, `src/lib/obligationsRepository.js`, `src/screens/FinancialPlanning.js` |
| 3 Goals & savings | On main (allocation RPC, no double allocation). **Missing:** savings interest estimates (spec §4) | same as phase 2 |
| 4 Spending limits | Partly: category budgets (`src/components/Budgets.js`). **Missing:** account / merchant / custom-group scopes, configurable warning %, refund rule | — |
| 5 Bills | **Merged (#127)**, but migration `20261101120000_bills_payments.sql` is **not applied** in production, so the Bills tab errors there. **Missing:** reminders (`reminderFor` in `src/lib/bills.js` is not called anywhere), editing a bill, attachments, paying a bill from a credit card | `src/lib/bills.js`, `src/components/BillsPanel.js` |
| 6 Home dashboard | **Not started**: Net worth, Bills due/overdue, Debt and Owed-to-you cards with drill-down (spec §1) | — |
| 7 Currency & crypto | **Not started**: rate staleness warning, historical rates, crypto valuation (`src/lib/fx.js` has none) | — |
| 8 Production readiness | Not started; see the release blockers in `docs/PR_PROGRESS.md` | — |

## Open PRs

Only #93 (legal verification draft) is open. #126 and #127 are merged. See `docs/PR_PROGRESS.md` for the full register and the four production migrations still to apply.

## Other owner requests still queued (from 2026-10-31)

1. Profile photo crop, and turning cloud sync off while signed in. **Not built** (Settings only offers sign-in when cloud sync is off).
2. Plans: Quick (free), Pro, Max, Ultra shared with NasrinAI. Pro: 3-month free trial then ₱149/month auto-billed, cancel anytime; lifetime Pro ₱999; Max/Ultra prices from NasrinAI env. Apple Pay, Google Pay, PayMongo. Quick limits: no NasrinAI Pro/Max/Ultra or NasrinAI-space features, no brief/summary, no automation, limited scenery and stickers, no upload, no badges, no cloud sync, no subscription tracker, no reminders, generic local replies instead of NasrinAI, no receipt scan. **Not built.** Needs a NasrinAI-side subscription/entitlement design; recurring card billing and wallet support through PayMongo cannot be verified from the repo; confirm before building. Legal docs must change with it. (Since #133 the streak badges use Pro/Max/Ultra as badge tiers only; they unlock nothing and imply no paid plan.)
3. File import for loans, receivables and bills. **Not built** (`src/lib/dataImport.js` covers accounts, transactions and subscriptions).

## Recommended next step

Phase 6 Home dashboard: add Net worth, Bills due/overdue, Debt and Owed-to-you cards using `financialPosition` (src/lib/accounting.js) and `billsSummary` (src/lib/bills.js), each opening its screen; keep the existing Home layout; cloud-only data shows a sign-in hint in local mode. Then wire bill reminders into notifications, then the phase 4 limit scopes.

## How this session validated database work

No Postgres service in CI. Locally: start Postgres 16 (`/usr/lib/postgresql/16/bin`), create roles `anon`, `authenticated`, `service_role`, schema `auth` with `users(id uuid, email text, raw_user_meta_data jsonb)` and `auth.uid()` reading `request.jwt.claims`, apply `supabase/migrations/*.sql` in order (`20261028000200_harden...` fails only on Supabase's `rls_auto_enable()`), then run `supabase/tests/*.test.sql`.
