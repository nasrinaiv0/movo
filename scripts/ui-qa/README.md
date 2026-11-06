# Vercel Sandbox UI checks

Synthetic data only. Uses the real Cryptocurrency, Financial Planning and reminder React components and application CSS; repository adapters are replaced by local fixtures. No customer account or database is used.

Inside the Vercel Sandbox, install Playwright in a separate tooling prefix, build with `NODE_ENV=development node scripts/ui-qa/build.cjs`, serve `/tmp/movo-ui-qa` on port 3000, then run `scripts/ui-qa/check.cjs` with `NODE_PATH` pointing to the tooling directory and `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` set to the installed Chromium executable.

Covers 320, 390 and 430 CSS-pixel widths, light/dark, green/orange accents, header dimensions and page/dialog overflow. Screenshots and JSON results are written to `/tmp/movo-source-transfer`. This is a component integration check, not a real bank/payment or native StoreKit/Play Billing test.

For the production Home, Wallet, Transactions, Menu, Crypto and Scheduled headers, serve `build/` on port 4174 and run `NODE_PATH=<Playwright installation>/node_modules node scripts/ui-qa/headers.cjs`. Set `QA_URL` to override the local address. This uses the app's local empty state, intercepts crypto responses with deterministic fixtures, and checks 320/390/430px in light/dark mode, utility grouping, separate Plus actions, 45px geometry, dialogs, provider timestamps, failed refresh and reduced motion. Screenshots and results are written to `/tmp/header-*`.

To validate the compact bill payment sheet, build the fixture and serve `/tmp/movo-ui-qa` on port 4175, then run `NODE_PATH=<Playwright installation>/node_modules node scripts/ui-qa/bill-payment.cjs`. It checks six width/theme combinations and adds, edits, removes and records split payments through synthetic repository adapters only.
