# Handover preservation review — 2026-11-20

The owner requested execution of the ChatGPT-to-cloud handover without destroying or changing MOVO's structures. Repository review found three historical engineering handoffs and the November 20 audit. The external chat's exact file/link has been requested; it is not treated as read. Historical handoffs now point to the current execution matrix while retaining their original evidence.

## Focused fixes

The old documentation still directed agents to the shared preference key, email/password sign-in and superseded rollout work. Updated CLAUDE guidance and README to match the scoped-preference implementation, passwordless authentication and already approved/deployed #328 accounting migration. Historical financial-planning pricing proposals remain historical, not new implementation instructions.

Two new synthetic App regressions failed against the preceding #330 source: clearing B erased A/guest preference copies, and a delayed clear initiated by A reset B after a switch. The fix preserves other preference envelopes and unassigned recovery keys, retains their in-memory copies, and checks the captured owner/session generation before applying asynchronous destructive results. A confirmed-owner check already developed in #291 is reused in the deletion client with its regression tests; the HTTP method, endpoint and body remain unchanged. Additional coverage verifies a late account-deletion response and a switch during local cleanup cannot disable B's preference editing.

## Preservation boundary

No database migration, table/column change, RLS/grant change, dependency change, framework replacement, native production-code change, screen replacement or financial-record conversion is included. Accounting calculations, record IDs, transaction routing, import formats and the existing navigation are retained. The Android change in the complete PR is restricted to its disposable test fixture. No customer deletion/reset or production configuration change was executed during this review.

Preference preservation is not certification of all legacy erasure paths. Legacy unscoped attachment cleanup, resumable server deletion, retention rollout, signed upgrades and physical/store acceptance remain explicit gates in #274/#291 and the execution handover. No permission for those production migrations is inferred here.

## Validation

The preceding source passed 253 suites / 1,658 tests, strict production build, TypeScript and local Chromium recovery/focus/restart at 320/390/1280 px with external requests blocked. Hosted iOS, Android, web, SQL and security checks passed. The paired emulator lost its ADB device during Wallet acceptance after successful seed/vault checks; that failed attempt is not acceptance and was rerun unchanged.

The follow-up passed focused reset/deletion regressions. Full current-source tests, typecheck, strict production compilation and fresh hosted checks are recorded on #330. Existing mocked tests and local Chromium are not real two-account Supabase or signed-device evidence.
