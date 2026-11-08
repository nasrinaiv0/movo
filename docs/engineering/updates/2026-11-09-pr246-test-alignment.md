# PR #246 — test alignment and render-loop fix inherited from #245 (2026-11-09)

- Brought in #245's payment-link fix (links are marked handled and cleared before the Pro+ check), which stops
  the render loop that made `src/App.test.js` hang on this branch too.
- `src/App.test.js` expected the old "Retry save" toast. #246 deliberately changed it to
  "Browser storage is unavailable or full. Export your records and retry."; the test now checks that wording.
- Local verification on the merged tree: TypeScript passed; Jest 926/926 across 156 suites; strict build passed.
- Note: commit `a8b7990` (i18n catalogs) predates the per-commit documentation gate's dated-update rule; history
  is not rewritten. The branch lands on main as one documented squash commit.
