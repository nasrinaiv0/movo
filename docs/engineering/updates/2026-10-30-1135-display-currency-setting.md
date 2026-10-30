# MOVO Display Currency setting — 2026-10-30 11:35 Asia/Manila

**Repository:** `nasrinaiv0/movo`  
**Branch / PR:** `fix/finance-calculations-sync` / PR #43  
**Implementation commit:** `dac81e426038e0165f235bae882cffdf9ef6c4bf`

## Finding

The CSV multi-currency import flow told users to change “Display Currency in Settings” to review each currency, but no such selector existed in the Settings UI. The finance branch already exposed `displayCurrency`, `availableCurrencies`, and a validated `setPref('displayCurrency', ...)` state path; the user-facing control was missing.

## Change

- Added a native `Preferences → Display Currency` select to the Settings screen.
- The control uses the app's available currency list, filtered to valid three-letter codes and always including the current selection.
- A change calls the existing `setPref('displayCurrency', code)` handler, which resets month/card selection and causes summaries to recalculate for the selected currency.
- If only one currency is available, the native select is disabled and the associated description explains that the user can add/import a record in another currency to create another option.
- The description explicitly states that currencies remain separate and no automatic FX conversion occurs.
- Updated the select's styling and focus visibility using the existing global focus rules.

## Regression coverage

- Accessible name: `Display Currency`.
- `aria-describedby` points to the explanatory text.
- Selecting USD calls `setPref('displayCurrency', 'USD')`.
- The no-conversion explanation is visible.
- With only PHP available, the select is disabled and the reason to add/import another currency is visible.

## Validation status

The implementation commit is on PR #43. Exact-head GitHub Actions, Vercel preview, typecheck, full tests, production build, and security audit are **pending** for `dac81e426038e0165f235bae882cffdf9ef6c4bf`. Prior successful runs for the previous branch head must not be reused as evidence for this commit.

## Integration note

The separate open PR #60 contains an Appearance row stating that PHP is the only available currency. That row must be reconciled with this selector before PR #60 can merge. The selector is intentionally part of the finance branch because its behavior depends on the currency-aware app context introduced there.

No database schema, RLS/grants, production financial records, Auth settings, or secrets changed.
