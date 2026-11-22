# Erasure integration — 2026-11-20

Preserve current main consent handling, legal disclosures and brand-rendering contracts rather than restoring superseded UI changes from #274. Retain server-owned account erasure, restrictive upload-freeze policies, atomic relational/Auth deletion and retention SQL. The released #328 client reset remains the current records-reset contract; no direct transaction write privileges are restored. Existing source-branch rollout/rollback rehearsal tests remain mandatory.

The local SQL runner correctly refuses a non-GitHub non-container host. Fresh GitHub disposable PostgreSQL checks must pass before claiming SQL verification. Typecheck, production build and full JavaScript suite are tracked on the published head.

Production is not changed by this integration commit. The schedule-owner, erasure and retention migrations need separate explicit approval before merge, including the archive-expiry trigger and scheduled cleanup of old archive copies and completed acknowledgement jobs. The prior approval covered only #328. Preserve historic customer records until this approval and the migration rehearsals complete.

Integrated released main `73e293bf` to preserve setup focus containment, reduced motion, planning/voice panels and the disposable R8 gates. Reconciled both simulator recovery test sets without relaxing failure behavior: only a timeout triggers a cold restart; a second timeout or app launch error still fails. The prior head's iOS launch timed out twice, including after restart; this was a failed check, not native acceptance. All 27 host-side simulator orchestration tests pass; fresh native CI must run. Production migration approval remains pending.
