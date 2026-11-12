# 2026-11-12 — Offline/online sync: local first, silent cloud sync, back-online prompt

## Request (owner)
- Online: input > local > output (dashboard) > silent cloud sync.
- Offline, or the internet drops suddenly: input > local > output (dashboard).
- Offline to online: a setting chooses automatic sync or asking first. When asking, a professional pop-up says the
  internet is restored and asks whether to sync the data to the cloud.

## What changed

### 1. Online saves are local first
- `src/lib/hybridFinanceWriter.js`: `writeHybridFinance` already committed a durable local intent before the cloud
  RPC. It now takes `onLocal(record)`, called right after that device commit and before the cloud call. A failing
  callback can't break the write. `src/lib/financeRepository.js`: `createTransaction` and `updateTransaction` pass
  it through.
- `src/App.js`:
  - `localFirstWrite` resolves as soon as the change is on this device, with `{ local, upload }`.
  - `createLocalFirst` does the same for the quick inputs: NasrinAI chat logging, credit-card purchases and card
    payments.
  - The transaction form (add and edit) uses it too: the dashboard updates and the sheet closes at once. The upload
    finishes silently.
- When the upload ends:
  - **Confirmed:** the server copy replaces the shown row. The post-save cloud refresh and the old-receipt cleanup
    run after confirmation, in the background, instead of before the form closed.
  - **Connection lost:** the existing offline path takes over. The record stays on this device's copy and syncs on
    reconnect.
  - **Refused by the server** (permission or plan): the row is taken off the screen and the person sees "This change
    could not be saved to your MOVO account: …". A receipt uploaded for it is removed.
- Validation and sign-in problems are found **before** the device commit, so they still show on the form as before.
- The background re-read that matches the device copy to the cloud now skips while any local-first upload is in
  flight, so it can never drop a record that is not in the cloud yet.
- Unchanged: a subscription payment still waits for the cloud, because it records the payment attempt against the
  saved row. Automation logging (`createAutomated`) has no device step, so it works as before.

### 2. Offline
Unchanged: saves go to this account's device copy, every page shows them, and deletions are remembered.

### 3. Back online
- New preference `autoSyncOnReconnect` (default **off**, meaning ask first). It is in `DEFAULTS`, so it syncs with
  the other preferences.
- Settings → Data & Sync gets the toggle **"Sync automatically when back online"**.
- **Off:** a centered, solid pop-up (`src/components/ReconnectSyncPrompt.js`):
  - **Title:** "You're back online".
  - **Question:** "Your internet connection has been restored. Would you like to sync the N change(s) you made
    offline to your MOVO account?"
  - **Reassurance:** "Until you sync, these changes stay safely on this device."
  - **Option:** "Always sync automatically when I'm back online".
  - **Buttons:** **Not now** and **Sync now**.
  - "Not now" keeps the small reminder banner with "Sync local to cloud".
- **On:** the changes upload by themselves about 1.5 s after the connection returns, with no pop-up. It makes one
  automatic attempt per reconnection; if that attempt doesn't finish (server busy, plan or conflict check), MOVO
  shows the pop-up instead of retrying in a loop. A new offline period or a completed sync allows the next attempt.
- Either way, the upload goes through the same verified path as before (`syncNow` → `refreshCloud` with approval):
  sign-in, verified plan, compare-and-swap conflict checks and the conflict review sheet.

## Security and data
- No change to RLS, policies, grants, the RPCs or the server.
- Offline-origin changes still upload only after approval. The approval now comes from the person's own setting
  (automatic) or from "Sync now"; a browser `online` event alone never uploads them unless that setting is on.
- Each record keeps its own UUID and operation id, so a save confirmed by the cloud and retried later is matched,
  not duplicated. The existing writer tests cover this.
- Legal texts make no promise about manual approval, so they are unchanged.

## Validation
- `hybridFinanceWriter.test.js`:
  - `onLocal` fires after the device commit and before the cloud;
  - a throwing callback can't break the write;
  - a sign-in failure never calls it;
  - a lost connection after it keeps the change pending.
- `ReconnectSyncPrompt.test.js`: the wording with counts, both buttons, the "always" option, and the busy state.
- `AppOfflineFirst.test.js` (end to end with an in-memory cloud):
  - the pop-up asks, and nothing uploads until "Sync now";
  - "Not now" keeps the change on the device with the reminder, and a later sync uploads it;
  - automatic sync uploads with no pop-up;
  - an online chat log shows before the cloud answers and is then confirmed;
  - a server refusal removes it and explains why.
- Full suite: Jest 223 suites / 1,342 tests, `tsc --noEmit`, strict build.
- Browser (Playwright, mock cloud, Chromium offline emulation), light and dark:
  - a chat log made offline appears;
  - on reconnect the pop-up opens centered (283 px above and below at 430×932, no border), reading "1 change";
  - "Sync now" closes it with nothing left pending.

Not run: real iPhone or Android devices on a real network.

## Rollback
Revert the commit. Online saves then wait for the cloud again, and the reconnect banner returns.
