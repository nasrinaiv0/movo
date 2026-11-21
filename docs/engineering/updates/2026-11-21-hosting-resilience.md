# Hosting resilience without replacing MOVO — 2026-11-21

The owner asked how MOVO can work while Vercel is disabled. Continue #330's existing offline/audit scope. No Vercel reactivation, replacement deployment, DNS change, production migration or store upload is performed.

## Changes

- `scripts/build-offline-worker.cjs`: the already installed public shell survives HTTP 402/429/5xx as well as rejected network requests. Original 401/403/404 responses remain; absent/denied caches preserve the actual host response. API/private/owner/invitation/auth-query routes and all writes remain outside fallback.
- `src/lib/platform.js` and `publicApiOrigin.js`: optional build-time HTTPS API origin, with strict validation, API-path confinement and safe legacy defaults. Public share/auth URLs and Supabase connections are unchanged. Invalid runtime configuration cannot redirect credentials or prevent local initialization. No automatic request replay/failover.
- `AutoLogSheet` and `referrals`: new API-facing Shortcut recipes/download links follow the configured backend while user-facing app review links keep the public origin; the device key remains masked on screen.
- `scripts/serve-movo.cjs`: optional Node 26 transport invokes unchanged, explicitly registered existing handlers; serves only generated public files with existing security headers and safe paths; bounds JSON bodies and propagates actual chunked lengths to handler checks. Keeps private exception details out of responses. Existing bearer, owner/MFA, consent, billing and provider gates stay in their handlers. Provides process liveness, not an upstream readiness claim.
- Build/CI validates API configuration and tests the optional transport. No dependency graph, financial schema/record/calculation, runtime account preference or CSS redesign is added.

## Verification and acceptance

Final local validation on Node 26.13.1: 258 suites / 1,693 regression tests, typecheck and fourteen worker/server/packaging/release checks pass. Eighteen focused routing/automation/referral tests pass. Both regular web and original-only strict builds pass (230 and 54 shell resources). The initial compile rejected the shared validator's `.cjs` import and its checker exhausted its heap; moving the same CommonJS helper to CRA's supported `.js` source path fixed compilation. Full tests, typecheck and strict builds were then rerun successfully; failed attempts are not counted as passes. Server tests use loopback and synthetic bodies; real handler calls have no credentials, fail authorization/billing gates and make no production writes. Tests cover exact CORS/preflight, malformed/oversized/chunked bodies, source/dotfile/symlink confinement (including hidden in-build targets), ranges, sanitized failure, route compatibility and single handler invocation after failures.

Browser outage acceptance passes with the real worker: install while healthy, switch all host responses to HTTP 402, create a 12.34 expense through the UI, and verify 100.25 becomes 87.91 through reload, host 503, full network offline and healthy recovery. Exactly one expense remains. Private API errors and 401/403 denials are not replaced with HTML; a first visit still receives 402. [Inspected screenshot and results](../../audits/2026-11-21-hosting-outage-review.md). A first visit or old disabled-host installation cannot download this fix during the outage. Local browser evidence does not establish physical-device, public-host or signed-store acceptance.

Previous source `02ef1cee` now passes all seven applicable hosted workflows, including native iOS/Android and paired R8 acceptance. Those results belong to that head. New exact-head checks are required for this change; Vercel production remains independently restricted and App Store name/rights evidence remains pending.

## Activation and rollback

[Operator runbook](../../MOVO_HOSTING_RESILIENCE.md). Prefer an independent host behind the existing owned `movo.nasrinai.com` origin to preserve old app URLs and browser storage. A split API origin requires a rebuilt client and exact CORS configuration; it does not restore the old website, callbacks or previously copied recipes. Configure secrets and external webhook/cron delivery on the chosen host; never put provider/service-role keys in the client or bypass existing gates.

An independently deployed host, TLS, enabled providers and disposable-account acceptance are still required for full online availability. No destination has been provisioned or traffic switched. Roll back hosting/build configuration without rewriting the database or clearing device recovery/outboxes. Maintain one authoritative database and existing operation IDs.
