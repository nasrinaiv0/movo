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
- [x] Verify source-code head `80c5c257ce7348b4e645e9a14b16c37b73d37867` through the Vercel preview build: `tsc --noEmit` completed, 11 test suites and 49 tests passed, and the production bundle compiled successfully. GitHub Actions push run `40819172799` and PR run `40819177992` both completed successfully for this source-code head.
- [x] Run a read-only production Supabase catalog check on 2026-10-29: RLS is enabled on profiles, financial accounts, transactions, budgets, and NasrinAI chat tables; user-owned tables have ownership policies; the upstream conversation mapping has no browser-role grants and intentionally has no client policies; browser roles have no TRUNCATE, TRIGGER, or REFERENCES grants.
- [x] Verify the latest preview deployment for documentation head `d7c2314e4a731dcf24f26f565ebd151d24718ad9`: Vercel deployment `dpl_Xo7HUEgZNf1RyPTmCsGy8m8oz6Dm` reached READY on 2026-10-29; the preview root and JavaScript bundle returned HTTP 200, and the bundle contains Help Center, Terms, Privacy, and financial-consent UI text without server-side secret names or a NasrinAI secret-key pattern. Build logs confirm typecheck, 11 suites / 49 tests, and production compilation. This verifies the built preview, not a full interactive browser session or production deployment. The ignored-build-step setting was cleared after confirmed cancellation of earlier previews.

## Controls requiring follow-up audit

- Notification push/email delivery and biometric lock are not backed by a delivery/native-device service; these controls are now disabled with explanatory copy.
- Plan/token management is not connected to a billing service; the profile no longer shows fabricated plan or usage values, and Settings marks Plan & Usage as unavailable instead of navigating to an unrelated screen.
- App language, card style, date format, currency selection, and quiet hours are read-only and labelled as single-option/unavailable rather than fake controls.
- Connected account rows no longer imply Apple/Facebook linking; only Google sign-in is implemented.
- Cloud sync follows authenticated cloud mode and is not presented as a freely toggleable switch when a cloud session is active.
- Actual bank linking, real money movement, card blocking, issuer spending limits, push/email delivery, biometric lock, and automated categorization remain unsupported. An in-app Help Center now provides accurate guidance for current storage, export, consent, and notification behavior.
- Local/demo financial records are not guaranteed to persist in the deployed main build; do not rely on them as a backup.
- NasrinAI upstream authentication is still known to return HTTP 401 in production logs; safe key-format diagnostics are in the PR, but a successful authenticated request is still required. See docs/NASRINAI_MOVO_INTEGRATION.md.
- Production migration `20261029032314_revoke_excess_table_privileges` is applied. The latest validated preview build passed its embedded test/typecheck/build lifecycle; the matching GitHub Actions run is still pending.
- GitHub Actions dependency installation reports 34 npm audit findings (16 low, 5 moderate, 13 high). Review and remediate dependency upgrades in a dedicated change; do not blindly run `npm audit fix --force`.
- Supabase Security Advisor reports leaked-password protection is disabled. Enable it in Supabase Auth before production sign-off; this frontend PR does not change that project setting.
- Supabase Security Advisor flags `movo_ai_upstream_conversations` for RLS-without-policy. This is intentional server-only isolation: browser roles have no grants, so do not add a client policy merely to silence the informational warning.
- Supabase Performance Advisor reports seven unused indexes; review query evidence before considering any removal.

## Security invariants

- Keep financial context opt-in and limited to the signed-in user's own records.
- Keep upstream API keys and service-role keys server-side; never render or log them.
- Preserve ownership checks, Supabase RLS, no-store/noindex chat responses, and user-isolated conversation mappings.
- Do not put real financial records or credentials in fixtures, tests, documentation, or logs.


## Additional increment — in-app Help Center (2026-10-29)

- [x] Replace the unavailable Help Center row with a real in-app screen and navigation route.
- [x] Document current behavior without promising unimplemented persistence, bank connectivity, payment execution, or notification delivery.
- [x] Add a regression test for Settings → Help Center and its Privacy Policy cross-link.
- [ ] Reconcile PR #19 finance persistence/import changes before finalizing the local-storage disclosure; its branch is three commits behind and conflicts with current `main` changes to `src/App.js` and `src/App.test.js`.

## Dependency-install reliability follow-up (2026-10-29)

- [ ] Current-head CI failed during `npm install` before tests ran: the npm registry returned HTTP 404 for `@types/estree@1.0.10`, a version not listed as the published latest release in the registry's package page. A conservative npm override pins this transitive type package to published version `1.0.9`; subsequent Vercel installation and build completed successfully.

- [x] Correct the Help Center regression test to activate the row by its visible title; the first preview run showed the generic helper compared the row's full accessible text (title plus description) to the title alone. This was a test-selector mismatch, not a dead frontend action.

- [x] Align Help Center regression assertions with the actual visible copy (transfer records do not move money; local/demo records may be lost on refresh/close), avoiding false failures from wording mismatches.


## Current deployment and validation snapshot (2026-10-29)

- Source-code validation head: `3cfc23d079d1c39bca897425ef760a006937553b`. Earlier audit-only commits `d7c2314e4a731dcf24f26f565ebd151d24718ad9` and `ee57f37f5c67d99928e4b547dd6619c407685f64` also passed their checks.
- Vercel preview for source-code head `3cfc23d079d1c39bca897425ef760a006937553b` (deployment `dpl_GUiGKLB5sK969XTfWpwztY746onu`) reached READY. The preview [`movo-ycz2bgmz0-nasrin-ai.vercel.app`](https://movo-ycz2bgmz0-nasrin-ai.vercel.app) returned HTTP 200; build logs confirm `tsc --noEmit`, 11 suites / 50 tests, and successful production compilation. Earlier audit-only preview builds also passed.
- GitHub Actions runs `40819303718` (audit-only commit `d7c2314`) and `40819503245` (audit-only commit `ee57f37`) completed successfully; runs `40819172799` and `40819177992` passed for the earlier source-code head. Run `40819718693` for source-code head `3cfc23d` was still in progress when this snapshot was written; the matching Vercel build had already passed 50 tests, typecheck, and production compilation.
- The production domain still points to the existing `main` deployment; do not promote this PR to production until legal/security blockers and review of PR #19 are resolved.

- [x] Run a source-level control scan across 14 primary screen/component files: no literal `<button>` lacked a local click/submit handler or explicit disabled state, no `<a>` lacked an href/click handler, and no `<form>` lacked an onSubmit handler. This is a static scan, not proof of runtime behavior; the interaction tests and preview checks remain required.

- [x] Clarify Clear Local Data behavior: it resets preferences to defaults, removes local/demo records in the current session, and does not affect cloud records; add a regression test for the confirmation copy, preference reset, and sample removal.

## Additional increment — local finance persistence and CSV import (2026-10-29)

- [x] Persist manually entered transactions and manually created accounts in browser local storage; do not persist demo rows as user data.
- [x] Restore local records after reload/sign-out and prevent a saved user edit from duplicating a sample row with the same ID.
- [x] Add local account creation/edit/archive, transaction editing, and review-first CSV import with a 5 MB limit, validation, preview, duplicate fingerprints, and per-row errors.
- [x] Align Terms, Privacy Policy, and Help Center with actual browser-local persistence and its unencrypted, device-specific nature.
- [x] Add unit and UI coverage for local persistence, CSV parsing, account/transaction editing, and import review.
- [ ] Fresh final-head CI/preview verification is pending.
- [ ] Release blockers remain: publish verified controller identity/legal disclosures, enable leaked-password protection, review dependency audit findings, resolve NasrinAI upstream 401, and reconcile PR #24 without duplicating UI work.


## Scheduled implementation pass — 2026-10-29 06:05 UTC

- Fixed the failing Help Center assertion to match the user-visible storage disclosure. The latest source branch head `b3372ebeae44e01d41535d6e1f3cd30a8c655669` passed GitHub Actions run [40826868335](https://github.com/nasrinaiv0/movo/actions/runs/40826868335).
- Added a visible, accessible publication-readiness notice to both Terms of Service and Privacy Policy. It explicitly says the operator's formal legal identity/address and retention/provider disclosures are still unresolved; this is not a claim that the legal pages are final.
- Vercel preview deployment `dpl_EDfXkaJVe9hDyj61XJU9EStZtgct` reached READY for that same source head. This verifies a preview build, not production deployment or a complete real-browser end-to-end audit.
- Production catalog check on 2026-10-29 confirmed RLS remains enabled for profiles, financial accounts, transactions, budgets, and NasrinAI chat tables. The upstream conversation mapping has privileges only for `service_role`; browser roles have no grants. Keep its no-policy RLS warning as intentional server-only isolation; do not add a browser policy.
- Supabase Security Advisor still reports leaked-password protection disabled. The available project connector does not expose the Auth password-security toggle, so this setting remains a launch blocker requiring an authorized Supabase dashboard action.
- Main advanced six commits beyond the PR's merge base with Liquid Glass, motion, icon, and navigation refinements. PR #23 therefore cannot be merged as-is. A reconciliation branch is being prepared from current main, preserving the newer UI while carrying over the legal, privacy, finance, and action-audit work. Fresh CI is required for that reconciled tree.
- PR #19 overlaps the finance persistence/import files in the frontend completion branch; PR #22 overlaps the legal/help work. Do not merge those duplicate increments separately until the reconciled PR's tests and diff are reviewed.
