# MOVO P0 iOS CoreSimulator openurl timeout — 2026-11-13

## Evidence recorded before code changes
- Isolated integration PR #298 at exact head `4c7bb464fc3f94590e9a3b84c7a5a8dc089058f3` passed Phase 1, Android native, finance-tenant, IAP PostgreSQL and referral-security workflows. Vercel preview `dpl_5UMqRfjpwSVi1QjUqmEwqFNY9VfT` READY and served HTTP 200.
- iOS workflow #43359864159 on head `4c7bb464fc3f94590e9a3b84c7a5a8dc089058f3` failed after both Debug simulator and unsigned Release builds succeeded. The iPhone 17 simulator installed and launched MOVO; `xcrun simctl openurl ... movo://log` timed out after 90s, and `simctl list devices` itself timed out during diagnosis. No application crash was shown.
- This is a real red release gate. Do not mark iOS successful on compilation alone, avoid bypassing deep-link, and never treat CoreSimulator timeout as a successful callback.
- A one-job rerun of the exact failed job was requested to distinguish transient host instability from reproducible failures.
- Preview billing flags report `enabled:false` for both stores: this is expected from the explicit `MOVO_STORE_BILLING_ENABLED` plus credentials gate, with core Supabase service-role/Google Play signing credentials scoped to production. Do NOT copy production credentials to preview or enable checkout merely to produce green test results.
- No production, main, merges, keys, Google Play or signed AAB changes allowed.

## Proposed bounded recovery (isolated test harness only)
- On a genuine timeout (not nonzero status) from simulator `openurl` after a verified app launch, allow one cold shutdown → boot → bootstatus → reinstall → relaunch → reopen link. The link is a disposable simulator-only test transaction; never use this for live payment actions.
- A repeated timeout, failed reset, install, launch or openurl remains a hard failure. A completed deep link and actual screenshot remain mandatory; no skip or false green.
- Add host-independent Python unit tests for one-time retry, second timeout, non-timeout failure, and restart failure. Keep existing screenshot recovery tests and iOS release checks.
- Run local Python host tests and exact-head CI, including iOS simulator, Android and security suites. Confirm Vercel preview SHA and safe GET smoke.
- Manual signed iOS/Android and Play purchase gates remain distinct.

## Results
The bounded deep-link recovery and five host tests were added in a later implementation commit alongside docs/PR_PROGRESS.md. iOS/macOS exact-head CI, Vercel preview and all manual Play/Android gates remain required; no CI result is asserted without verification.