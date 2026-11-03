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


---

# Deep Security Audit Addendum — 2026-11-03

**Purpose:** Expand the remediation scope with the additional attack scenarios, evidence requirements, and penetration-test matrix from the November 3 deep audit. This addendum is an implementation specification for Claude Code, not proof that the listed attacks have been reproduced.

## Evidence and severity rules

- Keep the production status **NOT CLEARED FOR PRODUCTION** until all P0 acceptance criteria and required production checks have evidence.
- Distinguish **confirmed code/configuration finding**, **historical observation**, **potential attack path**, and **not yet verified**. Do not call an untested scenario an exploitable vulnerability.
- A code change, successful build, HTTP 200, or passing unit test alone does not close a security finding.
- Use synthetic accounts and financial data in staging or another explicitly approved test environment. Do not conduct destructive tests against real user or production financial data.
- For each finding, record: affected files/functions/tables, threat scenario, root cause, severity rationale, remediation commit, regression test, test output, residual risk, and production-only verification still required.

## Expanded finding register and implementation requirements

### P0 — Cross-user financial data isolation (expanded)
Audit every table, view, materialized view, function, trigger, storage bucket, API route, and server-side query that can read or mutate user data.
- Test cross-user reads, inserts, updates, deletes, exports, and storage access.
- Verify identity is derived from a verified Supabase JWT/session, never trusted from request-body user IDs.
- Inspect all SECURITY DEFINER functions for safe search_path, least-privilege ownership, explicit authorization, and appropriate EXECUTE grants.
- Verify views and RPCs cannot bypass intended RLS protections.
- Include anonymous, authenticated non-owner, owner, and service-role test cases. Do not use service-role success as evidence that normal-user authorization works.
- Confirm production schema and grants match the migrations and tests.

### P0 — Transaction replay, idempotency, concurrency, and atomicity (expanded)
- Trace all transaction entry paths: Apple Pay/Shortcuts, device automation, bank notifications, manual entry, chat/voice, receipt/OCR, imports, retries, and any server-side integrations.
- Enforce idempotency in the database with durable unique keys or equivalent atomic conflict handling; client-side duplicate detection is not a security boundary.
- Test exact replay, changed payload with reused reference, same transaction reported by different sources, simultaneous requests, timeout-after-commit retries, and duplicate delivery across devices.
- Ensure a transfer debits and credits atomically, validates ownership of both accounts, validates currency rules, and cannot partially commit.
- Review the legacy RPC fallback from log_automation_transaction_v2 to log_automation_transaction. Remove it or fail closed unless the legacy path is proven to provide equivalent authorization, validation, idempotency, and concurrency guarantees.
- Do not silently drop legitimate transactions because a fuzzy merchant match says they are duplicates.

### P0 — NasrinAI context and conversation isolation (expanded)
- Reproduce and investigate the previously observed unrelated-context response (portfolio document appearing in a finance conversation). Treat it as a context-isolation defect to investigate; do not assume it proves cross-user exposure.
- Trace context from browser/client state through MOVO API, database retrieval, cache, provider request, retries, and fallback providers.
- Authorize every record/document before it enters a prompt. Never rely on prompt instructions to enforce data access.
- Verify conversation IDs, retrieval IDs, user IDs, tenant/project scopes, cache keys, and provider-side conversation identifiers cannot cross account or project boundaries.
- Add synthetic canary strings to two test accounts and attempt cross-account retrieval through new conversations, account switching, logout/login, retries, caches, and provider fallbacks.
- Capture sanitized evidence of the exact context sent upstream. Never log raw financial records, tokens, or secrets.
- Verify unrelated global memory/project documents are excluded unless the user explicitly selects and authorizes them.

### P0 — Secret exposure and privileged credential boundary (expanded)
- Scan current source, Git history, built browser bundles, source maps, CI logs/artifacts, deployment configuration, and runtime logs.
- Verify Supabase service-role credentials and NasrinAI/provider secrets are server-only.
- Confirm public environment variables contain only intentionally public values.
- If a real credential is found in history or artifacts, revoke/rotate it; deleting the current file is insufficient.
- Record scan tool, scope, timestamp, result, and remediation evidence without printing secret values.

### P0 — Failure handling and financial consistency (expanded)
- Simulate database timeout, provider timeout, network interruption, retry, partial failure, and response loss after commit.
- Verify every operation has a deterministic persisted outcome and cannot create duplicate or partial ledger state.
- Ensure failed automation/review queues cannot later re-import an already committed transaction as a new transaction.
- Fail closed when required migrations, security dependencies, or authorization checks are unavailable.

### P1 — Device-key authentication and automation abuse (expanded)
- Test registration takeover, key rotation, revocation propagation, stolen-key simulation, replay, brute-force/guessing resistance, per-device/account/IP limits, and concurrent requests.
- Store only appropriately hashed device secrets; never log raw keys.
- Define and test the blast radius of a compromised device key and the user's recovery/revocation workflow.
- Verify a valid device key cannot choose another user's account or exceed its registered scope.

### P1 — Local app lock and biometric security claims (expanded)
- Treat the existing local PBKDF2 passcode and browser/native biometric behavior as a local convenience lock unless the complete security architecture proves otherwise.
- Verify UI routes and sensitive data are not considered authorized merely because the local lock was bypassed or localStorage was modified.
- Test app background/resume, process termination, account switching, logout, unsupported devices, storage failure, and local cache cleanup.
- Do not claim that localStorage data is encrypted or that a browser-created credential is server-verified WebAuthn unless a server challenge and full server-side assertion/origin/RP-ID/signature verification are implemented.

### P1 — Merchant matching and financial data validation (expanded)
- Review src/lib/duplicates.js. Fuzzy substring/shared-token matching and missing merchant names can produce false matches.
- Make matching conservative, explainable, and subordinate to database idempotency.
- Add negative cases for unrelated merchants with shared tokens, short names, aliases, missing merchant data, and same-amount purchases.
- Validate amount bounds, sign/direction, currency, account ownership, transaction type, date/time, reference IDs, and transfer semantics on the server and in database functions.
- Do not rely on client-side validation.

### P1 — CSP, XSS, CSRF, and HTTP headers (expanded)
- Verify actual response headers on production and preview routes, not only vercel.json.
- The reviewed Vercel config showed a CSP scoped to /brands/ rather than a clearly site-wide policy. Confirm current deployed behavior and add a restrictive app-wide CSP after inventorying required origins.
- Test safe rendering of merchant names, transaction descriptions, OCR/imported content, AI output, markdown, profile fields, and external metadata.
- Inspect dangerous HTML insertion, URL schemes, markdown renderers, and DOM sinks; use safe rendering and context-appropriate output encoding.
- Treat CORS as a browser policy, not authentication. Test missing/malformed/untrusted Origin requests and ensure every sensitive endpoint independently authenticates and authorizes.
- Do not add broad CSP wildcards or unsafe-inline/unsafe-eval without a documented, tested exception.

### P1 — Rate limiting and resource exhaustion (expanded)
- Inventory every sensitive endpoint, including OTP, authentication, transaction logging, AI proxy, uploads, OCR, exports, and expensive database operations.
- Test per-account, per-device, per-IP, concurrency, request-size, timeout, and provider-cost limits.
- Verify controls remain effective across multiple sessions/devices and when a rate-limit backend is unavailable.
- Ensure failures are bounded and do not expose internal errors or create unbounded retry loops.

### P1 — Logs, caches, retention, and privacy (expanded)
- Inspect browser storage, service-worker/cache behavior, CDN/deployment caching, API responses, database logs, observability, analytics, and provider-side retention.
- Ensure financial/private API responses are private and non-cacheable where appropriate.
- Redact access tokens, device keys, secrets, and unnecessary financial content.
- Test consent revocation, account deletion, record deletion, export, and cache clearing against actual data flows.
- Reconcile published privacy disclosures with actual upstream AI processing and retention behavior.

### P1 — Dependency, CI/CD, and repository controls (expanded)
- Run current full and production dependency audits from the committed lockfile; report exact package, severity, dependency path, patched version, and exploitability/context.
- Review GitHub Actions permissions, third-party actions pinning, workflow triggers, pull-request secret exposure, artifact handling, and deployment credentials.
- Verify main branch protection/rulesets, required checks, review requirements, and deployment restrictions.
- Do not treat historical dependency counts or previous branch-protection observations as current results; re-run and record current evidence.

## Required penetration-test matrix

Run with dedicated synthetic accounts and non-production financial data. Record request/response status, actor role, expected result, actual result, and sanitized evidence.

| ID | Scenario | Expected result | Priority |
|---|---|---|---|
| PT-01 | Read another user's transaction | Denied | P0 |
| PT-02 | Modify another user's account | Denied | P0 |
| PT-03 | Delete another user's transaction | Denied | P0 |
| PT-04 | Invoke protected RPC as unauthorized user | Denied | P0 |
| PT-05 | Read private financial data anonymously | Denied | P0 |
| PT-06 | Replay an automation transaction | No duplicate ledger entry | P0 |
| PT-07 | Submit identical transactions concurrently | One logical transaction | P0 |
| PT-08 | Invoke legacy RPC fallback | Equivalent protections or fail closed | P0 |
| PT-09 | Transfer between unauthorized/incompatible accounts | Denied; no partial mutation | P0 |
| PT-10 | Switch users during an AI conversation | No context leakage | P0 |
| PT-11 | Retrieve another account's document/context | Denied before prompt inclusion | P0 |
| PT-12 | Use expired/invalid authentication token | Denied | P0 |
| PT-13 | Inspect browser build for privileged secrets | No privileged secret present | P0 |
| PT-14 | Submit revoked device key | Denied | P1 |
| PT-15 | Render malicious merchant/OCR/AI content | No script execution | P1 |
| PT-16 | Send untrusted cross-origin state-changing request | No unauthorized state change | P1 |
| PT-17 | Flood sensitive endpoint | Limits enforced; service remains stable | P1 |
| PT-18 | Trigger provider/database timeout and retry | No duplicate or partial transaction | P0 |
| PT-19 | Revoke AI financial-data consent | Subsequent financial context transmission blocked | P1 |
| PT-20 | Inspect logs after financial operations | No unnecessary secrets or sensitive payloads | P1 |
| PT-21 | Run dependency and secret scans | Findings captured; actionable issues fixed or risk-accepted | P1 |
| PT-22 | Inspect deployed CSP and security headers | Required policy present on app routes | P1 |
| PT-23 | Bypass local app lock | Backend authorization still enforced; claims remain accurate | P1 |
| PT-24 | Delete account and inspect retained copies | Behavior matches documented retention/deletion policy | P1 |

A passing matrix improves assurance but does not prove the system is invulnerable. Include additional tests discovered during code review.

## Expanded release gate

Do not mark MOVO cleared for production until:
- [ ] PT-01 through PT-13 pass with evidence, or any exception is explicitly documented and blocks release where appropriate.
- [ ] Transaction writes are atomic and idempotent across every supported source and retry path.
- [ ] The legacy RPC fallback is removed or proven equivalent.
- [ ] AI conversation and financial context isolation is demonstrated end to end with canary tests.
- [ ] Privileged credentials are absent from browser artifacts and exposed credentials have been rotated.
- [ ] Device-key revocation, rotation, and abuse limits are verified.
- [ ] CSP, XSS, CSRF/origin, rate-limit, and production-header checks are recorded.
- [ ] Dependency, secret, CI/CD, and branch-protection reviews are current.
- [ ] Consent, deletion, retention, and log/cache behavior match actual implementation and published disclosures.
- [ ] All unresolved P0 items remain visibly **BLOCKED / NOT CLEARED FOR PRODUCTION**.

## Claude Code execution instructions — mandatory

1. Re-read the current repository instructions and this complete remediation plan before changing code.
2. Independently verify each finding against the current branch, migrations, tests, and deployment configuration. Do not assume this addendum proves a vulnerability exists.
3. Create a focused implementation branch from the current main branch. Do not push remediation directly to main.
4. Implement in small, reviewable changes. Database changes require new migrations and matching SQL regression tests; do not apply migrations to production.
5. Add automated tests for each reproducible defect and each security property. Use synthetic fixtures and test identities.
6. Update this plan and docs/PR_PROGRESS.md as each finding is investigated, fixed, tested, or blocked.
7. Maintain a finding matrix with one of: CONFIRMED / FIXED / VERIFIED, NOT REPRODUCED, UNVERIFIED, BLOCKED, or ACCEPTED RISK. Include evidence and test references.
8. Run the repository's applicable test, typecheck, build, dependency, and security checks. Capture actual output and exit codes. Mark unavailable checks NOT RUN/BLOCKED.
9. Open a DRAFT pull request targeting main. Include scope, finding-to-fix mapping, migrations, tests, evidence, residual risks, and manual production verification steps.
10. Do not merge, deploy, access or modify production data, weaken controls, or expose secrets. Keep production status NOT CLEARED FOR PRODUCTION until the release gate is satisfied.

