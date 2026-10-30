# MOVO finance test-alignment evidence

**Checkpoint:** 2026-10-30 11:43 Asia/Manila  
**Repository:** `nasrinaiv0/movo` only  
**PR:** [#43 — finance calculations and currency isolation](https://github.com/nasrinaiv0/movo/pull/43)

## Failure observed and fixed

GitHub Actions run [#40998551699](https://github.com/nasrinaiv0/movo/actions/runs/40998551699) failed with **2 tests failing and 118 passing**. The failing assertions expected the old lowercase accessibility label and old multi-currency guidance text. The product UI correctly exposed the newer accessible label and the actual description; the tests were stale.

A subsequent Vercel build for intermediate head `c973c23da2e356b5a1464f371487ab712dd9232a` passed typecheck but still failed one App-level assertion because the demo contained only PHP records and therefore rendered the single-currency explanation. That failure was also preserved, then fixed by asserting the truthful single-currency wording “no conversion is applied”.

## Exact code/test-head evidence

- Code/test head: `aec4d68ca86fc6a0b17ce3c12c7780e4551de861`.
- Vercel deployment: [dpl_7ty9PTCxqCSq7BgAD89N1mKmgzSS](https://vercel.com/nasrin-ai/movo/7ty9PTCxqCSq7BgAD89N1mKmgzSS), state **READY**.
- Build log confirms TypeScript typecheck, **20/20 test suites and 120/120 tests passed**, and production compilation completed successfully.
- GitHub Actions did not publish a new run for this commit through the connected run-list endpoint at the time of this check; the READY Vercel build log is the evidence for this exact head. Production-only npm audit and `audit:controls` were not independently rerun on this head.

## Boundaries

This was test-alignment only. No production application behavior, finance data, database schema, RLS/grants, authentication settings, or secrets changed. PR #43 remains draft pending authenticated finance CRUD, CSV import/export, and owner-scoped currency verification. The 11:30 documentation snapshot in the disclosure update is historical; this file records the subsequent test-fix checkpoint.
