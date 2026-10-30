# MOVO notification-settings accessibility regression — 2026-10-30 13:02 Asia/Manila

## PR #60 notification-settings accessibility regression — 2026-10-30 13:02 Asia/Manila

- Current PR #60 head: `8005fbc695c5a8f30f2817e99b3fb8226ea1a429`, reconciled with current `main`.
- Added regression coverage for unsupported Push/Email delivery and demo-only Account & Security, NasrinAI Updates, Promotions, and Reports. Each disabled switch must expose a visible explanation through `aria-describedby`. In-App Alerts and the Transactions category remain interactive and must call the preference handler.
- Updated the disabled-category descriptions to explicitly say that live delivery is not connected and sample/demo alerts only.
- The first attempt at `776b9af8d955f220406f48dbc7f573950ae89380` failed (1 failed / 113 passed) because the visible explanation did not match the test's sample/demo expectation. The source-only follow-up `02155f4501f56d8b7fa2fb79143af33730dc28a1` still failed against the stale assertion. The test was corrected at `9c38028cbf3a11675f16db09d0fb41190fd5f71d`; latest branch reconciliation is `8005fbc695c5a8f30f2817e99b3fb8226ea1a429`.
- Exact-head GitHub Actions run [41006039735](https://github.com/nasrinaiv0/movo/actions/runs/41006039735) passed: **20 suites / 114 tests**, TypeScript typecheck, production-only npm audit (**0 production vulnerabilities**), `audit:controls`, and production build.
- Exact-head Vercel preview [dpl_EYB99rVuHay4i4MA3QfH9WKueW7X](https://vercel.com/nasrin-ai/movo/EYB99rVuHay4i4MA3QfH9WKueW7X) is READY; preview root and JavaScript bundle returned HTTP 200, and the four explicit demo-only descriptions were present in the deployed bundle.
- The full dependency tree still reports **34 findings (16 low, 5 moderate, 13 high)**. No dependency changes were made. The previous production-only audit passed on this exact head.
- **Not release-complete:** interactive keyboard/focus, screen-reader, responsive, and authenticated finance/CSV/currency flows remain unverified. PR #60 remains draft.
- No database schema, RLS/grants, Auth setting, financial record, provider secret, or separate repository was changed.

## Remaining release gates
1. Perform interactive keyboard-only/focus, screen-reader, dialog/navigation, and responsive checks for the complete visible control inventory.
2. Verify authenticated cloud finance CRUD, CSV import/export, account ownership, currency isolation, and chart provenance with synthetic user-owned records.
3. Verify authenticated MOVO context confirmation and unrelated-project canary; historical upstream 401 for a non-empty rejected credential requires authorized owner-side credential remediation.
4. Keep Terms/Privacy publication warnings until formal operator/controller identity/address, retention/deletion schedule, provider/data-recipient disclosures, and jurisdiction review are supplied.
5. Enable and verify Supabase leaked-password protection through authorized Auth configuration; continue triaging the 34 full-tree dependency findings.
