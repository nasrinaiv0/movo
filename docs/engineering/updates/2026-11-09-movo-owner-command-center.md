# MOVO Owner Command Center — implementation and release handoff (2026-11-09)

## Implementation
- New customer-isolated route: `/owner`, lazy-loading `src/owner/OwnerConsole.js` and `OwnerConsole.css` via `src/index.tsx`.
- Flat premium UI, consistent cards and compact padding, adaptive light/dark colors, no gradients, responsive 390px / 768px / 1440px layouts, scrollable tables, 12 navigation modules, private MFA authentication.
- New backend endpoint `/api/owner`: GET dashboard/analytics/billing/users/grants/security/health and stub responses for unintegrated modules; POST audited grant/revoke only.
- Owner access requires **all three**: valid Supabase user access token, UID present in *server-only* `MOVO_OWNER_USER_IDS`, and signed JWT claims with `aal2`. The browser's own subscription or editable profile flags never authorize owner API access.
- Enforce service-role-only transactional grant/revoke with SQL migration `20261108232950_owner_console_security_audit.sql`, installed **after** `20261108230330_owner_manual_plan_grants.sql`. Never grant execute to authenticated users. Owner audit entries are immutable to app roles.
- Manual Pro and Pro+ entitlements expire and can be revoked. Grant form requires reason and confirmation; revoke form requires a fresh reason and confirmation.
- User emails are masked in the UI; the API returns only limited user metadata. No owner endpoint enumerates customers' financial transactions or returns purchase tokens.
- Dashboard graph bars are computed only from database-backed counts (which may represent records rather than active users). Metrics from unsupported integrations must say "Not connected"/"Unavailable".
- Read-only billing ledger includes limited verified Apple/Google entitlement rows. It is **not** revenue, balance, or store settlement data.
- Health reports only backend/database reachability. Real deployment health, crashes, payment settlements, feature flags, support tickets, analytics cohorts, compliance evidentiary workflows and cloud reconciliation telemetry are **not yet wired**. Their navigation and placeholder pages are functional, but their external integrations remain pending. Do not call this 12 modules of live production administration.

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
- `POST /api/owner` JSON: `{action:"grant",userId:"<UUID>",tier:"pro|pro_plus",days:30,reason:"..."}`
- `POST /api/owner` JSON: `{action:"revoke",userId:"<UUID>",grantId:"<UUID>",reason:"..."}`
- All requests require `Authorization: Bearer <real Supabase access token>`. Never pass service-role keys in browsers or requests.
- Migrations and RLS must be tested against a schema-matched staging database and deployed through the approved process. Existing November 9 production plan-migration drift is a **release blocker**.

## Tests and safeguards
- Vercel Sandbox project `movo`, name `movo-owner-console-20261109`, isolated PostgreSQL 18.6 and Chromium 157.
- Before the billing-ledger addition, frontend tests **943/943** passed (159 suites), TS checked and optimized production build compiled.
- Isolated SQL `scripts/test-plan-migration.py` passed: plan grants, owner grant/revoke, immutability, and no client-side privilege escalation.
- Browser tests used dummy Supabase credentials and **intercepted** fake owner API responses inside the Sandbox only. No customer data or real service credentials were used.
- 390px mobile, 768px tablet and 1440px desktop: authenticated dashboard showed 4 metric cards, 4 bar items and 12 nav entries, with no page-level horizontal overflow; users screen opened; unsafe grant button disabled until explicit acknowledgment.
- Original customer splash intercepted owner interactions in browser QA. Fixed by removing the customer-only splash on the /owner route before rendering.
- Tests are not evidence of production data accuracy, live OAuth/MFA enrollment completion, full mobile Safari verification, subscription reconciliation, paid store API integrations, or production launch.
- No live Supabase migrations, Vercel env changes, PR merge, or commercial release performed.

## Release gate
1. Merge or replay base PR #252 safely; verify migration ordering and schema drift before database deployment.
2. Run isolated migration verification on a schema-matched database and inspect Supabase security advisors.
3. Configure actual owner UUID allowlist privately, enroll verified MFA, test both allowed and denied real accounts.
4. QA browser and iOS Safari, contrast and keyboard navigation; verify no owner splash overlay.
5. Verify store and manual grants coexist and revocation affects effective access without overwriting purchase receipts.
6. Connect real Vercel, Apple/Google, Supabase and telemetry sources for the remaining modules; do not invent data.
7. Promote only after CI, security, rollback, and access-control review.

## Rollback
Revert the /owner entrypoint and owner API and leave manual grant rows intact until they are reviewed. The owner security migration is additive; do not DROP audit tables or delete existing grants as a rollback shortcut. Explicitly revoke grants through the audited RPC instead.
