# MOVO CSV currency-validation correction

**Checkpoint:** 2026-10-30 11:46 Asia/Manila  
**Repository:** `nasrinaiv0/movo` only  
**PR:** [#43 — finance calculations and currency isolation](https://github.com/nasrinaiv0/movo/pull/43)

## Finding

The CSV parser previously mapped any currency field that did not match three uppercase letters to PHP. This meant a malformed explicit value (for example `USDT`) could be imported as a Philippine-peso transaction instead of being rejected. That was an avoidable data-integrity risk.

## Change

- A missing or blank optional currency still defaults to PHP for compatibility with CSVs that omit a currency column/value.
- A non-empty malformed currency now yields a row-level error and the row is excluded from import; it is no longer silently relabeled as PHP.
- Added regression tests for both malformed explicit currency and blank optional currency.
- No database schema, RLS/grants, authentication settings, financial records, provider secrets, or separate NasrinAI repository changed.

## Validation

Typecheck, the complete test suite, production build, and preview validation are pending for the new code head. Do not treat the change as validated until the exact-head build finishes successfully. Authenticated finance CRUD, CSV import/export, and owner-scoped currency isolation remain release gates.
