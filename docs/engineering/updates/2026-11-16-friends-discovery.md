# Friends discovery, private summaries, and profile photos

## Implementation plan recorded before changes

- Reproduce the generic Friends warning and preserve QR invites issued by older clients. Production REST logs show successful Friends RPC calls, so the generic warning alone does not identify the reported failure.
- Give verified members a searchable, opt-in MOVO username. Only usernames appear in discovery. Require recipient approval for a connection. Keep financial summaries private until their owner approves a named friend and previews the specific fields being shared.
- Share a month snapshot with an optional tracking note, income and expense totals, and broad spending percentages. Keep raw transactions, receipts, account details, and contact information out of the sharing payload. Revoke on request, unfriend, or account deletion.
- Use one profile photo source in the account UI, with a private account-scoped copy for signed-in users and local storage for guests. Photos are separate from friend discovery and financial sharing.
- Validate the existing QR invite path, malformed/expired session replies, recipient-only request approval, snapshot access and revocation, account deletion, photo upload and mobile layouts. Use disposable PostgreSQL and a Vercel preview before requesting any merge.

## Implementation and verification

- The production Friends migration and service-role `list` function were present, and production logs showed successful RPC calls. The individual report could not be correlated to a failing request. Explicit Capacitor HTTP handles serialized replies on native, the route accepts serialized JSON, and session, connection, and missing schema responses now have distinct messages. Error logs contain only the action and an allowlisted upstream error code.
- Discovery uses a chosen username, opt-in visibility, prefix limits, per-account throttles, and recipient-only acceptance. QR invites and new requests share the same connections. Blocking stops both paths. In-app reports go to the existing owner-only Support Center and do not copy financial data into reports.
- Approval records contain only a previewed monthly snapshot. The note and two aggregate options are optional, and money totals are off by default. Revocation, removal, blocking and account deletion remove access. The API has no financial-ledger access.
- The profile photo is cropped and re-encoded, stored separately from financial preferences, and cached by account on the device. Existing device-only photos have no recorded account owner. Signed-in members can upload those photos again to bind them to their account. Guests retain their local photo.
- The full disposable PostgreSQL migration history, invite compatibility, privacy boundary, blocking, reporting, account deletion and finance isolation passed. Focused API, localization, owner-support and image picker tests passed. The Vercel preview and exact merge-head checks are release gates.
- Rollout requires a preview database with the new migration and server credentials before signed-in testing. For production, apply the additive migration before deploying the code. An app rollback can leave the tables and compatible invite RPC in place. Before permitting store rollout, validate moderation review and support follow-up, update platform disclosures, and exercise the full flow on real iOS and Android devices. The privacy and terms update is dated November 17, 2026, which will prompt existing users to review it when deployed.
