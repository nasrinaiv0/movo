# MOVO - Google Play and App Store declarations (draft, NOT submitted)

**Prepared:** November 12, 2026. **Source:** `nasrinaiv0/movo` at `2b9a1cf7720043c48c20d37d6f64e45e9f5e272a`.
**Status:** Preliminary, evidence-based answers to review in the official consoles. **Not legally cleared, not submitted, not automatically applied.**

## Identity and links to validate
- App: **MOVO - Money Organizer & Visual Outflow**; Android package `com.nasrinai.movo` (verified Android/Capacitor configuration).
- Proposed Privacy Policy URL: https://movo.nasrinai.com/privacy
- Proposed Terms URL: https://movo.nasrinai.com/terms
- Proposed Account Deletion URL: https://movo.nasrinai.com/account-deletion.html
- Support: support@nasrinai.com
- **No live URL accessibility claim:** browser fetches did not independently verify these routes on November 12. Check in an incognito mobile browser and on Google Play review network before submitting.
- **Operator identity blocker:** published Privacy Policy identifies the 'MOVO service team'; confirm the accurate legal operator/controller, service address if legally required, DPO/privacy contact, vendor list, and any region-specific commercial disclosures before publication. Do not invent or silently publish a private residence.
- **Age blocker:** the Terms mention use with a parent/guardian for people who cannot legally accept terms; reconcile with the intended 18+ eligibility and in-app onboarding, with counsel. Do not silently change legal text.
- **Data retention:** verify 90-day archive claim, erasure/backups/processing-provider schedule, and partial failure behavior. The current server `api/account/delete.js` has multi-step erasure; a separate remediation is open. Avoid certifying deletion completeness until tested.

## Google Play Console - Financial features declaration
Route: **Policy and programs > App content > Financial features**.
- MOVO is a budgeting, bookkeeping, manual account/card/loan/subscription recordkeeping, reminder and optional cloud-sync app. It is **not** a bank, lending institution, brokerage, cryptocurrency exchange or payment transfer service solely because it depicts accounts/cards/stocks/crypto.
- **Strong initial selection:** `Support services > Other` for personal finance tracking / expense and budget management. Do NOT select 'My app doesn't provide any financial features' without Google Play review of the actual live features.
- **Conditionally select** `Financial advice` if NasrinAI gives personalized actionable financial recommendations (a disclaimer does not change actual behavior). Audit prompts and marketed product functionality.
- **Conditionally select** `Stock trading and portfolio management` if MOVO actually lets users manage investment portfolios, even if it cannot execute trades; pure static quote watchlists are a different question.
- **Conditionally select** rewards/points if MOVO issues or administers rewards beyond bookkeeping of third-party loyalty balances. Do not select lender, loan facilitator, money transfers, mobile payments/digital wallets, crypto wallet/exchange solely from labels or tracking UI.
- If Google requests licensing evidence, explain actual non-custodial recordkeeping and present a counsel-reviewed activity description; do not invent a regulated financial-services license.
- Product description draft: 'MOVO is a personal finance organizer for manually recording and reviewing expenses, income, budgets, card usage, bills, subscriptions, loans, savings goals and market watchlists. MOVO does not connect to bank accounts, hold funds, lend money, execute trades or transfer payments. Optional cloud sync and AI assistance are subject to account and consent settings.'

## Google Play Console - App content / Data safety
**These are candidate responses; inspect shipped AAB, SDK transitive dependencies, network traces and Supabase/vendor processing before certifying.**
- **Data collected when cloud features are used:** account email, optional display name, account identifiers, manually entered **other financial information** (expense amounts, bank labels, account/card details users provide, debts, bills and balances), purchase/entitlement records and optional chat inputs.
- **Potential additional categories requiring validation:** uploaded receipts/images and financial QR files (stored in private Supabase buckets when cloud features active), transcripts/audio sent for optional transcription, app error/technical metadata, subscription purchase identifiers, and any optional analytics/diagnostic provider.
- **Local-only mode:** data that remains on-device is ordinarily not off-device 'collection'; the entire app's declaration must nonetheless include cloud/optional flows that exist. Do not claim no data is collected.
- **Data shared:** confirm whether use of Supabase, Vercel, Google, NasrinAI and upstream LLM providers is considered processing by service providers or 'sharing' under Play definitions; determine contract/service-provider status and any independent purposes. Don't claim 'not shared' without that review.
- **Encryption in transit:** app design uses HTTPS; verify all endpoints and third-party SDK calls before selecting Yes.
- **Deletion:** provide in-app and external deletion pathway and disclose any lawfully retained records in Privacy Policy. Verify a real deletion request and support-mailbox response end to end, including private attachments.
- **Ads:** no advertising SDK/AD_ID permission appears in inspected `package.json` or `AndroidManifest.xml`. Proposed 'No ads' **subject to checking final merged Android manifest, binaries and remotely loaded content**. Subscriptions are not themselves advertising.
- **Financial info:** never omit the financial-data category simply because users manually entered data or choose cloud sync.
- **Review access:** provide working non-owner test accounts and setup steps using *synthetic* data, never customer credentials.

## Google Play Console - other App content declarations
- Privacy Policy: validated exact live HTTPS URL.
- Target audience: review intended 18+ positioning, actual app age gate, content ratings and any restrictions. Do not claim an age gate exists until tested.
- App access/restricted features: include sign-in, paywall, test-account and reviewer steps; keep test identities separate from production customers.
- Permissions: verify merged manifest, `android.permission.INTERNET`, `com.android.vending.BILLING`, media/camera usage via native/system pickers; do not claim absence of a permission without a final AAB inspection.
- Content rating; ads declaration; Data safety; account deletion; financial services; store product prices/territories/taxes/trials; subscription auto-renewal/restore/refund wording must be reconciled.
- No digital goods checkout bypass: use Play Billing for in-app digital subscriptions unless a platform/jurisdiction-specific exception is explicitly authorized.

## Apple App Store Connect - privacy and review
- App Privacy > Privacy Policy URL: verify `https://movo.nasrinai.com/privacy` responds publicly.
- Optional User Privacy Choices URL: `https://movo.nasrinai.com/account-deletion.html` after live verification.
- **Proposed linked-to-you data categories (conditional on cloud-enabled/feature use):** Contact Info (Email Address, Name when supplied); Identifiers (User ID); Financial Info (Other Financial Info, possibly Payment Info if actual synced card/bank numbers); Purchases (purchase history/subscription); User Content (chat, optional uploaded receipts, voice only if sent off-device); Diagnostics as found in SDK/network audit. Classify per-purpose and optionality only after verification.
- Do not select 'Data Not Collected'; do not mark 'Data Used to Track You' without actual ad cross-app tracking; inspect every SDK and vendor.
- Apple account creation requires in-app account deletion initiation and intelligible subscription cancellation/recovery messaging.
- App Review Guideline 4.8: with Google primary login, verify an equivalent privacy-preserving login option; email OTP does not automatically qualify for private-email signup. Apple Sign In is reported disabled; obtain a compliant alternative before iOS review or document a valid exception.
- Test signed TestFlight build, StoreKit/IAP sandbox in an isolated nonproduction backend, restore purchases, cancellation/expiry, account deletion, accessibility and privacy permissions on actual iPhones.
- Before paid subscriptions, present full billing period, actual localized price, trial/renewal terms, access and manage/restore paths. Country-specific external billing rules differ; do not assume a global external checkout entitlement.

## Philippines and other regions
- Philippines Data Privacy Act RA 10173: verify lawful purposes, proportional collection, required notices, retention limits, individual rights, safeguards and cross-border processor agreements. Perform and approve a Privacy Impact Assessment.
- Owner/counsel review actual DTI/SEC/BIR/consumer/tax, NPC DPO/registration applicability and any country-specific financial-product obligations based on *actual activities*, not marketing labels. No licensing or registration outcome can be asserted from repository code.
- Bank, card, e-wallet and subscription-service names/icons require documented permitted-use/trademark review; a Google S2 favicon result or owner approval does not grant all third-party logo rights. Prefer local generic icon while rights unclear.

## Exact operator-only console actions (not performed)
1. Open https://play.google.com/console/ > MOVO > Policy and programs > App content. Save accurate Financial features, Privacy Policy, Data safety, account deletion, Ads, target audience, content rating and app access declarations; inspect Policy status.
2. Open https://appstoreconnect.apple.com/ > MOVO > App Privacy and App Information. Add the validated Privacy Policy URL, completed type-by-type labels, reviewer access details and accurate subscription metadata. Do not submit iOS before signed/TestFlight, login and StoreKit gates.
3. Record console screenshots/date/owner, official app package/bundle and tested binary hash; compare to privacy/terms wording. Record independent legal/technical reviewer approval. Do not label complete solely because drafts exist.
4. Publicly publish amended legal notices only after checking operator identity, applicable notice, data flow, legal version bump/re-consent and the matching deployed source SHA.

## Sources (official)
- https://support.google.com/googleplay/android-developer/answer/13849271
- https://support.google.com/googleplay/android-developer/answer/10787469
- https://support.google.com/googleplay/android-developer/answer/13327111
- https://support.google.com/googleplay/android-developer/answer/9859455
- https://developer.apple.com/app-store/review/guidelines/
- https://developer.apple.com/app-store/app-privacy-details/
- https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion/
- https://privacy.gov.ph/data-privacy-act/

## Current status and tradeoffs
**DRAFT / MANUAL CONSOLE REVIEW PENDING / NO PRODUCTION RELEASE APPROVAL.**
Advantages: accurate scope-specific classification and fewer false compliance statements. Disadvantages: independent legal sign-off, console verification, device testing and any necessary code fixes still require owner action.
