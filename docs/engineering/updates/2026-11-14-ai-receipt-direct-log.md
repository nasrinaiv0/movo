# 2026-11-14 — AI receipt vision and direct-log review
## Exact baseline and objective
- Start from main `c8bd8191475c280c9316fefb1ace9dc363c77eb1`. Previous itemized scanner PR #300 is already merged; do not modify main directly.
- Requirement: photograph/import -> AI reads merchant, address, date/time, items/taxes/discounts/payment and categorizes transaction/items -> user reviews summary, selects one of their *existing* accounts/cards/e-wallets/cash/other accounts -> **Log** writes one transaction immediately, or **Discard** writes nothing. Never open the calculator / transaction-entry sheet.
## Implementation and data-safety plan (recorded before code commit)
1. Add server-only authenticated POST `/api/receipts/scan` backed by existing OpenRouter API key, fixed vision model, bounded input/output, explicit per-scan user consent, strict origin, paid entitlement, limited capture size, no raw receipt image persistence/logging. No service-role key to client.
2. Parse AI JSON defensively, do not trust prompts embedded in receipts, map category to known MOVO taxonomy, flag uncertainty, totals inconsistent with cash/change and VAT, ensure receipt purchase total—not cash tender—is recorded; prevent logging an invalid/zero amount.
3. Keep scanned image/photo transient and avoid persisting AI scan content/thumbnail in plaintext localStorage. The existing scan history is legacy, not new AI uploads.
4. Reuse existing `saveTransaction` accounting path, duplicate protection, account ownership validation/RLS, local-first sync and rollback; keep the scanner open on errors, prevent double-submit and direct log only after explicit click.
5. Use AccountPicker on the summary (no auto selecting bank/card/ewallet), category defaults to AI classification but remains correctable in optional details. Never automatically choose the funding source based on receipt text.
6. Update in-app/public Privacy Policy because provider transmission changes from local OCR to remote AI; update legal acceptance date and test static legal sync. No migration, production config/secret changes, merge or store upload.
## Tests and acceptance
- Auth, origin and consent rejection before provider calls; invalid/malformed payload, too-large image and unconfigured provider; provider response sanitized/uncertain fields rejected; request does not send account or stored ledger data.
- ₱159 McDonald's sample remains one expense; ₱500 tendered and ₱341 change never change the ledger amount; included VAT ₱17.04 is not a separate charge; item-level categories kept.
- Scanner correctly blocks missing account/invalid amount/duplicate, **Discard** without writing, direct **Log** once and no calculator route.
- Full Jest, typecheck, production build, finance tenant-isolation, iOS, Vercel preview; real-device iPhone/Android signed-in AI imaging and financial-transaction acceptance remains required before merge.

## Backend implementation (precommit)
- Added bounded authenticated receipt vision endpoint and JSON normalization tests. Provider: existing production OpenRouter API key; fixed vision-capable OpenRouter model, configurable by server-only MOVO_RECEIPT_VISION_MODEL. Preview currently does NOT have OPENROUTER_API_KEY (checked key names only); live AI preview needs a scoped preview key, not a production secret copy.
- Explicit per-scan consent; JWT getUser, entitlement, same-origin allowlist, no ledgers or account metadata sent to provider; data_collection deny requested. Server never saves source photo or logs provider output.

## AI client transport (precommit)
- New browser/Capacitor AI transport: image downsize to JPEG in memory (<2.2M data URL), PDF extracts text locally then sends only text; reads Supabase session bearer; calls existing MOVO origin via apiUrl; bounded timeout; no credentials in query string or localStorage.

## Direct-save scanner UI (precommit)
- Scanner now opts in to AI analysis per receipt, renders merchant, date, category, item breakdown, taxes, tender/change, shows grouped registered AccountPicker (bank/cards/e-wallets/cash/other). Only an explicit Log invokes the existing validated saveTransaction writer with a supplied draft; no calculator route. Discard clears transient receipt.
- Existing saveTransaction is refactored to accept an optional draft and return boolean, preserving all duplicate, RLS-scoped cloud/local-first, currency, date and account validation. Prevent double-click; on error keep review visible. Scan results never auto-save to legacy localStorage log.

## Review UI and API tests (precommit)
- Added compact review styling, reduced-motion fallback, item-level category correction and zero-rated sales field. Regression tests cover exact ₱159 sample, VAT/500/341 accounting, untrusted model input, JWT/consent/plan gates and provider error behavior. Preview and physical devices still require acceptance.

## Privacy and store metadata (precommit)
- Added paragraph 19 on remote provider scan, retention caveat, separate explicit consent, alternatives, rights, security, and new acceptance effective date Nov 14. Generated public privacy HTML via the same canonical section renderer. This materially changes photo processing compared with offline scanner: verify Play Data Safety and Apple App Privacy declarations before release. No automatic policy assertion of vendor zero retention.
