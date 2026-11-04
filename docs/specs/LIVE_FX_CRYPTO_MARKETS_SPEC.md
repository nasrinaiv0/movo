# MOVO Live FX, Cryptocurrency & Markets — Implementation Specification

Status: Partial implementation in PR #177. FX converter, searchable currency selector, tracked pairs, refresh/freshness UI and historical daily-rate charts are implemented. Crypto market discovery, local watchlist, coin detail and provider-supported daily history are now implemented in this branch. Price alerts are implemented as local preference rules with above/below threshold crossing, rearming, enable/pause/delete controls and foreground permission-aware notifications. Manual portfolio holdings, cost basis and market valuation are implemented as local-first preference records.
Owner request: 2026-11-04.

## Product outcome

Add a Markets area to MOVO with two distinct capabilities:
1. Foreign exchange: monitor currency rates, convert amounts, and inspect rate history.
2. Cryptocurrency: browse a live market, inspect coin details and charts, maintain a watchlist, configure price alerts, and track manually entered holdings.

PHP is the default display/base currency for users in the Philippines. Respect the user's existing preferred base currency when one is configured; do not hard-code PHP into accounting logic.

## Navigation and information architecture

- Add a Markets entry point accessible from the main navigation or Menu without displacing the core Home, Wallet, Transactions, NasrinAI, and Menu workflows. Prefer a Markets screen nested from Menu unless product design review approves a primary-tab change.
- Markets screen has tabs/segments: Overview, Currencies, Crypto, Watchlist.
- Overview surfaces a compact FX converter, selected FX pairs, crypto market snapshot, and the user's watchlist.
- Search and detail views must be keyboard accessible and usable at 320px width and 130% text scaling.
- Match MOVO's existing iOS-inspired visual language, adaptive light/dark themes, accent preferences, touch targets, and reduced-motion behavior.

## Foreign exchange

### Capabilities
- Search/select supported ISO-4217 currencies, including the existing CURRENCIES list in src/lib/fx.js.
- Convert a user-entered amount between any supported pair.
- Show the pair rate, inverse rate, daily change where the provider supplies comparable data, and the provider's as-of timestamp.
- Show historical rate series for 1D, 1W, 1M, 3M, 1Y where the provider supports it.
- Allow users to pin frequently used pairs.
- Refresh rates automatically while the Markets screen is active, with a visible last-updated time and manual refresh.
- Clearly distinguish a live provider response from cached or fallback rates. Never label fallback values as live.
- Keep original transaction amount/currency unchanged; existing conversion-to-base behavior in src/lib/fx.js remains the accounting conversion path.

### Data and refresh
- Extend the existing FX module rather than creating a second conversion implementation.
- Introduce a provider adapter that normalizes { base, rates, asOf, fetchedAt, provider, live }.
- Use a bounded cache and request deduplication. Recommended foreground polling interval: 5 minutes, subject to provider terms and rate limits. Stop polling when the app is backgrounded or screen is unmounted.
- Use exponential backoff and stale-cache fallback on network errors. Show the stale status and timestamp.
- Historical rates must come from a provider endpoint with documented history support; do not fabricate a history from the current rate.
- Do not send transaction records, account identifiers, amounts, or other financial data to FX providers. Requests contain currency codes only.

## Cryptocurrency market

### Market discovery
- Searchable market list with coin name, symbol, icon, rank, current price in selected base currency, 24-hour percentage movement, market capitalization, and 24-hour volume where supplied.
- Default featured assets may include BTC, ETH, SOL, XRP, BNB and USDT, but the list must be provider-driven and searchable rather than hard-coded to those assets.
- Filters/sorting: market cap, price change, price, and favorites. Label the quote currency clearly.
- Market overview may show total market cap and market movement only when the provider returns those fields.

### Coin detail
- Coin name/symbol, current quote, 24-hour change, market cap, volume, circulating supply, rank and provider timestamp when available.
- Historical price chart for 24h, 7d, 30d, 90d, 1y (only supported windows; no synthetic points).
- Show source attribution and clear delayed/cached status.
- Price alerts: user-defined above/below thresholds, enabled/disabled state, threshold-crossing detection and rearming. Rules are stored locally in MOVO preferences. Alerts are evaluated while MOVO is open and the market screen refreshes. Device notifications use the existing web Notification API or Capacitor local notifications only after permission is granted. Background delivery is not guaranteed; explain that limitation in the UI.

### Watchlist and portfolio
- Watchlist is separate from holdings. Users can add/remove assets and reorder them.
- Portfolio holdings are manual records: asset, quantity, quote currency, acquisition date, optional unit cost and fees. Support multiple lots or an explicit average-cost method; document the chosen method.
- Show current market value, cost basis, and unrealized P/L only when required price/cost inputs exist. Include a clear timestamp and quote currency.
- Crypto is an investment asset, not cash. Do not add crypto market value to available bank/cash balance or monthly income. Integrate it into a separately labelled investment/net-worth view only after accounting rules are defined and tested.
- Do not implement exchange account connections, wallet private-key collection, custody, deposits, withdrawals, swaps, or trading in this scope.

## Crypto provider implementation notes\n\nThe first adapter uses CoinPaprika's server-side API Pro host. The API key is read only from `COINPAPRIKA_API_KEY` in the Vercel server environment and is never included in the client bundle. The keyless tier is limited to personal exploration and is not suitable for redistribution in MOVO; use a provider plan/licence that explicitly permits the intended customer-facing display. If the key is absent, the API returns a stable configuration error and the UI preserves the local watchlist without fabricating prices. The market endpoint is bounded to 100 assets, quote currencies are allow-listed, coin IDs are validated, and normalized numeric fields/timestamps are checked before reaching the client. Responses are cached for three minutes; source `last_updated` is displayed separately from fetch time. Historical requests are limited to 365 days and the actual returned observations are shown without synthetic interpolation.\n\n## Data providers and security

- Use a provider adapter boundary for FX and crypto so vendors can be changed without rewriting screens.
- Provider selection must be based on documented API capabilities, terms, rate limits, CORS behavior, availability, and licensing for icons/market data.
- Any paid provider key must be server-side only. Never put API secrets in REACT_APP_*, local storage, source code, logs, or client requests.
- If a same-origin serverless proxy is required, validate supported symbols/quote currencies, cap page sizes and request frequency, apply timeouts, cache public market responses, and return normalized safe fields only.
- Do not expose raw upstream error bodies or provider credentials to clients.
- Do not send user financial records or identity data to market-data providers.
- Treat all upstream data as untrusted; validate numeric values, timestamps, symbols, array sizes and URL/icon fields before rendering.
- No Supabase migration is needed for public market data. If cloud-synced watchlists, alerts, or holdings are added, use a new migration with owner-scoped RLS, least-privilege grants, and isolation tests. Local-only preferences must remain supported.

## Suggested implementation phases

1. Provider/data layer: FX freshness metadata and reference-rate adapter are partially implemented; historical FX adapter and crypto market provider adapter, schema validation, cache/backoff hardening and tests remain.
2. FX UI: converter, searchable currency selector, tracked pairs, refresh/stale indicators and 1W/1M/3M/1Y historical charts are implemented in PR #177.
3. Crypto UI: market list, search/sort, coin detail and supported history charts.
4. Watchlist and alerts: local-first preferences, permission-aware notifications, tests.
5. Portfolio: holdings CRUD, valuation, cost basis and accounting/net-worth integration with explicit separation from cash.
6. Documentation, accessibility, responsive screenshots, full regression and production-preview verification.

## Acceptance criteria

- Existing transaction conversion, account balances, transfers and base-currency preferences remain correct.
- The UI never describes cached/fallback data as real-time/live.
- Every market value displays its quote currency and source timestamp.
- Refresh is bounded, deduplicated, abortable on unmount/background, and respects provider limits.
- Offline and provider-error states are useful and do not crash the app.
- Invalid, missing, negative, infinite or stale provider values are handled safely.
- No private financial data is sent to market-data providers.
- Watchlist/holding data is user-isolated in cloud mode and remains usable in local-only mode.
- Crypto holdings do not inflate cash, income, or expense totals.\n- Portfolio records merge by stable ID between local and signed-in preference copies; invalid quantities/costs are rejected.
- Tests cover conversion, stale rates, refresh/backoff, provider normalization, chart windows, portfolio valuation, cost basis, RLS (if persisted), and responsive/accessibility behavior.
- npm test -- --runInBand, npm run typecheck, and CI=true npx react-scripts build pass on the exact PR head. Vercel preview must be smoke-tested. Cancelled/skipped checks are not passes.

## Explicit non-goals

- Cryptocurrency trading, exchange connectivity, custody, wallet private keys, transfers or swaps.
- Guaranteed tick-by-tick pricing. “Live” means the latest provider update with a visible timestamp and refresh policy.
- Investment advice, buy/sell recommendations, or guaranteed returns.