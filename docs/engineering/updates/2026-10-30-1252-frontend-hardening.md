# MOVO frontend hardening — 2026-10-30 12:52 Asia/Manila

## Latest exact-head implementation checkpoint — 2026-10-30 12:52 Asia/Manila

### PR #56 — MOVO-only NasrinAI context isolation
- Current validated head: `ebb9156c9ee53507f577c468aea3c47d70e98501`.
- Added a fail-closed configuration guard: the server trims `NASRINAI_API_KEY`; an absent or whitespace-only value returns a generic HTTP 503 before database access or upstream fetch.
- Added a regression test proving the missing-key path makes no upstream request and persists no chat messages.
- GitHub Actions run [41004999162](https://github.com/nasrinaiv0/movo/actions/runs/41004999162) completed successfully: **18 suites / 104 tests passed**, TypeScript typecheck passed, production-only npm audit reported **0 production vulnerabilities**, and the production bundle compiled successfully.
- Exact-head Vercel preview [dpl_3a9cpyAxbi6czd3He8sPwFbxDKYw](https://vercel.com/nasrin-ai/movo/3a9cpyAxbi6czd3He8sPwFbxDKYw) is **READY**; the preview root returned HTTP 200.
- The guard improves missing-configuration behavior but does not resolve an upstream HTTP 401 for a non-empty credential that the upstream rejects. Vercel logs previously recorded 8 upstream 401s, last at 2026-10-29 15:37:46 UTC. A one-hour runtime-error check on this run returned no new error groups; that absence is not evidence that chat works.
- The authenticated preview API request was blocked by Vercel Authentication before reaching the application endpoint. No authenticated live POST, upstream scope confirmation, or unrelated-project canary was completed. Issue #47 stays open; PR #56 stays draft.

### PR #60 — unsupported Settings controls
- Current validated head: `f063cd5a1f4be085aac34f947816bfdffe2c8a82`.
- Added regression coverage for Push Notifications, Email Notifications, Face ID/Touch ID, Local Storage, and Auto Categorization. Each must be disabled and have its visible explanation associated through `aria-describedby`. The same test confirms In-App Alerts remains enabled and updates its preference.
- GitHub Actions run [41005003149](https://github.com/nasrinaiv0/movo/actions/runs/41005003149) completed successfully: **20 suites / 113 tests passed**, TypeScript typecheck passed, `audit:controls` passed, production-only npm audit reported **0 production vulnerabilities**, and the production bundle compiled successfully.
- Exact-head Vercel preview [dpl_2jdQniZNbdppvmTQ88JcYyfuqGWb](https://vercel.com/nasrin-ai/movo/2jdQniZNbdppvmTQ88JcYyfuqGWb) is **READY**; the preview root returned HTTP 200.
- Automated tests do not replace keyboard-only/focus, screen-reader, responsive, and authenticated finance-flow checks. PR #60 stays draft until these gates are completed.

### Security and release boundary
- The full dependency-tree audit still reports **34 findings (16 low, 5 moderate, 13 high)**. The zero-vulnerability result is limited to the production dependency tree; no broad forced upgrade was applied.
- Previously recorded read-only Supabase catalog evidence remains the latest available snapshot: RLS enabled on the seven checked public tables, 22 policies across six user-facing tables referencing `auth.uid()`, no checked `anon`/`PUBLIC` table grants, and the upstream mapping restricted to server-side service-role access. No database schema, RLS policy, grant, Auth setting, financial record, or secret was changed in this run.
- Supabase leaked-password protection remains an owner-authorized configuration blocker. Repository branch protection was previously found disabled with no required status checks; no branch-governance write action is available through the connected GitHub tools.
- Terms and Privacy Policy remain linked and explicitly warn that formal controller/operator identity and address, a fixed retention/deletion schedule, complete provider/data-recipient details, and jurisdiction-specific review are outstanding. Do not invent those legal facts.
- Authenticated cloud finance/CSV/currency-isolation verification, chart provenance against authorized records, the upstream MOVO-scope canary, and interactive accessibility QA remain unverified.
- No database schema/RLS/grants, production financial records, Auth settings, provider secret, or separate NasrinAI repository was changed in this run.

### Next actions
1. Obtain an authorized, valid MOVO service credential through the NasrinAI owner/control plane and verify a successful authenticated request without logging the credential.
2. Run the synthetic unrelated-document canary across retrieval, prompt, response, transcript, cache, retries, and logs; verify missing scope fails closed.
3. Verify signed-in financial CRUD, CSV import/export, currency isolation, and chart provenance with synthetic user-owned records.
4. Complete interactive keyboard/focus, screen-reader, and responsive checks for all visible controls.
5. Have the owner/legal reviewer supply missing publication facts; enable leaked-password protection and required branch checks through authorized project settings.


## Fresh Supabase read-only security recheck — 2026-10-30 12:54 Asia/Manila

- Catalog query: RLS is enabled on **7/7 checked public tables**: profiles, financial_accounts, transactions, budgets, movo_ai_conversations, movo_ai_messages, and movo_ai_upstream_conversations.
- The six user-facing tables have **22 policies**; each checked policy expression references `auth.uid()`. The upstream mapping has no client policy.
- `information_schema.role_table_grants` returned **73 grants** for `authenticated` and `service_role` across the checked tables, with **no `anon` or `PUBLIC` grants** in the checked set. The upstream mapping grants are limited to `service_role`; do not add a client policy/grant.
- Fresh Security Advisor findings: `auth_leaked_password_protection` remains WARN (disabled); `rls_enabled_no_policy` for the server-only upstream mapping remains INFO and intentional. Performance Advisor reports seven unused indexes; no index was dropped without query evidence.
- This was a read-only metadata/advisor check. No schema, RLS policy, grant, Auth setting, financial row, or secret was changed.
