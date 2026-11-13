# Receipt scanner structured extraction — 2026-11-14

## Baseline (before changes)
- Base branch: `main` at `5b616ce88e640ee867418db66b4da90ac438f5a0`.
- Existing on-device Tesseract/PDF OCR is retained; no image upload, database migration, or production configuration changes.
- Existing `parseReceipt` detects a total/merchant/date/time/fee but does **not** parse item lines, VAT breakdown, cash tendered, change, payment method or ambiguities.
- Dangerous fallback: when a printed total is unreadable the largest detected amount can be cash tendered (for example ₱500 rather than ₱159).
- Current scan history is persisted to device localStorage; avoid retaining the user's attached receipt photo in repository fixtures.

## Scope
1. Separate deterministic receipt-structure parser, fields for itemized purchases, component/modifier rows, VAT and payment, subtotal/discount/service charge and warnings.
2. Use explicit total cues instead of picking the highest arbitrary money figure. Flag missing or inconsistent totals and require user review.
3. Edit and review extracted details in compact mobile scanner UI, and transfer a concise item/tax/payment note to existing transaction flow without generating VAT or change transactions.
4. Preserve income/e-wallet behavior, never silently invent a total, keep original OCR local on device.
5. Add synthetic McDonald's-style receipt test and payment edge cases, full CI and protected preview verification before merge.

## Acceptance gates
- ₱159 total; ₱500 cash tendered; ₱341 change; VATable sales ₱141.96; VAT included ₱17.04; correct date/time and item options.
- A receipt without an explicit total must **not** auto-log ₱500 as an expense.
- No double counting of VAT, cash, or bundled side items; user can correct every extracted value.
- Existing bank/e-wallet parser tests stay green.
- No release/main merge, store upload, Supabase migration or production deployment.

## Validation and deployment
- Document started **before** implementation commits.
- Run focused Jest + typecheck + build and inspect exact-head GitHub Actions and Vercel preview.
- Actual iOS/Android camera & OCR acceptance remains a manual real-device gate, regardless of simulated test success.

## Implementation and initial validation update (2026-11-14)
- Implemented structured fields, editable scanner review, guarded total detection, synthetic receipt regression and UI coverage; retains existing encrypted/local record flow without schema changes.
- Original PR #300 run failed its *per-commit progress documentation gate* before tests ran; finance isolation passed. The branch's implementation history was consolidated into a single code commit that updates both this dated report and `docs/PR_PROGRESS.md` in that same commit, preserving the original planning commit.
- No physical-device OCR acceptance yet; no merge authorized.

## Localization CI repair (precommit)
- After documented-history consolidation, the exact-head Phase 1 i18n test surfaced ten missing labels. Add the complete 11-language entries, including dynamic parser warnings, in the same commit as both required progress documents. All financial/accounting code is unchanged by this repair. Translations remain machine-assisted and need in-market review.
