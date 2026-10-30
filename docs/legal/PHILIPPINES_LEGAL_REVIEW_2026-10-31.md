# MOVO Philippine Legal Review — 2026-10-31

## Scope

Repository: `nasrinaiv0/movo`  
Branch: `legal/philippines-privacy-consumer-review-2026-10-31`  
Status: **Draft legal-content changes; not legal sign-off or production clearance.**

## Changes made in this branch

- Added the user-provided privacy contact details: Nasrin Abubakar, designated as DPO/privacy contact; +63 947 387 5093; support@nasrinai.com; 142 Pag-asa Village, Matina Aplaya, Davao City, Philippines. Confirm that the designation and contact details are accurate and suitable for publication.
- Added third-party brand/logo terms: marks remain the property of their owners; display is for identification/reference only and does not imply partnership, sponsorship, endorsement, affiliation, or advertising; rights holders can request review/removal at any time; MOVO will review promptly and take appropriate action. This disclaimer does not itself authorize use of any logo; confirm permissions or a defensible lawful basis for each use.
- Clarified MOVO is a financial tracker, not a bank, payment processor, or bank-connected service, and that balances are based on user-entered records rather than verified institution balances.
- Added adults-18+ default eligibility language, with under-18 use only where legally permitted and with required parent/guardian consent and supervision; actual age gating still needs verification.
- Expanded no-sale/no-independent-marketing wording and cloud deletion expectations, while explicitly warning that actual cloud deletion, backup retention, and controls must be tested before making a guarantee.

- Updated Terms of Service and Privacy Policy effective dates to October 31, 2026.
- Strengthened the Terms' Philippine-law framing by naming Republic Act No. 10173 (Data Privacy Act of 2012), RA 7394 (Consumer Act of the Philippines), and RA 8792 (Electronic Commerce Act of 2000), where applicable.
- Clarified that mandatory statutory and consumer rights cannot be excluded or waived by the Terms.
- Strengthened the Privacy Policy's controller-identity disclosure and kept the publication-readiness warning because the operator's legal identity and service address are not verified.
- Added a general explanation that processing requires an applicable lawful basis and must follow transparency, legitimate purpose, proportionality, data-quality, and retention principles; it explicitly says the statement is not a substitute for an activity-by-activity assessment.
- Expanded the description of Philippine data-subject rights and the right to contact the National Privacy Commission (NPC), subject to legal conditions and exceptions.
- Clarified that the actual retention/deletion schedule is not verified and must be established and published before the policy is final.
- Added regression assertions for the updated dates, Philippine consumer-law disclosure, NPC reference, and retention-schedule warning.

## Legal reference points checked

- RA 10173 — Data Privacy Act of 2012, National Privacy Commission: https://privacy.gov.ph/data-privacy-act/
- Implementing Rules and Regulations of RA 10173, National Privacy Commission: https://privacy.gov.ph/implementing-rules-regulations-data-privacy-act-2012/
- RA 7394 — Consumer Act of the Philippines, Senate Legislative Reference Bureau: https://issuances-library.senate.gov.ph/legislative%2Bissuances/Republic%20Act%20No.%207394
- RA 8792 — Electronic Commerce Act, included in DTI's e-commerce regulatory framework: https://ecommerce.dti.gov.ph/ecommerce-philippines-2022/regulatory-framework/

## Required before legal publication or launch with real financial data

These are not safe to invent in policy copy. Obtain owner confirmation and/or qualified Philippine counsel review:

1. Confirm whether Nasrin Abubakar is formally appointed as DPO or is the privacy contact, verify the published telephone/address, and identify the legal person/entity operating MOVO and any additional registration details required by law.
2. An accurate inventory of data categories, purposes, lawful bases, recipients/processors, and cross-border processing locations/configuration.
3. A retention matrix by record type (account/auth data, finance records, chat/context, logs, support requests, backups), including deletion triggers, timing, and legal exceptions. Verify Settings-based deletion across database rows, object storage, logs, backups, and provider systems; do not promise immediate complete erasure until confirmed.
4. Confirmation of real cloud deletion behavior, backup/log retention, account deletion workflow, and the user request handling SLA/process.
5. Confirmation that the optional NasrinAI consent is recorded, revocable, not bundled with general Terms acceptance, and actually enforces the documented context boundary in the deployed integration.
6. Review of any additional laws or rules applicable to the actual business model, audience, marketing, subscriptions/payments, and distribution channel.
7. Complete Apple App Store privacy disclosures, privacy nutrition labels, permissions/data use, account deletion requirements (if account creation is supported), and any applicable standard EULA/terms requirements.
8. Audit every bank, e-wallet, merchant, payment-network, and company logo currently bundled or rendered. Prefer text names or licensed/official brand assets with permitted use. Do not assume that a non-affiliation disclaimer cures copyright, trademark, trade-dress, or brand-guideline infringement. Maintain a rights-holder takedown contact and promptly review substantiated requests.

## Evidence and limits

- This branch changes legal copy and tests only. It does not alter financial-data processing, authentication, Supabase schema/RLS, deletion implementation, provider routing, or production settings.
- Passing tests/build would validate the assertions and build mechanics only; it would not prove actual data flows or legal compliance.
- The existing warning must remain until the missing operator details and retention/provider facts are verified.
- Do not merge to production or describe MOVO as legally compliant solely because this PR is merged. Have qualified Philippine counsel review the final version.
