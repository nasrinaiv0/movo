# 2026-11-12 — Wearable manifest security regression follow-up

## CI observed
- Initial PR #280 Android native and hybrid-sync workflow failures occurred in a pre-native Jest suite, not in Gradle/WatchConnectivity.
- 203 Jest suites, 1,235 tests: 202 suites, 1,234 tests passed. Only `src/lib/androidManifestRelease.test.js` rejected the new, explicitly registered `movo://wear-log` host because it expected precisely two hosts.
- Tenant-isolation PostgreSQL job completed successfully.
- iOS compile, watch/Android native compile and Vercel preview are still separate release gates; do not infer pass from a Jest change.

## Correction
- Expanded the allowed test matrix to `auth-callback`, `log`, `wear-log`.
- Assert exactly three schemes and exact sorted host set (not merely count), retaining exported/View/Default/Browsable checks and blocking catch-all schemes, credentials and backups.
- No change to product code, router, database, privacy defaults or app logic.

## Verification and rollback
- Re-run the exact new head CI and full regression tests; require actual native build and both watch pairing scenarios before merging.
- Revert this commit if any original security contract changes unexpectedly.
