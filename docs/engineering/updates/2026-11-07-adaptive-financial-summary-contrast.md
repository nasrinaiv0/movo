# Adaptive financial summary contrast — 2026-11-07

## Scope and baseline
- Repository: `nasrinaiv0/movo`; baseline `main` at `d31d73f`.
- User reference: five iOS screenshots of Financial Planning/Net worth, Cashback tracked, Monthly subscriptions, Home Total Balance and Transactions Total Spent with a light-pink accent fill.
- This is a presentation-only change; transaction data, subscriptions, financial math, saved preferences and database authorization stay unchanged. The existing layout, spacing, corner radii and graph dimensions remain intact.

## Root cause
The app already calculates `--on-accent` with `contrastTextForAccent` (WCAG contrast, black or white), including custom hex accents. However, older CSS hard-coded white ink on the five accent-filled cards and their graph bars/strokes. In a light-pink accent this produced low-contrast white text and light charts.

## Changes
1. Use `--on-accent` for `--summary-card-ink` on Home/Wallet balance, Transactions total-spent and Cashback total cards, and for Financial Planning and Subscriptions `.sub-hero` cards.
2. Bind text labels, values, eye icons, trend indicators, chart axis labels and selected bars to the same inherited ink. Use translucent foreground-derived fills for secondary bars and indicator backgrounds.
3. Match SVG area fill and MiniBars rectangles to foreground ink, not the identical accent background. Remove forced dark `color-scheme` from accent summary cards.
4. Keep the chart heights, paths, financial values, visibility masking and click behavior exactly as they were.
5. Add `src/AccentSummaryContrast.test.js` for accent contrast (including light pink and dark charcoal), CSS wiring, and the five target screen selectors.

## Verification and gates
- Completed in Vercel Sandbox `movo-adaptive-card-contrast-20261107`: `npm ci`; targeted Jest 20/20 passing (3 suites); full `CI=true npm run build` prebuild with 701/701 tests (124 suites), `tsc --noEmit`, and optimized CRA build successfully compiled.
- Completed in Vercel Sandbox Chromium: loaded the built MOVO web app at 390px, injected five representative summary-card fixtures using the production stylesheet, and verified 14 computed foreground/chart selectors in light pink (#efa1f3, black ink) plus dark charcoal (#1c1c1e, white ink): 28/28 checks passed. The fixture is local QA instrumentation, not product UI or a change to production data.
- Required: GitHub PR CI and preview verification before merge. Draft security PR #227 is independent and must remain unmerged pending native validation.
- Security: no secrets, persisted financial data, network endpoints or Supabase policies changed.
- Rollback: revert the CSS and regression-test file(s) from this PR; no data migration needed.

## Contrast rules
Choose ink from the actual accent fill via `contrastTextForAccent`, independent of appearance mode. Very light accents (e.g. pastel pink) use black; dark accents use white. Contrast ratio target: at least 4.5:1. Secondary chart strokes and labels retain differentiated opacity but must remain legible.
