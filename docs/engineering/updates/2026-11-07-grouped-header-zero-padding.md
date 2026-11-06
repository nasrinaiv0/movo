# MOVO grouped header buttons — zero padding (2026-11-07)

## Request and scope
Remove **all four sides** of padding from each grouped header utility capsule and each action button inside it, across MOVO screens. The attached reference shows the combined Search, Notifications and Settings pill. Keep the existing appearance, button dimensions, icon dimensions, accessible controls, and separate Plus action intact.

## Code changes
- `src/App.css`: shared `.header-utility-group` and `.home-utility-pill` capsule padding changed **5px → 0**.
- Shared capsule minimum height changed **57px → 45px** so removing the padding actually removes the empty top and bottom space. Existing 1px decorative container border remains.
- Preserve **45×45px** button touch targets, **22×22px** glyphs, and **4px** icon-cell gap, with no change to header page padding or other button groups.
- Override the existing global **0.5px** header-action padding rule for **grouped** controls only, since it uses `!important` and higher selector specificity; standalone action padding is unchanged.
- `src/components/HeaderButtonSpacing.test.js`: updated zero-inset expectations and added a regression asserting the grouped-button override follows the global header control rule.

## Validation
Vercel Sandbox: `movo-header-group-zero-padding-20261107`, based on `main` at `db5420fa239c85230658a57d00bb1dbc18d65e29`. Test results should be recorded in the PR description after execution.

## Release safety
This change is CSS-only and has no intended effect on balances, transactions, authentication, privacy, RLS, or purchase validation. It does **not** constitute a security release. Security PR #227 remains a separate draft and must not be merged as part of this change.
