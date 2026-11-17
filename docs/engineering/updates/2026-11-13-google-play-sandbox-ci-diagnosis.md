# IAP CI gate diagnosis — 2026-11-13 (before corrective commit)

- PR #297 first implementation SHA: `23e4af8e1178116cefd72a73803821e1ea744750`.
- Disposable IAP PostgreSQL CI run #43355492063: JavaScript verification tests passed and migration bootstrap applied, but `scripts/security/iap-db.test.sql` line 98 reported `TEST: sandbox access leaked after allowlist removal`.
- Test fixture already had a different **legitimate production** subscription for the same synthetic user. Therefore `movo_plan_status()` correctly still returned source `store` after removing the sandbox allowlist. The assertion conflated production store access and unauthorized sandbox access.
- Fix the **synthetic test fixture only**: make the license-test receipt `pro_plus` while the existing production receipt stays `pro`, and assert plan `pro_plus` with the test allowlist, falling back to production `pro` without it. Do not weaken production/sandbox guards or change the database migration to make the test pass.
- Recheck exact-head IAP CI, Phase 1, finance, referral, iOS native, and Vercel preview; do not merge or deploy.
