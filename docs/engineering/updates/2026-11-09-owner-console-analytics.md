# Owner Command Center: consolidated from #253, live analytics, accurate plans, layout fixes — 2026-11-09

## Why
PR #253 (Owner Command Center) could not pass CI: its per-file "retain main" commits carry no documentation, so the
per-commit documentation gate failed before tests or the build ran. Its net change (17 files, unchanged) is carried
here as one documented commit instead of rewriting that branch, together with the fixes and improvements below.

## Fixes
- **Build:** `src/index.tsx` declared the lazy owner console between `import` statements (`import/first`), which
  the strict CI build rejects; moved after the imports. #253's CI never reached the build step.
- **Wrong plan data:** the user directory derived plans from manual grants and store rows only, so every person on
  the free month or a referral reward showed "Not verified". It now uses the database's own rules
  (`movo_plan_status`) through `movo_owner_user_plans` (one call per page, max 100 ids); before the migration is
  applied it falls back to the old partial view and says so.
- **Misleading counts:** "Pro"/"Pro+" bars counted store entitlement rows (expired rows and renewals included).
  Overview and Analytics now show the effective plan of every account.
- The console used a relative `/api/owner`; it now uses `apiUrl()` like the rest of the app (CLAUDE.md).
- The API tests in `api/owner/index.test.js` never run in CI (react-scripts only runs `src/`); new cases are also in
  the CI-run wrapper `src/owner/ownerApi.test.js`.

## Analytics (new migration `20261109140000_owner_analytics_kpis.sql`)
`movo_owner_kpis()` returns aggregate counts only (service_role only, same guard as the other owner functions):
accounts (total, verified, new 7/30 days, signed in 7/30 days), effective plan mix and how paid access was obtained
(store, free month, complimentary, referral), trials (started, active, ended, converted to a verified paid store
subscription), activity (records and active accounts in 7/30 days, accounts with a cloud wallet account), capture
channels (manual, file import, alerts...) and a 30-day daily series. No amounts, merchants or per-user rows.

## Layout and UI
- Overview/Analytics: four key-figure tiles (accounts, active accounts, Pro + Pro+ now, free-month trials with
  conversion), a 30-day activity chart (records / active accounts / sign-ups, hover or keyboard tooltip, table
  view), plan mix (Free / Pro · Gold / Pro+ · Platinum, validated light and dark palette, every value labelled),
  the 12-week registrations chart and capture channels. Unavailable data says so; nothing is shown as zero.
- Users: plan filter (All, Free, Pro, Pro+, Free month), plan tag with source and expiry, last sign-in column.
- Chart axis text stays readable on phones; the tooltip never pushes the page wider.

## Verification
- Isolated PostgreSQL 16 (`PGPORT=5499 python3 scripts/test-owner-migration.py`): plan, trial, manual-grant, owner
  audit, work-queue and the new analytics checks all PASS (aggregate-only, effective-plan rules, 30-day window,
  100-id page limit, client and missing-role denial). This runner is local-only; CI does not run it.
- Jest: owner API (14) and analytics components (4) pass; full suite and strict build on this head (see PR).
- Browser QA (`scripts/ui-qa/owner-console.cjs`, fictitious Supabase session, intercepted API) at 390/768/1440 px:
  key figures, 30 activity bars, plan legend, tooltip, trial plan source, grant guard, support form, no overflow.

## Release gates (unchanged from #253, plus)
- Apply `20261108232950`, `20261109000432` and `20261109140000` to production only with owner approval, after a
  schema-matched rehearsal; confirm `service_role` can read `auth.users` for the invoker functions.
- Set `MOVO_OWNER_USER_IDS` (server-only) and enrol MFA; test allowed and denied real accounts.
- `movo_owner_kpis` calls `movo_plan_status` once per account; re-check timing as the user count grows.

## Rollback
Revert the commit; the migrations are additive (functions only for the analytics one). Never drop audit tables.
