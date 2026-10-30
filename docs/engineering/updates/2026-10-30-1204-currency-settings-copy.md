# Remove stale PHP-only currency settings copy

**Date:** 2026-10-30 12:04 Asia/Manila  
**Repository:** `nasrinaiv0/movo`  
**Existing PR:** #60 — UI control and accessibility audit  
**Branch:** `chore/ui-control-audit-reconciled-main`

## Finding

PR #60 contained an informational Settings row stating that Philippine peso was the only available currency. The finance implementation in PR #43 adds account currencies and a Display Currency selector, so the PHP-only claim would be inaccurate once those changes are integrated.

## Change

- Removed the stale informational row rather than leaving contradictory UI copy.
- Added a Settings regression test asserting that the unsupported PHP-only claim does not return.
- Did not add a navigation target or pretend that the currency selector exists in this branch. PR #43 remains the source of the actual Display Currency behavior.

## Traceable commits

- Remove stale row: `4baa597637f9888be4698ee055dc43da775028fa`.
- Regression test: `df85cae40c666b19d162e0747898e3da98194e48`.
- Follow-up cleanup removed the temporary placeholder row from the Settings data array: `110c5d79d7b5623972d71ada13883161f1ec2576`.

## Validation

- **Exact final-head typecheck, full tests, control audit, production build, and preview are pending.** The earlier PR #60 results do not validate this new change.
- No finance calculations, database schema/RLS/grants, Auth settings, production records, or secrets changed.
- This does not merge the currency feature from PR #43; it only removes an obsolete claim from the accessibility branch.

## Merge gate

Keep PR #60 draft until its latest exact-head checks pass, the branch is reconciled with the finance implementation, and interactive keyboard/focus, screen-reader, responsive, and authenticated finance checks are completed.


## Exact-head validation result — 2026-10-30 12:05 Asia/Manila

- Validated source/test/documentation head: `97f206a33ad3c9c4f6483dc8fee7f37c17f8be54`.
- GitHub Actions run [41000813433](https://github.com/nasrinaiv0/movo/actions/runs/41000813433) completed successfully: **20/20 test suites and 112/112 tests passed**, TypeScript typecheck passed, `audit:controls` passed, production-only npm audit reported **0 vulnerabilities**, and production compilation succeeded.
- Vercel preview [dpl_HT8FavT14Eg6aGjnyoAeUiYAT5SY](https://vercel.com/nasrin-ai/movo/HT8FavT14Eg6aGjnyoAeUiYAT5SY) reached **READY** for the same head; the preview root returned HTTP 200.
- The Settings regression prevents the stale PHP-only claim from returning. The static control audit is still only a source-level guardrail; it does not prove callback business correctness or real assistive-technology behavior.
- The full dependency tree still reports 34 findings (16 low, 5 moderate, 13 high); the production-only audit does not clear those development/build-tool findings.
- **Still outstanding:** interactive keyboard/focus and screen-reader checks, responsive interactions, authenticated finance/CSV/currency verification, upstream MOVO-scope canary, legal publication details, and Supabase leaked-password protection. PR #60 remains draft.
- No finance data logic, database schema/RLS/grants, Auth settings, production records, or secrets changed in this increment.
