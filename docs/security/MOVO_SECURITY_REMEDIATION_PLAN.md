# MOVO Security Audit & Remediation Plan

**Status:** NOT CLEARED FOR PRODUCTION  
**Repository:** nasrinaiv0/movo  
**Prepared:** 2026-11-03

## Purpose
This document gives Claude Code a concrete, test-driven remediation plan. It records source-level risks and unverified controls; it is not a claim that a live penetration test or production audit has been completed.

## Executive summary
The source review found useful defensive controls, but production security is not yet demonstrated. Highest priorities are database isolation/RLS and grants, atomic transaction idempotency across automation sources, authenticated NasrinAI data access and explicit consent, and verification of production configuration. Do not mark the application production-ready until required tests and deployment checks pass.

## Findings and required remediation

### P0 — Verify and enforce Supabase isolation (not yet verified)
- Inspect every production-relevant migration, RLS policy, table grant, view, trigger, and SECURITY DEFINER function.
- Ensure each user's accounts, transactions, budgets, chat history, preferences, and other financial records are isolated by authenticated user identity.
- Ensure anonymous users cannot read or mutate private financial data; service-role credentials must remain server-only and never ship to the browser.
- For every RPC that reads or writes financial/automation records, verify EXECUTE grants, caller authorization, ownership checks, safe search_path for SECURITY DEFINER functions, and transaction behavior.
- Add/extend SQL isolation tests for cross-user reads, inserts, updates, deletes, RPC calls, and anonymous access. Test with realistic roles, not only owner/service roles.
- Never weaken RLS or grants to make tests pass.

### P0 — Make transaction writes atomic and idempotent across sources
- Review api/log.js, automation device-key authentication, and v2/legacy RPC paths.
- The current API reportedly falls back from log_automation_transaction_v2 to log_automation_transaction when v2 is unavailable. Verify that the legacy function guarantees the same ownership, source-aware idempotency, and concurrency protections. If not, remove the unsafe fallback or fail closed until the required migration is applied.
- Enforce idempotency in the database using unique constraints/keys and a single atomic transaction; application-side duplicate detection is only a UX safeguard.
- Ensure reference IDs and cross-source fingerprints cannot be double-booked by concurrent requests or Apple Pay/Siri/Android/chat/manual/receipt flows.
- Verify replay resistance and rate limits for automation device keys. Store only hashes where possible, support rotation/revocation, and never log raw keys.
- Add tests for duplicate requests, parallel/concurrent requests, retries/timeouts, same reference from different sources, missing/invalid/revoked keys, and migration-not-applied behavior.

### P1 — Fix duplicate heuristic false positives
- Review src/lib/duplicates.js. Merchant matching may treat a substring or one shared token of length 3+ as a match, potentially conflating unrelated merchants.
- Make matching conservative and explainable: normalize merchant aliases, require stronger similarity or multiple discriminating signals, and never let fuzzy matching override exact reference-ID or database idempotency rules.
- Add positive and negative fixtures for common tokens, overlapping names, punctuation, aliases, different accounts, amounts, currencies, dates, income/expense direction, and transfers.
- Preserve explicit user override where product behavior requires it; never silently discard a valid transaction based only on a fuzzy match.

### P1 — Clarify local app lock vs actual authentication
- Review src/lib/appLock.js. A local PBKDF2 passcode hash and browser biometric/WebAuthn-like flow should be treated as a local convenience lock, not server-verified authentication, device attestation, or encryption.
- Do not describe app lock as protecting server-side data or encrypting stored records.
- If there is no server challenge and server-side assertion/origin/RP-ID/signature verification, do not present the feature as security-grade WebAuthn authentication; either implement a standards-compliant flow or label/remove misleading biometric security claims.
- Keep passcodes and derived secrets out of logs. Test background re-lock, local data wipe behavior, storage failure, and unsupported browser/device cases.

### P1 — Verify NasrinAI proxy authentication, scope, and consent
- Audit api/nasrinai/chat.js end to end. Require a valid Supabase user on every request; derive user ID from verified auth, never untrusted request fields.
- Enforce separate, explicit, revocable consent on the server before sending financial context upstream. Do not infer consent from client UI state.
- Send only the minimum user-scoped context needed; exclude other users' data, general database access, secrets, and unrelated conversations. Keep MOVO conversation history isolated from provider-side memory.
- Ensure NASRINAI_API_KEY and Supabase service credentials remain server-side. Redact request/response bodies and sensitive financial data from logs.
- Test unauthorized/expired tokens, cross-user access, missing/revoked consent, upstream 401/429/5xx, timeout, oversized payload, and successful authenticated production requests without exposing secrets.

### P1 — Dependency and supply-chain review (not executed in prior review)
- Inspect package.json, lockfile, transitive dependencies, build scripts, and GitHub Actions.
- Run production and full dependency audits as appropriate; report package, severity, dependency path, fixed version, and upgrade risk.
- Apply targeted upgrades; do not blindly force major-version upgrades. Commit lockfile changes and add regression tests.
- Verify secret scanning and ensure no credentials or real financial data exist in Git history or artifacts. Rotate exposed secrets; deleting a file alone is insufficient.

### P1 — Browser and HTTP security headers
- Existing Vercel configuration includes baseline headers. A site-wide Content Security Policy was not evident in the prior source review; a policy appeared scoped to /brands/.
- Determine actual production headers and required origins first. Add a restrictive site-wide CSP compatible with the app, Supabase Auth, and approved NasrinAI endpoints; avoid broad wildcards and unsafe-inline/eval unless justified and documented.
- Keep HSTS, X-Content-Type-Options, Referrer-Policy, frame protections, and least-privilege Permissions Policy. Test production and preview headers.

### P1 — Financial privacy, retention, and export/deletion boundaries
- Verify published privacy/terms statements match actual data flows, retention, provider processing, local storage, and deletion behavior.
- Test consent revocation, account deletion, financial record deletion, local cache clearing, CSV export/import, and user-scoped data retrieval.
- Treat localStorage as unencrypted by MOVO. Do not imply app lock encrypts records.
- Do not use live or highly sensitive financial data until required legal/operator disclosures and production controls are complete.

## Verification commands and evidence
Run from repository root using the supported Node version:

    npm ci
    npm test -- --runInBand
    npm run typecheck
    CI=true npx react-scripts build
    npm audit
    npm run audit:production

If the lockfile is absent or npm ci fails, document why and resolve without silently generating unreviewed dependency changes. Use actual script names from package.json. Never claim a command passed unless it ran and its exit status/output was captured.

Also:
- Run all Supabase SQL tests and add targeted tests for every finding above.
- Review GitHub Actions permissions, secret exposure, dependency scanning, and secret scanning.
- Verify live deployment headers and auth/consent flows against the intended production URL, using test accounts and synthetic financial data only.
- Run concurrency/replay tests for automation transaction writes.
- Attach sanitized command outputs, test counts, migration identifiers, and deployment evidence to the PR.

## Required workflow for Claude Code
1. Read CLAUDE.md, README.md, docs/PR_WORKFLOW.md, docs/PR_PROGRESS.md, relevant migrations, and existing tests first.
2. Create a focused branch; do not commit directly to main.
3. Implement fixes in small, reviewable changes. Every database change must be a new migration with matching SQL tests. Never alter production data or apply migrations to production without explicit authorization.
4. Add regression tests before or alongside each fix. Preserve existing behavior unless unsafe.
5. Update this document with each finding's status and evidence; update docs/PR_PROGRESS.md and relevant security documentation.
6. Run required tests/typecheck/build/dependency checks. If a check cannot run, mark BLOCKED / NOT RUN and explain why.
7. Open a DRAFT pull request targeting main with a finding-to-fix matrix, migration plan, test results, residual risks, and manual production verification checklist.
8. Do not merge or deploy. Do not expose secrets, print raw tokens, disable security controls, or mark production safe while any P0 or required production check remains unresolved.

## Acceptance criteria
- [ ] RLS/grants/RPC tests prove cross-user and anonymous isolation.
- [ ] Transaction idempotency is atomic and race-safe across all supported sources.
- [ ] Unsafe legacy RPC fallback is removed or proven equivalent with tests.
- [ ] Duplicate heuristic regression tests prevent material false positives.
- [ ] App-lock and biometric claims accurately reflect implemented security.
- [ ] Server-side NasrinAI auth, consent, minimization, and redaction tests pass.
- [ ] Dependency audit is captured; actionable vulnerabilities are fixed or documented with explicit risk acceptance.
- [ ] Production CSP/headers are verified.
- [ ] CI tests, typecheck, and build pass with recorded output.
- [ ] Draft PR and documentation are complete; no merge/deploy performed.
- [ ] Production-readiness decision is evidence-based.

## Current baseline
The prior review was a partial source inspection. It did not execute the test suite, dependency audit, Supabase production/RLS verification, live deployment tests, or penetration tests. Reported risks are a mixture of code-level concerns and controls that remain unverified; do not label unverified items as confirmed exploitable vulnerabilities.


## 2026-11-06 review status (not security certification)
- Store entitlement RLS now protects the new live table; authenticated SELECT only, direct INSERT denied and anonymous SELECT denied. No purchase entitlements created.
- Twelve authenticated-callable SECURITY DEFINER financial RPCs remain on the advisor list. Retain needed functionality and verify caller/ownership checks with distinct simulated users before changing grants.
- Leaked-password protection warning remains in Supabase. MOVO uses passwordless OTP and social OAuth; configure the feature if password auth becomes enabled.
- Full tenant-isolation, device automation, account deletion, live store purchase and browser penetration tests remain release blockers.

- Privacy supplements now disclose optional NasrinAI financial context, voice/camera, hosting providers, market/favicon requests, unencrypted local storage, supported 90-day Archive and deletion exceptions. Reconcile with production vendor contracts before publication.
