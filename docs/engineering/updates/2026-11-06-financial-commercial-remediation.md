# MOVO — Production financial and commercial blocker remediation

Date: November 6, 2026 (Asia/Manila)
Base: main 703f31f7921b600f445f4ff90f0f1c6fd2182ee3
Branch: fix/release-accounting-security-20261106

## Code changes
- Finance repository now reads all owner-visible transaction pages instead of silently truncating at 1,000. Stable occurred_at/id ordering and fail-closed page errors.
- Accounting postings and accounting activities are paginated instead of fixed caps of 5,000, 2,000 or 4,000 rows. No ledger writes or data backfills occurred.
- Settled balances exclude pending records. Available funds reserve pending outgoing expenses/transfers without counting pending credits as collected money.
- Missing or invalid cross-currency rate pairs return unavailable instead of silently assuming 1:1. Non-finite financial amounts render as unavailable, not 0.00.
- Public static HTML Terms and Privacy Policy pages replicate the published in-app content, with Vercel /terms and /privacy rewrites and automated tests. Existing /account-deletion.html remains. Removed global noindex to make legal documents discoverable.
- CI now uses npm ci against the committed lockfile and rejects implementation commits lacking both the central PR progress file and a dated engineering change note. PR template updated.

## Database
- Applied the entitlement-only portion of the repository store migration to live MOVO Supabase under the tracked name movo_store_entitlements_verified.
- Verified table exists, RLS enabled, authenticated SELECT allowed, authenticated INSERT denied, anon SELECT denied, and 0 entitlements at verification.
- Original source migration also contains two automation RPC search_path alterations. Those alterations were not applied; requires independent regression review. Reconcile database migration history with repository before replaying the original migration.
- Production purchases remain disabled. No Apple/Google credentials configured in this change, no customer financial data modified.

## Test evidence and status
- Vercel Sandbox: movo-release-remediation-20261106 cloned from exact base commit.
- Baseline after first changes: 619 passed tests across 110 suites; TypeScript typecheck passed, production build passed, npm audit --omit=dev returned zero vulnerabilities. Final PR head and preview must be retested.
- Isolated tests cover 1,001, 10,000, 10,001 ledger entries; cents; transfers; reversals; foreign currencies; failed pages; pending holds; public HTML legal pages and route configuration.
- Commercial and accounting release decision: NOT CLEARED.

## Residual risks and next actions
- Offset pagination can be inconsistent if records are inserted or removed during a multi-page fetch. Implement snapshot-consistent/server-side owner-scoped balance projections before calling financial balances independently audited.
- Historical booked exchange rates differ from current/reference rates. Per-posting immutable FX rates and valuation/reporting policies require separate accounting review.
- Several UI components still consume settled balance; available-vs-settled labelling needs authenticated interactive QA.
- Twelve public authenticated-callable SECURITY DEFINER RPCs remain for authorization review; do not blanket revoke financial functions without compatibility testing.
- Supabase Auth leaked-password advisor remains; passwordless OAuth/OTP is currently configured. Revisit if password authentication is enabled.
- No real store-sandbox renewals, restores, refunds, notifications, or signed native-device purchase tests were performed. Owner must configure App Store Connect/Google Play, secrets, and sign builds.
- Formal legal operator approval, counsel review, external privacy URLs, safety/privacy disclosures, and accessibility testing remain.
- Rollback: revert this PR and restore prior Vercel deployment. Keep store-billing disabled. Do not remove the additive entitlement table if any verified store records are subsequently present.


## Expanded Terms and Privacy disclosures (same remediation PR)
- Added canonical English legal sections shared between the in-app Legal screen and directly accessible static policy pages. Effective date November 6, 2026. The supplementary text covers manual and automated ledger limitations, payment settlement, investment/FX and AI estimates, store subscription cancellation/restoration/refunds, security and user responsibilities.
- Privacy supplements cover processing purposes and lawful grounds; providers Vercel, Supabase, NasrinAI, Apple/Google, FX/market data and remote favicons; optional camera/voice, local/cloud storage, supported 90-day Archive, deletion/retention exceptions, privacy rights, cross-border processing, AI inferences and minors.
- scripts/update-legal-pages.cjs generates/checks the standalone pages from src/lib/legalSupplement.json; src/screens/Legal.js displays the same text in-app. A regression test checks for divergence.
- English policy supplements require reviewed legal translations for all supported locales. Original localized base policy text is preserved. Do not represent unreviewed machine translations as legally certified text.
- Legal review still required: legal operator full name and address, privacy contact, processor contracts and cross-border safeguards, specific processing/retention schedules, statutory consumer rights, refund and store rules, and notice of material changes. Not a certification.
- Official references: https://privacy.gov.ph/data-privacy-act-/ ; https://privacy.gov.ph/implementing-rules-regulations-data-privacy-act-2012/ ; https://developer.apple.com/app-store/review/guidelines/ ; https://support.google.com/googleplay/android-developer/answer/10144311

- Updated the in-app navigation test to assert the November 6 policy effective date; ensures consistency with public pages.

## CI dependency toolchain compatibility follow-up
- First PR #226 CI attempt passed the mandatory per-commit documentation gate, but npm ci under the runner's default npm 10 rejected the npm 11-generated package-lock due to a missing optional nested yaml@2.9.1 peer entry.
- Reproduced the discrepancy: npm 10.9.4 install --package-lock-only would add the nested yaml entry, whereas npm 11.19.1 accepted the original committed lockfile cleanly. To avoid unnecessary lockfile churn and preserve Vercel's tested resolution, the PR CI install is pinned to npm 11.19.1 through npx.
- CI must now be re-run at the exact new PR head. This follow-up changes only the CI script and the mandatory same-commit engineering and PR progress documentation. The original lockfile stays unchanged.
