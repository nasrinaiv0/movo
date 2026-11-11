# MOVO PR #274 — simulator runtime selection and bounded recovery

## 2026-11-12 — PR #274 iOS simulator launch recovery and runtime matching

The exact-head iOS CI compiled and installed the signed-off debug simulator build, but `simctl launch` hung twice for 180 seconds after a slow (>8-minute) first boot; a subsequent retry was started on the unchanged head to distinguish a runner flake. This patch changes **only macOS CI smoke-test tooling**: select the newest available iOS Simulator runtime (avoid Xcode/older runtime mismatch), and restart only the selected simulator after a genuine launch timeout before the single bounded retry. No erase, no skipping launch/deep-link/screenshot, no soft-failing app crash, no native/app/security/finance code changes. Added selection and fail-closed restart tests; a standalone local Python test harness passed 9 tests before commit. The macOS-host tests and actual launch must still pass after the PR push.

## What is still unverified
- The selected macOS runner must compile, boot, launch the exact app, open the custom URL and save a screenshot. Fail if any step fails.
- A successful CI smoke is not an Apple signed-device StoreKit purchase or a full iOS release audit.
- Vercel Sandbox testing is blocked by the project returning HTTP 402 (payment_required); it cannot run Xcode/CoreSimulator regardless.
