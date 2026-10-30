# MOVO Display Currency selector hardening — 2026-10-30 11:35 Asia/Manila

**Repository:** `nasrinaiv0/movo`  
**Branch / PR:** `fix/finance-calculations-sync` / PR #43  
**Current code head:** `4472a470e1efb18b0cccedeb7d9d9cbd43babd09`

## Finding

The CSV multi-currency import flow tells users to change Display Currency in Settings. The finance branch already has a functional Display Currency selector in the Appearance screen wired to `setPref('displayCurrency', ...)`; the remaining gap was that the selector stayed enabled when only one currency option existed and its description did not explain how to add choices.

## Change

- Hardened the existing Appearance selector; **no duplicate selector was added** to the Settings main screen.
- Filtered currency options to valid three-letter codes and ensured the current selection is included.
- Disabled the native select when only one currency is available.
- In single-currency state, the associated description explains that adding/importing a record in another currency creates another option.
- In multi-currency state, the description states that summaries show one currency at a time and MOVO does not convert currencies automatically.
- Preserved native select semantics and the existing visible focus treatment.

## Regression coverage

- Accessible name: `Display Currency`.
- `aria-describedby` points to the explanatory text.
- Selecting USD calls `setPref('displayCurrency', 'USD')`.
- No-automatic-conversion wording is visible when multiple currencies are available.
- With only PHP available, the select is disabled and the reason to add/import another currency is visible.

## Validation status

Current code head `4472a470e1efb18b0cccedeb7d9d9cbd43babd09` requires a fresh exact-head GitHub Actions run and Vercel preview check. Previous passing runs do not validate this commit.

## Integration note

PR #60's branch has a stale static “Philippine peso is the only available currency” row. Reconcile it with the selector before PR #60 can merge.

No database schema, RLS/grants, production financial records, Auth settings, or secrets changed.
