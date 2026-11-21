# MOVO App Store submission packet — 2026-11-21

**State: preparation candidate; not submitted or approved by Apple.** The owner confirmed there is no rejection yet. Preserve the current app/records/bundle ID. Name clearance and ownership evidence remain open.

## Review requirements and present evidence

| Requirement | Candidate behavior / evidence | Remaining decision |
| --- | --- | --- |
| Apple 4.1, copycats | Existing MOVO mark, written UI and finance workflows; no competitor icon/metadata is imported by this remediation. Native system controls follow iOS conventions while MOVO retains its own screens. | Prove ownership/assignments for the original brand/UI/artwork. Apple already lists **MOVO - SEND TO SPEND** by MovoCash, Inc. in Finance. This is a real confusion risk, not a finding of infringement. Resolve name clearance or choose a distinct identity before upload. |
| Apple 4.3(a), duplicate submissions | One canonical iPhone app ID: `com.nasrinai.movo`; the Watch target is its companion. Existing source release checks enforce this relationship. | Inspect App Store Connect and confirm a single app record. Do not create near-identical Pro, regional or renamed bundle-ID variants. This repository cannot prove other store records do not exist. |
| Apple 4.3(b) / 4.2, utility and differentiation | Manual financial recording, account-specific balance history, offline persistence, transfers, budgeting/obligations, optional reviewed receipt/AI workflows and owner-scoped sync are implemented. See the reviewer walkthrough below. | Demonstrate the actual signed build and live services. A feature list or cosmetic rebrand does not establish originality or guarantee review. |
| Apple 5.2, intellectual property | `build:app-store` excludes unverified public logo, wallpaper, mascot-file and tutorial-media packs. iOS uses generated geometry and generic marks/text. No unlicensed photo/video is fetched as a fallback. Saved style IDs remain unchanged. | Complete asset provenance and contributor/owner evidence. Functional sign-in branding, third-party SDKs, fonts and provider/service terms still require the documented license/brand review. |

Authoritative policy: [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) (4.1, 4.2, 4.3 and 5.2; checked 2026-11-21). Existing name listing: [MOVO - SEND TO SPEND, MovoCash, Inc.](https://apps.apple.com/us/app/movo-send-to-spend/id1538828856). These sources do not establish the owner's trademark rights or Apple's future decision.

## Exact production asset policy

The policy applies to all installed-iOS users and to the iOS build, not just reviewers. It does not change according to an account, review session, country or server switch.

- `src/lib/assetRights.js` enforces original-only artwork for installed iOS, even if a build flag was accidentally omitted. The build also fixes `REACT_APP_ASSET_POLICY=original-only` so unneeded inline trademark chunks can be eliminated.
- `scripts/build-app-store.cjs` produces a local, self-contained CRA build, removes unverified build copies, regenerates the offline shell and audits the resulting artifact. Unsigned iOS CI and the signed workflow both use it.
- Excluded output folders: `brands`, `wallpapers`, `mascot`, `tutorial`. Source repository files are retained for evidence/recovery; they are not proof of permission. Private user uploads and existing records are not erased.
- The old 630 wallpaper IDs survive. Generated SVG geometry replaces unreviewed imagery. The sole named franchise entry, “Witcher 3 Live,” was removed from the active catalog and retained in the quarantine register.
- The iOS guide retains captions and the written Aries SVG; old screenshot/audio media is replaced with original geometric illustrations and silent navigation. Those old media files are not represented as cleared. Refresh real App Store screenshots from the candidate signed build; do not use guide illustrations as store screenshots.
- Decorative issuer/merchant/subscription/stock/crypto logos become generic marks or text. Network names remain plain identification labels, not locally reconstructed payment-network artwork. Membership cards use the generic MOVO palette rather than merchant trade dress. Account/transaction names and IDs remain intact.
- No database migration, financial-calculation change, credential/storage downgrade, paid entitlement change, app-record creation or store upload is included.

## Source/rights evidence register

| Material | Evidence now available | Status |
| --- | --- | --- |
| MOVO mark, Aries, UI icons, procedural artwork | Sources in MovoLogo, ariesArt, Icon and assetRights; prior repository history | Owner/assignment review required; no legal ownership attestation manufactured |
| Legacy wallpapers and logo packs | Public source files retained; excluded from iOS output; quarantined franchise-title record | Not cleared for iOS redistribution |
| User uploads | Existing private user-selected data; no copying into the binary | Preserve existing upload terms; owner review remains required |
| JavaScript/native SDKs, OCR/PDF software | `public/third-party-notices.txt`, generated from locked installed packages; upstream license/NOTICE files preserved | Owner license review required, including relevant source-availability duties |
| MPL-2.0 native plugins | Full notices plus exact source-package URLs for app-attest 8.2.16 and native-purchases 8.9.6 | This candidate does not modify plugin source; owner must maintain access to source and any downstream modifications |
| Inter, Nunito, Lora, Atkinson Hyperlegible | Official Google Fonts OFL files, source URLs and hashes in `docs/legal/upstream/` | Font notices collected; verify the exact delivered fonts when recording evidence |
| tr46 0.0.3 (server dependency via node-fetch) | Exact package metadata declares MIT; the published archive lacked a standalone full notice | **Unresolved notice provenance** explicitly identified in credits; do not claim it legally cleared. Resolve in license review and distinguish server dependencies from actual iOS bundle contents |

Credits are accessible inside Terms → Third-party notices in the existing sheet. The file is bundled and included in the offline shell; reading credits does not require navigating to a third-party site.

## Technical evidence

Both regular web and original-only strict builds pass. The latter's offline shell contains 54 resources and excludes the four unreviewed media folders. Source regressions preserve all 630 style IDs and check iOS runtime enforcement, generic image fallbacks, SVG input safety, working guide navigation without unavailable audio, local notice loading/error/cancellation, and source-file preservation during packaging. [Inspected synthetic mobile Wallet and notices evidence](../audits/2026-11-21-app-store-rights-review.md) supports browser rendering only. Final counts and limitations are recorded in the [engineering update](../engineering/updates/2026-11-21-app-store-rights-preparation.md) and PR. None of this substitutes for owner/license clearance or signed-device/live-backend acceptance.

## Reviewer walkthrough to record on the signed candidate

Use fictional records; never share production customer data or put reusable review credentials in this repository.

1. Start empty, review Terms/Privacy and show the MOVO identity. Explain this is a manually maintained organizer; it does not hold, transfer or bank the user's money.
2. Add a cash account with 100.25 opening balance. Add an expense of 12.34. Show 87.91 and the account-specific running balance; relaunch to verify persistence.
3. Add another account and record an internal transfer. Show that the transfer changes its accounts without creating income/expense. Use the existing transfer workflow; do not claim bank connectivity.
4. Show budgets/obligations and transaction search/filtering. Record which features are guest/offline versus authenticated/paid; do not describe unavailable features as demonstrated.
5. Demonstrate offline recording and recovery, then signed-in owner isolation with disposable accounts where cloud access is required. Existing automated tests are supporting evidence, not replacement signed-device results.
6. If presenting receipt capture, voice or NasrinAI, demonstrate the actual signed build and consent/review controls. Confirm provider availability and entitlements first. Do not send real financial records for demonstration.
7. Show legal/contact/credits and account deletion entry points. Do not exercise destructive deletion on a real populated customer account to produce review evidence.

The current Vercel production restriction and separate finance/encryption/erasure/device gates remain material. Review access and live backend operation must be restored before submission.

## Metadata draft — not an availability or clearance claim

Current working identity is MOVO; it is **not cleared for submission**. Leave the actual App Store title/copyright field pending the owner's naming and rights decision. Do not claim registered status, bank/Apple affiliation, exclusivity or “Apple approved.”

Description basis: a personal money organizer for manually recording accounts, income, expenses and transfers; viewing cash flow and account history; and reviewing budgets and obligations. Describe optional cloud/AI/receipt features and paid plans only when verified in the submitted build. Keep screenshots, prices, privacy labels and support links consistent with that build. Do not reuse another app's screenshots, keyword list, title or marketing copy.

No title change, bundle-ID change, legal-entity claim or copyright-owner claim is made by this packet. An internal bundle ID need not be duplicated merely to change the eventual public display name.

## Submission control and operation

`docs/app-store/submission-evidence.json` remains pending. Complete each item only with real supporting files under `docs/app-store/evidence/`; do not commit credentials or confidential legal documents. Use a redacted evidence summary/reference where needed.

- `npm run build:app-store`: technical artifact build/audit; does **not** mean ownership or Apple approval.
- `node scripts/check-app-store-rights.cjs --upload`: requires identity/rights/single-record/metadata evidence before signed TestFlight publishing. The signed workflow uses this gate.
- `npm run ios:submission-check`: additionally requires signed-device/live-backend evidence for public submission readiness. Apple remains the final reviewer.

No evidence status is set to reviewed merely because a test passed. Outstanding evidence makes the submission check fail intentionally. Source CI and unsigned builds can still establish technical correctness without fabricating legal approval.
