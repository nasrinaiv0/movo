# 2026-11-12 — Referral QR codes open the stores with each person's code

**Owner request:** "fix the referral QR code; it should be linked to the App Store and Google Play store with a unique id per user referral."

## Problem
Refer MOVO shows two QR codes, which point to `/api/download?platform=ios|android&ref=<code>`. The handler redirected to a
store only when `MOVO_IOS_APP_STORE_URL` / `MOVO_ANDROID_STORE_URL` were set. Neither exists in the production
environment (checked by name only), so every QR code opened the MOVO web app. Even with them set, the store redirect
dropped the referral code.

## Change
| | Before | After |
|---|---|---|
| Android QR | Web app | Google Play `com.nasrinai.movo` with `referrer=utm_source=movo_referral&utm_medium=qr&movo_ref=<code>` |
| iPhone QR | Web app | App Store `apps.apple.com/app/id<APPLE_APP_ID>`; when a code is present, a short page shows it and "Copy code and open the App Store" |
| Code reaches the app | Only via the web app | Android: Play install referrer, read once on first launch. iPhone: copied by the person and entered in MOVO |

- `api/download.js`: store addresses come from `MOVO_*_STORE_URL` when set (exact formats only), else `APPLE_APP_ID` (digits
  only) and the fixed Play package. The iPhone page is served with `no-store`, uses a same-origin script
  (`public/get-movo.js`, because the site CSP forbids inline script) and works without JavaScript (plain App Store link,
  code on screen). Unknown platforms or a missing App Store id still fall back to the web app with the code.
- Android: `MovoNativePlugin.installReferrer` (Play Install Referrer 2.2) returns the referrer text, or "" when there is
  none, Play is unavailable, or the app was not installed from Play. It resolves only once.
- `src/lib/installReferral.js`: Android only. It asks once per install, keeps only `movo_ref` from a `movo_referral`
  source, never replaces a code the person already opened, and announces it (`movo:pending-referral`) so an open plans
  panel or Refer MOVO fills it in. An older app build without the bridge retries on the next launch.
- Refer MOVO caption: "Your code is included, so friends who join are linked to you" (11 languages).
- Privacy Policy section 18 describes the referral code, the Play install referrer and the iPhone copy step. Privacy
  effective date is November 12, 2026 (`legalVersion.js`, static `public/privacy.html`), so people accept it once more.

## Security
- No open redirect: only exact App Store / Google Play addresses, or `/` on this site.
- Only a normalised code (`M` + 5 characters) is ever placed in a link or the page; HTML cannot be injected.
- Nothing is granted on the device: the server still checks every claim (new, verified account; not self; rate limits).

## Validation
- Jest: new `installReferral.test.js` and rewritten download tests in `referralApi.test.js`; full suite 225/1,357.
- `tsc --noEmit`, strict CRA build.
- Browser (Chromium 390×844, site CSP applied): the iPhone page renders in light and dark with no console errors.
  The button copied `M78038` and navigated to the App Store. The Android link returned 302 to Google Play with the
  encoded referrer.
- Not run: Gradle compile here (CI `native-android` compiles it), a real Play install, an iPhone.

## Release notes
- The Android referrer needs a new Play build (version code above 7). The QR codes work on the website and in the
  current apps as soon as this deploys.
- If the Play listing is still limited to testers, people outside the test track will see "not available" in Google Play.
