# 2026-11-12 — Restore purchases and Manage subscription, always shown

## Request
Owner: "make sure there is always button for restore and manage subscriptions."

## Before
- Restore purchases and Manage subscription appeared only in Plan & Usage, and only in the phone apps.
- Restore was disabled when signed out.
- Manage was disabled unless the current plan came from a store.
- The plans panel ("Upgrade MOVO") had neither.

## Change
- New `src/components/SubscriptionLinks.js` with both buttons, never hidden and never disabled (Restore is only briefly
  busy while it runs):
  - **Restore purchases**
    - In the apps: the store restore (`restoreStorePurchases`); the server verifies it and the plan refreshes.
    - On the website: re-checks this MOVO account's verified plan (`getStoreEntitlements`), so purchases made in
      the apps show up.
    - Signed out: opens sign-in, because store purchases are linked to a MOVO account.
  - **Manage subscription**
    - In the apps: opens the App Store or Google Play subscription page (`manageStoreSubscriptions`).
    - On the website: offers links to `https://apps.apple.com/account/subscriptions` and
      `https://play.google.com/store/account/subscriptions?package=com.nasrinai.movo`. They open in a new tab
      with `rel="noopener noreferrer"`.
- `src/components/PlanOffer.js`: the plans panel footer shows both, under the fine print.
- `src/screens/Settings.js` (Plan & Usage):
  - Uses the same component for every person (app or website, signed in or not), replacing the native-only,
    conditionally disabled pair.
  - The website note now says "Subscribe in the MOVO iOS or Android app." It no longer says restore is app-only.
- `src/App.js`: `startAccount` added to the app context so Plan & Usage can open sign-in.
- i18n: `ui-2026-11-12-subscription-links.js` adds three strings in 11 languages (the store link names and the
  website's "no subscription found" message); the rest were already translated.

## Security and data
- No change to purchase verification or entitlements. Restore still grants nothing on the device; the server verifies.
- The store links are fixed official URLs, not built from user input.

## Validation
- `SubscriptionLinks.test.js`:
  - both buttons enabled when signed out on the website, and Restore asks to sign in;
  - website Restore re-checks the plan, and Manage shows both store links with safe `rel`;
  - in the apps, Restore and Manage call the store;
  - a failed restore says so, and the buttons stay usable.
- `PlanOffer.test.js` and `PlanUsageSheet.test.js`: both buttons present and enabled, signed out and as a Pro+
  store customer.
- Jest 221 suites / 1,328 tests, `tsc --noEmit`, strict build. Browser: the plans panel still fits without scrolling at
  375×667 and stays centered; Plan & Usage shows both buttons and the two store links.
- Not run: the store restore and manage dialogs on real iPhone / Android devices.

## Rollback
Revert this commit.
