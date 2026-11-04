# PR #177 — Final verification checkpoint

Date: 2026-11-04 (Asia/Manila)
Repository: `nasrinaiv0/movo`
Branch: `feat/live-fx-crypto-markets`
Verified head: `e936b2d8fb3db1f13c699dc42d678747add9ff08`

## Delivered on this head

- FX converter, tracked pairs, refresh/freshness state and historical reference charts.
- Crypto market discovery, search/sort, coin details, provider-supported history and local watchlist.
- Local above/below price alerts with threshold-crossing detection, re-arming, enable/pause/delete and permission-aware foreground notifications.
- Crypto remains separate from cash, income and expense totals.
- Server-side CoinPaprika proxy; provider key is not exposed to the browser.

## Exact-head automated evidence

GitHub Actions run [41722895702](https://github.com/nasrinaiv0/movo/actions/runs/41722895702), head `e936b2d8fb3db1f13c699dc42d678747add9ff08`, completed successfully on 2026-11-03.

All workflow steps passed:
- checkout and Node setup
- dependency installation (`npm install`; repository has no lockfile)
- production dependency audit
- TypeScript typecheck
- translation catalogue coverage
- full regression suite
- production build

The Vercel GitHub check named **Vercel Preview Comments** passed, but that check only reports unresolved feedback. The separate Vercel commit status was **Canceled by Ignored Build Step**. A canceled build is not a deployed preview and is not evidence of a successful deployment.

## Remaining release gates

1. **Vercel preview deployment:** verify or trigger a real preview deployment for this exact head. The available GitHub connection can read the Vercel check/status but does not expose Vercel project settings or deployment controls. Inspect the Vercel project's Ignored Build Step / deployment settings and confirm the preview URL and deployment SHA.
2. **Live browser/device smoke test:** verify the preview at mobile and desktop widths, including FX conversion, quote currency/freshness, crypto market loading, watchlist persistence, alert crossing/re-arming, notification permission and graceful provider-unavailable behavior. This must be tested against the deployed preview; automated unit/build success is not a substitute.
3. **Provider configuration:** set `COINPAPRIKA_API_KEY` in Vercel server-side environment variables using a plan/licence permitting customer-facing display, then confirm the preview returns provider-backed data. Do not expose the key to client code.
4. **Portfolio scope:** manual crypto holdings, cost basis and valuation are explicitly not included in this PR and remain a separate follow-up. No Supabase migration/RLS work is required for the current local-only watchlist and alert preferences.

## PR disposition

Keep PR #177 in draft until gates 1–3 are evidenced. Do not merge based solely on green CI or the Vercel Preview Comments check. Portfolio is a separate follow-up and should not silently block this market/watchlist/alerts scope unless the product owner changes the scope.
