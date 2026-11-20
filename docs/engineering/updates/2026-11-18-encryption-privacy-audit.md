# MOVO encryption and privacy release review

## Evidence and changes

- Production Supabase catalog review on November 18 found row-level security enabled on all 46 public base tables and private buckets for receipts, bank QR images and premium stickers. The 15 privileged RPCs callable by authenticated users had fixed search paths and denied anonymous execution. These catalog checks do not prove every RPC enforces tenant isolation. The security advisor also reported leaked-password protection disabled.
- Protected the wallet, offline snapshots and pending ledger payloads with authenticated encryption. The browser retains a non-extractable key in IndexedDB and native stores use the existing Keychain/Keystore seed. Device storage also contains index and sync metadata. An unlocked or compromised app runtime can access the records.
- The ledger schema update and encryption run in one IndexedDB transaction. A failed upgrade preserves plaintext v1 rows and pending operation state for retry. Older code cannot reopen the upgraded ledger. Local storage uses a separate encrypted namespace and holds both copies on conflict with an older tab. Native migration authenticates and reads back the new copy before removing its legacy preference. Different native copies are retained in authenticated recovery envelopes and retries reuse them.
- An orphaned encrypted ledger, QR image or Preferences copy prevents creating a replacement native seed. An optional QR migration failure is isolated from wallet startup, and a valid QR can be migrated on demand even if another legacy image is corrupt.
- Signed-in customers can request deletion regardless of plan and Cloud Sync status. Deletion is bound to the confirmed account, handles the owner’s scheduled transactions before removing their account, and reports a device cleanup failure separately from cloud deletion. A delayed preference upload now captures its intended owner and stops if the active owner changes.
- The iOS target packages the required-reason declaration for the app’s private UserDefaults use and no longer asserts an unverified exemption for bundled encryption. Camera permission copy describes capturing a receipt. Production dependency audit reported zero advisories at review time.
- Focused tests cover migration rollback, stale clients, corrupted payloads, key loss, interrupted native cleanup, account changes and deletion. Chromium reproduced the upgrade with two same-origin tabs, including a blocked old connection, and verified encrypted payloads and the original pending operation state after reload.

The integrated branch regenerates the language catalogs from both branches and keeps the newly added Android permission and plan controls. Local strict build passed 1,580 tests before integrating main.

## Release gates and remaining work

1. Upgrade existing signed iOS and Android test installs containing unsynced changes, deleted rows, and receipts without clearing storage. Verify key persistence, offline reopen, low storage, crash recovery, second-account isolation, and supported recovery for divergent copies. Exercise browser Safari as well as Chromium. A downgrade to code that cannot read encrypted records is unsafe.
2. Audit and repair identity ownership for financial preferences across account changes. Legacy global preferences include archive records and planning data. The delayed-write guard addresses one race but does not establish the owner of old global data. Receipt files, artwork, device preferences and user-created exports are outside the encrypted ledger. Validate a scoped recovery and deletion process for existing data.
3. Verify deletion with a disposable, populated account and the current database schema, including storage, billing, retained audit records, archived entries and failure/retry. The separate Clear All Data flow needs a complete deletion inventory and accurate scope. Review chat and voice consent, disclosure of external providers, revocation, and data portability independent of plan.
4. Confirm the legal controller identity and contact, published retention periods, cross-border processors and safeguards, actual distribution territories, and applicable Philippine NPC registration and breach procedures. Align the in-app and public terms with actual deployed versions and measured retention. Have the operator’s DPO and counsel review the release evidence.
5. Reconcile App Store privacy and Google Play Data safety, financial features, account deletion URL and reviewer access against the signed builds. Determine Apple encryption export classification and any territorial filings before uploading a store build. Keep declarations based on evidence from the actual archive and storefront configurations.

## Authorities

- [Philippines Data Privacy Act, sections 16 and 20](https://privacy.gov.ph/data-privacy-act/)
- [National Privacy Commission implementing rules](https://privacy.gov.ph/implementing-rules-regulations-data-privacy-act-%202012/)
- [Apple App Review Guidelines, section 5.1](https://developer.apple.com/app-store/review/guidelines/)
- [Apple encryption export compliance](https://developer.apple.com/help/app-store-connect/reference/app-information/export-compliance-documentation-for-encryption/)
- [Google Play User Data Policy](https://support.google.com/googleplay/android-developer/answer/10144311)
- [Google Play account-deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111)
- [EU GDPR Articles 13, 17, 32, and 33 where applicable](https://eur-lex.europa.eu/eli/reg/2016/679/oj)
