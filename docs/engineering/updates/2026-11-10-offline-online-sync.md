# Offline/online sync (section 5): held offline changes, "Sync local to cloud", conflict review — 2026-11-10

**Status: implemented and verified locally on `claude/movo-ui-motion-refinement-vafrxa`; no pull request yet.** This takes over the
section 5 work from draft PR #261; that PR's IndexedDB outbox is not adopted.

## What changed
- One authority per signed-in person: the owner-scoped device workspace (`lib/offlineWorkspaceStore.js`) with a
  baseline, the working copy, dirty ids, deletion tombstones (with the deleted row) and a new `held` flag. The pure
  three-way planner (`lib/offlineReconciliation.js`) and the compare-and-swap transport decide every upload; a clock is
  never used to pick a winner.
- Changes made while the cloud is unreachable are **held** on the device. When the connection returns while MOVO is
  open it shows "Your internet connection has been restored." with **Sync local to cloud**; held changes upload after
  that tap, or the next time MOVO is opened (`App.js` `syncLocalToCloud`, `refreshCloud({ approved })`).
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

## Added on 2026-11-10 and 2026-11-11
- **Opening MOVO syncs by itself (owner request).** The first screen waits for the sync (at most 6s), so it shows the
  latest records and nobody has to tap "Offline & online sync" to get them. Changes saved offline upload in that same
  sync with their revision checks; records changed on both sides still go to the review. With no connection the
  account's device copy shows at once. A reconnect while MOVO is open still shows "Your internet connection has been
  restored." with **Sync local to cloud** and uploads nothing until it is tapped.
- **Fixed: a healthy launch started as "Offline".** The plan check ran before the plan hook had the session, was read
  as an unreachable cloud and retried seconds later; this is the stale screen people worked around by tapping the sync
  row. The stored session is now handed to the check (`lib/usePlanEntitlement.js`, `App.js`).
- **Fixed: the first screen did not wait in the real app** when the sign-in listener reported the session before the
  launch check (`openingSyncRef`). Found with the browser run; covered by a test that fails without the fix.
- **Fixed: the "changes saved on this device" count lagged one change behind** (read before the workspace was written).
- Conflict review shows category names the same way on both sides (a stored id and its older label are one category)
  and its status box is a solid surface.
- Sign-in code: a code that arrives whole (pasted, or filled in from the message) is checked without a tap, once; a
  typed code is never sent early because codes can be 6 to 10 digits (#261 sent at 6 digits).
- Help Center: "What happens when I am offline?" in 11 languages.

## Verification (local only)
- Jest: see `docs/PR_PROGRESS.md` for the count on the head commit; `npx tsc --noEmit` and
  `CI=true npx react-scripts build` pass.
- Real browser (headless Chromium) against a local stand-in for the cloud with real compare-and-swap semantics,
  37 checks: offline add shown at once on Home, Wallet, Transactions and Menu; nothing uploaded while offline or after
  reconnecting until the tap; uploaded exactly once with exact cents; not uploaded again on later launches; a record
  changed on both sides is never overwritten and each choice (keep this device / keep MOVO account) ends with the
  right cloud row; an offline delete keeps its tombstone and is applied with the server procedure; reopening shows
  only the latest balance (the older one never appears); reopening with the cloud unreachable shows the device copy
  with the Offline status.
- Layout checked at 390px light, 320px dark with the largest text, 820px tablet and 390px Arabic: no sideways scroll,
  44px targets.

## Not done yet (release gates)
- Vercel preview check and CI on a pull request.
- WebKit and native iOS/Android builds were not run.

## Limits
- Only accounts and transactions sync offline; other record types still need the cloud.
- The translations are machine-assisted and need review before a commercial multilingual release.
- On the web, a screen that was never opened cannot load for the first time while offline.

## Data / security
No schema, RLS, grant, migration or API change. Uploads keep using client UUID primary keys and `updated_at`
compare-and-swap, so a retry cannot duplicate a record. The plan is still verified by the server with the signed-in
session's token before any cloud read. The workspace stays in owner-scoped `localStorage`; no credentials are stored
in it. Rollback: revert the commits; the extra `held` field is ignored by older builds.
