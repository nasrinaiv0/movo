# MOVO security and compliance remediation

Date: 11 November 2026 (Philippine time). Baseline: `166dbd1271fc21bde29025be93f321c205c7566b`.

The [production audit](../../audits/2026-11-11-security-safety-compliance.md) records the findings at that baseline. The changes below are proposed for review. Release clearance requires the outstanding verification and operator evidence below.

## Implemented

| Audit area | Change |
| --- | --- |
| Ledger integrity | Remove authenticated direct transaction update/delete grants and policies. Current clients use the hybrid compare-and-swap operation. The owner-scoped legacy reversal RPC remains available for older clients. Owner-aware FKs bind schedules and their latest transactions in both directions. New writes use the same safe-cent upper bound as the hybrid RPC. |
| Account deletion | Show deletion for signed-in users even with Cloud Sync off. The verified user ID comes from Supabase Auth. Deletion records a retryable request, blocks new receipt and QR writes, removes files through Storage, then commits owner-scoped database and Auth deletion together. The app reports and can retry device cleanup after the server confirms deletion. A separate endpoint clears cloud records while keeping the sign-in account and entitlement. |
| Billing | Google cancellation keeps access while the verified expiry is in the future. Pending cancellation and expiry still deny access. Checkout readiness remains a checkout control. Authenticated store verification, restoration, and signed notification processing must continue to support existing purchases. |
| Retention | Incoming cloud preference snapshots reject expired Archive entries. A daily secret-protected job prunes expired cloud archives and dismissed automations, and deletes Google acknowledgement jobs older than seven days. Successful acknowledgement already clears ciphertext immediately. Account erasure removes acknowledgement jobs linked to that account's Google entitlements. |
| Privacy and age | Update web and in-app disclosures for token storage, local/cloud archive cleanup and account deletion. Require an 18+ declaration alongside terms acceptance at sign-in. The updated legal paragraphs are marked English in-app until translations are reviewed. |
| NasrinAI | Disclose microphone transmission and downstream AI/voice processors before consent. Request renewed consent for the expanded disclosure. Add on-device withdrawal, stop the microphone without uploading a final clip, and invalidate queued requests. Requests already sent and processor copies follow their retention policy. |
| Platform and browser | Bundle the Apple UserDefaults required-reason declaration, exclude app domains from Android backup and Android device transfer, and restrict web CSP connections to MOVO's own origin, Supabase, and the existing FX providers. |

[Apple account deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app/) · [Google account deletion](https://support.google.com/googleplay/android-developer/answer/13327111) · [Google subscription lifecycle](https://developer.android.com/google/play/billing/lifecycle/subscriptions) · [Android backup rules](https://developer.android.com/identity/data/autobackup) · [Apple required-reason APIs](https://developer.apple.com/documentation/technotes/tn3183-adding-required-reason-api-entries-to-your-privacy-manifest)

## Verification completed

- Production-mode web build, TypeScript and OTP-template checks passed. Jest passed 1,190 tests across 194 suites.
- All repository migrations loaded in a disposable PostgreSQL fixture. Seven SQL suites passed, covering erasure and retention, hybrid CAS and reversal behavior, finance RPC tenant isolation, bill payments, obligation postings, covering indexes and owner audit anonymization. The bill fixture now seeds its service role and active plans to match the existing cloud-write guard.
- The production dependency advisory check reported zero known npm advisories. The iOS privacy plist parsed and is referenced by the app's Resources build phase.
- The checks used synthetic identities and records. Production was read only.

## Rollout

1. Review the three SQL migrations with a staging project that matches production Auth, Storage and grants. The production preflight read returned zero cross-owner schedule links in both directions and zero out-of-range transactions. The new checks and foreign keys start as `NOT VALID` so new writes are enforced without scanning old rows during the DDL lock. Validate existing rows as a separate controlled operation.
2. Coordinate migration and app rollout. The new account endpoints depend on the new procedures, and older clients that send raw transaction updates/deletes or raw Clear All Data calls will receive permission errors after the grant change. Current hybrid writes and the legacy reversal procedure are retained. Verify store builds and supported client versions before rollout.
3. Test normal, disabled-sync and expired-plan accounts with disposable identities and receipt/QR files. Exercise cloud clear, deletion retries, active uploads, device cleanup failures and cross-tenant denial. Confirm hosted Auth removes the identity and refresh sessions. Existing access tokens can remain valid until expiry, so verify the production database and server endpoints reject actions from the erased account. Device cleanup retry currently lives in the open app session. Other devices require separate cleanup.
4. Monitor the 03:00 UTC retention job and the existing ten-minute acknowledgement worker. Set the exact Google Pub/Sub subscription and verify configured audience, package, product IDs, base plans and store prices. Run cancellation, expiry, renewal, refund, revocation, restore and retry tests in isolated billing. Reconcile any affected prior subscriptions from verified Play data.
5. Vercel Sandbox creation for MOVO returned HTTP 402. Fresh browser and end-to-end tests remain open. Validate web/mobile sign-in, cloud CRUD, deletion, retention, CSP-dependent connections, and private-storage behavior before merge. Verify the exact signed AAB and IPA on devices and in the actual store consoles.

## Remaining compliance and engineering work

- Confirm the legal controller name, applicable business address and DPO/contact before publication. Verify NPC registration applicability, processor contracts and data locations, user-rights and breach response procedures, retention and commercial obligations. The verified controller identity is still missing from the notice.
- Verify processor-side retention and deletion for NasrinAI, including audio. The current withdrawal is local to the device. Review account-wide consent records and step-up authentication for account erasure.
- Financial data still uses WebView/browser storage and a native Preferences mirror. Native credential storage is separate. Migrating financial records to device-bound encrypted storage requires a lossless migration, recovery testing and signed-device verification.
- Hybrid sync stores full acknowledgements for safe replay. Set a retention policy compatible with the supported offline retry window before pruning this table. Finish the remaining hybrid writers and native storage acceptance.
- Confirm Supabase password-flow usage and leaked-password protection, and continue reviewing privileged RPCs and build/native dependencies. Verify Google Play Data safety and Financial features declarations, Apple App Privacy metadata and the full signed-archive privacy report.
- Billing activation, store submissions, and production migrations are outside the changes recorded on this branch. The audit still does not establish release or legal compliance.

[Philippine Data Privacy Act](https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/50253) · [NPC registration circular](https://privacy.gov.ph/wp-content/uploads/2023/05/Circular-2022-04.pdf) · [Store setup](../../commercial/STORE_BILLING_SETUP.md)


## PR #274 review follow-up (11 November 2026)

- Treat a deleted Supabase identity as ineligible for private Storage uploads even while an older JWT remains cryptographically valid. The original pending-erasure row cascades with auth.users, so checking that row alone left a residual-token window. Added synthetic regression asserting the stale account is blocked.
- Always attempt local attachment and QR cleanup on deletion; IndexedDB availability must guard only the hybrid owner store. Keep error reporting when cleanup is incomplete.
- Isolated finance CI now uses the PostgreSQL client bundled with the disposable database service container, avoiding runner APT DNS failures. PR progress is recorded in the same implementation commit to preserve the per-commit documentation gate.
- **Verification remains pending** until the rewritten PR head completes GitHub Actions and signed-device/browser checks. Vercel Sandbox creation returned HTTP 402 payment_required. The changes do **not** authorize deployment, migration application, billing activation, or a public launch.

- The existing Clear All Data action previously ignored private-file cleanup failures, did not await removal of the native Preferences mirror, and could report both a false success and a misleading 'nothing removed' error. It now awaits QR, receipt, hybrid journal and native mirror cleanup, retains the retry sheet on failure and reports a retry-required failure without falsely claiming no data changed. Native/browser acceptance is still required.

- UI regression for Clear All Data now awaits its verified asynchronous QR, attachment, hybrid-store and native-storage cleanup before asserting that records disappeared; this preserves the stricter completion contract rather than relying on an unsafe synchronous assumption.

- The privacy cleanup regression exposed an IndexedDB-absent runtime: account QR removal already treats unavailable IndexedDB as an empty store, but receipt attachment removal threw before the local ledger could be cleared. Both now skip only absent IndexedDB, while actual database write/clear errors remain blocking. The local-finance-key removal result is also checked before claiming success.

## 2026-11-11 — PR #274: DPO disclosure and 176-market compliance gate

Designated DPO Nasrin Abubakar, dpo@nasrinai.com, in public and in-app legal pages and the external account-deletion instructions; retain general support email. Legal controller identity, physical address and local representative details remain unverified, and no legal clearance is asserted. Added regression coverage and a global market-specific release evidence register. Apple currently advertises 175 App Store countries or regions, not the requested 176; Google Play market list and individual requirements need separate confirmation. Do not merge, publish, activate billing, or apply production migrations without independent validation. Vercel Sandbox still returns HTTP 402 payment_required.
