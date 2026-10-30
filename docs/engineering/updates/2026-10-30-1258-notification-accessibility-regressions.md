# Notification settings accessibility regression — 2026-10-30 12:58 Asia/Manila

## PR #60 — notification settings disabled-state verification — 2026-10-30 12:58 Asia/Manila

- Current code/test head before reconciliation: `9c38028cbf3a11675f16db09d0fb41190fd5f71d`.
- Added regression coverage for unsupported notification channels and demo-only notification categories. Push Notifications, Email Notifications, Account & Security, NasrinAI Updates, Promotions, and Reports must be disabled and have their visible reason linked through `aria-describedby`. In-App Alerts and Transactions category toggles remain functional.
- Improved visible copy for demo-only categories so disabled-state explanations explicitly say that live delivery is not connected and only sample/demo alerts are available.
- The first test attempt at `776b9af8d955f220406f48dbc7f573950ae89380` failed: **1 test failed / 113 passed** because the test expected a sample/demo explanation that the rendered description did not contain. The next source-only commit `02155f4501f56d8b7fa2fb79143af33730dc28a1` also failed while the assertion still expected the old text. The assertion was corrected in `9c38028cbf3a11675f16db09d0fb41190fd5f71d`; latest Vercel build logs confirm **20 suites / 114 tests passed**, `tsc --noEmit` passed, `audit:controls` ran, and the production bundle compiled successfully.
- Exact-head preview [dpl_HGwfQSwmFiJ5j17MzDmoLKB2he4X](https://vercel.com/nasrin-ai/movo/HGwfQSwmFiJ5j17MzDmoLKB2he4X) is READY. Preview root and JS bundle returned HTTP 200; the bundle contains all four explicit sample/demo-only descriptions.
- No GitHub Actions run was available for the exact head `9c38028` during this checkpoint. The preceding exact-head Actions run [41005003149](https://github.com/nasrinaiv0/movo/actions/runs/41005003149) passed **20 suites / 113 tests**, typecheck, `audit:controls`, production-only audit (0 vulnerabilities), and build at `f063cd5a1f4be085aac34f947816bfdffe2c8a82`. The dependency manifest is unchanged since that run, but the production-only audit was not independently rerun on `9c38028`. Full dependency-tree audit still reports 34 findings (16 low, 5 moderate, 13 high).
- **Keep draft:** interactive keyboard/focus, screen-reader, responsive behavior, and authenticated finance/CSV/currency flows remain unverified. This PR is also being reconciled with current main's documentation-only merge.
- No database schema, RLS/grants, Auth setting, financial records, provider secrets, or other repository were changed.

## Remaining validation
- Keep PR #60 draft until manual keyboard/focus, screen-reader, responsive, and authenticated finance-flow checks are completed.
- Re-run the production-only dependency audit on the latest exact head if a new GitHub Actions run can be triggered. The package manifest has not changed since the last passing production audit.
- The full dependency-tree findings and Supabase Auth leaked-password warning remain separate release gates.
