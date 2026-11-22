# Source merges and Android build 21 recovery — 2026-11-22

This is the current execution handover. All four formerly open source PRs have merged after their applicable current-head checks passed. This source disposition supersedes historical draft/source holds. It does not certify live hosting, signed-device/store acceptance or authorize destructive production activation.

| PR | Final disposition | Merge commit |
| --- | --- | --- |
| #330 | Merged; audit, ownership/import, interface and hosting preparation | `c3e37d7c6a1bac23533c8c0a626a6f05709f6dd0` |
| #331 | Merged; development dependency hardening, integrated #330 | `cfb83c514bfc7cf0c59fd8cc98d768ce56d88f30` |
| #291 | Merged; selected encryption plus owner/session-safe integration | `b55429d8217c8651a580de4c72b4608d4b431880` |
| #274 | Merged; gated erasure/retention and Android device-copy status | `ff9edc528c69a5f2e0bd0658c3335c3b788bd18b` |

#326 and #290 remain closed as superseded by #327 and #291. #329 remains closed following consolidation into released #327. Do not reopen these branches or restore superseded source.

## Current validation

#274 source head `9a0d48d2b13da3d4d5c0dc694d6ca5ecbc74a3ac` passes all eight workflows: Phase 1, hybrid security/accounting, finance SQL, IAP SQL, container, Android native, paired R8 acceptance and iOS. Main's `ff9edc52` tree exactly equals that tested head. Phase 1 covers 266 frontend suites / 1,762 tests plus five explicit server-retention tests (1,767 total); typecheck and strict original-only packaging pass. Twenty-seven Python harness tests pass. Main's post-merge iOS run must still be checked and recorded separately; do not infer its result from the PR.

Earlier paired runs, including both attempts at `65f63b83`, failed when the candidate emulator disappeared after full baseline and candidate startup/vault checks. They remain historical failures. Fresh AVDs remove shared emulator state between variants, with identical API/image/profile/RAM/renderer settings. The candidate step requires baseline success; both full instrumentation sequences and same-install process persistence remain mandatory. The actual host-process exit cause has not been established. Current [paired run 44987779244](https://github.com/nasrinaiv0/movo/actions/runs/44987779244) explicitly passes both acceptance steps.

[Baseline wallet](../../audits/assets/2026-11-22-android-fresh-avds/baseline-wallet.png) · [Candidate wallet](../../audits/assets/2026-11-22-android-fresh-avds/candidate-wallet.png) · [Provenance](../../audits/assets/2026-11-22-android-fresh-avds/results.json). Screenshots show the synthetic Wallet All view and credit balance. DOM instrumentation separately verifies Cards selection, style/logo and balance before capture; screenshots alone do not establish the final Cards-filter frame. These tests do not verify real provider sign-in, real store purchases or the reported customer balance mismatch.

## Android build 21 requests

The successful signed workflow `44965474894` explicitly records version code 21 and source `cfb83c514bfc7cf0c59fd8cc98d768ce56d88f30`. Both devices reportedly use the same MOVO account. A source merge cannot update an installed native binary; a new signed build and upgrade acceptance are still needed. No store upload occurred here.

| Report | Confirmed result and remaining work |
| --- | --- |
| Offline despite internet | Device-copy storage was incorrectly labeled offline in Planning and plan usage. Source now uses neutral device-copy language. Completed HTTP/SQL denials override stale WebView offline hints. Existing auth and reconciliation gates remain. |
| Subscription across devices | Server lookup is scoped to the MOVO user ID across devices/platforms. Disabled API hosting blocks verification on a new device. Preserve verified owner-scoped expiry; never unlock by device preference or ask for a second purchase to recover access. Recurring-bill sync still requires the existing owner-safe cloud sync. |
| Bank/card balances | Not yet reproduced from the report. Await a fictional starting balance, transaction/card type, expected and observed values, and affected devices. Existing ledger/cent/linked-card/running-balance tests pass. No calculation rule or historical record was changed based on an assumed cause. |
| Crypto/stocks | API hosting is disabled. CoinBeacon key exists in project configuration; licensed Twelve Data key is absent from project targets. Restore hosting and securely configure/verify providers before claiming live quotes. |
| Friends | API hosting blocks live acceptance. Preserve authenticated owner/share permissions and validate on disposable users after recovery. |
| Planning offline notice | Corrected in source; saved data remains read-only until existing safe reconciliation succeeds. Live cloud operations still need restored service and verified access. |

## Hosting and production boundaries

A fresh request to the entitlement API returned HTTP 402 `DEPLOYMENT_DISABLED`. Internet availability and MOVO service availability are separate. No production hosting/billing setting, DNS/IAM binding, paid resource, store record or customer data was changed.

Owner supplied Google project `project-005bfd34-e896-4664-a8e`. Tokyo (`asia-northeast1`) is selected near the database, pending owner confirmation. [Cloud Run deployment runbook](../../CLOUD_RUN_DEPLOYMENT.md) contains the target and validated container/renderer process. This workspace has no Google Cloud connector, gcloud CLI, application credentials or authenticated browser tools. Registry/runtime identity/image digest/secret versions are unverified. Authenticated Google Cloud access is required before deployment can proceed. Never paste provider/service-role keys into chat or put them in the frontend/image; configure version-pinned server-side secrets.

Production Supabase `cjsjmorqvuvvwbfyztiz` migration history was re-read after #274 merged and still ends at `20261120025027 harden_transaction_mutations_and_posted_allocations`. The three #274 migrations remain unapplied: `20261111133000`, `20261111133100`, `20261111133200`. Their approval is separate from #328's earlier authorization. The retention migration includes an incoming-snapshot pruning trigger and requires approval even while HTTP retention is off.

`MOVO_ACCOUNT_ERASURE_ENABLED` and `MOVO_DATA_RETENTION_ENABLED` remain absent in Vercel project metadata and default off in source. Disabled erasure/clear/retention returns 503 before destructive actions. No flags were enabled; no customer rows were read. Do not claim App Store account-erasure acceptance while these endpoints are unavailable. Signed native upgrade/recovery, physical accessibility/audio, live integrations and name/rights/store evidence remain release gates.
