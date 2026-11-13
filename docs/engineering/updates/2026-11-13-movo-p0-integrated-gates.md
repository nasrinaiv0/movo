# MOVO P0 isolated integration — 2026-11-13

## Progress recorded before application-code changes
- Owner asks to fix all outstanding MOVO P0 issues without bypassing release proof.
- Production main pinned to `5b616ce88e640ee867418db66b4da90ac438f5a0`.
- Existing open branches: PR #295 Android Google OAuth callback and secure-vault diagnostics, PR #296 Google Play cancellation-through-expiry, PR #297 Play license-tester isolation (new migration). Their independent checks are not proof of interoperability.
- This branch combines only the three reviewed P0 scopes and their test fixtures. It is a **disposable cross-PR integration check**, not a replacement for the source PRs and not an authorization to merge.
- Never change production Supabase, Vercel, main, secrets, Google Play, Apple distribution, existing accounts or financial records. Never generate/upload a signed store AAB.

## Integration implementation
1. Bring Android OAuth callback/dedup regression code from PR #295.
2. Bring independent Play expiry correction and tests from PR #296.
3. Bring strict test-purchase allowlist, fenced SQL migration, disposable IAP tests and RTDN handling from PR #297.
4. Reconcile the shared `api/lib/purchaseVerification.js`, `src/lib/purchaseVerification.test.js` and `docs/PR_PROGRESS.md` files carefully; verify no differing production config or migrations are silently discarded.
5. Check full exact-head Phase 1, Android native, iOS native, finance isolation, IAP PostgreSQL, referral security, and Vercel preview. Preserve missing/failed checks as blockers.

## Release gates
- Android Google OAuth, email OTP and secure session on a *signed internal Play build of same commit*; return to app and persist after restart.
- Google Play subscription product/base plan, license-test purchase, acknowledgement, renewal, cancellation-through-verified-expiry, restore, RTDN, immediate revoke/refund and non-tester isolation on physical device.
- Live redirect URLs, Google provider config, Play Console license testers and service account verified by operator.
- Disposable PostgreSQL migration rollback/compatibility and explicit production approval.
- Cross-PR review and all required checks green before merge; **NO MERGE / NO PRODUCTION DEPLOYMENT / NO AAB UPLOAD**.

## Results
Pending CI and actual device evidence. This plan was committed before integration code.