# MOVO Pro / Pro+ access, trials and referrals

2026-11-07 · Branch `feat/pro-plans-trial-restrictions` · Based on main `e8b7abc7`.

## Result and scope

Introduces one shared expiring entitlement model across UI, authenticated APIs and database writes. Existing TTS/receipt repairs, e-wallet QR upload and loyalty/Others changes from PRs #233–235 are preserved. The current ram is unchanged.

| Capability | Free | Pro | Pro+ |
|---|---|---|---|
| Local records, standard landscape styles, basic slide | Yes | Yes | Yes |
| Receipt attachments; financial export and read-only backup import | Yes | Yes | Yes |
| NasrinAI | Stored-record answers | Full | Full |
| Cloud writes, insights/briefings, receipt scanning | No | Yes | Yes |
| premium-stickers, portrait, chosen card animation, style/scenery uploads | No | Yes | Yes |
| Home custom Money Flow range | No | Yes | Yes |
| Automation and enhanced glow/motion | No | No | Yes |
| Native home-screen widgets | Basic after store release | Advanced after store release | Advanced after store release |
| Future premium mascots | No | No | Reserved; not implemented |

The first-launch sheet precedes the walkthrough. A verified account can claim one calendar month of Pro without payment details or automatic charging. Existing cloud users receive one migration-month grace trial; after expiry their records remain readable/exportable and financial writes fail closed. Local mode remains available. Internal streak IDs remain stable; visible tiers become Bronze/Silver/Gold.

Ten distinct referred accounts with verified, positive-value production Pro/Pro+ purchases qualify for one three-calendar-month Pro reward. Trial-only, sandbox and revoked purchases do not count. Claims and rewards serialize with database advisory locks; repeated callbacks do not extend a reward. The reward starts after the current trial or paid period. A refund reducing the qualifying count below ten disables reward access. MOVO grants do not cancel, pause or credit an Apple/Google subscription; the offer explicitly discloses continuing store renewals.

## Enforcement and data handling

- `movo_plan_status` checks the caller identity and expiry, returns only owner status, and normalizes historical max/ultra rows to Pro+.
- Trial/referral grants cannot be written by authenticated clients. Store receipts are verified on the server before access/referral processing. Apple positive prices and Google processed matching-product order totals establish paid referral evidence.
- API gates protect full NasrinAI and automation. Database triggers also cover financial SECURITY DEFINER RPC mutations; Pro cannot directly insert automation-source transactions.
- The premium-stickers bucket becomes private. Restrictive policies protect paid reads and cloud storage mutations while retaining underlying ownership policies. Existing signed URLs may remain valid until their 30-minute expiry; already downloaded images cannot be recalled.
- Sandbox entitlements require the explicit `MOVO_STORE_TEST_USER_IDS` allowlist, reconciled to a service-only test-user table. On removal, call the entitlement endpoint or remove its database allowlist row immediately; changing the environment alone does not synchronously revoke that row.
- Entitlements refresh on visibility and periodically, with an expiry timer and fail-closed errors. The UI never grants access from an imported backup.
- Backups paginate owner-filtered finance tables and include locally available receipts/QR/style/scenery media. Imports are separate read-only IndexedDB snapshots, not financial or entitlement writes. Invalid or oversized backups fail; the current 50 MB backup limit is explicit. Export fails instead of downloading a knowingly partial archive. Credentials and automation tokens are excluded from local exports.

## Verification

Executed in Vercel Sandbox `movo-pro-plans-20261107`, with source rebased onto the latest main above:

- Full Jest: **765 tests, 135 suites passed**.
- TypeScript: passed.
- Optimized production build: compiled successfully.
- Translation generation: 2,405 catalogue strings across 11 languages.
- Real PostgreSQL 18 disposable fixture database: migration plus adversarial SQL checks passed for grace, expiry/read-only, owner isolation, forged grants, automation, refund, duplicate claims and referral replay. Command: `PGPORT=55432 python3 scripts/test-plan-migration.py`. This fixture is not a production database clone.
- Chromium production-build checks at 320/390/430px: first-launch offer, Custom/portrait/scan/automation restrictions, Free receipt attachment, backup download and read-only import passed; no horizontal overflow or JavaScript page errors. First-launch checked in light/dark system appearance. Scanner shortcuts were corrected during this QA. No native store transaction is represented by these web checks.
- Production dependency audit: zero reported vulnerabilities.

## Release gates and owner setup

This is a **draft implementation**, not an activated production billing release. The new migration has not been applied to production and billing must remain disabled until these gates pass:

1. Review and apply `20261107070000_movo_plans_trials_referrals.sql` in a staging copy with the complete current production schema. Exercise authenticated financial create/edit/delete/reversal flows, existing-user read-only mode, ownership and storage downloads there. Coordinate the migration with the app deployment; the new code requires its RPCs.
2. Configure Pro and Pro+ monthly/annual products in App Store Connect and Google Play Console, including prices/localizations, approved native apps and signing. Product identifiers are in `src/lib/store-products.json`; no prices are invented in the UI.
3. Configure the existing native purchase verification credentials, Apple/Google server notifications and Google Orders API permissions, then validate purchase, restore, renewal, grace, cancellation, refund/revocation and account binding on signed iOS/Android builds. Explicit sandbox testers only. Enable `MOVO_STORE_BILLING_ENABLED` only after that verification.
4. Native widgets remain future native work conditional on store release. The future 12-mascot/four-hierarchy system is intentionally deferred as requested.

Rollback: before migration, revert the feature commit. After rollout, preserve grant/entitlement rows; do not drop them or revert only the UI while leaving incompatible API contracts. Disable new billing and use a reviewed coordinated migration/application rollback. No production customer rows were changed during this work.
