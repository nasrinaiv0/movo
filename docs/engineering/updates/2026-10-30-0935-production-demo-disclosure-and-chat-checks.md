# Production demo disclosure and chat-isolation checks — 2026-10-30 09:35 Asia/Manila

This is a MOVO-only audit update. It records observed evidence and unresolved gates; it does not change production data, Supabase configuration, or provider secrets.

## Production demo disclosure and current release gates — 2026-10-30 09:35 Asia/Manila

### Merged and production-verified
- PR #57 merged as `bb30c8e87722e51d0df07eef8031ebc5435b4093`. It moves the CRA build tool out of runtime dependencies and adds a production dependency audit gate. Exact-head GitHub Actions run [40982977495](https://github.com/nasrinaiv0/movo/actions/runs/40982977495) passed; `npm audit --omit=dev --audit-level=moderate` found **0 production dependency vulnerabilities**. The full install tree still reports **34 findings (16 low, 5 moderate, 13 high)**, largely in the CRA/build toolchain; this is not fully remediated.
- PR #59 merged as `277051e4ec2216a6b598c784a50b32ba37b89dee`. It replaces the unauthenticated demo's owner-like name/email with a generic demo identity and adds an accessible, responsive disclosure that the balances/transactions are fictional, not bank-linked, and not saved/synced as personal records. Its Sign in action is functional and the notice is hidden on sign-in/legal screens and in cloud mode.
- Production deployment [dpl_FRVNFKYmKHcrhnfvF8uhi7fwELVh](https://vercel.com/nasrin-ai/movo/FRVNFKYmKHcrhnfvF8uhi7fwELVh) is READY for the PR #59 merge SHA. Playwright Chromium against `https://movo.nasrinai.com` returned HTTP 200; the notice and generic demo identity were visible, neither `Nasrin Abubakar` nor `nasrin@nasrinai.com` appeared, there was no horizontal overflow at 390px, Sign in worked, Terms of Service and Privacy Policy opened/cross-linked, and no browser console/page errors or failed requests were recorded.
- Additional preview smoke verified Home, Wallet, Transactions, NasrinAI, Profile, Settings, Notifications, Search dialog open/Escape close, and Profile navigation without browser errors.
- A synthetic production POST to `/api/nasrinai/chat` with the allowed production origin but no Authorization header returned HTTP 401 `sign_in_required`. No user token, financial record, or provider secret was used.

### NasrinAI isolation: still a release blocker
- MOVO PR #56 exact head `36c486424a2f37591edb13d5a43936140515e217` passed GitHub Actions [40985264768](https://github.com/nasrinaiv0/movo/actions/runs/40985264768): **18 suites / 101 tests**, typecheck, production dependency audit, and production compilation. Its exact-head preview [dpl_BFQWqa1kAJu8mCpqMs3btR9j9ydj](https://vercel.com/nasrin-ai/movo/BFQWqa1kAJu8mCpqMs3btR9j9ydj) is READY.
- Added API-handler regression tests: unconfirmed scope returns 502 without persisting user/assistant messages; confirmed MOVO scope persists the authenticated user's turn; a conversation ID not owned by that user returns 404 before contacting upstream.
- Upstream NasrinAI PR #699 is merged. The latest NasrinAI production deployment is READY at commit `b39f4dcd62641d5f601e4e707cb46155ca8e135e`; source search at that deployed SHA finds the server-enforced `context_scope: "movo"` implementation in `src/chat.js`. This is deployment/source evidence, not a successful MOVO-authenticated request.
- The exact-head MOVO preview API could not be exercised through its protected route: Vercel SSO intercepted direct requests, and a browser request from the preview origin was rejected by the origin allowlist before reaching the auth gate. Production's no-token 401 is useful security evidence but does not prove the PR #56 scoped integration.
- **Do not merge PR #56 or close issue #47** until an authenticated end-to-end request proves the upstream returns the explicit MOVO scope marker and a synthetic unrelated-document canary is excluded from retrieval, provider prompt, response, transcript, caches, and logs. Do not expose/print/rotate keys without an authorized secret update.

### Open PRs and verification boundaries
- PR #43 (finance/currency) and PR #52 (chart formatting/validation) remain draft. Their automated source/test checks passed on their recorded heads, but authenticated finance writes, mixed-currency behavior against owned data, and chart provenance/rendering remain unverified.
- PR #55 (control/accessibility audit) remains draft and is currently reported as not mergeable against the newer main. Reconcile its branch with PR #59's demo disclosure and current main before considering merge. Static audit and automated tests do not replace interactive keyboard/screen-reader checks.
- PR #58 is the documentation reconciliation PR and should include this latest snapshot before merge.

### Remaining security/legal gates
- Read-only Supabase checks still show RLS enabled on the seven checked public profile/finance/chat tables, with 22 owner-scoped policies across the six user-facing tables and no `anon`/`PUBLIC` grants in the checked set. `movo_ai_upstream_conversations` intentionally remains server-only with `service_role` access and no browser policy.
- Supabase leaked-password protection is still disabled; enable it through authorized Auth settings and recheck the Security Advisor.
- Terms of Service and Privacy Policy navigation is now browser-verified in production, but publication warnings must remain until the operator/data-controller identity and address, actual retention/deletion schedule, provider/data-recipient disclosures, and jurisdiction-specific wording are verified. Do not invent legal facts.
- Full-tree dependency findings, authenticated finance/chat flows, CSV import/export, complete keyboard/focus and screen-reader behavior remain release gates.
- No database schema, RLS/grants, production financial data, or secrets were changed by the demo-disclosure implementation or this audit update.

## Reproducible checks

- Playwright Chromium smoke against the deployed production custom domain and the exact-head PR #59 preview; desktop 1440px and mobile 390px.
- Production-only dependency audit: `npm audit --omit=dev --audit-level=moderate` → `found 0 vulnerabilities`.
- Exact-head PR #56 GitHub Actions run [40985264768](https://github.com/nasrinaiv0/movo/actions/runs/40985264768).
- Read-only Supabase catalog/security observations recorded in the prior audit trail; no writes were made in this pass.

## What is not proven

- No authenticated end-to-end chat POST was made through the exact PR #56 deployed handler.
- No cross-user/project canary was run against live retrieval, provider prompt, transcript, cache and logs.
- No real user financial data was read or written during browser smoke.
- No legal facts were inferred or invented; the Terms/Privacy publication warning remains.
