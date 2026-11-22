# 2026-11-17 — PR #291 brought up to date with #309 and a sync race fixed

## Why
The owner asked to merge the finished PRs. #309 (referral points) merges first and carries `main`, including #294's Security & Data Guide. This PR merges #309's branch so the two land in order without conflicts.

## Resolution
- **Legal pages.** The Terms and Privacy hunks that conflicted take #309's text (the "Referral points and rewards" section and the Security & Data Guide link). This PR's encryption wording stays. Both effective dates move to **November 20, 2026** (`legalVersion.js`), later than #309's November 19, so people accept the combined text again. `scripts/update-legal-pages.cjs` rebuilt both static pages from those dates, and `--check` reports them current. The tests that pin the dates were updated.
- **Security & Data Guide.** `public/security.html` and `docs/security/MOVO_USER_DATA_SECURITY_GUIDE.md` come from `main` (#294). The guide's encryption claims now match what this PR ships. Updated app versions encrypt selected local financial records: offline wallet and account records, cached finance data, the queue of changes waiting to sync, and saved bank QR images. Encryption applies once the device key and a one-time migration have been verified. The guide says this depends on the app version, never that "everything" is encrypted. It also says it is not an independent audit and that no app can guarantee perfect security. `securityGuideContracts.test.js` checks this wording. The 2026-11-13 assurance note now opens with a status update that points to the guide.

## Sync race fixed (`App.js`)
After this merge, `AppOfflineFirst.test.js` ("Save locally on a CSV import … uploads the rows") failed in about half of the full Jest runs made while a second suite ran alongside. It passed every time on its own.

Tracing showed that the sync uploaded the row and saved a clean device copy (`dirty: false`). Afterwards, the local-persistence effect ran with rows from a render before the sync. It wrote those rows back with `dirty: true`. The copy then stayed dirty, so a later sync would re-check rows that were already confirmed.

The race exists on `main` too. This PR's encrypted storage makes every device-copy read and write slower, which widens the window.

Fix:
- `refreshCloud` records the clean copy it saved (`syncedCopyRef`: owner, `lastConfirmedAt` and the transaction list).
- The persistence effect skips its write only while storage still holds exactly that clean copy and the screen has not yet shown it. The sync's own render follows straight away with the new rows.
- The record is cleared as soon as the screen shows the synced rows, or when the sync fails and the screen is reloaded from the device copy. Later edits therefore save as before.
- Nothing is skipped once the device copy has changed again, so no edit is lost.

## Validation
- `tsc --noEmit` passes.
- The App and AppOfflineFirst suites pass.
- The full Jest suite passes, including runs with a second full suite running alongside (the load that reproduced the race).
- `node scripts/update-legal-pages.cjs --check` reports both pages current.
