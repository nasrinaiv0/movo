# MOVO finance UI correction — profile display currency

**Timestamp:** 2026-10-30 11:14 Asia/Manila  
**Repository:** `nasrinaiv0/movo`  
**Branch / PR:** `fix/finance-calculations-sync` / PR #43  
**Scope:** Profile summary currency formatting and privacy-mask consistency.

## Finding

The Profile screen's top-level balance/income/expense cards used `money(value)`, which defaults to PHP. The account-type subtotals explicitly passed `'PHP'` even though the app already scopes `accountsByType` to the selected display currency. Therefore, selecting USD could display USD amounts with a PHP symbol. In hidden-balance mode, `shown()` also used its PHP default and rendered the wrong currency mask.

## Change

- Read `displayCurrency` from the app context with a defensive PHP fallback.
- Format profile summary metrics using `money(value, displayCurrency)`.
- Pass the same currency to `shown()` so privacy masks remain currency-aware.
- Format bank, card, and e-wallet subtotals using the selected display currency and two fractional digits.
- Do not combine different currencies or invent exchange rates; the existing currency-filtered account list remains the data source.

## Regression coverage

Added an App-level test with synthetic USD and PHP accounts and transactions. It verifies:
1. Profile balance, income, and expense metrics use USD formatting when USD is selected.
2. The bank-account subtotal uses USD and does not show PHP for the USD-only view.
3. PHP-denominated records do not leak into the selected USD summary.
4. With balances hidden, the profile metrics and subtotal use the `USD ••••••` mask rather than the PHP mask.

## Validation status

- Source and regression test commits are on the finance PR branch.
- Implementation/test head `5308948502127be913921522b598693feb21e533` was validated by GitHub Actions [run #40996734432](https://github.com/nasrinaiv0/movo/actions/runs/40996734432): 20 suites / 118 tests passed, TypeScript typecheck passed, production-only dependency audit reported 0 vulnerabilities, and production build compiled successfully.
- Exact-head Vercel preview [dpl_DQTyWYggxd56XezRUErxs1Je3sa6](https://vercel.com/nasrin-ai/movo/DQTyWYggxd56XezRUErxs1Je3sa6) reached READY; root request returned HTTP 200.
- The documentation-only follow-up commit created by this record requires its own exact-head CI/preview check; do not reuse the implementation-head result for a later head.
- Authenticated cloud financial CRUD, CSV import/export, and real owner-scoped currency isolation remain unverified and are still release gates.

## Security boundary

Only application source, tests, and documentation changed. No database migration, RLS/grant policy, production financial data, authentication setting, or secret was modified.
