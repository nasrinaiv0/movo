# MOVO local-only file import confirmations — 2026-11-08

## Workflow
- Upload JSON or CSV -> validate and preview only; no finance records are changed.
- Discard records -> confirmation -> clear preview only; does not delete existing records.
- Save records -> confirmation -> commit validated, nonduplicate accounts/transactions locally before updating Wallet, Home and Transactions.
- Saving imported files in active Cloud Sync mode is prohibited. Users must switch to local mode in Settings first; no imported file is written through cloud APIs.
- Switching local pauses Pro/Pro+ feature use but does not cancel or modify paid subscription entitlements.

## Financial and privacy safeguards
- File upload is ephemeral: JSON previews are no longer automatically written to the old finance-backup IndexedDB key.
- JSON restore validates identifiers, account name conflicts, transfers and transaction amounts and timestamps with existing safe import planner.
- Local storage failures keep the preview for retry and do not update the visible ledger. Restore attempts best-effort rollback if accounts persisted but transactions did not.
- Concurrent local tab changes fail closed rather than overwriting newer ledger records.
- CSV checks duplicate transaction fingerprints, ambiguous account names and invalid transfers; only validated rows are added.
- Other JSON financial backup tables, loans, receivables, schedules, receipts and QR images remain preview-only, clearly labeled. This work does NOT claim those groups are fully restored. Full cloud-to-local migration remains blocked in PR #241.
- Existing browser storage is not encrypted, and signed-in cross-user local account isolation must be resolved before treating cloud-to-local as a complete release-ready feature.

## QA gates
- Focused Vercel Sandbox tests: 39 passed across 4 suites before final integrated code (FinanceBackupSheet, PlanRestrictions, planAccess, Settings).
- TypeScript checked. Complete build, browser QA and exact-head GitHub CI must pass before merge.
- No Supabase migration, production database write, purchase cancellation or automated subscription change.

## Rollback
- Revert this client import UI and access behavior only. Never delete the existing user's local financial records automatically.
