# MOVO Google Play Console submission worksheet — NOT SUBMITTED
Updated 12 November 2026. No Play Console API access has been verified.
Release gate: BLOCKED until exact store console fields are submitted and independently checked.

## Financial features (Play Console > Policy and programs > App content > Financial features)

**Select: Other** for manual finance tracking, budgets, recording bank/e-wallet balances and expense/loan tracking. MOVO is not itself a bank or payments institution. **Review and disclose**:
- Rewards, points, frequent-flyer miles and other incentives — MOVO referral reward points and loyalty cards exist; determine whether features satisfy this declaration.
- Financial advice — NasrinAI personalized recommendations and money planning may qualify; assess actual enabled prompts/output and jurisdictional licensing.
- Stock trading and portfolio management — MOVO displays stocks and a watchlist; do not represent it as registered stock trading if execution or managed portfolios aren't provided. Confirm whether portfolio tracking qualifies.
- Do not select direct personal lending, loan facilitation, banking, mobile payments/transfers, cryptocurrency exchange/custody, unless those are truly shipped functions.

**Never select 'My app does not provide financial features'** for the current finance tracking app. Product/feature changes require an updated declaration. Any extra lender information/licensing requirements apply only if actual loan facilitation/lending exists.

Official Play Financial features help: https://support.google.com/googleplay/android-developer/answer/13849271 .

## Data safety — draft data-flow inventory for review

Google requires a single complete disclosure across every live version and location, including SDKs and WebViews. The fields below are candidates for **collected** on cloud/voice/store use; the exact form must be verified against network traces, processor contracts, production configs and signed AAB before submission. Some fields are optional depending on mode.

| Play data category | MOVO processing candidate | Optional/required review | Disclosure blocker |
| --- | --- | --- | --- |
| Personal info > Email address | OTP or OAuth sign-in, account management | Optional if true local-only mode works | Verify Auth sends and hosted retention |
| Personal info > Name / User IDs | Profile, member/user IDs | Optional vs required per flow | Provider user/profile metadata |
| Financial info > Other financial info | Budget, balances, debt, goals, planning data | Cloud features optional | Data flows to Supabase; AI sharing optional |
| Financial info > Purchase history | Expenses and manually imported transactions, plus store subscription metadata | Cloud feature optional | Does not equal full credit card payment credentials |
| Financial info > User payment info | Manually recorded card/account names or partial numbers | Conditional | Clarify scope of card identifiers |
| Messages > Other in-app messages | NasrinAI chat text | Optional | AI provider/processors and retention |
| Audio files > Voice/sound recordings | Voice transcription clips | Optional | Ephemeral processing still may be collected |
| Photos / files | Optional receipts, QR uploads and generated files | Optional | Storage processor and local-only paths |
| App activity > App interactions | Product instrumentation only if enabled | Verify | SDK inventory and debug logging |
| App info and performance > Crash logs / diagnostics | Troubleshooting | Verify | Error logging data minimization |
| Device or other IDs | Device-related identifiers for security, fraud and sync | Verify | Native APIs, notification, referrals, analytics |
| Location | IP-derived approximate location or explicit profile fields | Verify | Do not claim precise location absent evidence |

Review per row: collection, sharing, required/optional, account management/functionality/security/analytics purpose, encryption in transit, deletion requests, SDK subprocessors and processing region. A store payment processor collecting full payment credentials directly is different from MOVO processing billing entitlement metadata.

Public Privacy Policy: https://movo.nasrinai.com/privacy
Public deletion: https://movo.nasrinai.com/account-deletion.html
DPO: Nasrin Abubakar <dpo@nasrinai.com>
Privacy correspondence: 142 Pag-asa Village, Matina Aplaya, Davao City, Davao del Sur, 8000, Philippines.

**Do not check 'data encrypted at rest by app' as completed.** An additive native AES-GCM vault is staged, not authoritative. The legacy browser storage and hybrid journal are still present. Also confirm in-transit encryption based on all data flows, not only MOVO's origin.

Official Play Data safety guidance: https://support.google.com/googleplay/android-developer/answer/10787469 .

## Distribution / commerce

- Confirm actual Play Console Production > Countries/regions selections, not Google developer registration locations.
- Review every target's ability to buy subscriptions (which may differ from free install), taxes, local prices, offer/base-plan compatibility and cancellation/refunds.
- Brazil: review Google Payments beneficial-owner/executive/address documentation.
- Japan: paid/IAP operator identity, telephone and address disclosure; confirm Play payments profile.
- Korean local developer fields are specific to developers based in Korea, not automatically a Philippines operator.
- India: no SEBI-verified claim unless appropriately registered; review actual stock functions and declarations.
- EU: GDPR controller identity/rep, DSA trader status and EU non-discrimination/geo-blocking requirements.
- Any country not individually assessed remains BLOCKED; counsel and operator approval required.

https://support.google.com/googleplay/android-developer/answer/6223646
https://support.google.com/googleplay/android-developer/answer/6334373
https://support.google.com/googleplay/android-developer/answer/9306917

Submitting documents into Git does not submit Google Play forms. You must submit the final values in Play Console; provider review, identity/business details and verified local sales rules are still outstanding.
