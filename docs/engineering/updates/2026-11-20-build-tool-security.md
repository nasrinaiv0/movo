# Build-tool security remediation — 2026-11-20

## Purpose and scope

Follow up the PR #329 MOVO audit with bounded development dependency fixes. Retain React 18, CRA, existing bundle entry points, Capacitor projects, APIs, schema and all financial calculations.

## Changes

- package.json / package-lock.json: serialize-javascript 7.1.4; underscore 1.13.8; SockJS-only UUID 11.1.1 override. Existing estree override retained.
- Five development-only lockfile entries change: remove unused randombytes and the old nested serialize-javascript; update serializer, underscore and UUID. No production dependency entry changes.
- src/lib/buildToolCompatibility.test.js: serializer callback/date/regex round trip; UUID v3/v5 reject truncated output buffers; existing SockJS and JSONPath integration remains usable. Real Node WebCrypto is supplied to Jest 27's older isolated global.

## Validation

Node 26.13.1, fresh npm ci --ignore-scripts --no-audit --no-fund. Full CI=true npm run build passed, including offline-worker integration, localization, email template checks, type checking, all then-existing tests and optimized compilation. The completed suite with new compatibility tests passes 252 suites / 1,644 tests; type checking and git diff --check pass. Build generates 229 offline shell resources.

npm audit snapshot: 31 total / 16 high before, 19 total / 9 high after; zero critical before/after. npm audit --omit=dev reports zero both before/after. These counts are the registry result at audit time, not a claim that all vulnerabilities are eliminated. Remaining CRA/SVGO/PostCSS/development-server chains require a separately tested upgrade; do not use npm audit fix --force to replace the architecture.

## Data and security

No production graph, application source, customer record, persisted format, database, RLS, production setting or signed native build is modified. No secret or real user data is included. These patches reduce known development-tool exposure; they do not prove live-site or device security.

## Rollback and release gates

Revert this commit to restore the prior package pins; no data rollback is needed. Exact-head hosted CI/native checks remain required. Vercel is currently reporting Account is blocked, and public MOVO returns HTTP 402 DEPLOYMENT_DISABLED. Account-owner/provider resolution and hosted acceptance are required before merge. Do not bypass deployment protection, create a replacement project or change billing to work around this gate.
