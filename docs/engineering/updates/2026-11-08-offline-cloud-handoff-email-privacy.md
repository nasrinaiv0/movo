# 2026-11-08 — Verified cloud-to-local handoff and Profile email masking

## Scope
- Ensure an expired, server-verified Pro entitlement or explicit Cloud Sync switch-off preserves supported account/transaction data in a per-user device workspace before allowing further local transactions.
- Account-scoped local snapshots retain ledger postings, accounting activities, budgets, bills and occurrences. They never migrate a signed-in user's finances into shared guest data.
- Fail closed on incomplete cloud retrieval or browser quota errors. The last complete local copy remains authoritative; remote records are never deleted.
- After local edits, re-enabling cloud requires reconciliation instead of silently replacing entries. Unknown entitlement/network failure is not treated as proof of expiry.
- Mask most of the email address in Profile and connected-provider labels. Authentication continues using the original email: display masking is not encryption.

## Test evidence
- Vercel Sandbox `movo-offline-fallback-privacy-20261108` based on main `be7c3d9`.
- 793/793 React/Jest tests across 142 suites, TypeScript validation and optimized build passed on the final fail-closed implementation.
- Focused tests cover per-owner local-workspace separation, atomic browser quota failure, masked email, Profile and Settings.
- GitHub draft PR checks and signed-device/browser UI validation are separate release gates.

## Open safety gaps — draft, not commercial release
- Offline CRUD and full fidelity migration for cloud loans, receivables, obligation/payment events, schedules, receipt and QR attachments, and concurrent reconnect reconciliation remain unfinished.
- Browser localStorage is not encrypted; no claim of protection from device compromise or XSS.
- Verify two users on the same device, plan-expiry transition, unknown entitlement, quota denial, iPhone Safari persistence, sign-out and restore on a real signed app.
- No production database or paid Supabase branch was changed.

## Review and rollback
See the detailed companion assessment in `docs/security/2026-11-08-offline-cloud-handoff-and-email-masking.md`.
Do not merge until release-blocking offline financial coverage is resolved; if rolled back, preserve user-specific local records for export and recovery.
