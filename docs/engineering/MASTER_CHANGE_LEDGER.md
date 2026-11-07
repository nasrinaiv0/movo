# MOVO Master Change Ledger

## 2026-11-08 â€” Optional account balances after each transaction

- Ledger-derived, account-currency running balances in transaction history; paired source and destination for transfers.
- On/off Settings preference is display-only; hide-balances privacy mask remains active and cents remain precise.
- Linked debit and credit-card handling; unknown FX and missing financial history are not represented as valid balances.
- No production persistence or database schema change; isolated Vercel Sandbox and PR review required.
- Detailed record: docs/engineering/updates/2026-11-08-transaction-running-balances.md

## 2026-11-07 â€” Unified Others filter, memberships and rewards cashback estimates

- Five Wallet filters: All, Cards, Banks, E-Wallets and Others. Others includes cash, other financial accounts and non-cash memberships, loyalty and tokens.
- Dedicated provider-specific membership/reward editor; points, stamps and tokens instead of currency; initial providers include Petron, Seaoil, Starbucks and Tim Hortons.
- Cashback now supports per-card automatic **estimates** by matching existing logged expenses to payment account, merchant and currency. Source deletion reverses estimates; no cash ledger changes.
- Existing member cards and cloud preferences are merged safely; translated user-facing labels in all 11 languages.
- Vercel Sandbox full Jest, optimized React bundle, and mobile browser create/reload/Cashback rule UI QA. No database or RLS migr¶»§q«^