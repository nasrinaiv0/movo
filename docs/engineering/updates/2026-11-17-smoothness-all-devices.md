# 2026-11-17 — Smoother MOVO on budget Android phones and iPhones; camera and voice on every Android device

## Why
The owner asked to optimise MOVO for all Android devices and models and to make it smoother and more responsive on iOS. They shared the Play Console report for bundle 11 (1.0): DEX optimisation 0%, obfuscation 93%, shrinking 92%, R8 Full Mode on, resource shrinking and class repackaging off.

## Google Play report
Bundle 11 was built before #308 (merged 2026-11-17). `main` already selects `proguard-android-optimize.txt`, enables `shrinkResources`, opts in to `android.r8.optimizedResourceShrinking` and adds `-repackageclasses`. The signed bundle built from `main` at `379371ea` (version code 63) contains these changes. Play only re-scores after a new bundle is uploaded. Upload a bundle built from `main` after this change to Internal testing, then compare the three DEX percentages.

AGP 9 is not part of this change. It is a toolchain migration (Gradle 9, new DSL, built-in Kotlin), and Capacitor 8 and its plugins are on AGP 8.13. Play lists it as a recommendation, not a requirement.

## How it was measured
- The production build ran in Playwright's Chromium with a year of realistic records (300 transactions, 6 accounts) and first-run screens skipped.
- **Budget Android profile:** 412×915 at 2.625× density, CPU throttled 6×.
- **iPhone-size profile:** 430×932 at 3×, CPU throttled 2×.
- **Measured:** startup long tasks, frame times while scrolling Home, Transactions and Wallet, and tab switches. Each figure is the median of 3 runs.
- **Diagnosis:** Chrome traces split main-thread time into script, style, layout and paint. Invalidation tracking showed what triggered each style recalculation.
- **Limits:** the browser renders in software, so GPU blur cost cannot be timed here. iOS runs WebKit, not Chromium; iOS figures are a proxy.

## Findings and fixes
1. **Whole-page restyle on every App render (main cause of scroll hitches).**
   - `setLanguage` runs on every App render and wrote `<html lang>` and `<html dir>` each time, even with the same value.
   - Chrome then restyled the entire page: about 580 elements, 160–200 ms at 6× throttle (about 30 ms on a real budget phone).
   - App re-renders when Home scrolls past the top, on toasts and while typing, so each of those hitched.
   - Fix: `lib/i18n.js` now writes only real changes. A test checks that re-applying the same language produces no attribute mutation.
2. **Blur where nothing shows through.**
   - Every card and filter chip had `backdrop-filter: blur(18px) saturate(1.85)` over the plain page colour: 11–15 GPU blur layers per screen, redrawn while scrolling.
   - Pixel comparison of Home, Wallet, Transactions and Menu found the result identical without the blur. Tested in light, dark, the blue, purple and orange tints, two accents and Home header banners: maximum channel difference 0–1, or 9 on 0.001% of Menu pixels.
   - Fix: a new block at the end of `App.css` drops card and chip blur unless a scenery photo or a Home header banner is behind them. The dock, the scrolled header, sheets and anything over a scenery or banner keep their glass.
   - Older WebViews that do not support the selector simply keep the blur.
3. **Date keys.**
   - `dayKey` used `Intl.DateTimeFormat.formatToParts` for every record on most screens.
   - When the format zone is the device zone (always, unless `Intl` fails), the local `Date` getters give the same day about 15× faster. Verified with zero mismatches over about 170,000 instants per zone, in 8 zones including DST, half-hour and 45-minute offsets. Invalid dates still throw.
4. **Chips.** The selected-chip highlight no longer sets new state when the ResizeObserver repeats an unchanged measurement, which saved a render and layout per chip row when a screen opens.
5. **iOS 120 Hz.** `CADisableMinimumFrameDurationOnPhone` lets ProMotion iPhones animate above 60 Hz. Fixes 1–4 apply equally to WKWebView.

### Results (median of 3)
| Budget Android (6× CPU) | Before | After |
|---|---|---|
| Home scroll: average fps / worst frame | 50 / 283 ms | 56 / 83 ms |
| Transactions scroll | 56 / 133 ms | 59 / 33 ms |
| Wallet scroll | 49 / 233 ms | 53 / 50 ms |
| Style time during a scroll | 421 ms | 80 ms |

| iPhone-size profile | Before | After |
|---|---|---|
| Home scroll | 56 fps / 67 ms | 59 fps / 33 ms |
| Wallet scroll | 54 fps / 117 ms | 59 fps / 33 ms |
| Ready after launch | 983 ms | 853 ms |

Startup blocking time and tab switches on the budget profile did not change measurably. Both are dominated by laying out large screens and parsing the 1.46 MB main bundle. Further code splitting is the next lever.

## Android: camera and voice on every device
- Receipt scanning and NasrinAI voice use `getUserMedia` in the WebView. Capacitor asks for `CAMERA`, `RECORD_AUDIO` and `MODIFY_AUDIO_SETTINGS` at runtime, but Android refuses any permission the manifest does not declare. On Android, the live camera therefore showed "Camera access was blocked" and voice failed, while both worked on iOS and the web.
- The manifest now declares the three permissions. They are asked only when the person starts scanning or voice.
- `android.hardware.camera`, `camera.autofocus` and `microphone` are declared `required="false"`, so Google Play still offers MOVO to tablets, Chromebooks and phones without them. They can upload a photo or type instead.
- A contract test pins the permission list and the optional features.
- The Privacy Policy already describes camera and microphone use and withdrawing permission, so no legal change is needed.
- **Play Console follow-up:** voice audio from the Android app now reaches NasrinAI's speech service. Check that the Data safety form declares voice or sound recordings, as it should for iOS and web.

## Validation
- Jest: the new tests in `i18n.test.js`, `format.test.js` and `androidManifestRelease.test.js`, and the full suite.
- `tsc --noEmit` and the strict build pass.
- Android native CI and the iOS build run on the PR.
