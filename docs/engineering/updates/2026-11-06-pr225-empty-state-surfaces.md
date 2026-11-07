# MOVO PR #225 — Remove horizontal backgrounds from empty-only lists

Date: 2026-11-06

## User reference
The Scheduled screen showed long rounded pill backgrounds behind static no-record messages: no scheduled payments/transfers, no upcoming/overdue obligations, and no reminder activity. Similar empty-list cards recur in Cashback, Bills, Wallet and other MOVO screens.

## Implementation
- When a record card has only its empty-message paragraph, drop decorative background, border, box shadow, blur, padding capsule and pseudo-element hairline. Do not remove the textual message or translation.
- For an empty category list with no entries, suppress its list's decorative card, and hide truly childless list cards.
- Restrict selectors to empty-record shapes with direct-child `:has()`, `:only-child`, and `:empty`; leave active lists, chart panels, forms, controls and CTA/onboarding cards unchanged. Preserve adaptive colors and reading order.
- Add `src/components/EmptyRecordSurfaces.test.js` to check conditions and protection of populated rows.

## Verification
Vercel Sandbox: `npm ci`; 109 test suites / 622 tests; typecheck; production build; `git diff --check` passed. Rebased PR CI and preview require independent confirmation.
