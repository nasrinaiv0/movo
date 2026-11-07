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

## Additional mobile browser evidence (2026-11-08)
- Vercel Sandbox optimized production build: 794/794 Jest tests across 142 suites, TypeScript check and build passed after fixing a tap interception issue in the import preview.
- Chromium at 390×844 mobile viewport: Upload file trigger measured 42 px high with no visible button border, filename/empty-state beside the trigger. Valid JSON preview required explicit Save records; after saving sample account PHP 200.00 and expense PHP 20.00, Wallet displayed PHP 180.00, Transactions listed the expense, and Home displayed PHP 180.00.
- Reuploading the same JSON and tapping Save records a second time produced No new accounts or transactions to save; the mobile Save control was tappable after shrinking the preview scroll region and using a sticky bottom action. No production data or deployment changed.
- Native iPhone Safari signed-build QA and complex obligation/receipt restores remain required before release.
