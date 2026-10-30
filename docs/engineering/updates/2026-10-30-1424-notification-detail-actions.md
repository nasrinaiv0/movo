# MOVO notification detail actions — 2026-10-30 14:24 Asia/Manila

## Finding

In `src/screens/Notifications.js`, the accessible More button on a notification detail invoked `setSheet({ name: 'actions' })`. That sheet is the global Quick actions menu and offers Add transaction, Add account, CSV import/export, Choose theme, and Remove sample data. It is not an appropriate action menu for the notification being viewed. The control responded, but its behavior was contextually incorrect.

## Implementation

- Changed the button accessible name to `Notification actions`.
- Added a dedicated `notificationActions` sheet in `src/App.js`, rendered only when an active notification exists.
- Added **Mark as unread**: removes the active notification ID from `prefs.readIds`, switches the feed filter to `Unread`, and navigates back to the notification list.
- Added **Notification settings**: navigates to the existing NotificationSettings screen; the normal navigation helper closes the sheet.
- Added two App-level regression tests in `src/App.test.js`: one verifies the selected notification returns to the Unread feed after marking unread, and one verifies the settings action reaches Notification Channels.

## Traceability

- Existing PR reused: [#60 — UI control and accessibility audit](https://github.com/nasrinaiv0/movo/pull/60).
- Branch: `chore/ui-control-audit-reconciled-main`.
- Source/test commits: `050e53f0f712f34306b827d12b2acb51adb89bb7`, `bba4df97b452a9e2449d3813d71ac8f01b24996b`, `e25a3327cf7b96c0caceabe8064322315181f92f`, with test-entry correction `b1cbcf250b2c7ac744a73e9c3b79629f68f843cf`.
- Exact-head CI and preview results must be checked on the latest PR head. The earlier green PR #60 run does not validate this change.

## Security and scope

- This is UI state/navigation only. It does not change financial records, finance persistence, ownership checks, Supabase schema/RLS/grants, authentication, legal text, or secrets.
- The notification ID is already generated from the current user-scoped transaction feed or local sample notices. The action only updates the existing local preference list; it performs no cross-user or database write.

## Remaining verification

- Confirm latest-head full tests, typecheck, static control audit, production-only dependency audit, and production build.
- Verify the exact-head preview and interactively test the notification action sheet at desktop and mobile widths, keyboard focus/escape behavior, and screen-reader announcements.
- Keep PR #60 draft until its full accessibility and authenticated finance release gates are complete.


## Test-entry correction and failed CI evidence

- GitHub Actions run [41014137573](https://github.com/nasrinaiv0/movo/actions/runs/41014137573) on source/test head `e25a3327cf7b96c0caceabe8064322315181f92f` failed: **2 tests failed / 114 passed**. Both new tests threw `TypeError: Cannot read properties of undefined (reading 'dispatchEvent')` because they attempted to use the bottom-navigation helper for Notifications, which is opened from the Home header.
- Run [41014193032](https://github.com/nasrinaiv0/movo/actions/runs/41014193032) on documentation-updated head `eb9ac5cd01989a1aa8eecec98ff84c5153f2a3ad` reproduced the same two failures; the documentation-only commits did not change the faulty test setup. These failures are explicitly preserved, not counted as passes.
- Corrected both tests in commit `b1cbcf250b2c7ac744a73e9c3b79629f68f843cf` to navigate to Home and click the real Notifications header control before opening a notification. This is a test-only correction; product code is unchanged in that correction.
- The latest full CI run must validate the corrected source/tests and final audit documentation. Do not reuse the failed or older green results; read the current PR #60 Checks tab for the final exact-head outcome.
