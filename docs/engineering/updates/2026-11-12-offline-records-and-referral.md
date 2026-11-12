# 2026-11-12 — Subscribers' records offline; referral field without waiting; Android Google sign-in finding

## 1. All of a subscriber's records offline (owner)
"All data should be available offline after the customer subscribes to plans. During testing some data are not
showing if the user is offline or not signed in."

### Causes found
- **Budgets and bills on Home and in Budgets:** offline (the account's device copy in use), `budgets` switched to
  this device's guest list (`prefs.budgets`). Bills and bill dates were filled only by a cloud sync. They were
  stored in the device copy, but never read back from it.
- **Financial planning and the Home planning card** (`lib/usePlanning.js`) loaded only in cloud mode. Offline, a
  signed-in subscriber saw "Sign in to manage your financial records".
- **Lists loaded straight from the cloud kept no copy:** loans, receivables, goals and their allocations, plan
  allocations, bills, bill dates and payments, scheduled transactions, payment attempts, reminder preferences and
  events, budgets, the accounting ledger. Offline they failed and the screens were empty.

### Fix
- **New `src/lib/offlineReadCache.js` (`cachedList`):**
  - Every successful cloud read of those lists is kept on this device under the signed-in account's id. On a
    network failure, the last copy is returned.
  - Server answers (permission, plan, validation) are never hidden.
  - One account never sees another's copy, and nothing is kept or shown while signed out.
  - Per-record lists, such as one loan's events, are cached per record and never fall back to another record's.
    Date-range lists (bill dates and payments) fall back to the latest copy when the exact range was never read.
  - Each list is capped at about 2 MB.
  - "Clear All Data" removes it with the other `movo.*` keys. Logout keeps it, like the device copy of accounts and
    transactions.
- **Wiring:** the repositories export the cached versions:
  - `obligationsRepository`;
  - `billsRepository`;
  - `scheduledTransactions`;
  - `paymentAttempts`;
  - `paymentReminderCenter`;
  - `financeRepository.listBudgets`.
- **`App.js`:**
  - Opening the account's device copy also restores budgets, bills and bill dates from it.
  - `budgets` reads the synced copy while the device copy is in use.
  - Changing a budget offline says "You can change budgets again when you're back online." This avoids writing
    into the guest list.
  - The account details sheet reads goal allocations offline.
- **Financial planning** (`usePlanning` returns `offline`):
  - Offline it shows the last synced loans, receivables, goals and bills, with "You're offline. These are your
    records as last synced; changes are available again when you're back online."
  - The Add button is hidden while offline.
- **"Not signed in":** unchanged on purpose. An account's records are shown only to that account after it signs
  in, never to a signed-out person on the same phone (privacy). They stay on the device and reappear on sign-in,
  online or offline.

### Validation
- `offlineReadCache.test.js`:
  - the copy is kept and shown offline;
  - server errors are never hidden;
  - accounts are isolated, and nothing is kept while signed out;
  - date-range lists use the latest copy, per-record lists don't;
  - with no copy, the error shows as before.
- `AppOfflineFirst.test.js`: a subscriber's loan shows online, and still shows after the connection drops, with the
  offline note and no Add button.
- Full suite: Jest 224 suites / 1,349 tests, `tsc --noEmit`.

## 2. Referral code field loads with the panel (owner)
"The panel should not wait for the add referral code to load. It should load when opening the panel."
- `PlanOffer.js`: the referral code field is part of the free-month offer from the first frame. There is no
  "Have a referral code?" step, and no waiting for sign-in or the plan check.
- Signed out, a typed code is kept on this device (`savePendingReferralCode`) and filled in again after sign-in.
- Test: `PlanOffer.test.js` checks the field signed in, and while the plan check is loading and signed out; a code
  typed before sign-in is filled in afterwards.

## 3. Android Google sign-in (version 7) — finding, no code change yet
Auth gateway logs show the owner's Android 12 Xiaomi app (WebView Chrome 114) calling `/auth/v1/settings` at
12:51 (twice) and 13:43 (three times), each answered 200. That is MOVO's pre-check that Google is enabled. None of
these taps reached `/auth/v1/authorize`. So the app stops after the pre-check and before or while opening Chrome's
secure sign-in tab. The two steps there are:
- saving the PKCE verifier in the Android Keystore vault (`MovoNative.secureSet`);
- `Browser.open` (Custom Tabs).

The two show different messages ("Secure sign-in storage is unavailable…" or "Android could not open secure
sign-in…"). The exact on-screen message is needed to pick the fix. The server side is confirmed working: Google is
enabled, and web Google sign-ins succeeded today.
