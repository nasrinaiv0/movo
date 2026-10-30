# MOVO notification detail actions — 2026-10-30 14:24 Asia/Manila

## Finding

In `src/screens/Notifications.js`, the accessible More button on a notification detail invoked `setSheet({ name: 'actions' })`. That sheet is the global Quick actions menu and offers Add transaction, Add account, CSV import/export, Choose theme, and Remove sample data. It is not an appropriate action menu for the notification being viewed. The control responded, but its behavior was contextually incorrect.

## Implementation

- Changed the button accessible name to `Notification actions`.
- Added a dedicated `notificationActions` sheet in `src/App.js`, rendered only when an active notification exists.
- Added **Mark as unread**: removes the active notification ID from `prefs.readIds`, switches the feed filter to `Unread`, and navigates back to the notification list.
- Added **Notification settings**: navigates to the existing NotificationSettings screen; the normal navigation helper closes the sheet.
- Added two App-level regression tests in `src/App.test.js`: one verifies the selected notification returns to the Unread feed after marking unread, and one verifies the settings action reaches Notification Channels.

## Traceability

- Existing PR reused: [#60 — UI control and accessibility audit](https://github.com/nasrinaiv0/movo/pull/60).
- Branch: `chore/ui-control-audit-reconciled-main`.
- Source/test commits: `050e53f0f712f34306b827d12b2acb51adb89bb7`, `bba4df97b452a9e2449d3813d71ac8f01b24996b`, `e25a3327cf7b96c0caceabe8064322315181f92f`, with test-entry correction `b1cbcf250b2c7ac744a73e9c3b79629f68f843cf`.
- Exact-head CI and preview results must be checked on the latest PR head. The earlier green PR #60 run does not validate this change.

## Security and scope

- This is UI state/navigation only. It does not change financial records, finance persistence, ownership checks, Supabase schema/RLS/grants, authentication, legal text, or secrets.
- The notification ID is already generated from the current user-scoped transaction feed or local sample notices. The action only updates the existing local preference list; it performs no cross-user or database write.

## Remaining verification

- Confirm latest-head full tests, typecheck, static control audit, production-only dependency audit, and production build.
- Verify the exact-head preview and interactively test the notification action sheet at desktop and mobile widths, keyboard focus/escape behavior, and screen-reader announcements.
- Keep PR #60 draft until its full accessibility and authenticated finance release gates are complete.


## Test-entry correction and failed CI evidence

- GitHub Actions run [41014137573](https://github.com/nasrinaiv0/movo/actions/runs/41014137573) on source/test head `e25a3327cf7b96c0caceabe8064322315181f92f` failed: **2 tests failed / 114 passed**. Both new tests threw `TypeError: Cannot read properties of undefined (reading 'dispatchEvent')` because they attempted to use the bottom-navigation helper for Notifications, which is opened from the Home header.
- Run [41014193032](https://github.com/nasrinaiv0/movo/actions/runs/41014193032) on documentation-updated head `eb9ac5cd01989a1aa8eecec98ff84c5153f2a3ad` reproduced the same two failures; the documentation-only commits did not change the faulty test setup. These failures are explicitly preserved, not counted as passes.
- Corrected both tests in commit `b1cbcf250b2c7ac744a73e9c3b79629f68f843cf` to navigate to Home and click the real Notifications header control before opening a notification. This is a test-only correction; product code is unchanged in that correction.
- The latest full CI run must validate the corrected source/tests and final audit documentation. Do not reuse the failed or older green results; read the current PR #60 Checks tab for the final exact-head outcome.


## Exact-head validation result — 2026-10-30 14:30 Asia/Manila

- This entry supersedes the earlier pending-validation note. Corrected code/test head `b1cbcf250b2c7ac744a73e9c3b79629f68f843cf` passed GitHub Actions run [41014247593](https://github.com/nasrinaiv0/movo/actions/runs/41014247593): **20/20 suites and 116/116 tests passed**, `tsc --noEmit` passed, `npm audit --omit=dev` reported **0 production vulnerabilities**, `audit:controls` passed, and production compilation succeeded.
- The final audit-documentation head `0c80b41657a187a1623f56fea01c76f138663f9a` also passed exact-head GitHub Actions run [41014324340](https://github.com/nasrinaiv0/movo/actions/runs/41014324340) with the same results: **20 suites / 116 tests**, typecheck, production-only audit (0), control audit, and production build.
- Exact-head Vercel deployment [dpl_FvKrwabpuBHCRT4xyicXcnNecFnk](https://vercel.com/nasrin-ai/movo/FvKrwabpuBHCRT4xyicXcnNecFnk) is READY for `0c80b41657a187a1623f56fea01c76f138663f9a`. Preview root and JS asset returned HTTP 200. The deployed bundle contains the accessible **Notification actions** label, **Mark as unread**, and **Notification settings**, and the notification-detail button routes to `notificationActions` rather than the global Quick actions sheet.
- Failed runs [41014137573](https://github.com/nasrinaiv0/movo/actions/runs/41014137573) and [41014193032](https://github.com/nasrinaiv0/movo/actions/runs/41014193032) remain documented: both failed two newly added tests because the tests attempted to use a nonexistent Notifications bottom-nav entry. The fixture was corrected to use Home → Notifications; the subsequent exact code/test run and final documentation-head run passed.
- Validation proves automated tests, static control audit, production-only dependency audit, build, preview readiness, and served bundle content. It does **not** prove a full interactive keyboard/focus, screen-reader, responsive, or authenticated finance/chat walkthrough. PR #60 remains draft until those broader release gates are completed.
- Full dependency-tree findings (previously 34: 16 low, 5 moderate, 13 high), Supabase leaked-password protection, verified legal publication facts, authenticated finance/CSV/currency checks, and upstream MOVO-scope canary remain separate blockers. No database schema, RLS/grants, Auth settings, financial data, or secrets were changed.


## Fresh read-only Supabase security check — 2026-10-30 14:31 Asia/Manila

- Read-only catalog query against the MOVO Supabase project confirmed RLS enabled on **7/7 checked public tables**: `profiles`, `financial_accounts`, `transactions`, `budgets`, `movo_ai_conversations`, `movo_ai_messages`, and `movo_ai_upstream_conversations`.
- The six user-facing tables have **22 policies**, and all 22 checked policy expressions reference `auth.uid()`. The checked grant set contains **0 anon/PUBLIC grants**. The upstream mapping has **0 anon/authenticated grants** and 7 `service_role` grants, preserving its server-only boundary.
- Security Advisor still reports `auth_leaked_password_protection` as WARN (disabled). It reports `rls_enabled_no_policy` for the upstream mapping as INFO; this is intentional for a server-only mapping, and no client policy should be added. Performance Advisor reports seven unused indexes as INFO; no index was dropped without query evidence.
- This was read-only metadata/advisor inspection. No schema, RLS policy, grant, Auth setting, financial row, or secret was changed.
- Release gates remain: owner-authorized leaked-password protection, legal publication facts, authenticated finance/CSV/currency verification, authenticated MOVO-scope canary, and interactive accessibility QA. The notification-action UI change is unrelated to the database boundary.
