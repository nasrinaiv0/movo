# Offline appearance, plan amounts, loan payment methods and Friends

The update preserves saved account presentation offline, makes plan amounts visible, reduces card shadows in both themes, separates loan receiving and repayment accounts, and adds QR/link-based Friends with a shareable profile QR image.

## Implementation progress

- Bundled 175 bank/wallet/brand PNGs (764 KB) from the curated institution registry, with saved account names and existing MOVO fallback for other institutions. Sources are Google S2 favicon responses for the registry domains. Marks identify user-selected institutions and imply no partnership or bank connection.
- Production web builds generate a versioned offline app shell with scripts, all lazy chunks, fonts, icons and logos. Existing notification handling is retained. Only allowlisted public artwork is cached at runtime. APIs, query-string URLs, credentials and financial responses are excluded. Cache storage failures do not turn successful artwork requests into failures.
- Verified unexpired plans are cached using the existing owner-bound AES-GCM cache. Device features survive local mode and restart. Cloud writes remain server-authorized. Annual expiry handles the browser timer limit. Owner changes, revocation, invalid cache and expiry cannot restore an old grant.
- Public plan metadata displays fresh store quotes, last store quotes or the approved PHP reference. Pro monthly 99.00 / annual 950.40; Pro+ monthly 149.00 / annual 1,430.40. References are labelled. Cached/reference amounts never authorize checkout. Live Play offer metadata is preserved. Annual savings compare matching currencies and quote sources.
- Card grid, stack and bank faces use shared neutral elevation. Dark-mode outer shadow is 0 2px 5px -3px at 18% opacity. Portrait cards retain their existing zero-shadow treatment.
- Cloud Sync off remains off; owned saved QR images retain owner identity, while remote preference and QR writes still require cloud mode. Local budgets remain distinct from the read-only cloud-budget copy.
- Loans store separate receiving and preferred repayment accounts. Users choose currency, bank/e-wallet/cash receiving account, and a card or account for repayment. Linked debit payments resolve to one underlying bank ledger. Existing atomic repayment RPCs remain responsible for principal and posting updates. Merely choosing a payment method posts no money.
- Additive migration 20261119120000 adds the owner-bound payment-account FK and validates active same-currency methods. The migration is not applied to a customer database by this task.
- Friends has camera/photo QR scanning and pasted invite links. A bundled JS QR decoder supports Safari without BarcodeDetector. Scans remain on-device, use strict MOVO URL validation, open a preview, and require explicit acceptance.
- The invitation profile card exposes chosen display name/initial, optional own username, MOVO and a single-use QR. Exported PNG includes chosen name/initial and invite only. Native shares preserve trusted URL validation, PNG byte/signature/dimension bounds, URI grants and temporary-file cleanup. Privacy and iOS camera/photo-save disclosures are updated.
- New interface copy is translated into the existing 12 complete catalogs. The other 85 languages keep their documented limited coverage and English fallback. This change does not claim 97 fully translated catalogs.

## Validation and remaining release gates

- Node 26 regression run before the last review refinements: 247 suites, 1,561 tests passed; final exact-tree verification is recorded in the PR.
- Worker test covers private-request exclusion and cache-storage failure recovery.
- Browser checks exercise genuine offline reload, bundled logo decoding, all four plan amounts, restrained computed shadows and overflow at 320, 390 and 1440 pixels.
- Focused loan and Friends tests cover separate methods, card repayment, untrusted links, review-before-accept, invite-name stability and delayed camera permission cleanup. SQL fixture covers owner/currency isolation and a single card repayment posting.
- Exact-head CI, Vercel preview and native compilation must be green before merge. Real-device camera, AirDrop/Quick Share, Apple/Google purchase/restoration and subscription expiry acceptance remain required before a public paid release.

## Limits and rollout

Existing saved data and local actions remain available offline. Fresh market quotes, remote AI, Friends server actions, store checkout/verification and cloud-only financial mutations still need connectivity. Existing cloud loans/bills/allocations are readable from their saved copy; this change does not invent an offline accounting RPC queue. Offline web use requires a completed first online load. Unknown remote logos or premium artwork not previously downloaded can still use the existing fallback. Cached price metadata may be stale until the store reconnects.

Apply the additive migration in a reviewed staging release before deploying the new loan metadata UI. A missing migration must fail the loan save visibly rather than silently dropping a payment preference. Production, store catalogs, secrets and store uploads are untouched by this branch. Roll back by reverting this commit; keep the nullable metadata column if a deployed version has already written preferences.
