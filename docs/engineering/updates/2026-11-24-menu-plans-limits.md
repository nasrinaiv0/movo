# Restore Menu Plans & limits — 2026-11-24

## Scope and rationale
One Menu tile opens the existing combined Plans and Limits sheet, preserving Financial planning navigation, category budgets, account and merchant limits, translations and all finance logic.

## Reproduced failures
GitHub run 45328043529 rejected code-only commits 4454b3b and bdff644 due to missing same-commit progress and engineering documentation. Vercel deployment dpl_Baoapqwft26wiuG98erTRNySH9Qs failed only the legacy full-app Menu order assertion (1,804 tests passed). Correct that assertion and exercise direct navigation, active Plans tab, Limits and close back to Menu. Preserve the separate Menu unit test. Consolidate the PR-only history to satisfy the existing policy, with an expected-head lease.

## Acceptance
Exact-head CI, Vercel READY, actual light/dark mobile screenshots and independent frontend review remain required before merge. No remote migrations or production modifications.
