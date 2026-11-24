# 2026-11-23 — Audit fixes: cross-device preference sync, same-currency transfers, unconvertible totals, net worth

Owner request: "Full audit … tell me what bugs you found", then "fix all of these".

## Purpose

1. **Balances differed between devices.**
   - Recorded credit-card payments, card kind and credit limit (`accountStyles`), and card–bank links (`cardBankLinks`) live in synced preferences.
   - Preferences were read once at sign-in. After that every save replaced the whole cloud row, even saves for unrelated settings.
   - `creditCardPayments` and `creditSpendLogs` were not merge-aware, so on sign-in the cloud copy replaced the device's.
   - A device with an older copy could therefore erase another device's card payments or flip a card between credit and debit.
2. **Cross-currency transfers drifted.**
   - The Transfer sheet allowed a transfer between accounts in different currencies but stored one amount.
   - The receiving account was re-converted at each day's exchange rate.
3. **An amount with no exchange rate blanked totals.** One record in a currency with no rate made a month's income and expense totals, and Financial planning's net worth, invalid.
4. **Net worth was cut off.** At the Largest text size, Home showed the net worth as "₱167,74" with no ellipsis.

## Changes

- **Three-way preference sync.**
  - `lib/prefsMerge.js` adds `mergePreferencesThreeWay(base, local, remote)`, which applies only what this device changed since it last synced on top of the account's latest copy:
    - single values are kept only if this device changed them;
    - maps are merged per key;
    - id lists apply this device's additions, edits and removals;
    - card payments and credit spend logs are never dropped;
    - "seen" markers keep the newest value;
    - legal acceptance and the streak use their existing merges.
  - The first sign-in merge now unions `creditCardPayments` and `creditSpendLogs` per account.
  - `lib/financeRepository.js` adds `savePreferencesIfUnchanged`: an update that succeeds only while `updated_at` still matches the copy that was read, or an insert when no row exists.
  - `App.js` sync:
    - Each save reads the latest row, merges three-way, and saves with that check. It retries up to 4 times when another device or a server function wrote first.
    - Each successful save adopts the merged copy on the device.
    - MOVO also pulls the account copy when the app returns to the foreground and once a minute while visible, keeping this device's unsaved changes on top.
- **Same-currency transfers.**
  - New `lib/transferCurrency.js`.
  - The Transfer sheet lists only same-currency destinations and explains why. Changing the From account clears a destination in another currency.
  - Saving a transfer between currencies is refused, including a card payment from an account in another currency.
  - Automated transfers already enforced this on the server (`transfer_currency_mismatch`).
- **Unconvertible amounts.**
  - The transaction list keeps such a record's own amount and currency (`unconvertible: true`), and it adds 0 to home-currency totals.
  - `planningSummary` treats an amount it cannot convert as 0 instead of returning NaN.
- **Net worth.** The Home net worth row wraps (Assets/Liabilities move to the next line) instead of cutting the amount (new block at the end of `App.css`).
- **Startup.** `@capgo/native-purchases` loads on first use through `ensureConfigured()`. This removes the plugin's code from the main bundle, but the main bundle stays about the same size, because the new sync code adds about 1 KB compressed.
- **Translations.** Two new strings in 11 languages (`src/i18n/catalog/ui-2026-11-23-audit-fixes.js`).

## Tests

- New test files:
  - `lib/prefsThreeWay.test.js`: a stale device cannot erase payments, card kind or links; concurrent payments are kept; list add/edit/remove; untouched settings follow the account.
  - `lib/transferCurrency.test.js`: the helper and the sheet only offer same-currency destinations.
  - `lib/unconvertibleTotals.test.js`: net worth stays finite; the row shows its own currency.
- Changed test files:
  - `lib/preferencesSync.test.js`: the conditional update and the insert path.
  - Four App test files now mock `savePreferencesIfUnchanged`.
- Results: full suite 271 suites, 1,789 tests passed; `tsc --noEmit` clean.
- Strict build: `CI=true` build compiled. The fork type-checker ran out of memory in this environment (known), and `tsc` passed separately.
- Browser check against the test-only mock cloud:
  - At Largest text, Home shows "₱167,744.00".
  - The Transfer sheet renders.
  - No page errors.

## Data, security and compatibility

- No schema change.
  - RLS is unchanged.
  - The conditional save uses the existing owner-only update policy on `user_preferences`.
- Server functions that update `user_preferences`:
  - These are the reversible payment functions that write subscriptions.
  - A client copy can no longer overwrite their updates, because the conditional save fails and the client re-merges.
- Existing cross-currency transfers keep their single stored amount. Their receiving balances still follow the current rate. The fix prevents new ones.
- Income and expense totals still use the current exchange rate for past foreign-currency records. A per-record rate needs a schema change and is left as a follow-up.

## Rollback

Revert the PR. The new sync reads and writes the same row format as before.

## Remaining release gates (owner)

- **Vercel.** Restore the Vercel account and redeploy `main`. Production still runs #327.
- **Account deletion and "Clear all data".**
  - Approve the production migrations `account_erasure` and `enforce_archive_and_billing_retention`.
    - Checked against production on 2026-11-23: PostgreSQL 17, every referenced table exists, no conflicting objects.
    - The archive rule would remove 0 of 14 current archive items.
    - The first apply attempt waited for an approval prompt that got no answer, so nothing changed.
  - Then set `MOVO_ACCOUNT_ERASURE_ENABLED=true` in Vercel.
- **Android Plans.** Play Console subscriptions must be active and MOVO installed from Google Play.
- **Build tooling.** The remaining dependency advisories are in Create React App's build tools only and need a migration away from `react-scripts`.
