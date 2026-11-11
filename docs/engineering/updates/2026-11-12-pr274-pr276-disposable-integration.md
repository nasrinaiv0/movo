# MOVO — disposable integration of PR #274 with merged PR #276

## 2026-11-12 — Disposable PR #274 + #276 integration review (precommit)
 
**Source:** `main` at 43efeee64fa058c214edd5b1cc7f6e208d26fbf6; PR #274 at 8422adea30aaa64788e1abc2504ae36673141be6; merge base `166dbd1271fc21bde29025be93f321c205c7566b`. Branch: `ci-only/integrate-pr274-with-pr276-20261112`. This is **NOT** a production release or merge of PR #274.
 
**Precommit verification:** 67/67 PR-exclusive blobs copied intact; 39/39 `main`-exclusive blobs retained intact; 21/21 shared files manually/automatically reconciled; 11 translation dictionaries retain keys and order from both branches (2,832 keys each), version SHA-1 regenerated. Native Python isolated runner: 4 precommit synthetic merge/safety checks passed. Actual Jest/Android/iOS/PostgreSQL integration CI **not yet run** on this combined commit; cannot claim release approval.
 
**Deliberate resolutions:** preserve new main launch sync, back navigation, transaction time and navigation pricing; preserve PR274 deletion/privacy/consent/RLS fixes and tests. Device-mode account deletion test simulates offline to respect new startup wait. MR DIY branding remains known by alias, remote favicon stays blocked without per-provider approval. Finance CI uses main's exact PostgreSQL service ID and PR's `pg_dump`/`pg_restore` rollback and retention tests. Combine both branches' per-locale catalog additions, with no translation collisions.
 
**Release holds:** Android/iOS release versions not validated; Supabase production migration history does not match repository (40 local vs 35 remote, only 19 timestamp matches); PR274 ledger write revocation can reject old installed clients; user declined paid staging; keep main, PR274, production database and store territories unchanged. Branch CI and conflict checks must pass, and human signed-device/production-shaped validation remains necessary before merging the canonical PR.
 

## Merge provenance

- `main` commit: `43efeee64fa058c214edd5b1cc7f6e208d26fbf6`
- PR #274 head: `8422adea30aaa64788e1abc2504ae36673141be6`
- Common ancestor: `166dbd1271fc21bde29025be93f321c205c7566b`
- Proposed integration tree: `482545281f272d45d5efb146e7f336c20269f1af` before this report
- PR-only paths: 67 copied byte-identically from PR
- Main-only paths: 39 retained byte-identically from main
- Both-modified paths: 21, of which 11 localization JSON dictionaries and one generated version file
- Direct collision resolutions: app deletion test at same insertion point as new offline launch test; merchant test MR DIY policy; finance workflow; progress history; generated locales

## Precommit test evidence

- Connector verified merged Git tree: 67 PR-exclusive blob SHAs, 39 main-exclusive blob SHAs, all 21 overlap blob SHAs distinct from either raw side. No missing source paths
- Diff hunk replay passed for all manually blended UI/tests; ordinary nonoverlapping blocks were combined without patch skips
- All 11 merged locale dictionaries have 2,832 entries; both input key sequences appear as subsequences; translations of shared keys agree
- SHA-1 from concatenated JSON dictionaries recalculated and validated with independent standard test vectors; generated `version.js` uses that hash
- Isolated Python 4/4: correct nonoverlapping three-way application, explicit conflict refusal, JSON order/hash, and disposable PostgreSQL target guard
- **Not passed / not yet executed:** complete Jest suite, TypeScript/web build, native Android/iOS, PostgreSQL migration and snapshot restore, Supabase Auth/Storage staging, mobile signed-device checks

## Security stop conditions

A CI-only merge commit is not legal approval and must never be pushed to `main`. Do not merge canonical PR #274 or apply its three production SQL migrations until migration history is reconciled against a production-shaped database, signed versions support the grant change, and all CI gates pass. There is no paid staging branch because the user explicitly declined one.
