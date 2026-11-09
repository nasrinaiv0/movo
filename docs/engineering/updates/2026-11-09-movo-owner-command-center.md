# MOVO Owner Command Center — implementation and release handoff (2026-11-09)

## Implementation
- New customer-isolated route: `/owner`, lazy-loading `src/owner/OwnerConsole.js` and `OwnerConsole.css` via `src/index.tsx`.
- Flat premium UI, consistent cards and compact padding, adaptive light/dark colors, no gradients, responsive 390px / 768px / 1440px layouts, scrollable tables, 12 navigation modules, private MFA authentication.
- New backend endpoint `/api/owner`: GET dashboard/analytics/billing/users/grants/security/health and restricted owner workspaces; POST audited grant/revoke and operational work item create/update. Provider feeds remain explicitly unintegrated.
- Owner access requires **all three**: valid Supabase user access token, UID present in *server-only* `MOVO_OWNER_USER_IDS`, and signed JWT claims with `aal2`. The browser's own subscription or editable profile flags never authorize owner API access.
- Enforce service-role-only transactional grant/revoke with SQL migration `20261108232950_owner_console_security_audit.sql`, installed **after** `20261108230330_owner_manual_plan_grants.sql`. Never grant execute to authenticated users. Owner audit entries are immutable to app roles.
- Manual Pro and Pro+ entitlements expire and can be revoked. Grant form requires reason and confirmation; revoke form requires a fresh reason and confirmation.
- User emails are masked in the UI; the API returns only limited user metadata. No owner endpoint enumerates customers' financial transactions or returns purchase tokens.
- Dashboard graph bars are computed only from database-backed counts (which may represent records rather than active users). Metrics from unsupported integrations must say "Not connected"/"Unavailable".
- Read-only billing ledger includes limited verified Apple/Google entitlement rows. It is **not** revenue, balance, or store settlement data.
- Health reports only backend/database reachability. Real deployment health, crashes, payment settlements, analytics cohorts and cloud reconciliation telemetry are **not yet wired**.
- Operational modules for Sync, Support, Compliance, Announcements, Settings and Health now have **functional private work queues** with create, status/priority edit, notes, and filter controls. Every create/update is transactional with an immutable owner audit entry and timestamp-based stale-write protection. These are OWNER TASKS, not public feature-flag publishing, announcements, support ticket ingestion, or third-party provider integrations.
- This is a usable 12-section OWNER WORKSPACE, not a claim of 12 fully integrated production services.

## Vercel owner configuration
Set `MOVO_OWNER_USER_IDS` in the **server** project environment, comma-separated Supabase Auth `user.id` UUIDs. Leave blank to intentionally disable the owner API. **Never** use a browser-prefixed environment variable or plaintext owner passwords. No owner UID was configured in live Vercel during this task.

Existing server environment keys must be configured and privately verified:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only)
- `REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_ANON_KEY` (public only)
Actual values have not been read or exposed.

Owners need a verified Supabase Auth account, and a working TOTP second factor. `/owner` is a separate **route** on MOVO's origin; a new owner subdomain was NOT created. A separate hostname requires an independently verified Vercel project and DNS configuration.

## API contract
- `GET /api/owner?view=overview|analytics|billing|users|grants|security|health|sync|support|compliance|promotions|settings`
- `GET /api/owner?view=users&page=2` (50 per page)
- `GET /api/owner?view=sync|support|compliance|promotions|settings|health` (latest 100 scoped owner work items)
- `POST /api/owner` JSON: `{action:"grant",userId:"<UUID>",tier:"pro|pro_plus",days:30,reason:"..."}`
- `POST /api/owner` JSON: `{action:"revoke",userId:"<UUID>",grantId:"<UUID>",reason:"..."}`
- `POST /api/owner` JSON: `{action:"work_create",area:"support",title:"...",notes:"...",priority:"high"}`
- `POST /api/owner` JSON: `{action:"work_update",id:"<UUID>",expectedUpdatedAt:"<ISO timestamp>",status:"blocked",priority:"critical",notes:"..."}`
- All requests require `Authorization: Bearer <real Supabase access token>`. Never pass service-role keys in browsers or requests.
- Apply third migration `20261109000432_owner_operations_workspaces.sql` only AFTER `20261108232950_owner_console_security_audit.sql`. No customer-side RLS access is granted. `scripts/test-plan-migration.py` exercises all three migrations on an isolated PostgreSQL database.
- Migrations and RLS must be tested against a schema-matched staging database and deployed through the approved process. Existing November 9 production plan-migration drift is a **release blocker**.

## Tests and safeguards
- Vercel Sandbox project `movo`, name `movo-owner-console-20261109`, isolated PostgreSQL 18.6 and Chromium 157.
- Frontend suite **947/947** passed (159 suites) on the feature branch after operational modules were added. TypeScript and optimized CRA compilation passed in Vercel Sandbox.
- Isolated SQL `scripts/test-plan-migration.py` passed: plan grants, owner grant/revoke, immutability, and no client-side privilege escalation.
- Browser tests used dummy Supabase credentials and **intercepted** fake owner API responses inside the Sandbox only. No customer data or real service credentials were used. Repro script: `scripts/ui-qa/owner-console.cjs` (requires an isolated Playwright + Google Chrome test setup).
- Browser Chrome 157 at 390px mobile, 768px tablet and 1440px desktop: dashboard shows four database-count cards, user controls navigate, unsafe grant confirmation stays disabled, operational item form opens and accepts input, and no page-level overflow or obstructed controls were observed in these flows.
- Original customer splash intercepted owner interactions in browser QA. Fixed by removing the customer-only splash on the /owner route before rendering.
- Tests are not evidence of production data accuracy, live OAuth/MFA enrollment completion, full mobile Safari verification, subscription reconciliation, paid store API integrations, or production launch.
- No live Supabase migrations, Vercel env changes, PR merge, or commercial release performed.

## Release gate
1. Merge or replay base PR #252 safely; verify migration ordering and schema drift before database deployment.
2. Run isolated migration verification on a schema-matched database and inspect Supabase security advisors.
3. Configure actual owner UUID allowlist privately, enroll verified MFA, test both allowed and denied real accounts.
4. QA browser and iOS Safari, contrast and keyboard navigation; verify no owner splash overlay.
5. Verify store and manual grants coexist and revocation affects effective access without overwriting purchase receipts.
6. Connect real Vercel, Apple/Google, Supabase and telemetry sources for the remaining modules; operational work queues are not replacements for external service APIs, and no simulated data may be displayed as live.
7. Promote only after CI, security, rollback, and access-control review.

## Rollback
Revert the /owner entrypoint and owner API and leave manual grant rows intact until they are reviewed. The owner security migration is additive; do not DROP audit tables or delete existing grants as a rollback shortcut. Explicitly revoke grants through the audited RPC instead.
