# MOVO Frontend Functionality & Legal Readiness

## Purpose
Track implementation and verification of every user-visible control and legal page. Do not mark a control complete based on appearance alone.

## Control audit checklist
- [ ] Home dashboard actions, period selectors, show/hide balance, quick actions, and recent-transaction navigation
- [ ] Wallet: add/edit/archive account, card details, account filters, search, and empty/error/loading states
- [ ] Transactions: add/edit/delete, search, filters, sort, month selection, CSV import/export, duplicate handling, validation, and confirmation dialogs
- [ ] NasrinAI: authentication gating, explicit consent, send/retry, loading/error states, conversation history, clear/new conversation, and privacy-safe server proxy
- [ ] Profile: edit/save/cancel, profile controls, sign-in/sign-out, and account state
- [ ] Settings: preferences persist across reloads; every toggle reflects a real capability; unsupported capabilities are clearly described rather than silently pretending to work
- [ ] Appearance: theme, accent, custom color, compact mode, category colors, and system theme changes
- [ ] Notifications: filters, read/unread, mark all read, detail navigation; delivery channels must not claim real push/email delivery unless implemented
- [ ] Accessibility: keyboard operation, visible focus, labels, dialog semantics, contrast, reduced-motion behavior, mobile layout, and actionable error messages
- [ ] No dead links, placeholder buttons, fake success states, unhandled promise rejections, or console errors

## Legal pages
- [x] public/terms.html — Terms of Service drafted
- [x] public/privacy.html — Privacy Policy drafted
- Pages are marked noindex because this is a private finance workspace. This is not an authorization boundary.
- The operator must validate real deployment data flows, retention, provider contracts, contact channel, and jurisdiction-specific requirements with qualified counsel before treating the policies as final.
- [x] Link legal pages from sign-in, Profile > About, Settings, NasrinAI consent, and Help Center.
- [ ] Review final wording against actual production data flows and qualified legal guidance.

## Required verification before completion
1. Run npm run typecheck.
2. Run the complete npm test -- --runInBand suite.
3. Run npm run build (including configured prebuild checks).
4. Review CI on the latest PR head and fix any failures.
5. Check security/RLS isolation and confirm secrets do not appear in client bundles.
6. Test the deployed app on a mobile viewport and verify critical flows end-to-end where deployment access allows.
7. Report any blocked or unverified live integration honestly.