# 2026-11-09 — One confirmation dialog for log out and every destructive action

## Owner request

Section 11, "Logout & Delete Confirmation System": log out and every deletion of a financial or personal record ask
first in a consistent compact modal; Cancel never changes records, balances or session state; no deletion or log out
runs without explicit confirmation.

## What changed

- **Shared dialog (`src/components/ConfirmDialog.js`).** `useConfirm()` returns `confirm(options)`, which resolves
  `true` only after the person pressed the confirm button (and the optional `action` finished), otherwise `false`.
  - Cancel, Escape and a tap outside only dismiss; none can confirm. Escape and Tab are caught on `window` in the
    capture phase, so a sheet underneath never also reacts.
  - Double taps: refs (not state) guard the confirm button, so a second tap, or a tap during the 200ms closing
    animation after Cancel, never runs anything. The closing layer also ignores pointer events. One dialog at a
    time: a second request while one is open resolves `false`.
  - With `action`, the dialog stays open while it runs (spinner, both buttons off, dismissing ignored). A failure is
    shown in the dialog with **Try again**, and nothing is reported as done unless the action finished.
  - `verify: 'DELETE'` requires the typed word (Empty archive, lock-screen reset). Clear all data and Delete account
    already use their typed-DELETE sheets and are unchanged.
  - `role="alertdialog"`, `aria-modal`, labelled title and description, focus starts on Cancel, stays inside, and
    returns to where it was. 200ms ease-out scale/opacity in and out; none with reduced motion.
  - Without the app shell (a component rendered alone in a test) it falls back to `window.confirm`, so it still asks.
- **Wording.** `deleteRecord(name, { impact, permanent })` gives "Delete this record?", the record's name, "Are you
  sure you want to delete this record? This action may affect your financial balances and reports." and a line on
  what happens: archived for 90 days (transactions, budgets, plans, subscriptions), balances unaffected (limits,
  plans), recorded payments kept (loans, receivables, subscriptions), or "This cannot be undone." when permanent.
- **Every delete now asks first:** transactions (detail sheet and the NasrinAI chat "Undo", which now also goes to
  the Archive like any other deletion), allocation reversal, account archive, budgets, plans, spending limits,
  subscriptions, loans and receivables (the two separate confirmation sheets are replaced by the dialog), cashback
  entries, crypto holdings and price alerts, membership/rewards cards (both sheets), Archive "delete for good" and
  "Empty archive" (typed DELETE), custom stickers, the profile photo, "Sign out of other devices", "Use 500 points"
  and the lock-screen reset (typed DELETE). Editors stay open when the person cancels.
- **Log out (Profile → Log out).** "Log out of MOVO?" / "Are you sure you want to log out of your account?" with
  Cancel and **Log Out**. When this account has changes on the device that have not reached the cloud
  (`src/lib/unsyncedChanges.js` counts added, changed and removed rows in the offline workspace plus pending
  deletions), the dialog says how many and that logging out keeps them on this device.
  - Order fixed: unsaved offline changes are written to the account's device copy **before** the session ends (the
    old code ended the session first, after which the auth listener could drop them). If that write fails, the
    person stays logged in and the dialog says why.
  - `signOut()` (`financeRepository.js`) revokes the session on the server when it can; offline it still removes the
    session from this device (`scope: 'local'`) and reports `localOnly`, so logging out never depends on the network.
    It throws only if the device is still signed in afterwards.
  - Afterwards: cloud state cleared, local guest records shown, the sign-in screen opens, and the toast says
    "Signed out securely." or, offline, "Logged out on this device. You were offline, so other devices were not
    signed out."
- **Look.** Compact centred card (max 340px, 22px radius) on the sheet surface, solid colours only, no button
  borders, two 48px buttons with a 16px radius. The destructive button is solid `#d32f2f` with white text in every
  theme (4.98:1; the dark theme's brighter `--red` would only give 3.4:1); the icon tile uses `--red-bg`/`--red`.
- **Translations.** 57 new strings in all 11 languages (`src/i18n/catalog/zz-confirmations-20261109.js`).

## Tests

- `ConfirmDialog.test.js`: wording and accessibility attributes, focus on Cancel and back to the opener; Cancel,
  Escape and backdrop never run the action; Escape never reaches a sheet listener; a triple tap runs once; nothing
  can be pressed during the closing animation (fails if the guard is removed); one dialog at a time; failure with Try
  again and success only after it finished; `userMessage`; typed DELETE (Enter submits only when typed); Tab trap;
  the browser fallback still asks.
- `unsyncedChanges.test.js`, `signOut.test.js` (online, offline local removal, thrown errors, never success while
  still signed in).
- App: delete a transaction — Cancel, Escape and backdrop keep the stored row; Delete removes it, archives it and the
  wallet total rises by exactly ₱1,250; chat Undo asks first; account archive asks first.
- Offline-first App: deletions upload only after confirming; log out offline shows the unsynced warning, Cancel
  changes nothing, a double tap signs out once, the offline record is still on the device, and sign-in opens.
- Updated: Financial Planning loan delete, receivable delete (plus a failure-then-retry test and a double-tap test),
  membership card removal.

## Not changed

Clear all data and Delete account (typed DELETE sheets), legal text (log out still keeps device records, as before),
and the owner console's own sign-out (separate app).

## Data and security

- No schema, RLS, grant, API or server change. Deletions use the same repository calls, offline tombstones
  (`recordOfflineDeletions`) and Archive entries as before; the dialog only decides whether they run.
- Logging out never clears the offline workspace or local records. Online, the session is revoked on the server
  (`scope: 'global'`, as before). Offline, the session is removed from this device (`scope: 'local'`); its refresh
  token cannot be revoked until the server is reachable, and the toast says other devices were not signed out.
- In-memory session state, cloud rows and the per-account referral/trial guards are reset on log out.

## Rollback

Revert the commit. No data migration; records deleted while it was live stay deleted or archived as recorded.

## Remaining release gates

- Native iOS and Android builds were not run for this change; only the web build, Jest and Playwright against the
  built app. The dialog is plain web UI inside the Capacitor web view.
- Vercel preview check and Vercel Sandbox run are reported on the PR.
