# Android release optimization for Google Play

Date: 2026-11-16 (Philippines)

## Build changes

The Play Console report for bundle 11 (1.0) showed 0% DEX optimization, 93% obfuscation, 92% code shrinking, R8 Full Mode, and 16 KB page-size support. Resource Shrinking, Resource Shrinking Optimized, and Repackage Classes were not marked active. Total uncompressed DEX size was outside the screenshot.

- Select the optimized default ProGuard file, which enables R8 bytecode optimization. Retain MOVO's release minification and Capacitor/Native bridge rules.
- Enable Android resource shrinking and opt in to the integrated code and resource shrinker on AGP 8.13.0.
- Explicitly enable R8 class repackaging for smaller DEX class names. Preserve plugin names and methods covered by keep rules.
- Keep the current Capacitor and AGP versions to isolate the behavior change. Play's AGP 9 upgrade recommendation is a separate toolchain migration.

## Checks and release acceptance

Python verified the proposed release configuration and existing bridge rules. MOVO's documentation guard passed locally on a disposable Git fixture with the updated commit's file list. Phase 1 CI stopped at its documentation check on the initial head. Check Phase 1, Android native build, and the disposable-key signed AAB workflow again on the revised head.

After merging the reviewed change, generate a signed AAB from main. The previous signed workflow used Android version code 16. Use 17 if the highest version code in Play Console is 16 or less. Upload the new AAB to Internal testing and check for:

- Improved DEX optimization compared with bundle 11. Compare all three percentages and total uncompressed DEX size.
- R8 Full Mode, Resource Shrinking, Resource Shrinking Optimized, and Repackage Classes. Confirm 16 KB page-size support on the new bundle.
- Working Google and email sign-in, session restoration after restart, receipt scanning, notifications, and Play license-tester subscription purchase and restore on the Play-delivered Android build.

Play reports the optimization metrics after the bundle upload. Under Google's February 2027 policy, apps with over 10 MB of DEX code need 25% or more in each DEX category.

- [Android R8 configuration](https://developer.android.com/topic/performance/app-optimization/enable-app-optimization)
- [Play Console DEX thresholds](https://support.google.com/googleplay/android-developer/answer/17492799?hl=en)
