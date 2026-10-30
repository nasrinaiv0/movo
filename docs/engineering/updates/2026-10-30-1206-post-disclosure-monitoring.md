# MOVO post-disclosure monitoring delta — 2026-10-30 12:06 Asia/Manila

**Current main:** `9438e7c01c916a6b27f62e026fe9b4a4f6952f94`  
**Production deployment:** [dpl_3kHKpwFatSAawrVCtU19XNEECR3E](https://vercel.com/nasrin-ai/movo/3kHKpwFatSAawrVCtU19XNEECR3E), READY at the same commit.  
**Monitoring scope:** read-only application/release audit plus documentation-only updates on a separate branch.

## New verified progress

1. **PR #63 merged** as `1df043bcc54d59bee16fce806b601e09d647b06e`. It changed only `src/App.test.js`, `src/components/NasrinAIChat.js`, and `src/screens/Legal.js`. The old absolute “Your account stays isolated” statement was replaced by a clear unverified-upstream-boundary caveat; Privacy Policy date moved to October 30 while Terms remains October 29. CI #40997576900 passed 17 suites / 95 tests, typecheck, production-only audit (0), and build. Recorded production smoke verified the caveat and new date in the served bundle and absence of the old guarantee. This is transparency improvement only, not isolation proof.
2. **PR #64 merged** as `9438e7c01c916a6b27f62e026fe9b4a4f6952f94`. Documentation-only paths: `docs/PR_PROGRESS.md`, Claude handoff, master ledger, and `docs/engineering/updates/2026-10-30-1130-disclosure-hotfix.md`. Production deployment at main is READY; the deployment source metadata matches the merge commit.
3. **Latest exact-head CI/preview checks verified for four open application PRs:** #43 (20 suites / 125 tests), #52 (18 / 101), #56 (18 / 103), and #60 (20 / 112). All production-only audits report zero vulnerabilities and all four previews are READY. Their full dependency-tree install logs still report 34 findings (16 low, 5 moderate, 13 high).

## No overclaim

- PR #63 changed user-facing wording and legal effective-date metadata; it did not change the API, retrieval, provider request, persistence, auth, RLS, grants, schema, or secrets.
- PR #64 changed documentation only.
- A READY preview, root HTTP 200, and passing unit tests are not proof of authenticated context isolation or finance-flow correctness.
- PR #56 and issue #47 remain open/draft pending authenticated scope confirmation and an unrelated-project canary across retrieval, provider prompt/request, response, transcript, cache and logs, including retries, missing confirmation, account switching and sign-out/sign-in.
- Legal publication, manual accessibility, authenticated finance/CSV, chart provenance, leaked-password protection and branch governance remain unresolved.

## Exact-head evidence

- #43 head `ad532e1df7ca14a0c0aebe0244d7b82d2bb0578e`: [CI #41000693424](https://github.com/nasrinaiv0/movo/actions/runs/41000693424), preview [dpl_J9fnf3wcBzhUqyFZsmp9eVJypsiz](https://vercel.com/nasrin-ai/movo/J9fnf3wcBzhUqyFZsmp9eVJypsiz).
- #52 head `78b776497c8125f1637b2fb601965c1cc94e9b03`: [CI #40999382232](https://github.com/nasrinaiv0/movo/actions/runs/40999382232), preview [dpl_76bUJdnfATaWSKRof8z33HKyZXzu](https://vercel.com/nasrin-ai/movo/76bUJdnfATaWSKRof8z33HKyZXzu).
- #56 head `15e112149bf70b6ee1f141365a4b9ed9ffb9e6e5`: [CI #40999433274](https://github.com/nasrinaiv0/movo/actions/runs/40999433274), preview [dpl_2EsxdALcYGPnwUWi9zydjTf8uahs](https://vercel.com/nasrin-ai/movo/2EsxdALcYGPnwUWi9zydjTf8uahs).
- #60 head `12ba5b3b45065949626e3ecf49a777b9de44387b`: [CI #41000977707](https://github.com/nasrinaiv0/movo/actions/runs/41000977707), preview [dpl_8TrpytetCKee3BJaNjMcXuVk64ac](https://vercel.com/nasrin-ai/movo/8TrpytetCKee3BJaNjMcXuVk64ac).

## Security snapshot

The merged ledger records 7/7 checked tables RLS-enabled, 22 user-facing policies referencing `auth.uid()`, no checked `anon`/`PUBLIC` grants, and service-role-only access to the upstream conversation mapping. Leaked-password protection remains disabled. MOVO main remains unprotected by repository-level branch-protection/ruleset checks. Legal publication remains blocked on verified operator/controller identity/address, retention/deletion schedule, provider/data-recipient details, and jurisdiction review.

## Next audit actions

1. Prove the authenticated context boundary with the unrelated-project canary before merging #56.
2. Verify authenticated finance CRUD/CSV and currency isolation for #43, and authorized chart provenance for #52.
3. Complete manual accessibility checks for #60.
4. Resolve branch protection, leaked-password protection, full-tree dependency findings, and legal publication blockers through authorized changes.
5. Re-run all required checks on any subsequent exact-head changes; do not reuse stale CI evidence.
