# 2026-11-17 — PR #316 brought up to date with main (#314, #315)

## Why
The owner asked to merge all finished PRs. #315 changed the same Profile and Appearance screens as this PR.

## Resolution
- `screens/Profile.js`: this PR's two-column grid (`adaptive-settings-grid`) now wraps #315's rows, which have tinted icon tiles, short descriptions and the one-line Local Storage note.
- `screens/Settings.js` (Appearance): this PR's grouped sections stay. #315's "Colour-coded icons" switch is added under Display & Layout.
- Everything else merged without conflicts.

## Validation
Jest (243 suites, 1,512 tests) and `tsc --noEmit` pass on the merged tree.
