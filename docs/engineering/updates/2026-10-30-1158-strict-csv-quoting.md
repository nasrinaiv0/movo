# Strict CSV quote validation before finance import

**Date:** 2026-10-30 11:58 Asia/Manila  
**Repository:** `nasrinaiv0/movo` only  
**Existing PR:** #43 — finance calculations and currency isolation  
**Branch:** `fix/finance-calculations-sync`

## Finding

The CSV row parser previously toggled quoted mode whenever it encountered a double quote. That could silently accept malformed cells such as an unquoted description containing a quote or characters appended after a closing quote. Malformed rows could then be interpreted differently from what the user sees in a bank-export file, which is unacceptable for financial import.

## Implementation

- Replaced quote toggling with explicit unquoted / quoted / after-closing-quote parser states.
- Escaped double quotes remain supported inside quoted cells.
- Newlines inside quoted cells remain part of the field; CRLF and LF row separators remain supported.
- Allows only separator whitespace after a quoted cell, ignoring that whitespace rather than appending it to the cell.
- Rejects a quote inside an already-started unquoted field with a specific error.
- Rejects non-whitespace characters after a closing quote with a specific error.
- Continues to reject unclosed quoted fields.
- Preserves UTF-8 BOM removal, empty-line handling, currency validation, row-level financial validation, and browser-local parsing. The CSV file is not uploaded by this parser.
- Added regression tests for malformed quote-in-unquoted-cell, characters after a closing quote, separator whitespace, CRLF, and embedded newlines.

## Traceable commits

- Parser implementation: `b4cc1ced75c898917e24073ec3098cc3b61e1834`.
- Regression tests: `c123b25904cd84ed6d6359bce5427ebe6f7064cf`.
- Exact final PR head and its CI/preview results must be recorded after the docs are reconciled. No test result is claimed by this note alone.

## Security and data boundaries

- No database schema, RLS policy, grant, Auth setting, production financial record, or secret changed.
- The existing CSV export's formula-leading text neutralization is unchanged.
- Existing currency validation remains: invalid non-empty currency is rejected; missing/blank optional currency alone defaults to PHP.
- The parser still requires the existing review/validation step before import.

## Validation plan / merge gate

- [ ] Exact final-head TypeScript typecheck.
- [ ] Full Jest suite, including the new parser regressions.
- [ ] Production build.
- [ ] Verify preview deployment for the exact final head.
- [ ] Interactive authenticated CSV import/export and owner-scoped currency checks remain separate release gates; CI does not replace them.

## Rollback

Revert the parser and parser-test commits. No migration or production data rollback is required.


## Failed check and correction — 2026-10-30 12:00 Asia/Manila

- GitHub Actions run [41000381655](https://github.com/nasrinaiv0/movo/actions/runs/41000381655) failed at the full Jest step: **1 suite failed / 19 passed; 1 test failed / 124 passed**. The failing test was the existing `transactionFingerprint` equivalence test.
- Root cause: while replacing the parser, the first API update also double-escaped regular expressions outside the parser (including whitespace normalization). This unintentionally changed existing fingerprint behavior. The failure was not ignored.
- Corrected the source by restoring the untouched pre-change file at `15316f97bce721f815425b7fe867a549c712c89b` and reapplying only the strict parser function. This preserves the original date/amount/whitespace normalization and the prior currency validation.
- Correction commit: `7c41531c0a48a60433d2cca10262734c03ce4ed7`.
- A read-back confirmed the date regex is `/^\\d{4}-\\d{2}-\\d{2}$/`, the amount parser still strips whitespace with `/\\s/`, and BOM handling is `/^\\uFEFF/` in source.
- **Validation for the corrected head is pending**. The failed run's 124 passing tests are not a pass for the failed head; do not report this change as green until a fresh exact-head run completes.
