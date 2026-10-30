# MOVO Audit Delta — runtime dependency boundary and production audit gate

**Audit timestamp:** 2026-10-30 08:50 Asia/Manila (2026-10-30 00:50 UTC)  
**Repository:** https://github.com/nasrinaiv0/movo  
**Branch:** `chore/movo-runtime-dependency-scope`  
**Base:** `bbd3183553fde00206d65639ecbf042b20d28a67`  
**Scope:** Package classification, CI enforcement for production dependencies, and fresh read-only production telemetry. MOVO repository only; no changes to the separate NasrinAI repository.

## Change summary

1. Move `react-scripts@5.0.1` from `dependencies` to `devDependencies`. It is used by the build, local development server, and Jest runner; the deployed application is a compiled React bundle, and the server-side NasrinAI route imports `@supabase/supabase-js`, not `react-scripts`.
2. Add `npm run audit:production` as `npm audit --omit=dev`.
3. Add a required `Audit production dependency tree` step to `.github/workflows/phase1-ci.yml`, after install and before tests/build. A new or newly introduced known vulnerability in the production dependency tree will now fail this workflow.

## Validation evidence

### Temporary sandbox experiment — confirmed, not yet exact-branch CI

The current MOVO context-isolation code/test tree was checked out at `62eda3c7fe763db219a5340f49cef8540c13c614`. In a temporary workspace, moving only `react-scripts` to `devDependencies` was followed by a fresh `npm install`, production-only audit, and `npm run build`.

- Install: exit code 0.
- `npm audit --omit=dev`: exit code 0; **0 info, low, moderate, high, or critical advisories** in the production dependency tree after the move.
- `npm run build`: exit code 0.
- TypeScript: passed.
- Jest: **17 suites / 98 tests passed**.
- Production compilation: succeeded.
- The experiment used Node 24.22.1. GitHub Actions is configured for Node 20, so the exact branch still needs its own CI run; do not treat this sandbox result as CI evidence.

### Full dependency audit — remaining finding, not fixed

Before the move, a fresh `npm audit --json` reported **34 advisories: 16 low, 5 moderate, 13 high, 0 critical**. The findings were in the legacy `react-scripts@5.0.1` build/test toolchain's transitive dependency tree, including high-severity findings associated with `@svgr/plugin-svgo`, `bfj`, `css-select`, `jsonpath`, `nth-check`, `postcss`, `rollup-plugin-terser`, `serialize-javascript`, `svgo`, `underscore`, `webpack-dev-middleware`, `webpack-dev-server`, and `workbox-build`.

**This change does not fix those build-toolchain advisories.** It corrects dependency classification and prevents that toolchain from being treated as part of the runtime dependency set. The full `npm audit` still needs a separately tested build-toolchain remediation or a planned migration away from CRA. No `npm audit fix --force` or broad dependency override was applied because that could break the current build without a compatibility plan.

## Production observations — 2026-10-30

- The production MOVO homepage `https://movo.nasrinai.com` returned HTTP 200. This confirms page delivery only, not authenticated app behavior.
- Read-only Vercel environment metadata showed `NASRINAI_API_KEY` exists as a sensitive variable targeted to Production. Its value was not decrypted or exposed. Presence does not prove the key is valid.
- Runtime error telemetry in the latest 24-hour window showed repeated upstream HTTP 401 responses on `/api/nasrinai/chat` (latest recorded 2026-10-29 15:37 UTC), plus one timeout and one network error. These are older deployment events; they do not prove the latest deployment currently fails, but they require a successful authenticated request before declaring chat healthy.
- The only safe credential diagnosis is that the production upstream rejected the configured credential. Do not log or inspect the secret in chat. Follow `docs/NASRINAI_MOVO_INTEGRATION.md` to rotate the server-only credential through the authorized secret-management path and verify a successful response.

## Safety and limitations

- No environment variable values were read or emitted.
- No production secret, database row, schema, RLS policy, grant, or Supabase Auth setting was changed.
- The static frontend and server route remain unchanged in this branch; this is dependency-boundary hardening and CI coverage.
- This delta is not evidence that the entire frontend is complete. Open finance/chart/control/context-isolation PRs and the legal publication gates remain separate.

## Required follow-up

- [ ] Exact-branch GitHub Actions passes on Node 20, including the new production dependency audit.
- [ ] Verify the production-only audit remains clean after installation on the CI runner.
- [ ] Plan and validate a separate CRA build-toolchain remediation; do not hide its 34 full-tree findings.
- [ ] Complete authenticated MOVO finance/chat browser tests and the MOVO-only context canary before merging application PRs.
- [ ] Publish final legal disclosures only after operator identity/address, provider details, retention schedule, and applicable jurisdiction wording are verified.
