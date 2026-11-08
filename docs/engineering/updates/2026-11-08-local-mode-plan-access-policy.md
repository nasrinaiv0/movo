# MOVO — local-only mode suspends paid feature access
Date: November 8, 2026
Scope: Client access policy; no subscription cancellation, no cloud-write API policy changes, no Supabase migration.

## User policy
- Turning off Cloud Sync makes the effective feature-access tier Free, regardless of any cached or verified Pro/Pro+ entitlement. Manual local account/transaction tracking and import/export remain available.
- The purchase/verified entitlement persists as-is. Switching storage mode never cancels billing, revokes store purchases, triggers refunds, changes the subscription record or alters expiration. Plan & Usage shows both storage mode and the underlying plan.
- When Cloud Sync resumes successfully, feature access derives afresh from the verified, active, unexpired entitlement; expired and unknown entitlements remain denied.
- If the user selects a paid feature while offline, show an offline-mode explanation with a route to Cloud Sync Settings rather than a paid upgrade/claim prompt.
- Disable local-mode paid features in both App callbacks and the PlanContext shared by premium child components. Prevent cloud QR/preference writes from executing in local-only mode.

## Security, offline finance, and release caveats
- Client feature gates are a UI/UX restriction, not backend subscription authorization: every server API, database RPC, and store grant must independently enforce entitlements.
- This policy does **not** fix or assert the safety of transferring all historical cloud financial records, schedules, receivables, loans, receipts or QR uploads into local storage. PR #241 remains draft and requires completeness, privacy, multi-account isolation and signed-device validation before its migration is released.
- Preserve the ability to export local records and manage/restore existing purchases even while premium usage is paused.
- No production financial writes or schema change were required.

## Tests
- Unit coverage: Pro/Pro+ cloud-to-local denial, cloud reactivation only with verified active unexpired entitlement, missing-mode fail closed, PlanProvider card UI render/resume, offline feature sheet no second-purchase prompt.
- Run isolated Vercel Sandbox Jest, TypeScript, production build, responsive browser UI before merge.

## Executed Vercel Sandbox verification
- 35/35 targeted tests across 3 suites passed (PlanRestrictions, planAccess, Settings).
- TypeScript `tsc --noEmit` passed; isolated React Scripts optimized build completed successfully.
- Mobile Chromium, 390x844: initial page loaded, legal/onboarding flow completed, Settings showed `Local mode · paid features paused`, and Plan & Usage showed `Local mode is active` with Access mode `Local (Offline)`; no JavaScript exceptions or horizontal overflow.
- Full GitHub Phase 1 CI must pass on the exact PR head before merge. A full local prebuild test command was interrupted after long execution; do not count it as a completed pass.
