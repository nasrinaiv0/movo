# MOVO native finance encryption prerequisite

## 2026-11-12 — Staged native encrypted finance snapshots (not yet primary ledger)

Introduced an additive, native-only, non-destructive finance snapshot store using AES-256-GCM with owner/group authenticated data and device-only Keychain/Keystore key wrapping. No automatic import or deletion of existing browser/Preferences/IndexedDB records. Added cryptographic tamper, key-failure, IV-randomness, web isolation and round-trip migration-stage tests plus native allowlist contracts. This is a migration prerequisite, **NOT** proof that MOVO's production local finance records are encrypted; authoritative localStorage and IndexedDB journals remain plaintext until a subsequent rigorously tested switchover. Full privacy disclosure and NO-GO stay in force.

Key risks deferred intentionally: synchronous localStorage ledger, native Preferences mirror, hybrid IndexedDB outbox, migration rollbacks and data-loss under reinstall. No live cloud or customer records changed. Vercel Sandbox HTTP 402 prevents direct interactive checks; CI and native signed-device acceptance remain necessary.
