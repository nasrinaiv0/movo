# MOVO PR #227 — free local authorization and native callback hardening

**Date:** 2026-11-08 (Asia/Manila)  
**Scope:** Native deep-link parser, disposable PostgreSQL authorization regression, GitHub CI  
**Release status:** Draft / unmerged. No production Supabase, Vercel deployment, billing, or customer data altered.

## Implemented and tested

### 1. Disconnected two-user financial authorization verification

- Added `supabase/tests/security_definer_tenant_isolation.test.sql` with synthetic Alice/Bob accounts and financial records. It attempts cross-user calls for all twelve authenticated-callable `SECURITY DEFINER` finance RPCs:
  - `allocate_goal_funds`, `allocate_plan_funds`, `delete_transaction_with_reversals`, `ensure_bill_occurrences`, `record_bill_payment`, `record_loan_event`, `record_receivable_event`, `release_goal_allocation`, `release_plan_funding_allocation`, `restore_transaction_links`, `reverse_allocation_event`, `update_bill_occurrence`.
- The eleven RPCs targeting resource IDs reject attempts using another user's IDs; `ensure_bill_occurrences` cannot create bill occurrences for the other user. Tests also check unchanged foreign balances and transactions.
- Positive checks prove the rightful account owner can modify their bill occurrence and release their own savings-goal and plan allocations. The test uses a single transaction and **ROLLBACK**.
- Added `scripts/test-finance-rpc-isolation-local.py`: creates a randomly named disposable PostgreSQL database, constructs only local Supabase Auth/Storage fixture shims, applies all 28 repository migrations and runs the SQL regression. The local database is force-dropped in `finally`.
- **Strict host guard:** accepts only `localhost`, `127.0.0.1`, `::1`, or the standard local PostgreSQL Unix socket. Ignores `PGHOST` unless explicitly and safely provided through `MOVO_TEST_PGHOST`. Cannot be aimed at a remotely hosted production database.
- Ran locally inside the existing Vercel Sandbox with PostgreSQL 18: **all 28 migrations and all adversarial checks passed**; no Supabase remote connections or mutations. Database cleanup completed.

### 2. Continuous verification

- Added `.github/workflows/finance-tenant-isolation.yml` to run the exact same regression on PRs against a short-lived, containerized local PostgreSQL 18 instance. The CI-only database password is a nonproduction fixture; no real Supabase secrets or deployment credentials are used.
- The new GitHub job is unverified until the final pushed PR head runs. It does not replace independent application CI, native builds, or required branch protections.

### 3. Harden native URL handling

- `src/lib/native.js` now rejects malformed, oversized, ambiguous and credential-bearing `movo://` callbacks; rejects duplicate PKCE codes, userinfo, nonstandard ports, unexpected deep-link paths and token parameters. OAuth error callbacks cannot additionally exchange a code.
- `src/lib/native.test.js` adds negative regression tests. The intended normal `movo://auth-callback?code=...` and `movo://log?...` flows are preserved.
- **This reduces spoofed/malformed link handling; it does not solve the inherent custom-scheme interception risk.** Verified HTTPS Universal Links/App Links and signing information remain release requirements.

## Reproduction

In Vercel Sandbox, use a fresh local PostgreSQL server (not a customer database):

```sh
MOVO_TEST_PGHOST=/var/run/postgresql MOVO_TEST_PGUSER=ubuntu \
  python3 scripts/test-finance-rpc-isolation-local.py
CI=true npm test -- --runInBand src/lib/native.test.js
npm run typecheck
CI=true npm test -- --runInBand
CI=true npx react-scripts build
```

The runner itself refuses any nonlocal target. In GitHub CI it runs only against a transient `postgres:18` service.

## Explicit remaining blockers

- This validates **repository migration behavior in a locally simulated environment**, **not** the deployed Supabase schema, auth policies, extensions or all production data edge cases. Do not claim live tenant isolation certification.
- Real signed Android/iOS device upgrade, deep-link collision and token-vault migration checks remain pending.
- GitHub branch-protection ruleset currently not enforced; administrator action required. PR stays draft pending review.
- Web HttpOnly authentication/BFF design, MFA/passkeys, comprehensive shared API/OTP throttling, verified HTTPS mobile links, device attestation and security monitoring remain incomplete.
- The earlier proposed paid Supabase branch was **not created**. Production data and configuration were not changed.
