# MOVO P0 — exact Google Play offer checkout — 2026-11-13

## Diagnosis documented before implementation
- Current `src/components/PlanOffer.js` displays the price/terms from a specific `getStoreProducts()` entry but calls `purchaseStoreProduct(product.productIdentifier, session)`, discarding the selected offer token.
- Current `src/lib/nativePurchases.js` passes only `planIdentifier` for Android, which lets the Capgo plugin pick the first returned offer on that base plan. Multiple Play offers can make a different price/trial than displayed enter checkout.
- Official Capgo docs: https://capgo.app/docs/plugins/native-purchases/android-subscription-offers/ — when an exact displayed offer must be charged, pass its `offerToken` from the same product query. Stale tokens fail closed.
- Base main: `5b616ce88e640ee867418db66b4da90ac438f5a0`. This isolated PR must not merge, alter production env, generate signed AAB, publish to Google Play, or change Supabase/Vercel.
- Keep legacy string purchase callers supported, but the visual plan chooser passes the selected store product object, with validated ID and base-plan consistency.
- Avoid storing offer tokens persistently, logging store credentials, or silently choosing a different offer when an explicit token is rejected.

## Planned changes
1. Pass `product` selected by `PlanOffer` to `purchaseStoreProduct` instead of dropping the quote.
2. Android: prefer the same quoted `offerToken` with matching product ID + plan ID. If unavailable, legacy base-plan fallback remains (explicitly documented), but do not silently fall back on a rejected token.
3. Add tests for exact token, wrong/stale base-plan object blocked, legacy plan flow compatibility, and iOS unchanged behavior.
4. Run Phase 1, Android native, iOS native, IAP security, Vercel preview and integrated P0 regression. Real Play Console offer/price testing remains a physical-device gate.

## Implementation evidence
Pending; this plan is committed before code.