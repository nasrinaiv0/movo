# Offline-first saving, automatic upload, imports under Cloud Sync, plan badges — 2026-11-09

## What the person sees
- **No internet or a slow connection:** a signed-in person with Cloud Sync on keeps using MOVO. A save, edit,
  delete, chat log, automation log or credit purchase that cannot reach the cloud within 12 s (or fails with a
  network error) is saved on this account's device copy instead, with the toast "No connection. Saved on this
  device; it uploads automatically when you are back online."
- **Automatic upload:** when the connection is back (browser `online` event), when MOVO returns to the foreground,
  and every minute while changes wait, the verified reconciliation uploads them and MOVO returns to cloud mode.
  Settings → "Offline & online sync" retries now without switching Cloud Sync off (a failed retry used to turn
  Cloud Sync off, which stopped later automatic uploads).
- **Imports with Cloud Sync on:** CSV "Confirm save locally" and the JSON backup "Save records" no longer refuse.
  The rows are saved into the account's device copy, shown on Home, Wallet, Transactions and Menu at once, and
  uploaded automatically (now, or on reconnect). Rows the sync could never upload (no real account, bad cents,
  invalid type) are rejected at import with a reason instead of blocking every later upload.
- **Pro during an outage:** paid features stay on while working from the device copy, using the last
  server-verified entitlement (it still expires on time). Only turning Cloud Sync off pauses them (#245).
- **Plan badge:** Pro wears the Gold MOVO badge and Pro+ the Platinum one (same artwork as the streak badges) in the
  Menu hero, the Profile card (replacing the stale "Plan details unavailable" pill) and the plans sheet.

## How it works
- `lib/offlineReconciliation.js`: a device deletion (tombstone) is now an upload `change: 'delete'` when the cloud
  row still matches the confirmed copy (or the deleted device copy for a row created on this device); a row already
  gone counts as done; a row changed elsewhere is a conflict. Updates carry the current cloud row (`cloud`) as
  their revision. Both sides holding the same financial meaning (a lost acknowledgment) is reconciled.
- `lib/offlineSyncTransport.js`: uploads account creates/edits, transaction creates, **edits** (compare-and-swap on
  `updated_at`) and **deletions** (re-checked revision, then the same `delete_transaction_with_reversals` RPC the app
  uses online), and **receipts** kept on the device (uploaded to `movo-receipts/<owner>/offline-<id>.<ext>`, fixed
  path so retries overwrite). Order: accounts, transactions, deletions. Everything is re-read and verified before
  the journal is cleared; retries converge without writing twice.
- `lib/offlineSyncCloudAdapter.js`: `updateOfflineTransactionCAS`, `deleteOfflineTransactionCAS`,
  `uploadOfflineReceipt`, `offlineUploadProblem` (pure pre-check).
- `lib/offlineWorkspaceStore.js`: `recordOfflineDeletions` / `restoreOfflineRows` write the working copy and
  tombstones (with the deleted row) in one storage write; an Archive restore clears the tombstone.
- `lib/networkFailure.js`: `isNetworkFailure`, `withTimeout` (12 s writes, 25 s reads). Server answers (RLS,
  validation, statement timeouts) are never treated as a lost connection.
- `lib/recordId.js`: every new financial record id is a v4 UUID even where `crypto.randomUUID` is missing, so a
  record made offline can always sync; cloud creates send the same id, so a write that timed out but still landed
  is matched instead of duplicated.
- `financeRepository.js`: transactions are read with `updated_at`; creates accept a client UUID.
- `App.js`: `switchToDeviceCopy` (shared by the `offline` event and failed writes), `cloudWrite`, automatic retry,
  imports via `showDeviceCopyAndSync`, and the device copy is refreshed from an owner-checked cloud read after
  changes while online, so a dropped connection continues from current records.

## Bug fixed on main
Deleting a transaction online (or on another device) made the next sync fail with "Cloud and device history
differ unexpectedly" and dropped MOVO into local mode, because the clean device copy still listed the row. A device
copy with no pending changes now accepts cloud deletions (`cleanCopyCheck`); a copy with pending changes still goes
through the full reconciliation and never loses device-only data.

## Not changed / limits
- No migration, RLS, grant or policy change. No production data touched.
- Budgets, bills, loans, goals and other cloud tables still need a connection to change (their offline sync needs
  audited server-side procedures first). The first-run file import keeps refusing while Cloud Sync is on.
- An offline delete is applied with a revision check immediately before the server procedure; the procedure itself
  takes no revision, so a change landing in that same instant is the remaining window (same as an online delete).
- Conflicts (the same record changed on two devices) still wait for review; nothing is overwritten.

## Verification
- New: `src/AppOfflineFirst.test.js` (signed-in end to end: offline save + delete then automatic upload with no
  double write; CSV "Save locally" under Cloud Sync updates pages and uploads; online delete keeps cloud mode;
  Pro badge during an outage), planner/transport/adapter/store/network/recordId/PlanBadge unit tests. Mutation
  checks: disabling the write fallback, the tombstone, or the clean-copy rule each fails the integration test.
- Full Jest suite, `tsc --noEmit` and `CI=true react-scripts build` run locally on this head; results in the PR.
