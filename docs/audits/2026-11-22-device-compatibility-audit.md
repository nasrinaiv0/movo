# MOVO device compatibility audit — 2026-11-22

MOVO has responsive phone layouts and optional watch companions, but full iPhone Duo, Samsung foldable and smartwatch compatibility is not yet established. Basic launch support, optimized layouts, physical-device acceptance and store availability are separate claims. This audit changes no application code, architecture, financial structures, production settings or customer records.

## Scope and evidence

Audited main `2a94fa4a3e4761350e8b874c0625725583020264`; local documentation head `cc4ae63e8c86aa7cf88cd985e02ccf46b4b0a682` has the identical tree. Reused the existing original-only production bundle from tested application head `e8f8742d7870ef6681f2123b809e60faa6584ff7`; `git diff` confirms identical `src`, `public`, `ios` and `capacitor.config.json` content. A source audit cannot establish the contents or availability of every installed/store release.

Reviewed native manifests, SDK targets, watch implementations, phone handoff/unlock gates, UIKit chrome, responsive breakpoints and viewport listeners. Checked current Apple, Android and Samsung documentation. No actual Duo, Samsung foldable or paired watch was available in this Linux environment.

## Compatibility matrix

| Device/platform | What the source supports | Audit verdict |
| --- | --- | --- |
| iPhone Duo | iPhone app target, iOS 15 minimum, arm64, Touch ID and Face ID through LocalAuthentication; width-responsive web content | Basic compatibility expected under Apple's compatibility behavior. Full-display, all-pose optimization is incomplete and untested. |
| Samsung Galaxy Z Fold | Android API 24 minimum / target 36, no phone orientation lock, size/density/layout configuration handling, responsive web content | Responsive foundation present. Cover/inner-screen transition, Samsung multi-window and native lifecycle acceptance are unverified. |
| Samsung Galaxy Z Flip | Same Android phone app | Main-screen use has the same responsive foundation. Flex Mode is not implemented explicitly. External cover-screen app eligibility/use is not established. |
| Apple Watch | Separate watchOS 10+ SwiftUI target with paired-iPhone WatchConnectivity quick-log request | Limited companion only. No independent ledger, balance display, purchases or watch-side logging. Signed pairing/installation remains unverified. |
| Wear OS, including supported Galaxy Watch and Pixel Watch models | Separate API 28+ watch module, target 36, fixed quick-log handoff to paired Android phone | Limited companion only; a concrete visual-policy gap and unverified round-screen/pairing acceptance remain. Separate signed watch distribution is required. |
| Older Samsung Tizen watches, Garmin, Fitbit and other watch operating systems | No corresponding platform module found | No implemented MOVO companion support demonstrated. Notifications mirrored by a phone do not establish app compatibility. |

Samsung states that newer Wear OS Galaxy Watches cannot pair with iOS; use Apple Watch with iPhone and a supported Wear OS watch with Android. Exact watch/phone model and OS compatibility must also satisfy the manufacturer's pairing requirements. [Samsung compatibility guidance](https://www.samsung.com/us/support/answer/ANS10004668/).

## Findings and recommended resolution

### High: iPhone Duo optimization has not been validated with the required SDK and poses

The latest successful [main iOS run 44993781116](https://github.com/nasrinaiv0/movo/actions/runs/44993781116) explicitly reports Xcode 26.6, iOS 26.5 SDK and an **iPhone 17 / iOS 26.5** simulator. It compiled both watch and phone targets and an unsigned physical-iOS Release target. It did not test Duo. `ios/App/App/Info.plist:56` permits portrait only.

Apple explains that pre-iOS-27 SDK builds run in a compatibility layout; newer SDKs introduce dynamic resizing and changed bar placement. Updating the SDK alone is insufficient: first adapt controls to available window size and safe areas, then test every supported pose. Preserve the iOS 15 minimum where dependencies permit; SDK selection and deployment minimum are different settings. [Apple Duo preparation](https://developer.apple.com/iphone-duo/prepare/).

### High: custom iOS chrome cannot inherit Duo's native navigation adaptation automatically

`ios/App/App/GlassChrome.swift:208` builds a custom top bar; `:267` builds a fixed-height bottom dock with a horizontal stack. These use Auto Layout and safe areas, which is useful, but are not a system `UITabBarController` or toolbar that automatically adopts Duo's new arrangements. No size-class/pose-driven rail arrangement was found.

`src/lib/nativeChrome.js:23` mirrors only `nav.bottom-nav .nav-item`. At 768 CSS pixels the React app instead renders `.side-nav` (`src/App.js:3048`), leaving the native dock hidden while web navigation takes over. The fallback can remain usable, but it does not prove a consistent native Duo interface. Unify the available-width/trait-driven navigation contract, reserve each occupied edge correctly, preserve existing actions and modal/unlock gates, and test UIKit and web content together. No framework rewrite is required.

### Medium: fold posture and hinge avoidance are incomplete

`src/lib/layout.js:13` checks both horizontal and vertical viewport segments and listens for resize/orientation events. `src/App.css:1875` has only a **horizontal-segment** grid rule. Its full-width headers/large cards and centered sheets are not guaranteed to avoid a separating hinge. No native Jetpack WindowManager/FoldingFeature integration was found. Native posture integration is needed only where the product needs posture-specific behavior; its absence alone does not make normal foldable use incompatible.

In this Chromium probe, CDP accepted vertical/horizontal display features, but both segment media queries remained false. Consequently the hinge-specific rules were **not exercised**. Do not describe these probes as successful hinge support or infer actual WebView support. Keep the working width-based fallback and validate real WebView capabilities before adding a minimal native posture bridge. Test both book and tabletop postures, orientation, IME, multi-window and asymmetric insets. [Android adaptive guidance](https://developer.android.com/develop/adaptive-apps/guides/get-started-with-adaptive-apps).

The phone targets API 36, so large-window resizing matters even when a device ignores orientation/resizability restrictions. [Android adaptive do's and don'ts](https://developer.android.com/develop/adaptive-apps/guides/adaptive-dos-and-donts).

### Medium: Wear OS background conflicts with a published visual requirement

`android/wear/src/main/java/com/nasrinai/movo/wear/WearActivity.java:24` sets the background to `Color.rgb(9, 18, 14)` (#09120e). Google's WO-V13 calls for a black app background. Set the background to black and verify the launch theme/splash as well. This is a source-level submission gap, not evidence that a physical watch cannot launch MOVO. [Wear OS app quality](https://developer.android.com/develop/adaptive-apps/quality-guidelines/wear-app-quality).

The same file fixes the quick-log button to 52dp (`:71`) and uses uniform rectangular padding without round-screen insets. Increased text size/round-screen clipping is a **risk requiring measurement**, not a reproduced failure. Use content-driven height and shape-aware insets if tests demonstrate clipping. Verify swipe-to-dismiss, rotary scrolling, 48dp targets and 192dp/227dp round-screen layouts against the same quality checklist.

### Release gate: watch companions have no signed, paired-device acceptance evidence

`ios/App/MOVOWatch/MOVOWatchApp.swift` sends only a fixed action while the iPhone is reachable; it cannot wake MOVO or enter a transaction independently. `android/wear` explicitly declares `standalone=false` and hands off only `movo://wear-log`. These are intentional limited features, not full financial apps on a watch.

Phone handlers wait for authentication initialization, completed setup and local unlock before opening the existing manual form (`src/App.js:2454`). Privacy checks find no financial payloads or tokens in the watch handoff. Preserve these boundaries. Apple documents the reachability requirement for interactive messages. [WatchConnectivity reachability](https://developer.apple.com/documentation/watchconnectivity/wcsession/isreachable).

Before advertising watch support, install signed companions, verify actual pairing/unpairing, phone locked/unlocked/offline/missing, account switching and duplicate taps, and complete watch listings/provisioning. Use the same Android package/signing identity with a distinct watch version code. No signed watch upload or physical pairing was performed here.

### Independent service blocker: public API remains disabled

A fresh read of `https://movo.nasrinai.com/api/purchases/entitlements` during this audit returned HTTP 402 and `DEPLOYMENT_DISABLED`. This prevents live API-dependent acceptance on all device families. Restore a correctly configured API before certifying subscription verification/restore, markets or friends. It does not establish a hardware-compatibility defect. Existing local/offline financial behavior must retain its ownership and reconciliation rules.

## Verification performed

- Wearable static privacy/manifest contract: **PASS**, script-reported 12 checks.
- Four focused frontend suites: **28 tests passed** (`layout`, `native`, `iosInterface`, `nativeChrome`). These validate mocked contracts, not native device posture.
- Isolated Chromium, external requests blocked, synthetic guest account only: **16 viewport geometry checks passed** across draft entry and Wallet. Tested draft sizes 344×882, 466×678, 674×898, 768×1024, 890×626, 1024×768, 280×653, 674×370 and return to 360×800; seven Wallet sizes. These are CSS window stress sizes, not certified native device presets.
- Draft description/account survived every resize. Saving the entered 12.34 expense from 100.25 yielded **87.91**, retained after reload. The expected “While you were away” panel was dismissed through its normal Done button before the reload check. No unexpected page errors or measured document/dialog overflow.
- Two additional CDP hinge probes recorded; **segment detection inactive**, so hinge handling remains unverified.
- Historical current-main iOS compile/launch evidence reviewed as described above. No new native build or physical watch/foldable acceptance performed.

Raw results and reproducible browser runner: [results.json](assets/2026-11-22-device-compatibility/results.json), [audit.cjs](assets/2026-11-22-device-compatibility/audit.cjs). Serve the matching production web bundle with `scripts/serve-movo.cjs`; the runner accepts `MOVO_COMPAT_BASE_URL`, `MOVO_COMPAT_RESULTS` and `MOVO_CHROMIUM_EXECUTABLE`. Browser geometry does not verify WKWebView/UIKit, Android activity recreation, physical keyboards, camera/OCR, store checkout, screen-reader operation or a real IME.

## Acceptance plan before claiming full compatibility

1. Build with a supported current Apple SDK after correcting adaptive native chrome. Run the Duo simulator and a signed Duo build: outer/inner/tent/tabletop, orientation changes, keyboard, large text, reduced motion, safe areas and Touch ID. Preserve unsaved form input and avoid duplicate saves.
2. Run Samsung Fold/Flip cover-to-inner/main transitions and split/pop-up windows, first on foldable emulators and then physical Samsung hardware. Include background/recreation/process death, camera/OCR, account switching and app lock. Confirm one financial save only and unchanged balance rules. Ordinary process termination need not silently autosave a transaction.
3. Correct the Wear OS background, measure round-screen/font-scale layout, then run signed Apple Watch+iPhone and Wear OS+Android handoffs. Test unreachable and locked phones and report only the implemented companion scope.
4. Restore API hosting and execute authenticated live subscription/restore and second-device tests, markets and friends separately. Keep physical/store evidence distinct from source and browser tests.

No production migration, store release, source merge or application restructuring was performed as part of this audit.
