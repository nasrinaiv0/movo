# Import & Export: compact upload and preview → Save records (2026-11-08)

## Baseline and intent
- Based on MOVO main be7c3d9. Isolated feature PR (not linked to security PR #227).
- Existing Settings > Export & import opened a bulky read-only JSON preview; native file input displayed Choose file, and uploading did not add records into the active ledger.
- Replace it with compact bordered panels only where structural, no visible control borders, responsive Export backup / Export CSV buttons and a clean Upload file trigger with No file selected text.
- Allow CSV selection to route into the existing validated CSV preview and a Save records action. JSON financial backups display counts, per-group preview and explicit Save records.
- Never auto-save on file selection. The backup file remains available for read-only preview, including unsupported groups.

## Import correctness and security
- Restored account and transaction IDs are regenerated; original ownership/user_id, service tokens and purchase entitlements are never replayed.
- Account ID relationships map via card/account names. Duplicate account names and transaction fingerprints are skipped. Invalid or unsupported groups remain preview-only, rather than being silently booked.
- For local mode, both account and transaction arrays must persist before the UI is updated; otherwise rollback is attempted and a warning shown. Keep backup copy.
- For active cloud mode, server APIs enforce owner identity and plan verification; partial failures are counted. The import does not claim atomicity over multiple server requests.
- Preserves opening balances, and derives them from current balances plus posted transactions when the source lacks a separate opening-balance field.
- Existing transactions update Home, Wallet, Transactions and graphs through their shared accounting state after Save.

## QA and release gates
- Vercel Sandbox movo-import-export-revamp-20261108.
- Tests: financeBackupRestore, FinanceBackupSheet interactions (upload without save, preview/save, CSV routing), existing CSV and account math suites.
- Run full typecheck, full suite and optimized build; review iPhone Safari and light/dark screenshot before merge.
- Existing complex backup groups (loans, scheduled payments, receipts, QR and arbitrary metadata) remain view-only until a separate lossless restore design; never claim those are imported automatically.
- No schema change or production data changed by this PR.

## Accounting integrity hardening (2026-11-08)
- JSON financial-backup Save now fails closed for missing/duplicate source account names, ambiguous matching names in the existing wallet, conflicts in account type/currency, transactions whose original account IDs cannot be mapped, missing transfer destinations and invalid transaction rows.
- This protects multiple real bank accounts with the same display label from being silently merged and prevents imports of some records while omitting invalid ones without notice. The user receives an error before any write; original records are untouched.
- Added five focused accounting regression cases including whitespace and case-insensitive name collisions. CSV preview and duplicate reimport remain independent and unchanged.
