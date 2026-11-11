# MOVO — disposable integration of PR #274 with main after PR #278

## 2026-11-12 — Disposable PR #274 integration updated for latest main PR #278 (precommit)

**Current latest main:** `2edcabdd2d5788d37c3fbf28028c23a350aab9db` (includes PR #276 and PR #278). **Security PR #274:** `8422adea30aaa64788e1abc2504ae36673141be6`. The disposable branch `ci-only/integrate-pr274-with-pr276-20261112` remains independent; `main`, PR #274 and production were not modified.

**Three-way integration audit:** latest main advanced after the first staged tree, so remerged all newer additions without discarding earlier conflicts. Verified **69/69** prior integration-only files retained, **28/28** new-main-only files retained, and **20/20** newly overlapping files reconciled. PR #278's native back/swipe, setup agreement, narrated guide and Terms §17 remain; PR #274's erasure guards, DPO contact, legal correspondence and payment retention protections remain. Retained true device-mode account deletion with current launch timing.

**Legal consistency:** reconciled native/app URLs and date imports; aligned new `legalVersion.js` Privacy Policy effective date with updated standalone Privacy Policy (November 11, 2026). Re-rendered public Terms page from merged `legalSupplement.json`; static generation is idempotent and the Privacy Policy is canonical. Both Terms §17 setup acceptance and DPO/address remain. 11 merged translation dictionaries contain **2,850** keys each and regenerated locale SHA-1 version `37a945a340d2` (test vectors verified).

**Precommit checks:** 16/16 actual combined source-contract checks passed; 69/69 + 28/28 + 20/20 file provenance checks passed; isolated Python synthetic merge / security tests 4/4 passed. The integrated Jest, native, strict build and PostgreSQL tests are **NOT yet executed**, and a Vercel preview alone will not clear them. Never claim full merge or release readiness until exact commit checks pass.

**Safety:** no paid Supabase staging branch, no production migrations, no customer records, no main commits, and no merge of PR #274. Migration-history drift, old signed app ledger write behavior, and real Auth/Storage plus rollback remain blockers for production release.


## Pre-merge verification and release gates

- The combined merge commit must use two parents: latest main `2edcabdd2d5788d37c3fbf28028c23a350aab9db` and canonical PR #274 head `8422adea30aaa64788e1abc2504ae36673141be6`, **only on** `ci-only/integrate-pr274-with-pr276-20261112`.
- The unit/integration pipeline should prove React UI behavior including new setup video and login/logout, i18n build --check, Android/iOS builds, financial tenant isolation, hybrid sync, IAP integrity, migration staging and synthetic backup/restore. CI not executed at documentation time.
- Signed older app versions may still use direct transaction UPDATE/DELETE. PR #274 revokes those privileges. Do not deploy the DB change until installation/upgrade gating is verified with real devices.
- The three PR #274 migrations remain absent in live Supabase. Repository history and remote history differ and need manual forensic reconciliation; never run a bulk migration repair or schema push against production to make checks green.
- Pending Google Play acknowledgement jobs must never be deleted by age unless completed; the combined migration and SQL tests enforce this.
- Commercial territory review, App Store/Google Play declarations and real production backup restoration remain outside synthetic integration testing.

## Branch clean-up

This is a disposable, clearly marked CI-only branch. It should never be merged to production `main`. PR #274 remains canonical and open. A temporary CI-only pull request may be opened to attempt triggering Actions, but close it without merging if the GitHub App does not start checks.
