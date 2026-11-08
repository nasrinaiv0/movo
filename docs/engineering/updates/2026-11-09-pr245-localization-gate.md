# MOVO — PR #245 localization CI gate repair (2026-11-09)

Generated all locale catalogs from the current feature branch's own 2,540-string catalog with `npm run i18n`, including version hash. This avoids committed missing-key drift after the new import confirmation and local-mode plan strings.

Verified in isolated Vercel Sandbox against PR #245 source `d4bac81d5e9ff40a00a93f705aa4039a399a1e74`:
- i18n catalog coverage suite: 2/2 passing, all 11 supported languages have matching placeholders.
- import, plan and walkthrough component suites: 15/15 passing.
- No production database, cloud records or subscription grants were modified.

Merge must still pass the exact new GitHub head's full CI and Vercel preview, with signed-in local isolation and iPhone Safari UI QA. PR #245 is a local-only import feature, not full bidirectional synchronization; PR #246 remains the release-gated dependent sync work. Local storage is not encrypted.
