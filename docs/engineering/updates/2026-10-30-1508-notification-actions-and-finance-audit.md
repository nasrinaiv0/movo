# MOVO audit delta — 2026-10-30 15:08 Asia/Manila (07:08 UTC)

## Evidence boundary

- Repository: https://github.com/nasrinaiv0/movo
- Current main and production source: 86c28e90805869816c3a17dd40f6a2398d0b7291.
- Production deployment: dpl_BT3wbamTQw387JDRBnXqSkUECDrK; READY; alias movo.nasrinai.com. Production root returned HTTP 200.
- Current implementation previews remain unmerged. This audit made documentation-only changes and did not alter application code, database state, Auth settings, financial records, secrets or production deployment.

## Audit delta — 2026-10-30 15:08 Asia/Manila (07:08 UTC)

### PR #60 — Notification detail actions (new since previous checkpoint)
- Repository: nasrinaiv0/movo. PR: https://github.com/nasrinaiv0/movo/pull/60. Current exact head: 76d8be917a27083b8c1bc557e9fc5e2de2f0fed1. PR remains open/draft; no merge or production deployment.
- Source areas: src/screens/Notifications.js, src/App.js, src/App.test.js; detailed trace in docs/engineering/updates/2026-10-30-1424-notification-detail-actions.md; ledger, progress register and Claude handoff were already updated on this branch.
- Before: the More button on a notification detail invoked the global Quick actions sheet (add transaction/account, CSV import/export, theme selection, sample-data removal), which was not appropriate for the selected notification.
- After: the button is named Notification actions and opens a dedicated notificationActions sheet. Mark as unread removes the selected notification ID from prefs.readIds, switches the feed to Unread and returns to the list. Notification settings navigates to the existing Notification Channels screen.
- Regression coverage: two App-level tests cover marking the current alert unread and navigating to notification settings. Earlier attempts 41014137573 and 41014193032 failed because the test tried to reach Notifications through the wrong navigation entry point; tests were corrected to Home → Notifications.
- Exact-head CI #41015057727 passed 20 suites / 116 tests, TypeScript typecheck, audit:controls, production-only npm audit (0 vulnerabilities) and production build. Preview dpl_5cRdXx1g3fbtPf5YoEUENgm3vpM6 is READY for this SHA; preview root and JS bundle returned HTTP 200. Bundle scan did not find server-only variable names NASRINAI_API_KEY or SUPABASE_SERVICE_ROLE_KEY.
- Security/data impact: UI-only; no database schema, RLS, grants, authentication, financial record, or provider secret changed. The notification action updates local notification-read preference state and uses existing navigation; verify persistence behavior across reload/account switching in manual QA.
- Still not production: main remains 86c28e90805869816c3a17dd40f6a2398d0b7291, deployment dpl_BT3wbamTQw387JDRBnXqSkUECDrK. Keyboard/focus, screen-reader, responsive interaction and authenticated finance flows remain outstanding.

### PR #43 — Strict CSV amount validation (current head reaffirmed)
- Current head: 19a2641a3f987d129f172077dfa2d8d49c24c9c2. Source/test change is in src/lib/csvImport.js and src/lib/csvImport.test.js; the latest commit adds audit documentation.
- Before: parser removed currency symbols, commas and whitespace before Number(), so malformed grouping such as 1,2,3 could become 123 and scientific notation such as 1e3 could be accepted.
- After: complete amount format is validated before removing grouping commas; only supported plain or correctly grouped digits, optional leading currency symbol/sign and optional decimal fraction are accepted. Invalid values produce row-level errors; no currency conversion is introduced.
- Exact-head CI #41010265858 passed 20 suites / 127 tests, typecheck and production build; production-only dependency audit reported zero vulnerabilities. Preview dpl_DitmTVsr2Kk67RkJvZuPAUBAXyAj is READY. Preview bundle delivery is verified; production deployment still uses main and does not include this PR.
- No database migration or production financial write occurred. Still required: authenticated import/export, malformed-row rejection, mixed-validity/partial-write behavior, idempotency/duplicate handling, ownership and currency isolation.

### PR #52 — Chart data integrity (carried forward; no new source commit detected)
- Current head: 6dab55aec6378283631761650a39c6cbf7272671. CI #41007086687 passed 18 suites / 101 tests; preview READY.
- The implementation validates chart values and preserves currency formatting; unlike currencies must not be combined without an explicit FX model. The next test must prove chart provenance against authorized user-owned financial records and cover malformed/non-finite values and accessibility labels.

### PR #56 — MOVO-only NasrinAI context boundary (carried forward; no new source commit detected)
- Current head: cbcb2d6db42ac0dee6c235e0df95f344fcebf86b. CI #41006746648 passed 18 suites / 104 tests; preview READY.
- Missing/blank NASRINAI_API_KEY now returns controlled HTTP 503 with nasrinai_not_configured before upstream calls or chat insertion. This does not fix a non-empty rejected credential or prove isolation.
- An authenticated preview request was blocked by Vercel Authentication before reaching the handler. No authenticated unrelated-project canary has passed. Keep issue #47 open and PR #56 draft until retrieval, provider prompt, response, transcript, cache, retry and log boundaries are demonstrated with synthetic data.

### Production, dependencies and privacy
- Production deployment dpl_BT3wbamTQw387JDRBnXqSkUECDrK is READY at main SHA 86c28e90805869816c3a17dd40f6a2398d0b7291. The production root returned HTTP 200. PR #43/#52/#56/#60 previews are not production releases.
- Full dependency tree still reports 34 findings (16 low, 5 moderate, 13 high); production-only npm audit reports 0. Do not describe the whole dependency tree as clean.
- Prior Supabase catalog evidence is historical for this checkpoint: 7/7 checked tables had RLS, 22 user-facing policies referenced auth.uid(), no anon/PUBLIC grants were found in the checked set, and the upstream conversation mapping remained server-role-only. Leaked-password protection was previously reported disabled; it was not changed here.
- Legal publication warning remains until formal operator/controller identity and address, actual retention/deletion schedule, provider/data-recipient details and jurisdiction-specific review are verified.

## Next actions
1. Complete authenticated MOVO-scope canary testing for PR #56; keep issue #47 open until evidence covers retrieval, prompt, response, transcript, cache, retries and logs.
2. Test PR #43 CSV import/export with synthetic user-owned accounts, including malformed rows, partial-validity files, duplicates/idempotency and cross-account/currency isolation.
3. Validate PR #52 chart provenance against authorized finance records.
4. Perform manual keyboard/focus, screen-reader, responsive and authenticated finance-flow QA for PR #60.
5. Enable and verify leaked-password protection through an authorized Supabase Auth configuration change; remediate the full-tree dependency findings.
6. Do not merge any of these draft PRs solely because CI and Vercel preview are green.

## Evidence links

- PR #60 notification actions: https://github.com/nasrinaiv0/movo/pull/60
- PR #60 exact-head CI: https://github.com/nasrinaiv0/movo/actions/runs/41015057727
- PR #60 matching preview: https://vercel.com/nasrin-ai/movo/5cRdXx1g3fbtPf5YoEUENgm3vpM6
- Detailed notification action trace: https://github.com/nasrinaiv0/movo/blob/chore/ui-control-audit-reconciled-main/docs/engineering/updates/2026-10-30-1424-notification-detail-actions.md
- PR #43 CSV validation: https://github.com/nasrinaiv0/movo/pull/43
- PR #43 exact-head CI: https://github.com/nasrinaiv0/movo/actions/runs/41010265858
- PR #43 matching preview: https://vercel.com/nasrin-ai/movo/DiTmTVsr2Kk67RkJvZuPAUBAXyAj
- PR #52 chart integrity: https://github.com/nasrinaiv0/movo/pull/52
- PR #56 context boundary: https://github.com/nasrinaiv0/movo/pull/56
- Context isolation issue #47: https://github.com/nasrinaiv0/movo/issues/47
- Current production deployment: https://vercel.com/nasrin-ai/movo/BT3wbamTQw387JDRBnXqSkUECDrK

## Next audit actions

Run authenticated synthetic-data tests for context isolation, finance CRUD, CSV import/export, currency isolation and chart provenance; complete manual accessibility checks; remediate leaked-password protection and full-tree dependency findings. Keep all draft PRs open until their explicit release gates are evidenced.
