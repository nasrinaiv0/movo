# CSV amount-format validation — 2026-10-30 13:15 Asia/Manila

## Scope
Repository: `nasrinaiv0/movo` only. Existing dedicated branch / PR: `fix/finance-calculations-sync` / PR #43. This extends the existing CSV import hardening; no duplicate PR was created.

## Finding
The CSV importer previously removed every comma, currency symbol, and whitespace character before calling `Number()`. That could turn malformed or ambiguous monetary input such as `1,2,3` into `123` and scientific notation such as `1e3` into a valid-looking amount. This silently changes what a user imports into their financial ledger.

## Change
- Added a strict amount parser for plain digits and correctly grouped thousands (for example `1234.50` and `1,234.50`).
- Supports the existing leading currency symbols `₱`, `$`, `€`, and `£`, including whitespace between the symbol and amount.
- Preserves the existing sign normalization and cent rounding behavior.
- Rejects malformed comma grouping, repeated decimal points, scientific notation, suffix text, and unsupported amount syntax with a row-level validation error.
- Does not upload the CSV or change finance persistence behavior.
- Added regression tests for malformed grouping, repeated decimals, scientific notation, and valid plain/grouped/symbol-prefixed amounts.

## Files
- `src/lib/csvImport.js`
- `src/lib/csvImport.test.js`
- This change record and the master change ledger.

## Validation status
- Exact source/test head `fb7f018de8446d9a63a95bb70a5b61970a68e00f` passed GitHub Actions run [41007544994](https://github.com/nasrinaiv0/movo/actions/runs/41007544994): **20 test suites / 127 tests passed**, TypeScript typecheck passed, `npm audit --omit=dev` reported **0 vulnerabilities**, and production compilation succeeded.
- Documentation-only follow-up head `d0aa73d7e99105546ca27e49b1cd510125d177e4` also passed GitHub Actions run [41007756323](https://github.com/nasrinaiv0/movo/actions/runs/41007756323) with the same **20 suites / 127 tests**, typecheck, production-only audit (**0 vulnerabilities**), and production build.
- Exact-head Vercel preview [dpl_4zaKJ7CZfMBKfZpDmznoWzK5aeiL](https://vercel.com/nasrin-ai/movo/4zaKJ7CZfMBKfZpDmznoWzK5aeiL) reached **READY**. The preview root returned HTTP 200, and the deployed JavaScript bundle contained the new amount-format validation message. A static bundle check is not an interactive authenticated CSV-import test.
- This evidence file is being refreshed as a documentation-only follow-up. Always verify live CI/deployment status for the final current SHA before merge; do not reuse a result for a later, untested SHA.

## Security and limitations
- No database schema, financial records, Supabase RLS/grants, authentication settings, deployment variables, or provider secrets were changed.
- This parser intentionally expects a dot decimal separator and standard three-digit comma grouping. Locale-specific formats such as `1.234,50` are rejected instead of guessed; supporting locale selection would require an explicit UX choice and dedicated tests.
- Manual authenticated cloud import and owner-isolation verification remain separate release gates.
