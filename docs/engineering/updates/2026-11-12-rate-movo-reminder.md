# 2026-11-12 — Rate MOVO reminder (App Store / Google Play)

## Request
The owner sent a screenshot of the iOS "Enjoying Reminders? Tap a star to rate it on the App Store" dialog and asked for a reminder to rate MOVO in the App Store or Google Play.

## Why the stores' own dialogs
That screenshot shows Apple's system dialog. Both stores require apps to use their own rating flow:
- **Apple.** App Review Guideline 5.6.1 requires the provided API and disallows custom review prompts.
- **Google.** The In-App Review guidelines say not to ask questions such as "Do you like the app?" before or while showing the review card.

So MOVO shows no screen of its own and only decides when to ask.

## Change
- `src/lib/reviewPrompt.js` (new): device-only counters in `localStorage` `movo.reviewPrompt.v1`: the first day, active days and request times.
  - `shouldAskForReview` returns true only in the phone apps, after 7 days, 5 active days and 10 records, at most once every 120 days and 3 times a year.
  - `requestStoreReview` records the request, then calls the native method. On the web it does nothing.
- `src/App.js`:
  - Counts one active day per calendar day once setup is done.
  - After a new record is saved (online or on the device), checks the rules and asks about 1.8 s later, after the save celebration. It never asks while a sheet is open, while locked, or before setup.
- `ios/App/App/MovoNativePlugin.swift`: `requestReview` calls `AppStore.requestReview(in:)` on iOS 16+ and `SKStoreReviewController.requestReview(in:)` on iOS 15, in the foreground scene.
- `android/.../MovoNativePlugin.java`: `requestReview` runs Google Play's `ReviewManager.requestReviewFlow()` then `launchReviewFlow()`. `android/app/build.gradle` adds `com.google.android.play:review:2.0.2`.
- Tests:
  - `reviewPrompt.test.js`: counting, rules, bad stored values, and that it never asks on the web.
  - `reviewNativeContracts.test.js`: both platforms use the store APIs and contain no custom prompt, store links or alert dialogs.

## Privacy and legal
The stores never tell MOVO whether the dialog appeared or what was rated, and nothing is sent to MOVO's servers. The counters are usage timing on the device only, and Clear All Data removes them (the `movo.` prefix). The Terms and Privacy Policy are unchanged, since no data is collected or shared. Changing them would also ask everyone to accept again.

## Not included
There is no manual "Rate MOVO" button yet. Apple advises against calling the review request from a button, because it may show nothing. A button should open the store's write-review page, which needs the App Store ID and Play listing. Both are server settings (`MOVO_IOS_APP_STORE_URL`, `MOVO_ANDROID_STORE_URL`) that stay empty until MOVO is listed.

## Validation
- Jest: 214 suites / 1,301 tests pass. tsc is clean. The strict build compiled.
- The Swift and Java code compiles in CI (`build-ios`, `native-android`). The Android SDK and Google Maven are not reachable from this environment, so the new dependency resolves in CI only.
- Not run: real devices. The dialogs appear only in builds installed from TestFlight or Google Play internal testing. Apple's development builds always show the dialog; the Play card needs a Play-installed build.

## Rollback
Revert the commit. Nothing on the server or in user data changes.
