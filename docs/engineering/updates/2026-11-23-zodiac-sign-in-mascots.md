# 2026-11-23 — Zodiac mascots for MOVO sign-in

## Purpose and implementation

- `src/components/ZodiacMascots.js` reuses the active MOVO Aries component and the twelve-sign ordering already used by Home themes. The other eleven signs get original vectors with warm faces, subdued colors and small details drawn to read at compact sizes.
- `src/components/ZodiacMascots.css` presents a monochrome, center-forward row and gives each sign a short entrance gesture. The sequence stops without user input and honors browser Reduce Motion and MOVO's native iOS Reduce Motion class.
- `src/components/AuthPanel.js` renders the decorative row at the bottom of the existing card. The feature adds no controls, tab stops or screen-reader announcements. The header Aries continues responding to sign-in states.
- `src/components/AuthPanel.test.js` checks the row's order, all twelve SVGs, the shared Aries component and its placement outside the input flow.

## Validation

- Local cloud sandbox, Node 26.13.1: all 266 Jest suites / 1,772 tests, type checking, prebuild checks, production bundling and offline-shell packaging pass. The separate focused auth, Aries and zodiac checks also pass (5 suites / 32 tests).
- The rendered artwork contact sheet and standalone vectors are checked separately from the app. The browser preview was unavailable in the sandbox.
- The published PR head requires hosted checks. No physical-device release check is claimed here.

## Compatibility and rollback

The artwork is bundled with the shared web app and needs no additional package, media request or external service. No authentication, consent, API, schema, RLS, billing, store entitlement, storage or financial logic changed. Revert this change to remove the sign-in row and its artwork. It has no persisted state or data to migrate.
