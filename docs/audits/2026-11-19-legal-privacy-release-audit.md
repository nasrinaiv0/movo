# MOVO legal and privacy release audit — 19 November 2026

**Decision: NO-GO for a claim of complete legal compliance or unrestricted international release.** This review corrects verified policy/code mismatches; it is not a legal opinion, registration certificate, security certification or proof of operational compliance. MOVO is a product of **NasrinAI**, as confirmed by the owner. No registered-company suffix or registration number is inferred.

## Scope and evidence

Reviewed main a3193b8361e32ea559d8350deaeb6a3e75041759, including merged voice/loading PR324, the in-app Terms/Privacy, public legal/security/deletion pages, setup acceptance, preferences merge, optional AI consent, storage/encryption code, account deletion, purchase acknowledgement and Friends QR layout. No customer records, credentials or audio were used. No production, store settings, signing keys or database records were changed in this audit.

## Corrected in this branch

| Status | Finding and evidence | Correction |
|---|---|---|
| 🟢 | Generic operator wording omitted the product relationship | Policies identify MOVO as a product of NasrinAI and show the existing DPO/privacy contact details |
| 🟢 | Legal.js and public pages said all browser storage lacked application encryption | Shared core describes encrypted read/chat/plan caches separately from unencrypted financial working copies, outbox, attachments, QR images and preferences; no end-to-end claim |
| 🟢 | Sticker images were described as never uploaded, but financeRepository saves signed-in custom stickers in preferences | Public and in-app disclosures acknowledge supported cloud sticker storage |
| 🟢 | Google token storage was described as transient/hash-only, but iapSecurity encrypts pending acknowledgement tokens | Discloses encrypted restricted pending tokens, success scrubbing and unresolved purchase-processing exceptions |
| 🟢 | Every deletion was described as a guaranteed 90-day Archive purge | Describes startup-dependent cleanup and different loan/receivable handling |
| 🟢 | Clear All implied account-wide deletion although deleteAllCloudData deletes only selected tables | Renamed Clear records, states actual supported scope before confirmation, removes false all-data success/error promises; Delete Account remains distinct |
| 🟢 | Delete Account disappeared with Cloud Sync off | Signed-in owners retain the deletion action independently of cloud mode |
| 🟢 | AI consent had no targeted withdrawal | Settings AI data sharing withdraws this device’s choice, stops capture, prevents future/transient retry transmissions; opt-in still requires chat review |
| 🟢 | Same-day legal changes reused the same acceptance marker; prefs merged revision and timestamp independently | Explicit revision 2026-11-19-r2, exact-current acceptance, paired preference merge and rejection of unknown future markers |
| 🟢 | Terms allowed parent-supervised minor use while the intended service is18+ | Consistent adult eligibility and affirmative setup self-declaration; no claim of independent age verification |
| 🟢 | Public deletion instructions pointed through Privacy & Data, which opens the policy | Correct path: Settings → Security & Privacy → Delete Account; public support route and subscription links remain |
| 🟢 | Friends camera frame could stretch wider than its capped height | Square centered scanner with centered video crop and symmetric overlay; profile QR also has automatic inline margins |

## Remaining release blockers and operator actions

| Priority | Gap | Required evidence/action |
|---|---|---|
| 🔴 | Main offline finance/workspace/outbox data is not all encrypted | Complete safe encryption/migration/device acceptance without losing unsynced records before advertising comprehensive at-rest protection. Disclosures alone do not fix this security gap. |
| 🔴 | Pending IAP acknowledgement jobs have no owner FK and terminal jobs can retry indefinitely | Implement bounded terminal-token scrubbing, account-deletion reconciliation and auditable retention/purge jobs, preserving valid purchase acknowledgements. Verify cancellation-through-expiry, refund and restore flows before paid launch. |
| 🔴 | Clear records is a partial cloud reset | Its new scope is explicit. Design an owner-scoped transactional comprehensive reset if the product will promise all-cloud erasure. Do not substitute this reset for Delete Account. Actual auth-user deletion cascades loans/receivables; deleting only financial accounts leaves those rows through SET NULL. |
| 🟡 | Operator registration, formal DPO appointment and public contact operations not evidenced | Confirm the legal person behind the NasrinAI brand and matching Apple/Google seller identity. Verify the DPO inbox and postal contact, applicable NPC registration, request log, incident ownership and a privacy impact assessment. No registration or inbox delivery is certified here. |
| 🟡 | Provider contracts, retention periods and international safeguards not inspected | Complete the processor inventory, DPAs, storage locations, backup/log retention schedule and transfer assessment. NasrinAI, OpenRouter/model providers, Vercel, Supabase, Apple/Google and external reference/icon services must match actual use. |
| 🟡 | Device-local AI withdrawal is not an account-wide consent ledger | The policy accurately limits the switch to this device. Assess a server-side revocation/consent-version record for stronger account-wide enforcement and handle broader privacy requests through the operator process. |
| 🟡 | Global language and territorial readiness is incomplete | Build reports 12 complete and 85 limited language catalogs. New critical legal core is explicitly English; obtain qualified legal translations/accessible notices for marketed languages and jurisdiction-specific review. Do not call97-language or176-country legal readiness complete. |
| 🟡 | Store disclosures and financial-feature classification need console evidence | Align Data Safety/App Privacy, permissions, age rating, deletion URL, financial-feature declaration, price/trial/cancellation/restore information and seller identity with the code. Tracking loans does not make MOVO a lender; classify actual features accurately, including rewards and market functionality. |
| 🟡 | Real purchase, authentication and native-device evidence | CI/emulators cannot prove store billing or real Google/email sign-in. Finish physical-device and Play/App Store test-account acceptance before promotion. |

## Regional review boundaries

- Philippines: maintain the information-controller/DPO identity, purposes/bases, recipients, rights, retention and request procedures; assess NPC registration by the applicable thresholds and risk conditions, not headcount alone.
- EEA: where GDPR applies, assess lawful bases, processor contracts, international-transfer safeguards, request deadlines and any representative obligations. A policy paragraph is not proof these duties are implemented.
- Other territories: approve availability only after applicable consumer, privacy, subscription and financial-feature requirements are reviewed. This audit does not certify all store territories.

## Official sources checked

- NPC right to be informed: https://privacy.gov.ph/the-right-to-be-informed/
- NPC data-subject rights: https://privacy.gov.ph/data-subject-rights/
- NPC DPO/privacy impact compliance guidance: https://privacy.gov.ph/pips-and-pics/5-pillars-of-compliance/
- NPC registration criteria: https://privacy.gov.ph/pips-and-pics/faqs/
- Apple App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Apple deletion guidance: https://developer.apple.com/go/?id=ar-ad-support
- Google Play User Data: https://support.google.com/googleplay/android-developer/answer/10144311
- Google financial declaration: https://support.google.com/googleplay/android-developer/answer/13849271
- Google financial services: https://support.google.com/googleplay/android-developer/answer/9876821
- GDPR official text, particularly Articles12–14,17,20,22,27 and44–49: https://eur-lex.europa.eu/eli/reg/2016/679/

## Validation and rollout

Focused initial legal/consent verification passed 61 tests. The first full run found obsolete assertions that required incorrect 90-day/unencrypted-storage wording and a clear-confirmation test selecting the background settings row instead of the dialog button. Those assertions were corrected to verify truthful disclosures and the actual typed-DELETE confirmation. Final full regression/build, browser geometry and exact-head CI results are recorded in PR progress before completion.

Recommend a staged release after the red blockers and operator checks have evidence. Advantage: fewer misleading disclosures and safer privacy controls. Trade-off: broader rollout waits for retention, encryption, store and regional acceptance. Keep production/store uploads untouched during this work.
