# Profile: no Sign in button for signed-in people; account rows match Total Balance — 2026-11-09

## What changed
- `src/screens/Profile.js`: the profile card's **Sign in** button showed whenever MOVO was not in cloud mode, so a
  signed-in person with Cloud Sync off, offline, or waiting for a sync saw "Sign in" under their own name and email.
  It now shows only when no one is signed in.
- The **Cloud Sync** row said "Sign in to use cloud storage" (and opened Sign in) for the same signed-in person; it now
  shows the sync status with an "Off" pill and opens Settings.
- The **Bank Accounts / Cards / E-Wallets** rows now add up with the Total Balance rules (`lib/totalBalance.js`): a
  debit card linked to its bank was counted again under Cards (its balance is the bank's), archived accounts were
  included, and card payments that moved no money were counted. Counts show open accounts.

## Verification
Profile tests: signed-out shows Sign in; signed in (cloud or local) and builds without cloud do not; the local-mode
Cloud Sync row shows status and opens Settings; account rows count linked debit cards once and skip archived ones.
Full Jest 166 suites / 1010 tests, `tsc --noEmit`, strict build (exit 0).

## Data / security
UI only; no data, auth, RLS or API change.
