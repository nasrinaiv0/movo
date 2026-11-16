# Tablet and desktop layouts

## Plan and baseline

- Branch from main and apply the shared layout across the MOVO customer app and Owner Command Center. Keep route, authorization, purchase and finance behavior in the existing components.
- At 820 and 1440 px, baseline renders show Settings groups lining up in one long column, the Menu using broad two-column tiles, and a transaction panel outside the initial viewport. Build shared width and spacing rules first, then give compound screens layouts based on their content.
- Use balanced grids for dashboard tiles and settings groups, a readable measure for single-purpose pages, and compact or work-sized centered panels. Verify keyboard focus, Escape, upgraded text size, short windows and phone behavior using invented records.
- Scope: application shell, shared Sheet, screen structure and CSS. Rollback is a revert of this PR. No migration or storage changes are required.

## Implementation and verification

- The shared workspace keeps consistent gutters and uses a bounded reading column for sign-in, help, legal, chat, archive and notifications. Dashboard widgets and settings groups use wider layouts, and Wallet cards, FX, subscriptions and market views present related information together. The Owner Command Center adjusts card columns to its usable width and keeps the module rail scrollable.
- Shared sheets render above the app shell. Tablet and desktop panels center within the visible window, remove the bottom-sheet grabber and preserve focus when opened or dismissed. Transaction and account entry use related panes on wide screens, and search, receipt review, plans and CSV preview get appropriate panel widths.
- Node 26 strict production build, typecheck, localization build and all 1,491 tests passed. The existing device Back test also checks the sheet mount and returned focus.
- Isolated Chromium checked 22 customer routes at 820 and 1440 px, with additional checks at 1024 × 600 dark, enlarged text, and the 390 px phone dock. It exercised transaction entry, wallet controls, account entry, search, Friends, budgets and plans, subscription catalog and plan comparison. Vercel Sandbox repeated the customer checks with fixture services. The Owner Command Center passed five fixture-backed module checks at both 820 and 1440 px.
- Remaining manual checks before release: Safari on an iPad with real resize and keyboard behavior, paid receipt scanning and scheduling with a test entitlement, and store purchase acceptance when releasing a native build. The separate Friends Summary PR carries the in-app recipient experience.

## Compact layout refinement

- Leaner workspace padding and a more compact navigation rail give room back to tablet dashboards. Use a consistent spacing scale for headers, cards and lists while keeping the app's primary controls comfortable to tap.
- Turn Menu tiles into compact, aligned action cards. Keep the summary, list and detail views easy to scan, with aligned ledger metadata on wide rows and adaptive text wrapping.
- Move the transaction keypad alongside the entry fields on standard iPad widths and keep the save action reachable in short windows. Reduce surplus padding in general panels and avoid changing any form, purchase, permission or financial behavior.

- Customer layout checks passed at 820 px and 1440 px across 22 routes each, with additional coverage at 1024 × 600 in dark mode with the largest text setting and a 390 px phone. Transaction entry was exercised across Expense, Income and Transfer. The compact account action stays within reach while the panel scrolls. Five Owner Command Center modules passed fixture checks at both wide widths.
- Node 26 passed all 1,491 tests across 240 suites. Screenshots contain sample records. The customer layout adjustments live in `src/AdaptiveLayout.css` and the owner adjustments in `src/owner/OwnerConsole.css`.
