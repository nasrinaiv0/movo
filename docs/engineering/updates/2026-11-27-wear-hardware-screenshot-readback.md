# Wear screenshot pixel readback on Android 14

Contributor: Codex. Recorded before commit, 2026-11-27 UTC. Parent `f0998b78878252be542e2950f6eab23781efe338`.

## Evidence and correction

Official Android 14 sources show `UiAutomationConnection.takeScreenshot` returning `ScreenshotHardwareBuffer.asBitmap()`, while `Bitmap.getPixel` throws for `Config.HARDWARE`. The compositor-frame gate added in the previous commit therefore must support hardware-backed captures. This is an acceptance-test compatibility correction; no production app behavior changes.

Before inspecting pixels, copy a hardware bitmap to immutable ARGB_8888 software storage. Software captures are read directly. Require a non-null copy; release temporary software storage in a finally block and release rejected or exceptional original captures. A successfully accepted original screenshot is still written to the artifact and recycled by the existing capture routine. No image is synthesized or injected. The three-second deadline, matching threshold, current full bounds, foreground focus, font-scale/text-fit/48dp/round-display assertions and real click/handoff acceptance are unchanged.

References: [Android 14 UiAutomationConnection](https://android.googlesource.com/platform/frameworks/base/+/refs/tags/android-14.0.0_r1/core/java/android/app/UiAutomationConnection.java), [UiAutomation](https://android.googlesource.com/platform/frameworks/base/+/refs/tags/android-14.0.0_r1/core/java/android/app/UiAutomation.java), [Bitmap](https://android.googlesource.com/platform/frameworks/base/+/refs/tags/android-14.0.0_r1/graphics/java/android/graphics/Bitmap.java).

## Validation and limits

The unchanged host wearable contract passed all 12 checks and the whitespace check passed. An initial local Jest invocation used a nonexistent test path and executed zero tests; the actual repository wearable check is scripts/test-wearable-contract.py and its successful result is the reported host evidence. The unchanged per-commit documentation gate is checked after the local commit and before publication. Local Android SDK/Java compilation is unavailable; actual compilation and enlarged/default captures on both watch sizes must pass on the fresh exact head before acceptance. Earlier native screenshots and geometry remain diagnostic evidence, not acceptance for this new head. No new provisioning, dependencies, production UI/layout, account permissions, financial calculations or schema changes. Roll back only this test correction if needed while retaining a compatible real-frame capture check; never waive the rendered evidence gate.

The owner has authorized merges and database updates, but confirms there is no backup. A verified recoverable off-site backup or secure direct backup connection is still missing. Vercel automatically deploys main and the new Friends client depends on missing database RPCs, so remaining merge/deployment and production DDL remain held for coordinated safe rollout. No production mutation or feature activation has occurred.
