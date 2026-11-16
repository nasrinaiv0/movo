# MOVO Node.js 26 LTS runtime and CI alignment — 2026-11-12

## Baseline and goal
- Starting commit: `2b9a1cf7720043c48c20d37d6f64e45e9f5e272a`; Vercel MOVO project already configured with Node 26.x; GitHub Actions used Node 22 in seven setup-node steps across six workflows.
- Standardize the Node runtime without affecting application behavior, dependencies, Supabase, auth, payments, production deployment, or signing secrets.
- Vercel Sandbox API preflight returned HTTP 402 payment_required; do not change billing, use PR GitHub Actions plus integrated Vercel preview.

## Implementation prepared before commit
- Add `.nvmrc` with `26`; `package.json` `engines.node: 26.x` to match existing Vercel configuration.
- Switch all seven setup-node steps to `node-version-file: .nvmrc`; log an enforced Node 26 assertion in Phase 1 CI.
- Keep `npm@11.19.1` CI installs pinned; no dependency or lockfile changes.
- Existing `@types/node@20.17.30` provides compile-time API typings, not the runtime version, and remains unchanged because TypeScript 4.9 / CRA 5 compatibility requires separate review.
- Source: Android native security build; Play CI test-signing and manual signing steps; hybrid-sync; IAP integrity; iOS simulator; Phase 1 CI. PostgreSQL-only finance and referral workflows need no Node runtime change.

## Verification plan and release gates
- Verify package JSON, YAML, root Node file, and per-commit docs gate.
- Exact-head Phase 1: npm ci, dependency security audit, auth configuration tests, i18n, TypeScript, full Jest and optimized web build.
- Android: debug / release R8 native builds; Play: ephemeral CI signing and verified disposable AAB (never upload); iOS: unsigned Xcode simulator compile and launch; IAP cryptographic integrity, hybrid sync and tenant isolation workflows.
- Verify all applicable GitHub Actions job conclusions, identify missing/skipped runs, and match the exact Vercel **preview** deployment SHA and status; inspect preview build errors and accessible HTTP smoke.
- Manual signed Play release and TestFlight uploads cannot run on a PR and must remain untriggered. No claim of real-device verification from simulator builds.
- No merge, main changes, database migrations, Vercel settings edits or production redeployment. Resolve failures only on this feature branch; document results before any subsequent commit.

## Pre-commit checks
- Inspected and counted exactly seven existing setup-node v22 declarations, validated replacement for each, preserved GitHub action versions and pinned npm install commands.
- Changes are limited to Node version/configuration, workflow setup, and both required docs. Status of CI/preview: pending PR creation; not asserted green.
