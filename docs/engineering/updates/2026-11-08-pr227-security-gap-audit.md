# PR #227 security re-audit — 2026-11-08

PR #227 remains DRAFT and unmerged; do not treat Android CI success as a native security certification.

- Isolated Vercel Sandbox (`movo-security-audit-pr227-20261108`) checked the exact PR head: typecheck, 644/644 tests (113 suites), optimized build all pass.
- Android debug + unsigned R8 release CI passed; iOS workflow has a canceled job; physical signed-device tests still pending.
- `main` is 34 commits ahead; read-only merge test finds conflicts in `src/App.js`, `docs/PR_PROGRESS.md` and `docs/engineering/MASTER_CHANGE_LEDGER.md`.
- Live MOVO Supabase security metadata: RLS enabled on 28/28 public tables; 12 authenticated-executable SECURITY DEFINER finance RPCs; all 12 mention auth.uid, user_id and search_path, but no independent cross-user negative tests; leaked-password protection disabled. Deny-all RLS mapping table has no policy (confirm intended).
- Native auth legacy deletion errors are swallowed by cleanup helper, so claim of guaranteed plaintext scrubbing is overstated; new review gates demand retry/cleanup/device testing.
- `main` currently reports branch protection disabled. Require CI checks, review and current-main integration before merge.
- No production mutation or database changes in this audit; detailed 22-control assessment in `docs/security/PR227_GAP_AUDIT_2026-11-08.md`.
