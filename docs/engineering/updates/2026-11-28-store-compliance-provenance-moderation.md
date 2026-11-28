# AI provenance, moderation and erasure candidate

## 2026-11-28 — PR #348 reporting provenance and moderation candidate (before commit)

Contributor: ChatGPT. Parent 9373bc0c59f63d2ee34c8ee5394a4a67da34bfdf. Five of seven workflows passed; iOS running, both disposable PG jobs failed at synthetic AI conversation insertion with enforce_movo_cloud_plan sign_in_required (jobs 140981657975 and 140981658180). Correct fixtures using existing service JWT test context; do not disable triggers. Downloaded artifact 15262889849 (101 images): inspect light/dark report selection at 320/390/768/1280, 320px 200% and RTL; contact name now wraps. Manifest says head 9373bc0 but workingTree uncommitted; no multilingual AI report images. Add service-only atomic verified turn provenance, legacy row rejection, freeze lock, restricted MFA owner moderation API and queue, bounded retention draft. Add synthetic provenance/authorization/moderation and concurrent freeze tests. Existing SQL draft stays outside migrations; hosted PG and new exact-head browser evidence pending. No approvals changed, no flags, production changes, new PR, paid provisioning, remote migrations or store submissions. Independent Claude review required before migration or activation.

Review SQL using both disposable versions, confirm no legacy auth regression, staff AAL2 allowlist and audit privacy, retention and FK race, validate real multilingual UI. Keep all 18 evidence gates pending until genuine evidence is reviewed.

## 2026-11-28 — PR #348 retention privilege correction (before commit)

Contributor: ChatGPT. Parent 30f2460c42c5f4b28f20e808ce525279fadb9a1d. Preflight review found access-log cleanup used SELECT FOR UPDATE SKIP LOCKED despite intentionally withholding UPDATE on the audit table. PostgreSQL 17 documented this requirement (https://www.postgresql.org/docs/17/ddl-priv.html). Preserve audit immutability: serialize cleanup batches with a transaction advisory try-lock and select only bounded expired access IDs without row-locking SELECT. Report and rate cleanup retain their original locking clauses and update grants. No migration/flag activation; fresh hosted CI required. Existing audit-event cascades are separately reviewed; bounded counts describe direct deletes. No new PR, production changes or approval.

