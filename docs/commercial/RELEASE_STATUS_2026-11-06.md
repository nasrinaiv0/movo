# MOVO release status — 6 November 2026

## Implemented and checked

Financial calculations, complete two-decimal monetary labels, compact financial planning and crypto screens, reminder split payments, 45px circular headers, readable light/dark controls, and explicit loan payment/edit/archive actions. Vercel Sandbox checks use the real components with synthetic records; they do not connect to customer data.

Recovered store work includes Apple/Google restoration, server verification, account binding, owner-scoped entitlement storage, fresh Apple transaction lookup, pending-purchase handling, and prevention of replaying an older receipt over a revoked transaction. Store checkout is disabled by default.

## Owner setup required

1. Configure App Store Connect and Google Play developer accounts, subscription products/base plans, signing and reviewer accounts. Exact products and Vercel environment names are in `STORE_BILLING_SETUP.md`.
2. Provide the Apple/Google server credentials and notification configuration through Vercel's secret settings. Do not send private keys in chat.
3. Arrange signed iPhone/Android builds and real-device purchase, restore, renewal, refund and account-deletion testing before enabling `MOVO_STORE_BILLING_ENABLED`.
4. Complete the applicable business/privacy documents, store privacy declarations, screenshots and review metadata listed in `RELEASE_DOCUMENT_TASKS.md`. Legal applicability requires review; this code change is not legal certification or app-store approval.

## Engineering release gates

Apply the store-entitlements migration to the intended Supabase project after backup/schema review; the isolated SQL test covered the new entitlement table/function, not the existing automation RPC search-path changes. Verify notification retry handling with live store test events. Review new translations with native speakers. Confirm preview/production deployment at the exact PR SHA before merging. Existing web financial records were not modified by this work.
