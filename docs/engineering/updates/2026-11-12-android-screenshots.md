# 2026-11-12 — Screenshots work on Android

## Purpose
Owner request: make sure screenshots work on Android phones. The Android app set `FLAG_SECURE` for its whole lifetime
(a privacy choice from 2026-11-06), which blocks screenshots and screen recording.

## What changed
- `android/app/src/main/java/com/nasrinai/movo/MainActivity.java`: `FLAG_SECURE` is no longer set while the app is in use. Screenshots and
  screen recording work.
- The recent-apps preview still must not show balances, card details or QR codes:
  - Android 13+ (API 33): `setRecentsScreenshotEnabled(false)` keeps the preview blank.
  - Android 7–12 (API 24–32): `FLAG_SECURE` is added in `onPause`, when the system takes the preview, and cleared
    again in `onResume`.
- `src/lib/nativeSecurityContracts.test.js`: the contract now requires exactly this policy: no permanent
  `FLAG_SECURE`, the preview hidden, the flag cleared on resume.
- Security docs updated (hardening point 19, SEC-227-11 note).
- iOS is unchanged: screenshots already work there, and the app-switcher cover stays.

## Privacy implications
Screenshots and recordings of MOVO can now contain personal financial data and are stored by the phone's gallery,
outside MOVO's control. Terms §15 already warns that "Exported CSV files and screenshots may expose sensitive
financial records". No legal text promised that screenshots were blocked.

## Tests
- Jest: security contract test passes.
- Strict build passes.
- Android compilation runs in CI (`native-android`). There is no Android SDK in this environment.
- Not run: a real Android phone. Check that a screenshot works, and that the recent-apps preview is blank, on Android 13+
  and on an older version.

## Rollback
Revert the commit to block screenshots again.
