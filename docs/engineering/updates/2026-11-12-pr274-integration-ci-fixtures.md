# MOVO disposable PR274 + PR276 + PR278 — CI fixture corrections

## 2026-11-12 — CI-only PR279: payment-aware synthetic migration data

The second exact integration CI finance run advanced through all baseline migrations but rejected the unprivileged synthetic account seeds with `sign_in_required` from `enforce_movo_cloud_plan()`. This is expected real authorization behavior, **not** a defect to bypass in production. Seed two synthetic owners as a service-role data fixture with Pro+ manual grant rows, then explicitly switch to the `authenticated` test role and owner JWT for the legacy direct-write compatibility test. Add an isolated test contract checking both grants precede protected rows. The last integration commit also failed documentation gates because it did not include a new dated engineering update; the new dated note and PR progress are included before this commit. No production, main, PR274, cloud entitlement, schema or store configuration changed.

## Verification

The previous CI run recorded a real `sign_in_required` error when seeding financial accounts without paid/authenticated context. Guard and fixture tests run before actual SQL migration, so they did not establish migration correctness. Re-run all six exact-head workflows after this change. The modified fixtures only use synthetic UUIDs and disposable PostgreSQL containers, and the tests retain the strict old-client denial checks.


## 2026-11-12 — CI-only PR #279: isolate synthetic stage data from existing regression tests

Disposable PostgreSQL CI **fully applied** all baseline migrations, PR274's three security/erasure/retention migrations, post-upgrade legacy-denial tests, and successfully restored a pre-upgrade snapshot into a separate database. The next pre-existing SQL suite failed because it assumed user_preferences contained exactly one row; our earlier synthetic stage fixture deliberately persisted a second unrelated user's row. Fix the **test harness**, not production SQL: take a clean schema snapshot before seeding staging users; after the staging and rollback assertions, recreate ONLY the randomly named disposable test database from its pristine snapshot, apply the same three PR migrations, then run the original seven SQL regressions against uncontaminated data. Keep the separate snapshot rollback database and owner-safe test coverage. Test contracts ensure the reset is bound to a generated database and an explicit GitHub Actions service container. No customer schema/data or real Supabase account changes.

The prior disposable commit b40b18e8 lacks a per-commit dated engineering note, despite the latest commit having one. To pass the **existing** per-commit documentation gate without weakening it, replace only the disposable CI-only branch's history with one two-parent integration merge commit containing the final verified source tree and dated engineering notes. **Never** force-update `main` or canonical PR #274. Fresh exact-commit CI must pass before any release approval.
