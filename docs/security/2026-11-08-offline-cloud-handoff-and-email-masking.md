# MOVO — verified cloud-to-local handoff and email display privacy (2026-11-08)

## Requirement
- When a person's verified Pro cloud-write entitlement expires, switch the existing accounts and transactions to a local, device-only workspace so they can continue recording.
- If they turn off Cloud Sync intentionally, copy the current cloud dataset into the device workspace *before* switching modes.
- In the UI, conceal email addresses except for a small portion. This is display masking, not encryption of the authentication email.

## Implementation
- A single-write, per-account browser workspace is keyed to authenticated user id; a signed-out guest cannot automatically see another user's saved finances. The signed-in workspace contains accounts, transactions, accounting postings and activities, budgets, bills, and occurrences, but **not** every cloud-backed loan, receivable, payment automation or attachment table.
- Complete cloud reads take a safe local snapshot before setting the cloud view active. Partially failed cloud fetches never replace an existing complete snapshot.
- A cloud-toggle-off operation saves the full supported snapshot atomically to one storage key before switching. Browser quota failures leave cloud active and surface a warning, not an empty wallet.
- The plan-expiry transition runs only after a verifiable entitlement response; unknown/unreachable entitlement service is not treated as proven expiry. The hook also uses local expiry checks for the last verified plan.
- Cached accounting posting/activity rows remain part of the offline ledger to preserve running balances; cloud-side finance records are not intentionally erased.
- Turning cloud back on is refused when signed-in local edits are unsynced; no automatic overwrite or duplicate upload. Back up the device and reconcile entries before cloud reactivation.
- Auth signout removes in-memory signed-in data and reverts to guest records. Clear All also removes all local user workspaces.
- Profile and edit profile show masked email characters. Raw email remains available to the authentication system and is not substituted with masked text for security checks.

## Known limitations and mandatory release gates
- Browser localStorage is **not encrypted** by MOVO. Account-scoped browser keys protect against accidental cross-account UI mixing, not physical-device compromise, XSS, shared-browser devtools access, or malicious extensions. Do not claim end-to-end encryption or native-secure storage.
- Unsupported cloud-only pages — loans, receivables, payment obligations, scheduled reminders, file attachments, and some account metadata — are not fully migrated into local editing. A complete offline engine for those must be separately implemented and verified before claiming all-cloud-data conversion.
- Multi-device conflict reconciliation, offline edits to cloud restoration, quota failure recovery, real iPhone Safari eviction/private browsing, native device testing, and signed device compatibility require validation.
- PR #227 secure native vault work remains independent and incomplete.
- Cloud subscription expiry, active Pro renewal, network disconnection, signed-out privacy, and two-account contamination require integration testing with distinct real test accounts.
- **Do not merge for production or advertise full offline functionality until these release gates are closed.**

## Sandbox verification
- Sandbox: movo-offline-fallback-privacy-20261108; starting main be7c3d9.
- Unit suites: localFinanceWorkspace, emailPrivacy, Profile, Settings, planAccess, and full CRA tests/build.
- No production database writes and no schema migrations in this change.

## Rollback
- Revert the frontend code, leave per-user local workspace data preserved for export; do not auto-copy signed-in workspaces to guest storage or delete the records on rollback.
