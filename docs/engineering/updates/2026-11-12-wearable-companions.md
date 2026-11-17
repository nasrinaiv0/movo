# 2026-11-12 — Wearable companion initial implementation

## Current status
A new, non-destructive pull request is being prepared from main 2edcabdd2d5788d37c3fbf28028c23a350aab9db. It is **not merged**; all final CI and hardware validation are pending.

## Changes prepared
- Wear OS Java UI and separate Android :wear bundle, plus Google-approved RemoteActivityHelper fixed URI to open a blank Quick Log on the paired phone.
- Embedded watchOS SwiftUI companion with WatchConnectivity request to the iOS native bridge. No records or authentication details are shared or cached.
- Existing React Quick Log receives a request but waits for setup, phone app lock and authentication readiness; no automated changes to accounts or transaction records.
- Kotlin/Swift backend dependencies are not introduced to existing phone ledger, billing or sync paths. Existing phone builds remain separate gate.
- Android / iOS CI builds updated to exercise both targets, with dedicated static contract and Jest URI rejection tests.

## Risk register
- Watch OS binary size, icon and watch-store media need separate review.
- Apple Watch message delivery only works while the iPhone is reachable; request is one-shot and never a background money writer.
- Wear OS requires separately signed, appropriately versioned Google Play distribution with the same identity as the phone app.
- Device testing required for phone lock, setup, sign-out, unpaired watch, iPhone unreachable, accessibility, and launch routing.

## Verification plan
1. Validate project/manifest syntax and run `python3 scripts/test-wearable-contract.py`.
2. Run unit regression, full typecheck, app build, Android native build and unsigned Wear AAB.
3. Compile phone app and watchOS target on GitHub macOS simulator.
4. Pair real Android/Wear and iPhone/Apple Watch, verify no automatic ledger writes, no sensitive watch display, proper phone gating.
5. Review store declarations, developer signing, app icons and safe rollback; keep PR open if any gate is red.

No database migrations, RLS, billing changes or production deployments are requested.
