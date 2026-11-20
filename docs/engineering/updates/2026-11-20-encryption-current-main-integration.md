# Encryption integration — 2026-11-20

Preserve current main legal identity, processor disclosures, adult declaration and revision-aware acknowledgement while integrating #291 encrypted wallet/workspace/outbox and QR migrations. Keep owner-bound deletion, chat consent invalidation, explicit Cloud Sync off behavior, current permission descriptions and newer native chat-history mirroring exclusions. Correct stale date-only test expectations and keep static legal pages synchronized to the canonical disclosure.

Acceptance changes to November 20 revision 1 because selected financial encryption coverage is newly described. Legacy versions, attachments, exports and some preferences remain outside this selected coverage. Key loss can destroy access to unsynced data. Existing migrations run before App mount; any finance vault failure blocks rendering. Optional QR/cache failures remain isolated.

Validation is recorded against the final PR head. Signed native in-place upgrades remain a store-release gate; merging source does not publish native binaries. Old clients cannot read the encrypted namespace; preserve recovery copies and favor roll-forward fixes. Production database schema is unchanged by this PR.
