# MOVO post-merge disclosure hotfix and current release snapshot

**Timestamp:** 2026-10-30 11:30 Asia/Manila  
**Current main:** `1df043bcc54d59bee16fce806b601e09d647b06e`

## PR #63 — disclosure hotfix merged

- Exact-head CI [#40997576900](https://github.com/nasrinaiv0/movo/actions/runs/40997576900): **17 suites / 95 tests passed**, TypeScript typecheck passed, production-only dependency audit reported 0 vulnerabilities, production build compiled successfully.
- Preview deployment dpl_8g7qW9jw11r68N6ygt2MbqzeBxHb reached READY; root returned HTTP 200.
- Merged commit: `1df043bcc54d59bee16fce806b601e09d647b06e`.
- Production deployment dpl_CoSq9dcgCG2qVbCkm1BBSeRU2r1U reached READY; root returned HTTP 200.
- Served production JS bundle verified: contains “Important privacy limitation”, contains the explicit upstream-boundary warning and October 30, 2026 Privacy Policy date, and does not contain “Your account stays isolated”.
- Scope is limited to disclosure copy and effective-date accuracy. It does not change or prove backend context isolation.

## Current release candidates

| PR | Head | Exact-head validation | Preview | Remaining gate |
|---|---|---|---|---|
| #43 | `d6f2fcd40ad9c5438e031400dd5120d77272bec0` | 20 suites / 118 tests; typecheck; production-only audit 0; build | READY, root 200 | Authenticated finance CRUD, CSV, owner-scoped currency flows |
| #52 | `4b645666108174f31d4875d0da063bd8fe1c0170` | 18 suites / 101 tests; typecheck; production-only audit 0; build | READY, root 200 | Chart values vs authorized finance records |
| #56 | `06b5680b069ce17b75b9e2d63e3e0904bdda703e` | 18 suites / 103 tests; typecheck; production-only audit 0; build | READY, root 200 | Authenticated scope confirmation + unrelated-project canary |
| #60 | `43087d907be095ef42d8fbcd7b8d9b2cc6723662` | 20 suites / 111 tests; typecheck; `audit:controls`; production-only audit 0; build | READY, root 200 | Manual keyboard/focus, screen-reader, responsive, live-control and finance-flow checks |

All four application PRs remain draft. Green CI and HTTP 200 previews are not substitutes for the listed gates.

## Fresh security evidence

- MOVO Supabase project `cjsjmorqvuvvwbfyztiz`: RLS enabled on all 7 checked tables; all 22 policies across six user-facing tables reference `auth.uid()`; no checked `anon`/`PUBLIC` grants; upstream mapping has no policies or authenticated grants and remains service-role-only.
- Security Advisor still reports leaked-password protection disabled; no Auth configuration write action was available.
- Repository-level branch API still reports main protected=false, required checks enforcement off, and no repository rulesets.
- Full dependency tree reports 34 findings (16 low, 5 moderate, 13 high); production-only audit reports zero. Do not conflate scopes.

## Remaining release blockers

1. Complete authenticated MOVO-scoped POST and unrelated-project canary across retrieval, provider prompt, reply, transcript, cache, and logs; keep issue #47 open.
2. Verify authenticated financial writes, CSV import/export, owner-scoped currency isolation, and chart data provenance.
3. Perform interactive keyboard/focus, screen-reader, responsive, and end-to-end visible-control checks.
4. Confirm legal operator/controller identity and address, real retention/deletion schedule, provider/data recipients, and jurisdiction wording before removing the publication warning.
5. Enable leaked-password protection through an authorized Auth settings workflow and triage the full dependency tree.

No production financial records, schema, RLS/grants, Auth settings, or secrets were changed by this checkpoint.
