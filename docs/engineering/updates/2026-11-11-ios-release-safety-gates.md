# MOVO iOS release hardening — November 11, 2026

**Repository:** `nasrinaiv0/movo`
**PR:** #272, branch `fix/ios-release-gates-20261111`
**Base:** `b1d728f9a31d51da5183bcd61f392cbbfb6e5c18`
**Status:** release-gate code update. **Not** signed iOS/App Store certification.

## Scope and architecture invariants

Existing UI, routing, financial data flows, accounting calculations, Supabase production schema/RLS, native bridge, OAuth, plan entitlement model, purchases, security policies, and marketing screens remain intact. This change adds release verification and cloud build determinism only.

1. Broaden `.github/workflows/ios-build.yml` PR/push triggers to all bundled product code, API, public assets and build scripts. Recompile both Debug simulator and unsigned Release iPhone target. Run current iOS screenshot/deep-link smoke.
2. Add pure-Node `scripts/check-ios-release-readiness.cjs` and five negative regression checks. Reject wrong native IDs, accidental remote website wrapper, missing permission strings, invalid Xcode version, missing StoreKit manual finishing, absent signed TestFlight pipeline, and a wrong/transparent App Store icon.
3. Pin Codemagic dependency install to the lockfile and validate Xcode 26+ before signed distribution; run project typecheck, tests, build and existing `xcode-project build-ipa` and TestFlight upload configuration.
4. Update `docs/IOS_APP.md` and this release handoff. No StoreKit entitlement relaxation or production migration.

## Directly inspected source evidence

- Canonical bundle ID `com.nasrinai.movo` matches Capacitor and Xcode, iPhone-only portrait deployment.
- GitHub iOS simulator workflow on prior `main` commit `97e5f61d` passed; not current candidate.
- Native app icon GitHub binary is a genuine **1024×1024 RGB PNG (no alpha channel)**.
- Codemagic distribution profile and ASC integration are expressed in YAML, but credentials and execution status cannot be verified through repository code.
- Vercel web Production deployment `b1d728f` is READY; this is **not** an Apple signed binary.
- Live Supabase `movo_iap_commit` requires environment `production`. Apple's TestFlight transactions use the Sandbox environment. Never add a blanket production Sandbox fallback or grant paid/referral entitlements for test receipts.
- Vercel Sandbox creation attempted through v3/v4 and returned `402 payment_required`. No current UI verification is claimed.

## Exact-head verification required

- GitHub macOS `MOVO iOS build` including Node contract tests, React build, unsigned Release iPhone compilation, simulator installation and screenshot.
- GitHub Phase 1 CI, finance tenant isolation and any active security workflows; Vercel preview with UX/device responsiveness and no runtime regression.
- Signed App Store IPA, App Store Connect successful TestFlight processing, real iPhone authentication, biometric/background, Siri/mic/camera/receipt, account deletion, local/cloud recovery, money exactness, RLS cross-account isolation, trial/subscription restore/refund/renewal, privacy manifest audit.
- Billing remains **disabled** until an isolated Sandbox test backend/entitlement ledger proves end-to-end StoreKit behavior, production credentials are configured, and production App Store Server Notifications V2 are validated.
- Owner action: configure Apple Developer membership/App ID, Codemagic MOVO_ASC signing, app store subscriptions, TestFlight testers/reviewer account and required privacy/legal declarations.

## Merge/release policy

PR is non-draft for CI. Merge only if required checks pass and preview/device criteria are met. No production deployment, DB migration, billing activation, App Store upload or sandbox override was performed by this implementation.
