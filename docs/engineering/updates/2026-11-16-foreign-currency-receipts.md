# Foreign-currency receipt review

## Changes

- The AI endpoint asks for the printed charged total and its ISO currency. It asks for an unknown currency when the evidence is ambiguous. Basic on-device scans recognize explicit codes and recognizable symbols on the total line. The reviewer can change or confirm the receipt currency.
- The review calculates the total in the account, card, cash, or e-wallet currency selected by the user. It displays the original total and the estimated charge with a reference rate, provider and date. Same-currency receipts skip conversion. The user can enter the actual amount shown by the account and log directly.
- The selected account receives one expense or refund in its own currency through the existing writer. The receipt note retains the original total, logged total, and rate information or statement attribution. The extracted line items, taxes and change keep their original values.

## Files and data

- `src/components/ScannerSheet.js`, `src/components/ReceiptAiReview.css`, and `src/App.js` connect the review with the existing FX cache and transaction writer.
- `src/lib/fx.js`, `src/lib/receiptDetails.js`, and `api/receipts/receiptScanCore.cjs` validate provider rates and retain the charged currency. The existing USD-base rate download sends no receipt, amount, account, or sign-in data. The privacy notice describes the conversion.
- The estimate uses a recent daily reference rate, with the existing 36-hour freshness threshold. In the absence of a valid reference rate, the statement amount or a matching account is required to log. No migration or configuration change is required. If needed, revert the application commit. Earlier converted transaction amounts and receipt notes remain readable.

## Validation and acceptance

- The first complete local Node 26 run passed TypeScript, the CI-strict optimized build, and 233 Jest suites / 1,460 tests. The Vercel Sandbox FX fixtures passed with rates and clocks controlled by the test.
- The isolated mobile Chromium pass used the built app, a synthetic USD receipt, and stubbed provider, auth, and cloud responses at 375 px light and 320 px dark. It checked direct save, converted amount, statement override, original receipt note, and horizontal fit.
- On the protected PR preview with a test account that can scan receipts, upload a USD receipt, select a PHP account, review both amounts and the rate, and log. Open the transaction and inspect the selected account, saved PHP amount, and original USD total. Repeat with a USD account and with the actual statement amount. Check the final GitHub head and the Vercel deployment before merge.
