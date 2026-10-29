# MOVO Frontend Action Audit

Last updated: 2026-10-29

This audit is a working register, not a claim that the entire frontend is complete. Each visible control must either perform a verified action or be visibly disabled with a clear reason. Re-check the live branch and deployment after every meaningful change.

## Current increment: legal access and honest feature status

- [x] Add in-app Terms of Service and Privacy Policy pages with effective date, local/cloud mode boundaries, AI consent disclosure, privacy requests, and support contact.
- [x] Add legal-page navigation and cross-links.
- [x] Link legal pages from profile About, Settings, authentication onboarding, and NasrinAI financial-context consent.
- [x] Remove misleading static plan/token figures from the profile flow and identify plan management as unavailable.
- [x] Route Settings > Privacy & Data to the Privacy Policy instead of unexpectedly toggling balance visibility.
- [x] Make search icons open the shared search sheet and route the submitted query to filtered Transactions results.
- [x] Fix Wallet transfer actions so they open a transfer form, and label the action as recording a transfer rather than moving money.
- [x] Make the Transactions balance-visibility icon functional and remove a decorative chevron that looked interactive.
- [x] Make in-app notification master/category preferences affect the feed; disable push/email and native biometric controls that have no backing service.
- [x] Remove fabricated plan/token figures; mark unavailable card controls disabled and remove misleading chevrons from read-only settings/provider rows.
- [x] Add a sign-in CTA to the local-mode NasrinAI screen and preserve a new-chat intent across navigation.
- [x] Add a server-side-only NasrinAI key-format diagnostic that logs classification only, never the key or its identifier.
- [x] Revoke unnecessary TRUNCATE, TRIGGER, and REFERENCES grants from anon/authenticated on finance/profile/chat tables; keep the upstream conversation mapping server-role-only.
- [x] Verify production RLS remains enabled on profiles, finance tables, and NasrinAI chat tables, and verify authenticated CRUD grants remain while TRUNCATE and mapping-table access are absent.
- [x] Re-audit Home, Wallet, Transactions, Profile, Settings, Notifications, Auth, and NasrinAI controls against current source; fixed misleading Plan & Usage navigation and added visible unavailable states for unsupported settings.
- [x] Add modal keyboard handling: initial focus, Tab/Shift+Tab focus containment, Escape dismissal, and focus restoration.
- [ ] Verify legal contact/operator identity and retention language with the service operator/legal reviewer before production.
- [x] Verify current PR head CI: GitHub Actions run 40812940506 completed successfully on commit 9994eb1dec71ca487b34d57b062091c276490432; the verify job's test and production-build steps succeeded. The package build lifecycle runs typecheck and the test suite before bundling.
- [ ] Re-run current-head CI after the accessibility and settings changes, then verify Supabase RLS checks and live deployment behavior.

## Controls requiring follow-up audit

- Notification push/email delivery and biometric lock are not backed by a delivery/native-device service; these controls are now disabled with explanatory copy.
- Plan/token management is not connected to a billing service; the profile no longer shows fabricated plan or usage values, and Settings marks Plan & Usage as unavailable instead of navigating to an unrelated screen.
- App language, card style, date format, currency selection, and quiet hours are read-only and labelled as single-option/unavailable rather than fake controls.
- Connected account rows no longer imply Apple/Facebook linking; only Google sign-in is implemented.
- Cloud sync follows authenticated cloud mode and is not presented as a freely toggleable switch when a cloud session is active.
- Actual bank linking, real money movement, card blocking, issuer spending limits, push/email delivery, biometric lock, automated categorization, and a Help Center remain unsupported.
- Local/demo financial records are not guaranteed to persist in the deployed main build; do not rely on them as a backup.
- NasrinAI upstream authentication is still known to return HTTP 401 in production logs; safe key-format diagnostics are in the PR, but a successful authenticated request is still required. See docs/NASRINAI_MOVO_INTEGRATION.md.
- Production migration 20261029032314_revoke_excess_table_privileges has been applied; the current-head frontend CI and deployment checks are still pending.

## Security invariants

- Keep financial context opt-in and limited to the signed-in user's own records.
- Keep upstream API keys and service-role keys server-side; never render or log them.
- Preserve ownership checks, Supabase RLS, no-store/noindex chat responses, and user-isolated conversation mappings.
- Do not put real financial records or credentials in fixtures, tests, documentation, or logs.
