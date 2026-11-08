# MOVO Philippine reward presets — collapsible categories and accounting-safe estimates

Date: 2026-11-08
Scope: new stacked PR based on Wallet loyalty cards PR #239, not directly on main.
Source: user's 13-page *Philippine Loyalty Programs, Cashback & Rewards Master Directory*. This is a user-provided reference, not independently verified active provider pricing or a financial guarantee.

## Changes
- Compact 8-category directory in Cashback with searchable preset list, type filters (All / Points / Cashback / Miles / Offers), independent category expand/collapse and Expand all/Collapse all.
- 65 reference programs across Retail, Grocery/Memberships, Health/Beauty, Fuel, Dining/Coffee/Cinema, Credit Card Cashback, Airline Miles and Digital Wallets.
- Presets include earning ratio, provider terms/redemption notes, source PDF page, and only mathematically representable default parameters. Special promotions, point vouchers, miles and fuel-litre rates are shown as manual/reference where transaction data cannot prove entitlement.
- Applying a non-cash preset creates or reuses a Wallet loyalty card (initial recorded points = zero, never invented). It adds an editable rule under Cashback > Automatic membership points, initially disabled with a separate verified-terms toggle.
- Applying cashback requires selection of an existing bank/credit card/e-wallet and attaches editable source rate, category, minimum receipt, full receipt increment, monthly cap, and merchant matching. Existing user overrides are retained, not forcibly reset. All source presets start disabled until reviewed.
- Two high-level collapsible settings groups (cashback rules and loyalty rules) plus independently collapsible account/card editors; minimal padding and no visible button border, iPhone-width horizontal filter chips.
- Existing account balance math, refunds, transaction posting and native purchase privileges are not modified.

## Accounting & safety decisions
- No automated monetary posting: cashback remains Estimated; manual cashback entries are user-recorded and are not evidence of a real bank credit. Reward points are not money, cannot fund payments and do not add to net worth.
- Only eligible expense transactions count; no income/transfer or archived account credits; deleting/editing a transaction reverses/recomputes estimates because calculations derive from current records.
- Standard point blocks use floor(amount / spend threshold) × points per block. Example: SMAC suggested 1 pt/₱200 gives 2 pts for ₱499.99, not 2.49995. For conditional rates, verified flag, merchant name/category matching and payment-account selection are required.
- Credit-card estimates honor explicit category/merchant scope, minimum receipts, ₱1,000 whole-receipt increments where specified, and chronological allocation under a per-account monthly cap. Unparsable limits fail closed instead of unlimited estimates.
- Conditional HSBC monthly threshold, in-store-only Security Bank cashback, tier-based UnionBank and Maya Landers, promotional BDO, Chinabank Velvet and per-litre Shell/Caltex/Cleanfuel cannot be calculated reliably from basic transaction records. These presets remain manual-only.
- The PDF describes varied and qualified rates. No cross-merchant stacking assumption is calculated. No claims of live merchant affiliation, verified POS barcode formats, automatic redemption or actual entitlement.
- No database migration, no merchant API, no new secrets. Preference merging preserves different account-scoped cashback rules across local/cloud contexts.

## Evidence and tests
- Vercel Sandbox movo-ph-rewards-presets-20261108, built from PR #239 head 1d1d626b8757859f5d8f87ccce5f92e909c6187c.
- Target QA: Jest component interaction, catalog validity, accounting thresholds and caps, invalid input fail-closed, locale check, TypeScript and optimized bundle.
- Mobile browser at 390×844: eight categories, filtered cashback rows, Wallet card creation, applying rate to selected credit card, persisted overrides. Native iOS/Android remain separate release gates.
- No production deployment, database or paid branch changed.

## Remaining before commercial launch
1. Verify merchant terms with official providers and date each program's effective rate; the supplied reference is not a live feed.
2. Add eligible-merchant MCC/channel verification and monthly qualifying spend logic before automatic precise tiered cashback. Otherwise leave those promotions manual.
3. Verify redemption minimums, points expiry, reversals and redeemed points with issuers; do not convert estimates into real balances.
4. Test local/cloud conflict merges, currency cases, unlink/relink, timezone month boundaries, refunds and multiple cards with providers.
5. Review this stacked PR with PR #239 and security PR #227 only after CI, native and security gates pass.

## Rollback
Remove the Cashback directory and new preset library/rules within this PR. Existing financial and membership records remain unchanged; additive preference keys are not removed.

## Confirmed sandbox results
- 2026-11-08: Full build 804/804 tests across 144 suites, TypeScript check, and optimized production compilation passed before packaging.
- Vercel Sandbox mobile Chromium (390×844): eight collapsed category headers; retail SMAC preset creates one Wallet card with zero recorded points; EastWest Visa Platinum applied to selected card with 8.88% reference rate and 1,250 monthly cap, auto disabled and unverified.
- Mobile follow-up: default expanded SMAC editor allows user to change threshold 200 to 250; applying the same preset again preserves the 250 override and keeps one Wallet card.
- Generated 11-language dictionaries are reproducible from the canonical catalog. npm pretest/prestart and prebuild run i18n generation; generated locale JSON is not part of this stacked feature diff to avoid redundant multi-megabyte changes.

## Consolidation QA — 2026-11-08
- Retargeted from merged Wallet PR #239 onto main after Import & Export PR #240 and engineering-register restoration PR #243, retaining the whole code tree without overwriting newer features.
- Vercel Sandbox exact integrated code tree `4693641820b02210999e03ace2d6269838f4b603`: 820/820 tests across 146 suites, TypeScript, optimized build succeeded.
- GitHub implementation/documentation gate repaired by a lease-protected branch squash onto main; required same-commit PR register and dated engineering update preserved. GitHub Phase 1 CI passed on consolidated implementation commit `583e4fde788b424164d48c4f213f9bd30fc04ac8`.
- Chromium 390px navigation from onboarding through Menu > Cashback displayed eight collapsible groups and 65 total reference entries (7+8+7+7+10+11+8+7) with editable/off-by-default estimates; no page JavaScript exceptions.
- Still DRAFT pending signed-device/browser QA, provider-term review and cloud/local override merge verification. Financial rewards remain estimates, not money or confirmed points.
