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
- Source/test commits: `050e53f0f712f34306b827d12b2acb51adb89bb7`, `bba4df97b452a9e2449d3813d71ac8f01b24996b`, `e25a3327cf7b96c0caceabe8064322315181f92f`.
- Exact-head CI and preview results must be checked on the latest PR head. The earlier green PR #60 run does not validate this change.

## Security and scope

- This is UI state/navigation only. It does not change financial records, finance persistence, ownership checks, Supabase schema/RLS/grants, authentication, legal text, or secrets.
- The notification ID is already generated from the current user-scoped transaction feed or local sample notices. The action only updates the existing local preference list; it performs no cross-user or database write.

## Remaining verification

- Confirm latest-head full tests, typecheck, static control audit, production-only dependency audit, and production build.
- Verify the exact-head preview and interactively test the notification action sheet at desktop and mobile widths, keyboard focus/escape behavior, and screen-reader announcements.
- Keep PR #60 draft until its full accessibility and authenticated finance release gates are complete.
