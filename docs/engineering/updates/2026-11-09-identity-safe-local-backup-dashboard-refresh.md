# Identity-safe local restore and live dashboard refresh — 2026-11-09

## Problem
MOVO financial backups may contain several accounts with the same display name (e.g. BPI, GoTyme). Before this change, the backup restore rejected all same-name accounts, even when source IDs disambiguated them. A preview could therefore remain visible without applying any financial rows. Successful saves also kept the import sheet open instead of returning the user to the updated dashboard; tightly sized preview grid rows could visually overlap on iPhone.

## Implementation
- Preserve distinct local accounts for distinct source account IDs and map every transaction/transfer to its source account ID. Preserve imported display names without changing source owners or copying privileged authentication fields. Store a non-privileged source-account reference so the same backup can be imported again without duplicating accounts.
- Existing-account name matching is allowed only when unique on both sides. Reject duplicate source IDs, missing IDs for same-name accounts, ambiguous name-only transactions, missing source references and incompatible account types/currencies rather than risking cross-account postings.
- Preserve validated amounts/currency, historical transaction timestamps and opening balances. Keep the existing transaction fingerprint protection and transfer conflict skipping; do not invent transactions.
- Confirm local storage persistence and read back the exact saved arrays before setting application state. After a nonempty save, clear stale month/search/wallet filters, close the import sheet, navigate to Home and refresh shared derived account, transaction, balance, recent activity and breakdown selectors. Menu financial routes then see the same state.
- Keep cloud-side activity rows out of local transaction calculations, ensuring that switching offline cannot count cloud accounting entries as local events.
- Fix iPhone-sized preview grid track sizing and summary alignment. Keep the two-step save/discard confirmation and accessible input controls.

## Scope and safeguards
Only accounts and transactions are currently supported for local MOVO JSON restoration. Budgets, loans, bills, allocations, receipts, QR attachments and other groups remain preview-only and are neither silently restored nor counted as successfully saved. This PR does not enable cloud import or alter entitlement, receipts, pricing, Vercel environment variables, or production database policies.

Local mode never writes financial records to Supabase. Signed-in offline mode remains bound to the existing verified local workspace, and the current read-back/rollback guard is preserved. Unsupported groups and all skipped/conflicted records are disclosed in the preview flow.

## Verification
- New importer unit tests cover same-name distinct IDs, exact transaction mapping, transfer mapping, repeated import idempotency, missing/duplicate IDs and ambiguous name-only references.
- React import-sheet test verifies success dispatch and zero-write no-dispatch.
- React app integration test confirms the modal closes, Home summary changes immediately, Wallet and Transactions show imported records, Menu remains navigable, and cold reload preserves the imported rows.
- Must pass exact-head full tests, typecheck, build, isolated SQL CI, preview deployment and interactive iPhone checks before release. No production access or schema change was performed to implement this fix.
