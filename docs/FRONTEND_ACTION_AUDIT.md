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
- [x] Include transfer records in the in-app notification feed and add regression coverage for transfer-specific notices.
- [x] Label in-app income, expense, and transfer notices as recorded entries rather than implying that MOVO verified a payment or moved money.
- [x] Sort Transfers by the actual source/target account names and show the route in transaction metadata; use neutral “Account” wording in notification details.
- [x] Rename the Transactions action control to match its actual Quick actions sheet and protect CSV exports from spreadsheet formula injection; delay object-URL revocation for browser download compatibility.
- [ ] Obtain and publish the formal controller/operator legal name and registered address; review the privacy contact, provider/retention details, lawful bases, and jurisdiction-specific language with qualified counsel before production. The legal pages now disclose this unresolved identity requirement rather than implying the controller is identified.
- [x] Verify the latest source-code head `3809a24c1cf12b67d55f2fcb5e6f8bc223a7aa57`: GitHub Actions run `40814024273` passed; 10 test suites and 47 tests passed, the production bundle compiled, and the build lifecycle's typecheck passed before bundling.
- [x] Run a read-only production Supabase catalog check on 2026-10-29: RLS is enabled on profiles, financial accounts, transactions, budgets, and NasrinAI chat tables; user-owned tables have ownership policies; the upstream conversation mapping has no browser-role grants and intentionally has no client policies; browser roles have no TRUNCATE, TRIGGER, or REFERENCES grants.
- [ ] Verify deployed preview behavior. Both automatic and manually triggered Vercel preview deployments were cancelled by the project's ignored-build step. The currently READY production deployment is still on `main` commit `07e3ec9f6724a0e526f94a6a3a288fff624681bf`, so it does not validate this PR's UI changes.

## Controls requiring follow-up audit

- Notification push/email delivery and biometric lock are not backed by a delivery/native-device service; these controls are now disabled with explanatory copy.
- Plan/token management is not connected to a billing service; the profile no longer shows fabricated plan or usage values, and Settings marks Plan & Usage as unavailable instead of navigating to an unrelated screen.
- App language, card style, date format, currency selection, and quiet hours are read-only and labelled as single-option/unavailable rather than fake controls.
- Connected account rows no longer imply Apple/Facebook linking; only Google sign-in is implemented.
- Cloud sync follows authenticated cloud mode and is not presented as a freely toggleable switch when a cloud session is active.
- Actual bank linking, real money movement, card blocking, issuer spending limits, push/email delivery, biometric lock, automated categorization, and a Help Center remain unsupported.
- Local/demo financial records are not guaranteed to persist in the deployed main build; do not rely on them as a backup.
- NasrinAI upstream authentication is still known to return HTTP 401 in production logs; safe key-format diagnostics are in the PR, but a successful authenticated request is still required. See docs/NASRINAI_MOVO_INTEGRATION.md.
- Production migration `20261029032314_revoke_excess_table_privileges` is applied. The latest source-code head passed CI; the Vercel preview remains unverified because it was cancelled.
- GitHub Actions dependency installation reports 34 npm audit findings (16 low, 5 moderate, 13 high). Review and remediate dependency upgrades in a dedicated change; do not blindly run `npm audit fix --force`.
- Supabase Security Advisor reports leaked-password protection is disabled. Enable it in Supabase Auth before production sign-off; this frontend PR does not change that project setting.
- Supabase Security Advisor flags `movo_ai_upstream_conversations` for RLS-without-policy. This is intentional server-only isolation: browser roles have no grants, so do not add a client policy merely to silence the informational warning.
- Supabase Performance Advisor reports seven unused indexes; review query evidence before considering any removal.

## Security invariants

- Keep financial context opt-in and limited to the signed-in user's own records.
- Keep upstream API keys and service-role keys server-side; never render or log them.
- Preserve ownership checks, Supabase RLS, no-store/noindex chat responses, and user-isolated conversation mappings.
- Do not put real financial records or credentials in fixtures, tests, documentation, or logs.
