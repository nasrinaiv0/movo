# MOVO P0 integrated offer + iOS smoke follow-up — 2026-11-13

## Before implementation
- Original integrated PR #298 head `0e9027a5e82d31fa59c3c265c59697d542daf351`: Phase 1, IAP disposable PostgreSQL, finance isolation, referral security and Android native all PASSED. iOS macOS workflow was still queued.
- PR #295 now has a strict cold restart of the simulator after two screenshot timeouts; no smoke bypass. PR #299 adds exact Google Play displayed offer-token checkout and price/plan mismatch tests. Both scopes remain independent and not merged.
- This additional integration commit should combine the exact reviewed PR #295 iOS smoke recovery and PR #299 price-to-checkout path with the original OAuth + Play cancellation + license-test fixes.
- Keep all keys, main, production backend, database, signed AAB publishing and Google Play unchanged.
- Validate the combined exact-head Phase 1, native Android, iOS, finance, IAP, referral and Vercel preview. No physical device success claim from CI.
- Record test results and any failures, do not skip or weaken the screenshot or offer-token checks.

## Implementation and evidence
Follow-up implementation now includes exact-offer Android checkout from PR #299 and a strict screenshot service recovery from PR #295, with supporting Jest and Python tests. Require new exact-head native Android, iOS and billing CI; previews and physical device checks remain release gates.