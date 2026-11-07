# MOVO — Cash + other accounts, memberships, loyalty and rewards in Others
**Date:** 2026-11-07
**Base commit:** fc83c7d903a1afd81f93c561f2c8a4c9a4e3dc63
**Scope:** Wallet account type selector and Others filter; non-cash membership/rewards cards; Cashback points estimation

## User requirement and final taxonomy
- Keep the Wallet's five compact filters: All, Cards, Banks, E-Wallets and Others.
- Others includes actual cash accounts, investments/miscellaneous financial accounts, and non-cash membership, loyalty and reward/token cards. The legacy saved filter key Cash & Other remains a supported alias.
- Account Type selector can launch a dedicated membership or tokens editor. Standard financial account add/edit stays unchanged.
- Include Petron, Seaoil, Shell, Caltex, Starbucks, Tim Hortons, Coffee Bean & Tea Leaf, SM Advantage, Watsons, Landers, Robinsons Rewards, Mercury Drug Suki, 7-Eleven, Jollibee, McDonald's, and a manually entered provider.
- Track membership number, optional rewards barcode, numerical points, tokens, stamps or vouchers, expiry and notes. Card rows display reward amounts with units, never currency.
- Cashback displays membership/rewards programs and permits per-card rules, linked to one financial payment account, case-insensitive merchant substring and the selected account's currency. User enters rewards earned per 100 of matching spending. Only logged expense transactions produce estimates.
- Keep actual provider-issued rewards manually recorded and separate from MOVO estimates. Estimated totals and individual per-transaction estimates are derived, not posted to financial ledgers or received as real points. Deleting an expense automatically removes its estimate.

## Architecture and data isolation
- New membership and tokens types are UI choices that route to a separate rewards editor; **they are not new financial_accounts.account_type values**. The database account type CHECK constraint is not modified. New data uses existing per-user preferences membershipCards and loyaltyRewardRules; legacy membershipCards remain readable.
- Rewards cannot be selected as financial transaction payment accounts and never appear in balances, liquid assets, savings, debt, cashbacks denominated in currency, scheduled transfers, financial planning or money movement. Cash accounts continue in normal finance accounts, including actual monetary balances.
- Per-card reward rules merge safely when local and cloud preferences reconcile. Memberships use unionById merge; device-only secrets are still excluded as before.
- User input is length bounded and sanitized. Numeric rewards require non-negative values, at most two fractional digits. Expiry dates are validated. Member numbers are masked in Wallet list. Rendering relies on React escaping of user data.
- Rewards are estimates derived deterministically from logged transactions; require a configured permitted live payment account, explicit enabled rule, merchant name match >=2 characters, matching transaction currency, and a finite, bounded earn rate. Earned points are rounded down at two decimals and amounts are bounded. No provider connection or claim of actual payout.
- No changes to any financial posting calculations, payment provider, banking API, account database schema, RLS, or production secrets. No migrations are required.

## UI and compatibility
- Wallet keeps All, Cards, Banks, E-Wallets and Others visible. Other accounts and rewards appear together under Others. Existing bank/e-wallet/credit cards stay in their own filters.
- Existing membership cards saved in prefs are surfaced with an implicit membership type. Individual rewards can be edited or removed; removing also deletes its corresponding auto-estimation rule.
- New loyalty editor follows MOVO's compact controls, plain background, no unnecessary borders or gradients; points/units are distinct from monetary amounts.
- Added translated UI catalogue entries across 11 languages (Filipino, Arabic, Chinese, Spanish, Italian, German, French, Portuguese, Japanese, Korean and Hindi).

## Verification and rollback
- Vercel Sandbox installed locked dependencies and built the production bundle under the production CSP.
- Automated Jest coverage: membership normalization, brands, points units, secure non-financial isolation, estimates, merchant/account/currency checks, deleted transaction reversal, invalid/disabled rules, local/cloud preference merging, account eligibility and exact filter taxonomy, editable rewards UI, existing regressions and i18n completeness.
- Chromium mobile viewport 390x844: exact five wallet filters; Others empty and new-account picker; add Petron points, Starbucks stamps and real Cash account with 200 PHP; verify Others shows all three with Petron points and Starbucks stamps instead of currency, and cash as PHP; reload and verify persistence; open Cashback, confirm reward rules for both, choose Cash as Petron's payment account, enable + configure reward rate and merchant, reload Cashback and verify persisted rule. No page errors.
- Physical iPhone Safari and authenticated cloud preferences paths still require real-device post-deployment confirmation. No issuer-side points API is connected.
- Rollback: revert this PR; no data migration, finance data rewrite or storage policy change.
