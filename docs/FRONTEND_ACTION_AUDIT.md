# MOVO Frontend Action Audit

Last updated: 2026-10-29

This audit is a working register, not a claim that the entire frontend is complete. Each visible control must either perform a verified action or be visibly disabled with a clear reason. Re-check the live branch and deployment after every meaningful change.

## Current increment: legal access and honest feature status

- [x] Add in-app Terms of Service and Privacy Policy pages with effective date, local/cloud mode boundaries, AI consent disclosure, privacy requests, and support contact.
- [x] Add legal-page navigation and cross-links.
- [x] Link legal pages from profile About, Settings, authentication onboarding, and NasrinAI financial-context consent.
- [x] Remove misleading static plan/token figures from the profile flow and identify plan management as unavailable.
- [x] Route Settings > Privacy & Data to the Privacy Policy instead of unexpectedly toggling balance visibility.
- [ ] Validate all frontend controls across Home, Wallet, Transactions, Profile, Settings, Notifications, Auth, and NasrinAI on the current PR head.
- [ ] Verify legal contact/operator identity and retention language with the service operator/legal reviewer before production.
- [ ] Verify current-head CI, typecheck, tests, production build, Supabase RLS checks, and live deployment behavior.

## Controls requiring follow-up audit

- Notification push/email delivery and biometric lock are not backed by a delivery/native-device service; these should be disabled with explanatory copy rather than implying delivery/security behavior.
- Plan/token management is not connected to a billing service; do not show fabricated plan or usage values.
- App language, card style, date format, currency selection, and quiet hours currently have only fixed-value informational behavior.
- Connected account rows must not imply Apple/Facebook linking unless those providers are implemented.
- Cloud sync is determined by authenticated cloud mode and should not be presented as a user-controlled switch unless disabling it truly stops sync.
- Local/demo financial records are not guaranteed to persist in the deployed main build; do not rely on them as a backup.
- NasrinAI upstream authentication is still known to return HTTP 401 in production logs; the UI integration must not be considered live-verified until a successful authenticated request is observed.

## Security invariants

- Keep financial context opt-in and limited to the signed-in user's own records.
- Keep upstream API keys and service-role keys server-side; never render or log them.
- Preserve ownership checks, Supabase RLS, no-store/noindex chat responses, and user-isolated conversation mappings.
- Do not put real financial records or credentials in fixtures, tests, documentation, or logs.
