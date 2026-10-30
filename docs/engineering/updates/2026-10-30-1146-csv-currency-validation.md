# MOVO CSV currency-validation correction

**Checkpoint:** 2026-10-30 11:46–11:52 Asia/Manila  
**Repository:** `nasrinaiv0/movo` only  
**PR:** [#43 — finance calculations and currency isolation](https://github.com/nasrinaiv0/movo/pull/43)

## Finding

The CSV parser previously mapped any currency field that did not match three uppercase letters to PHP. A malformed explicit value such as `USDT` could therefore be imported as a Philippine-peso transaction instead of being rejected. This was a financial data-integrity risk.

## Change

- Missing or blank optional currency still defaults to PHP for compatibility with CSVs that omit currency.
- A non-empty malformed currency now yields a row-level error and the row is excluded from import; it is no longer silently relabeled as PHP.
- Added regression tests for malformed explicit currency and blank optional currency. The UI already renders parser row errors in an accessible `role="alert"` block.
- No database schema, RLS/grants, authentication settings, financial records, provider secrets, or separate NasrinAI repository changed.

## Exact-head validation

- Code/test head: `b5de9612499c29a22c2844718742d0c4e665be46`.
- Vercel deployment [dpl_BNQdu6c7ReQ23xfTfZ3Lrw5qPtNg](https://vercel.com/nasrin-ai/movo/BNQdu6c7ReQ23xfTfZ3Lrw5qPtNg) reached **READY**.
- Build log confirms TypeScript typecheck, **20/20 test suites and 122/122 tests passed**, and production compilation completed successfully.
- The first fixture attempt used a literal escaped sequence instead of a newline; the failing test run was not hidden, the fixture was corrected, and the final exact-head build passed.
- GitHub Actions did not list a new run for this commit at the time of the check; the READY Vercel build log is the evidence for this exact head. Production-only npm audit and `audit:controls` were not independently rerun; dependency manifests were unchanged.

## Remaining release gates

Authenticated finance CRUD, CSV import/export against real user-owned records, and owner-scoped currency isolation remain unverified. Keep PR #43 draft until those live flows are verified.
