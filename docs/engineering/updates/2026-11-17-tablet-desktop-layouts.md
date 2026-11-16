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
