# 2026-11-16 — One pop-up surface with an iOS-style edge, light and dark

## Owner request
Make every pop-up panel look like the transaction-details pop-up (owner's screenshot). It should adapt to light and dark mode and have an iOS 27-style border. Budgets & Plans in Menu should match.

## What changed (`src/App.css`, last block "Pop-up panels")
- **Surface:** every `Sheet` (bottom sheets and centred dialogs) has an opaque surface: `--pop-bg`, white in light and `#1c1c1e` in dark, matching the reference. The translucent glass panel used by Budgets & Plans and Limits, with its bright white outline, is gone.
- **Edge:** an iOS-style hairline drawn as a gradient border (`--pop-rim`), painted with a padding-box fill over a border-box gradient so it stays fixed while a long sheet scrolls.
  - Dark: a light rim, brightest at the top-left and faint along the sides.
  - Light: a faint grey rim.
  - Each theme has its own soft shadow (`--pop-shadow`).
- **Shape on phones:** bottom sheets float 8 px from the screen edges and above the home indicator, with 32 px corners all round. Centred pop-ups use the same 32 px corners. The composer's sticky Save bar follows the new bottom padding and keeps the rounded corners.
- **Composer sheets** (Add transaction, Add account) use the same surface; their fields stay one step off it (`--tx-field`).
- **Backdrop:** the page behind a pop-up dims and blurs (8 px; 4 px on Android for performance; none with "reduce transparency").
- This supersedes the 2026-11-12 "no outline" rule for the transaction-details pop-up and the plan panel's own shadow. Higher-specificity selectors win over those older rules.

## Validation
- Jest full suite, `tsc`, strict build.
- Browser check of the built app (430×932, sample data), before and after, in light and dark:
  - transaction details, Budgets & Plans (Plans), Budgets & Plans (Limits), Add Transaction, and Settings → Language;
  - computed styles confirm one surface, edge, radius and shadow on all five;
  - no console errors.
- Not done: no check on an iPhone or Android device. The safe-area spacing applies only on devices with a home indicator.

## Rollback
Remove the "Pop-up panels" block at the end of `App.css`.
