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
