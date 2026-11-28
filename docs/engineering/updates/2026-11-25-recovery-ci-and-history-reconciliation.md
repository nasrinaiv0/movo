# PR #347 — exact predecessor evidence, migration semantics and R8 workflow validation

Before commit, 2026-11-25: exact predecessor 3720ed1ba15294ecbedf67df0e1a07a7c9dc2183. Raw Actions API shows R8 failed on push, run 45622092372, zero jobs and zero artifacts. Found inherited invalid expression MOVO_JOB_CANCELLED: ${{ cancelled() }} in step env. GitHub's contexts reference (https://docs.github.com/en/actions/reference/workflows-and-actions/contexts#context-availability) allows cancelled() in steps.if, not steps.env. Replace with separate normal always/not-cancelled hard diff check and cancellation-only scoped restore plus diff, preserving no acceptance credit. No compiler, keep rule or release behavior change. Add host-only workflow contract test to normal Phase 1 (and R8's discovery) with 24 existing portable tests. Fresh exact-head CI required; don't claim R8 execution until real paired run.

## Exact predecessor acceptance
- Finance 45622103666 / job 139232671513: success, actual disposable PostgreSQL. Passed existing PR274 synthetic snapshot restore, staged private chat/recipient/loan upgrades, cross-tenant and accounting tests, duplicate loan/import, both ordered loan-erasure cases including denial of post-request replay and final erasure cascade, five ordered friend consent/revocation/erasure outcomes. No production writes.
- Friend visual 45622103292 artifact 15024493622, SHA256 10b96ebc01d068816da6a7fb0038269b3bdd84df3a8d82b753dac0c1b854e0b7: 18 configurations, 12 actual PNG inspected, no overflow, light/dark, 44px save, UTF8, calendar/receipt/owner switch, three timezones. Synthetic mock server.
- Loan visual 45622103194 artifact 15025627714, SHA256 04c1bebca6de28d8e01011f02d18888676b2e4d24fb8898162ded8645d52dd14: 8 configurations, 8 actual PNG inspected, separate receiving/payment account, light/dark, no overflow. Both archives verified. Vercel status success; Phase 1 completed success. iOS, Wear and Android/signed-disposable checks pending at evidence snapshot; no physical signed release or real account proof. New head will require fresh artifacts.

## Historical migration semantic reconciliation
All 19 mismatched-history-name files compared statement by statement, with conservative SQL tokenization that preserves literals and dollar bodies, then limited routine/quoted-identifier normalization for the five outstanding comparisons. Counts: 9 ordered-token/routine normalized matches, 7 wrapper/session-only differences, 3 substantive DDL discrepancies with live catalog alternatives. This is not a PostgreSQL AST or a full equivalence proof.

| Source filename (prefix/short name) | Recorded migration version | Comparison / disposition |
|---|---|---|
| 20261028000100 initial finance | 20261027173339 | 62/62 normalized statements match; 3 extra remote revokes on handle_new_user/set_updated_at/rls_auto_enable; live anon/auth EXECUTE denied, preserve |
| 20261028000200 harden finance | 20261027173359 | 5/5 ordered tokens match |
| 20261029032314 revoke excess | same | 2/2 ordered tokens match |
| 20261031125030 secure automation | same | 13/13 after routine token comparison |
| 20261104114406 monthly loan schedule | same | 2/2 ordered tokens match |
| 20261104114413 reminder center | same | 20/20 ordered tokens match |
| 20261104114416 payment history | same | 5/5 ordered tokens match |
| 20261104114422 receipt attachment | same | 12/12 ordered tokens match |
| 20261104114425 receivable reminders | same | 4/6 match; source adds ownership-check policy. Live owner-only policy plus validated payment_attempts_account_owner_fk composite FK protects ownership; preserve, test delete nulling and tenant denial |
| 20261104114626 payment account ownership | same | 3/4 match; source unique index name absent, live financial_accounts_id_user_id_key unique(id,user_id) validated; do not add redundant index |
| 20261105110000 scheduled policy | 20261105031952 | 15/15 ordered tokens match |
| 20261105120000 obligation postings | 20261105032005 | 11/11 after routine token comparison |
| 20261110041806 owner deletion FK | 20261110125155 | 10/10 substantive statements, 2 recorded SET LOCAL statements |
| 20261110050000 hybrid sync | 20261110125158 | 15/15 substantive statements, 2 recorded SET LOCAL statements |
| 20261113000000 Play test isolation | same | 6/6 substantive statements; source BEGIN/COMMIT only |
| 20261115225110 referral rewards | same | 20/20 substantive statements; source BEGIN/COMMIT only |
| 20261116034926 private friends | same | 11/11 substantive statements; source BEGIN/COMMIT only |
| 20261116070316 discovery/avatar | same | 34/34 substantive statements, 2 recorded SET LOCAL statements |
| 20261119120000 loan payment account | same | 9/9 substantive statements, 2 recorded SET LOCAL statements |

The 5 historical source-only and 7 missing-statement-text files received statically extracted CREATE table/function/index/policy/trigger name checks against live catalog: trigger hardening 16/16, reversible payments 32/32, store entitlements 5/5, manual plan grants 3/3, verified referral points 23/23, bills 15/15, automation sources 5/5, automation inbox 9/9, automation transfers 1/1, IAP integrity 12/12, account erasure 6/6, retention 5/5. These are name-only sampled declarations (not signatures, constraints, all policies or body equivalence); preserve successors, especially the intentional revocation of legacy upsert_movo_store_entitlement. Seven missing history texts cannot be reconstructed as evidence. Three production-only records: premium card styles storage SELECT policy exists and restricts to authenticated premium-stickers bucket; store-entitlement verified history and own SELECT policy exist, later IAP revocation preserved; service role auth.users five column SELECT grants are present. No history repair or replay. Four pending capability migrations remain separately gated. Full 50-source+3-remote fingerprint classification retained from prior package. Backups and restore, live HTTP, DBA review, exact PostgreSQL 17 rehearsal and constraint validation remain production gates.

## Dependency advisory investigation
Exact predecessor Phase 1 artifact 15026670419 SHA256 db72e4ef52e9d5a5eb7e04313d8d578088689c2a9d6f426b34c401a9bc4ef291 verified. npm full tree: 19 affected package entries (9 high, 1 moderate, 9 low, 0 critical); 17 direct advisory objects in six root dependency families, all flagged instances are dev-only in locked tree. Production npm audit --omit=dev passed with zero findings. Locked react-scripts 5.0.1 (dev). package-lock blob ef9cacea37b164bc449cc3aabb2fc6b677450fb0. Affected versions: SVGO 1.3.2 (nested css-select 2.1.0/nth-check 1.0.2), resolve-url-loader 4.0.0 nested PostCSS 7.0.39 (root PostCSS 8.5.32 unaffected by recorded ranges), webpack-dev-server 4.15.2 / dev-middleware 5.3.4, @tootallnate/once 1.1.2 via jsdom/Jest. Advisory IDs:
- GHSA-vpq2-c234-7xj6, GHSA-rp65-9cf3-cjxr
- GHSA-7fh5-64p2-3v2j, GHSA-qx2v-qp2m-jg93, GHSA-6g55-p6wh-862q, GHSA-fxqj-rqcc-2cmp, GHSA-r28c-9q8g-f849
- GHSA-2p49-hgcm-8545, GHSA-4vpr-x523-8j87, GHSA-w27v-7q3p-w38r
- GHSA-g84c-rxfj-3j2c
- GHSA-9jgg-88mc-972h, GHSA-4v9v-hfq4-rm2v, GHSA-79cf-xcqc-c78w, GHSA-mx8g-39q3-5c79, GHSA-f5vj-f2hx-8m93, GHSA-m28w-2pqf-7qgj.

Do not apply npm audit fix --force: suggested downgrade to react-scripts 0.0.0 would destroy build compatibility. Treat SVG/CSS tooling as build-time exposure (untrusted assets / sourcemaps); restrict dev-server to loopback, no exposure of developer HMR or middleware, vetted trusted assets only, no secret material in builds. Root vulnerabilities require a separate compatibility-tested modernization of SVGR/SVGO, PostCSS loader chain, webpack dev server and Jest/jsdom or a maintained replacement toolchain. Do not add incompatible cross-major overrides. Registry access locally unavailable, no dependency changes; investigation complete, remediation pending. Independent review required, no external Claude execution or provider cost claimed. Both frozen PRs and main remain untouched. No production changes or paid provisioning.
