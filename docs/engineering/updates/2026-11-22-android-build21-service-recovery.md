# Android build 21: connectivity and service recovery

The owner reports Android build 21, with both devices signed into the same MOVO account. Reports cover offline status while internet is connected, subscriptions missing across devices, bank/card balances, crypto/stocks, friends and Financial Planning. The subscription wording may cover both MOVO paid access and recurring bills; do not infer a purchase from a device-local preference.

## Confirmed findings and changes

A fresh unauthenticated request to `https://movo.nasrinai.com/api/purchases/entitlements` returns HTTP 402 with `DEPLOYMENT_DISABLED`. This establishes an API hosting failure, not loss of the phone's internet connection. Purchases/entitlements, crypto, stocks and friends depend on MOVO API routes. Restoring their availability requires an operational API host and real provider verification. Do not unlock an unverified plan, move credentials into the browser, retry financial writes on a different host, or substitute invented market quotes.

Financial Planning incorrectly described every signed-in device-copy session as offline. It now explains that records are held on the device until safely reconciled. The plan panel similarly labels storage as “On this device,” rather than calling the internet offline. Cloud editing remains blocked until the existing safe reconciliation succeeds.

Network error classification now gives completed HTTP and PostgreSQL/PostgREST rejection responses priority over a stale browser connectivity hint. A 401/402 or ledger denial must not become an offline write retry just because Android reports `navigator.onLine === false`. Transport failures and local timeout behavior retain their existing handling.

Both devices must obtain the same server-verified account entitlement; an unreachable verification endpoint cannot establish a new device's plan. Existing verified, owner-scoped cached access retains its expiry. Existing restore and refresh paths are retained; no local paid-access flag or purchase rebinding is added. Avoid asking the owner to purchase again to recover an existing subscription.

## Balance investigation

No production records were queried or rewritten. The bank/card mismatch is not yet reproduced from the report. Await a fictional example of starting balance, transaction/card type, expected and observed result, including whether both devices differ. Existing ledger, posted-event, debit-link, credit liability, cent precision and running-balance regressions are being checked. Do not change the accounting rules or repair history based on an assumed cause. The signed release workflow `44965474894` explicitly records version code 21 and source `cfb83c514bfc7cf0c59fd8cc98d768ce56d88f30`. Signed upgrade validation remains necessary; an artifact build is not proof of installation or correct live account balances.

## Release and hosting boundaries

#291 merged as `b55429d8` after all eight current-head workflows passed. #274 incorporates that actual main with unchanged source/config/test fingerprints before this focused fix. Its preceding paired emulator run failed when the candidate emulator disappeared after complete baseline acceptance and candidate seed/vault checks; logs and emulator artifacts are retained. It remains a failed check until a complete new-head pass.

The optional Cloud Run container and API-origin configuration already exist. The owner supplied project ID `project-005bfd34-e896-4664-a8e`; select Tokyo (`asia-northeast1`) to match the database, pending confirmation. The runbook now has these concrete non-secret target values. Google authentication/tooling is unavailable in this workspace, and the registry, runtime service account, image digest and secret versions remain unverified. No cloud project, resource, DNS/IAM, billing setting or production environment was changed. No #274 production migration or destructive feature activation is included. Both activation variables are absent in current Vercel project metadata, so their server handlers default to disabled.

## Verification

Focused suite: 6 suites / 50 tests pass, including a connected-device Planning regression and HTTP/database denial handling with a false browser-offline hint. Typecheck passes. Full regression, strict original-only bundle and fresh native/SQL/container checks remain required before merging this final head. No claim of signed Android build 21 acceptance or live API recovery is made.

Strict original-only production build, notices audit and 54-resource offline worker pass. Full regression initially passed 265 suites / 1,761 tests and failed one existing assertion that required the now-incorrect offline sentence. Update that assertion to the neutral device-copy notice while retaining its saved-loan and no-Add assertions; rerun that suite and fresh full CI before merge.

The updated offline-first integration suite and stocks/crypto API checks pass: 3 suites / 18 tests. Full current-head hosted CI remains required. The earlier attempt naming a nonexistent `stocks.test.js` was a test command error, not a product failure; the actual stock screen suite is used here.


## Final-head validation and separate emulator instances

At `65f63b83`, all 266 frontend suites / 1,762 tests plus five explicit server retention tests pass (1,767 total). Web/build, SQL isolation, hybrid security, container, Android native and iOS workflows pass. Both attempts of paired R8 `44985616297` complete baseline acceptance and candidate seed/vault recreation, then lose the candidate emulator during Wallet acceptance. Neither attempt is a paired pass. Retain the logs and failure status.

The workflow now runs baseline and candidate on separately created disposable AVDs with distinct names and identical API/image/profile/RAM/renderer settings. This removes shared emulator state between compiler outputs; it does not establish the cause of the host process exit. The candidate step requires baseline success. Both complete acceptance sequences, including same-install process-restart persistence, remain mandatory. Default CLI invocation still runs both; explicit `--variant` only selects the compiler output for that fresh AVD. All 27 host harness tests pass, including required acceptance/restart phases and failure propagation. No application source, assertion, timeout, device identity/root check or network isolation is changed. A complete fresh native/hosted pass remains required before merging.

Read-only Vercel project metadata confirms `COINBEACON_API_KEY` exists for production/preview/development, but `TWELVE_DATA_API_KEY` is absent from project targets. Stock quotes need a valid licensed server-side provider configuration as well as restored API hosting. No credentials were decrypted or changed; provider validity has not been tested. Both destructive feature switches remain absent.
