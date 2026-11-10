# Offline/online sync (section 5): held offline changes, "Sync local to cloud", conflict review — 2026-11-10

**Status: in progress on `claude/movo-ui-motion-refinement-vafrxa`. Not ready to merge.** This takes over the
section 5 work from draft PR #261; that PR's IndexedDB outbox is not adopted.

## What changed
- One authority per signed-in person: the owner-scoped device workspace (`lib/offlineWorkspaceStore.js`) with a
  baseline, the working copy, dirty ids, deletion tombstones (with the deleted row) and a new `held` flag. The pure
  three-way planner (`lib/offlineReconciliation.js`) and the compare-and-swap transport decide every upload; a clock is
  never used to pick a winner.
- Changes made while the cloud is unreachable are **held** on the device. When the connection returns MOVO shows
  "Your internet connection has been restored." with **Sync local to cloud**; held changes upload only after that tap
  (`App.js` `syncLocalToCloud`, `refreshCloud({ approved })`).
- Records changed both on the device and in the account are listed with both versions side by side
  (`components/SyncStatus.js`, `lib/offlineConflicts.js`): **Keep this device** or **Keep MOVO account**, per record.
  Keeping a deletion asks first through the shared confirmation dialog. A choice is written to the device workspace
  and uploaded with the same compare-and-swap check on the next sync; nothing is uploaded or discarded before that.
- Automatic attempts back off 5s → 5min with ±20% jitter (`lib/syncBackoff.js`).
- One status for every page (`lib/syncStatus.js`): local, syncing, synced, offline, waiting, review, error. A bar above
  the dock shows offline / ready to sync / needs review / paused; Menu and Settings rows show the same status.
- On launch a signed-in person sees their own device copy first, never guest rows.
- Profile photo picker accepts any `image/*` type (`screens/Profile.js`).
- 43 new interface strings translated into the 11 catalog languages (`src/i18n/catalog/sync-status.js`).

## Verification so far (local only)
- Full Jest before the translations: 188 of 189 suites passed, the one failure being the missing-translation check;
  after adding the catalog, `lib/i18n.test.js`, `AppOfflineFirst.test.js` (5) and `AppSyncReview.test.js` (5) pass.
  A full run on the final head is still required.
- `npx tsc --noEmit` and `CI=true npx react-scripts build` pass.

## Not done yet (release gates)
- Full Jest on the final head; visual check of the bar, notice, sheet and conflict cards (320/390/430px, tablet,
  light/dark, right-to-left, largest text); browser end-to-end run against a mocked cloud.
- Help Center and legal wording that still describes automatic upload after reconnecting; effective-date bump.
- Review of #261's one-time-code auto-submit; decision on its indexed balances.
- WebKit and native iOS/Android builds were not run.

## Limits
- Only accounts and transactions sync offline; other record types still need the cloud.
- The translations are machine-assisted and need review before a commercial multilingual release.

## Data / security
No schema, RLS, grant, migration or API change. Uploads keep using client UUID primary keys and `updated_at`
compare-and-swap, so a retry cannot duplicate a record. The workspace stays in owner-scoped `localStorage`; no
credentials are stored in it. Rollback: revert the commit; the extra `held` field is ignored by older builds.
