# MOVO context-isolation hardening — 2026-10-30 13:08 Asia/Manila

## PR #56 — missing-credential fail-closed guard and live-isolation blocker — 2026-10-30 13:08 Asia/Manila

- Code/test head before main reconciliation: `ebb9156c9ee53507f577c468aea3c47d70e98501`.
- Added server-side fail-closed handling for a missing/blank `NASRINAI_API_KEY`: trim the environment value, return a generic HTTP 503 before database access or upstream fetch, and persist no chat messages. The regression test confirms the missing-key path has no upstream call and no chat writes.
- Exact-head GitHub Actions run [41004999162](https://github.com/nasrinaiv0/movo/actions/runs/41004999162) passed **18 suites / 104 tests**, TypeScript typecheck, production-only audit (**0 production vulnerabilities**), and production build. The exact-head preview [dpl_3a9cpyAxbi6czd3He8sPwFbxDKYw](https://vercel.com/nasrin-ai/movo/3a9cpyAxbi6czd3He8sPwFbxDKYw) is READY; root HTTP 200.
- This guard only handles absent/blank configuration. It does not resolve the previously observed upstream HTTP 401 when a non-empty credential is rejected. Logs showed 8 upstream 401s, last at 2026-10-29 15:37:46 UTC; no credential value was read or logged.
- The authenticated preview API request was blocked by Vercel Authentication before reaching the application endpoint. No authenticated live POST or unrelated-project canary has been completed. Keep issue #47 open and PR #56 draft.
- Fresh read-only Supabase evidence on main: RLS enabled on all 7 checked tables; 22 policies across six user-facing tables reference `auth.uid()`; no checked `anon`/`PUBLIC` grants; upstream mapping grants remain service-role-only. Security Advisor still warns leaked-password protection is disabled; the no-policy warning for the server-only mapping is informational/intentional.
- Full dependency tree remains at 34 findings (16 low, 5 moderate, 13 high). Terms/Privacy still warn about missing formal controller/operator identity/address, fixed retention schedule, complete provider disclosures, and jurisdiction review.
- Main reconciliation below changes documentation only; re-run exact-head CI/preview checks on the resulting merge commit before considering further lifecycle changes.

## Required next validation
1. Re-run full CI and preview build after the documentation-only main reconciliation.
2. Obtain authorized Vercel preview access or an authenticated synthetic test session; run the MOVO-scope POST and unrelated-document canary.
3. If the upstream rejects the non-empty service credential, have the owner verify/reissue it in the authorized NasrinAI control plane. Never retrieve/log the credential value.
4. Verify no canary leaks into retrieval, provider prompt, response, transcript, cache, retries, or logs; verify account switch and sign-out/sign-in behavior.
