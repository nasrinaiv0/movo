# Vercel Sandbox UI checks

Synthetic data only. Uses the real Cryptocurrency, Financial Planning and reminder React components and application CSS; repository adapters are replaced by local fixtures. No customer account or database is used.

Inside the Vercel Sandbox, install Playwright in a separate tooling prefix, build with `NODE_ENV=development node scripts/ui-qa/build.cjs`, serve `/tmp/movo-ui-qa` on port 3000, then run `scripts/ui-qa/check.cjs` with `NODE_PATH` pointing to the tooling directory and `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` set to the installed Chromium executable.

Covers 320, 390 and 430 CSS-pixel widths, light/dark, green/orange accents, header dimensions and page/dialog overflow. Screenshots and JSON results are written to `/tmp/movo-source-transfer`. This is a component integration check, not a real bank/payment or native StoreKit/Play Billing test.
