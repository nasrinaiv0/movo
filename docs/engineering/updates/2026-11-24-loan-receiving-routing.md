# Loan and debt receiving account routing — 2026-11-24

## Diagnosis before implementation
The create form starts with `new_proceeds: false`; selecting the receiving account changes only `account_id`. The existing repository consequently writes an opening liability without invoking the borrowed-event RPC. This affects loan and debt alike. Existing historical liabilities must not be credited again.

## Scope
Selecting a receiving account in the new-record form automatically enables the existing new-proceeds option. Clearing the selection disables it; explicitly turning it off clears the selected receiving account and permits a historical liability without a cash posting. Currency changes discard incompatible selection and its proceeds intent. Repayment method and edit forms remain metadata-only. Use the existing borrowed-event posting and refresh path; do not introduce another balance mutation or income transaction.

## Acceptance
Test selection, clearing, historical entry, currency changes, both obligation types, repayment preference and finance refresh. Exercise SQL signed posting and outstanding principal with disposable data; confirm non-income classification, owner/currency guards and no duplicate posting. Review existing two-request create flow for lost-response/idempotency risk before any broader redesign; this patch does not claim to resolve it. No production migration, merge, store upload or production change. Independent Claude review requested in PR; exact-head CI and signed-in browser evidence pending.
