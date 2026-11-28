# MOVO dual-store compliance P0–P4 — staging candidate

Baseline: a9688176401aef0fbb3495241f4e7201b0e86c57. The canonical app ID remains com.nasrinai.movo. HOLD: no store submission or independent approval. No production changes. The legal revision date is a proposed staging date, to be confirmed or updated at actual approved publication.

## P0 — safety and legal
Correct canonical Terms sticker sync and Friends chat/card/avatar disclosures. Require counsel/owner review, actual locale reconciliation and renewed legal acceptance. Verify existing message report capability (currently flag-gated), block/report scope, harmful-content prevention including nonconsensual intimate imagery, moderation queue and response operations. Implement in-app AI response reporting and restricted-content prevention where absent; verify explicit third-party consent, provider retention, voice/receipt processing and revocation. No flag activation. Prove complete disposable-account deletion, including Friends, receipts, cloud/local, billing exceptions, retention, retries and backup lifecycle. No customer data.

Rights: MOVO name conflict remains pending. Confirm actual operator and trademark/asset/license evidence, single record per platform, exact bundled SDK/fonts/media notices. iOS original-only asset policy is a mitigation, not clearance; Android rights remain open. Verify commercial display/redistribution/caching/territory permissions for CoinBeacon, Binance market data fallback, Twelve Data, Frankfurter and ExchangeRate-API. If unlicensed, remove or disable affected features in reviewed candidate. No false endorsement or rights claim.

## P1 — metadata and declarations
metadata.json is draft English-US copy. Finance category, 18+ Terms, Apple age override, Google 18+ target audience separately from IARC calculated rating. Disclose messaging/UGC/AI accurately. Apple new Shared Location and Dating/Relationships descriptors due Jan 12 2027; verify rather than assuming. Confirm legal developer/copyright, actual store record, version/build, category, localization, support URLs, reviewer contacts and demo accounts, accessibility, export/encryption, EU trader status. Never commit credentials. Prepare actual signed-build phone/tablet/watch screenshots, icons, Play feature graphic, and device-specific dimensions. No prototype or unavailable-feature marketing. Confirm metadata with actual signed artifact.

Google financial declaration: other financial services (recordkeeping) candidate yes; rewards if enabled; manual portfolios and AI outputs require assessment of portfolio management/advice. Lending, banking, money movement, payments, credit facilitation, custody, trading, insurance and similar regulated services are proposed no only if implementation confirms no provision. Complete actual console questionnaire.

Privacy/Data Safety: map account email/name/ID; finances; purchases/referral/device integrity; Friends and AI messages/cards; avatars, receipts and artwork; voice; diagnostics/app interactions. Distinguish local-only vs sent, linked vs not, collection/sharing, mandatory/optional, purposes, tracking, retention and deletion by each store's definitions. Review Supabase/auth, Apple/Google billing and device integrity, AI and market providers, all SDKs, actual network traces and final manifests. Do not declare no data collected or no sharing without verification. Confirm privacy URL and deletion URL accessibility.

## P2 — signed acceptance
Physical iPhone, iPad, Android phone/tablet/foldable, Apple Watch and Wear OS pairing/handoff; signed archives, correct signing identities, build/version code, 64-bit/16 KB binary validation including Wear, final merged manifest, R8 and accessibility. Current Apple Xcode/SDK 26+; SDK 27 April 2027. Android target 36, Wear at least 35. Verify purchase/restore, account binding, duplicate callbacks, pending/deferred, grace, expiry, refund, revoke, renewal, cross-device, trial/price/terms, correct subscription product IDs, reward exclusions, cancellation and account deletion. No actual store purchases or signing credentials used by this candidate.

## P3 — territories
All territories remain HOLD until actual per-country review. Philippines DPA/NPC/BSP/SEC; EU GDPR/DSA trader and AI Act applicability; UK GDPR/FCA; US state privacy and subscriptions; Canada federal/provincial privacy; Australia privacy/consumer; Brazil LGPD; Japan APPI; Korea PIPA/subscription consent; Singapore PDPA; India DPDP and financial scope; mainland China AI/security and local distribution; other territories individually. Review legal basis, data transfers, consumer rights, financial scope, sanctions/export, local age, language/tax and availability. No blanket worldwide compliance assertion.

## P4 — gates and independent review
Run node --test scripts/check-store-compliance.test.cjs and node scripts/check-store-compliance.cjs --lint. Run --fingerprint on clean committed checkout. Register the actual fingerprint in evidence.json only when obtaining genuine human reviews; review records require nonempty redacted evidence and matching SHA-256. All 18 items pending. The upload stage is pre-upload configuration and legal review; submission adds independent per-platform signed and store purchase lifecycle evidence. Existing Apple rights gate remains. The gate verifies structure and integrity, not truth or store approval; manual console actions still need owner authorization. Existing release workflows remain protected/manual/tag-triggered; do not dispatch or tag. No new feature enablement.

Independent Claude/Codex reviewer: inspect exact source diff and source fingerprint, canonical legal regeneration, localization, eligibility re-ack, Friends/AI safety and data disclosure, account erasure, provider contracts, release scripts and all original CI and financial regressions. Review actual signed screenshots, accessible responsive UI, compact padding/typography, reduced motion and privacy controls, without duplicate financial/auth architecture. Report unresolved findings, document before changes, do not self-approve or merge.

Policy references checked 2026-11-28:
- https://developer.apple.com/app-store/review/guidelines/
- https://developer.apple.com/app-store/app-privacy-details/
- https://developer.apple.com/news/upcoming-requirements/
- https://developer.apple.com/help/app-store-connect/release-notes/
- https://support.google.com/googleplay/android-developer/answer/13849271
- https://support.google.com/googleplay/android-developer/answer/10144311
- https://support.google.com/googleplay/android-developer/answer/11926878
- https://support.google.com/googleplay/android-developer/answer/17492799
Recheck live policy and actual console questions before submission.

## Continuation — moderation candidate
See [provider/privacy review](PROVIDER_AND_PRIVACY_REVIEW.md) and [inactive database design](AI_REPORT_DATABASE_DRAFT.sql). AI report API/UI is gated by MOVO_AI_REPORTS_ENABLED; missing RPC fails closed. No migration or moderation operations activation. Narrow text screening is not complete moderation; require multilingual and adversarial validation, human review queue, actual signed UI and privacy/retention acceptance. Do not claim approval.
