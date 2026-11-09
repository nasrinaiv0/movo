# 2026-11-09 — PR #255 iOS simulator launch reliability

## Root cause and evidence
- GitHub Actions iOS run 42546337168 completed the web app build, Capacitor sync, and unsigned Xcode compilation successfully.
- A cold macOS-26 runner spent over seven minutes migrating CoreSimulator services and then `xcrun simctl launch` timed out at 90 seconds (no app crash diagnostic). This means native launch remains **unverified**, not that the iOS binary cannot compile.
- No finance, entitlements, production database, or signed-build paths are modified.

## Changes
- `.github/workflows/ios-build.yml`: invoke testable native-smoke driver after the same unsigned Xcode build; add host-independent CI unit-test step.
- `scripts/ios-simulator-smoke.py`: prefer a pre-booted available iPhone, wait for explicit boot completion, bounded install, 180-second first launch and one 180-second retry **only** after an OS-service timeout; enforce deep-link open and actual simulator screenshot, with explicit errors and device diagnostics. If launch fails, the job fails.
- `scripts/test-ios-simulator-smoke.py`: mock system calls to test booted-device selection, missing devices, timeout retry, failure propagation, and subprocess timeout handling.
- `docs/PR_PROGRESS.md`: register exact-head verification gate.

## Tests and deployment gates
- Vercel Sandbox: `python3 scripts/test-ios-simulator-smoke.py`, `python3 -m py_compile scripts/ios-simulator-smoke.py`, `python3 -m py_compile scripts/test-ios-simulator-smoke.py`, workflow script parse and diff checks.
- GitHub CI after push: required Phase 1 checks, Finance Tenant Isolation, and iOS macOS-26 **real** CoreSimulator launch, deep-link, screenshot (must all pass; no soft-fail).
- Local Linux sandbox cannot execute Xcode or CoreSimulator, and unit tests are not proof of a native launch.

## Security, compatibility, rollback
- Only CI and host test tooling; no sensitive user data, secrets, production traffic, provisioning, or schema changes.
- Screenshot contains only seeded GitHub simulator state; no logged-in finance data.
- Roll back this commit to restore prior smoke step, at the cost of its 90-second launch limit and lack of a specific cold-boot retry.
