# 2026-11-12 — MOVO bank/card activity and e-wallet card display (PR #275)

## Feature
Banks show their own ledger transactions plus transactions directly assigned to each explicitly linked active debit card or issuer-linked credit card. The Account details → Transactions tab provides an All activity view, Bank account view, and one view for each linked card (masked suffix). Full history is progressive, 50 records at a time. Individual card detail remains strictly scoped to that card. Recent activity and Money Flow in the bank overview use the same combined, deduplicated rows.

The Wallet → Cards carousel and pile now include active e-wallets, which remain separately available under E-Wallets. No account type is reclassified.

## Security and accounting isolation
- Link debit cards via cardBankLinks / linkedAccountId; credit cards via the issuing-bank ID. No institution-name guessing.
- Archived cards and other banks' cards are excluded from bank grouping.
- Transfer rows are deduplicated by transaction ID even when both account endpoints are in the bank group.
- Display-only projections: no writes to transactions, balances, offline cache, sync, Supabase schema, or access controls.
- Existing account-specific privacy and currency formatting remain in effect.

## Tests and release controls
- Pure helper regression covers link precedence, cross-bank exclusion, archived links, transfer destination visibility and duplication.
- React component regression covers bank aggregate, individual card filters, history clickthrough, and 65-item pagination.
- Wallet filter regression covers dual e-wallet visibility and archived exclusion. Seven new labels localized for all 11 languages with matching placeholders.
- First GitHub CI run: 195 of 196 Jest suites passed. The locale key check failed on seven new keys; translated strings are included in the updated head. Await exact-head CI and build.
- Vercel Sandbox creation and resume both rejected by Vercel HTTP 402 payment_required. Sandbox UI/browser verification NOT completed; device tests and preview gate remain pending. Do not merge until release checks pass.

## Rollback
Feature is a pure view change; revert its UI/helper/catalog changes to restore previous layout without any data rollback.
