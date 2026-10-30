# MOVO CSV currency-validation correction

**Checkpoint:** 2026-10-30 11:46–11:56 Asia/Manila  
**Repository:** `nasrinaiv0/movo` only  
**PR:** [#43 — finance calculations and currency isolation](https://github.com/nasrinaiv0/movo/pull/43)

## Finding and fix

The CSV parser previously mapped any currency field that did not match three uppercase letters to PHP. A malformed explicit value such as `USDT` could therefore be imported as a Philippine-peso transaction instead of being rejected. The parser now defaults only a blank/missing optional currency to PHP; a non-empty malformed value produces a row-level error and is excluded from import.

## Regression coverage

- Parser test: malformed explicit currency is rejected and does not create a transaction.
- Parser test: blank optional currency remains compatible and defaults to PHP.
- App-level test: a malformed currency read through the file-input/FileReader path appears in an accessible `role="alert"` block and the Import button remains disabled when no valid rows exist.
- The initial UI fixture incorrectly encoded a literal escaped sequence instead of a row break. The failing run was preserved; the fixture was corrected and the exact source/test head passed.

## Exact-head validation

- Source/test head: `569e5e3d98f0a4932012df0952614cc850dfb077`.
- Vercel deployment [dpl_BcZFDfGSvEUDXLeNoGh4v8q75VNk](https://vercel.com/nasrin-ai/movo/BcZFDfGSvEUDXLeNoGh4v8q75VNk) reached **READY**.
- Build log confirms TypeScript typecheck, **20/20 test suites and 123/123 tests passed**, and production compilation completed successfully.
- GitHub Actions did not list a new run for this commit at the time of the check; the READY Vercel build log is the exact-head evidence. Production-only npm audit and `audit:controls` were not independently rerun; dependency manifests were unchanged.

## Remaining release gates

Authenticated finance CRUD, CSV import/export against real user-owned records, and owner-scoped currency isolation remain unverified. Keep PR #43 draft until those live flows are verified. No database schema, RLS/grants, authentication settings, financial records, provider secrets, or separate NasrinAI repository changed.
