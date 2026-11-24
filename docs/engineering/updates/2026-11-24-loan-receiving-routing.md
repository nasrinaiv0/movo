# Loan and debt receiving account routing — 2026-11-24

## Diagnosis before implementation
The create form starts with `new_proceeds: false`; selecting the receiving account changes only `account_id`. The existing repository consequently writes an opening liability without invoking the borrowed-event RPC. This affects loan and debt alike. Existing historical liabilities must not be credited again.

## Scope
Selecting a receiving account in the new-record form automatically enables the existing new-proceeds option. Clearing the selection disables it; explicitly turning it off clears the selected receiving account and permits a historical liability without a cash posting. Currency changes discard incompatible selection and its proceeds intent. Repayment method and edit forms remain metadata-only. Use the existing borrowed-event posting and refresh path; do not introduce another balance mutation or income transaction.

## Acceptance
Test selection, clearing, historical entry, currency changes, both obligation types, repayment preference and finance refresh. Exercise SQL signed posting and outstanding principal with disposable data; confirm non-income classification, owner/currency guards and no duplicate posting. Review existing two-request create flow for lost-response/idempotency risk before any broader redesign; this patch does not claim to resolve it. No production migration, merge, store upload or production change. Independent Claude review requested in PR; exact-head CI and signed-in browser evidence pending.

## Implementation and CI remediation
Selection wiring and both regression suites are implemented. Initial CI rejected per-commit documentation and collapsed SQL dollar quotes; the new implementation commit includes both required documents and correct delimiters. Full acceptance remains pending.

## Latest main integration
Tree comparison shows only the progress register overlaps the mascot merge. Preserve all original routing and accounting regression blobs and both documentation histories. Exact-head revalidation required before requested merge.

## Actual visual release gate
Previous simulator screenshot was an OS prompt. Real browser fixture and UI-only XCTest target added. Guest native planning/sign-in restriction and free automation gate must be proven by accessibility assertions; signed-in loan form is covered by isolated real-component browser fixtures, not a live account. Physical-device and store testing remain separate. No production changes.

## iOS acceptance compile fix (2026-11-24)
`build-ios` failed to compile `UITests/MOVOAcceptance.swift`: `XCUIApplication.open(_:)` is only available in iOS 16.4 or newer, and the test target deploys to iOS 15.0. The deep-link step is now behind `guard #available(iOS 16.4, *)`. The CI simulator runs a newer iOS, so the step still runs and still asserts the entitlement gate. On an older simulator it fails instead of silently skipping. No app, accounting or database change.
