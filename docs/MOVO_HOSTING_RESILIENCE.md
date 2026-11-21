# Keep MOVO usable when Vercel is unavailable

2026-11-21. Implementation in #330. This is preparation for an independent host, not a deployed replacement. Vercel remains restricted; no billing, DNS, Supabase production settings or store records were changed. Preserve React/CRA, Capacitor, existing API handlers, owner scopes and the current financial model.

## What can work during an outage

| Surface | Available behavior | Limit |
| --- | --- | --- |
| Installed iOS/Android app | Bundled interface, device records and local finance tracking | Requires the installed version and usable local storage; server features need a backend |
| Previously installed browser/PWA shell | The updated worker opens cached public HTML on network failure, HTTP 402/429 or 5xx | Must have successfully installed this worker and cache before the outage; cannot rescue a first visit or download this fix through a disabled host |
| Supabase Auth/database/storage | Existing direct client connections remain independent of Vercel | Requires the actual Supabase project, valid auth/redirects and applicable plan gates; no guarantee of complete offline/cloud parity |
| AI, sharing/Friends, server automations, market proxies, purchase verification, account deletion | Existing handlers can run on the independent Node transport | Still needs deployed server credentials, provider availability, webhook/cron configuration and real acceptance tests |

The service worker caches public display resources only. It never caches/replays API writes, replaces 401/403 authentication denials, intercepts `/owner` or invitation pages, or handles sign-in query strings. If the cache is absent or denied, the original host response remains. A host outage does not itself erase device or Supabase records. Do not clear app/browser storage to troubleshoot it.

## Recommended deployment: keep the owned hostname

Run the current application and API handlers on a TLS-enabled Node 26 host independent of the disabled Vercel team. Keep `movo.nasrinai.com` as the public origin. After staging acceptance, the domain owner can point its DNS/edge routing at the tested host. This preserves old installed-app URLs, public links, existing Shortcut recipes, auth callbacks and same-origin browser data. A different browser hostname creates a different storage origin and does not automatically inherit unsynced records.

`scripts/serve-movo.cjs` serves a completed `build/` and an explicit list of existing API entry points. It delegates business/auth/accounting logic to the unchanged `api/` handlers. It does not expose the `api/` directory, private source, dotfiles, sourcemaps or symlinks outside `build/`. The transport preserves common security headers from `vercel.json`, exact CORS origins, private/no-store API defaults, JSON parsing with a 4 MiB bound, handler-specific size checks for chunked requests, public byte ranges, and 30-second request-body/65-second socket deadlines. It does not retry or redirect a financial write to another server.

Build and exercise an isolated candidate using Node 26:

```sh
npm ci
npm test -- --runInBand
npm run typecheck
node --test scripts/serve-movo.test.cjs scripts/build-offline-worker.test.cjs
npm run build:app-store
PORT=8080 npm run start:server
```

The original-only build keeps unreviewed artwork packs out of this candidate as well. App Store ownership/name/license evidence remains pending; this command is not Apple approval. A default `npm run build` preserves the legacy web asset profile and does not clear those assets for redistribution.

The process binds to `127.0.0.1` by default. A container/platform requiring another interface can set `MOVO_BIND_HOST=0.0.0.0` behind its TLS ingress. Never expose an unprotected development host as the live service. `/healthz` reports process liveness only; it does not prove database, provider, billing or frontend readiness.

Configure secrets in the independent host's private runtime secret manager, following `.env.example`: Supabase server URL/keys, enabled AI/market providers, store-verification credentials, owner allowlist and cron secret as applicable. Keep service-role/provider/store secrets out of `REACT_APP_*`, `build/`, logs and committed files. Preserve existing billing-off and owner/MFA/consent gates; an outage is not permission to grant plans or relax authorization. The Node entry point defaults `NODE_ENV` to production and does not automatically load private dotenv files.

## Optional split API origin

When frontend and API intentionally use different hosts, set the **public build-time** `REACT_APP_API_ORIGIN` to the reviewed HTTPS API origin, for example `https://api.movo.example`, then rebuild the web/native bundles. The example is not a provisioned destination. Values containing credentials, paths, query strings, fragments or insecure protocols are rejected by the build validator. Runtime invalid configuration falls back to the original host and does not break local startup or redirect tokens.

`apiUrl()` uses that origin for React API calls. New Shortcut recipes and referral download links use it too. Public app/share/auth origins stay separate. Do not derive API origins from local storage, an account field, a URL parameter or a remote untrusted instruction. No automatic POST retry or multi-host failover is added.

Set `MOVO_ALLOWED_ORIGINS` to the exact actual HTTPS frontend origins on the backend. Preflights allow the existing authorization/JSON/referral headers; arbitrary origins/headers are denied. Native/server clients without a browser Origin still require each existing handler's authentication. Old binaries, previously copied Shortcuts, public static links, app-link files, store webhooks and configured OAuth redirects do not move merely because a new build flag exists. Keep the owned hostname available or update and test each integration explicitly.

## Deployment acceptance before changing traffic

1. Confirm an independent provider, runtime, TLS, ingress/body limits, secret storage, monitoring, rollback and data-processing terms. Review recurring cost before provisioning a paid resource. No provider has been created by this change.
2. Build the exact candidate and verify the served public shell, mobile layouts, worker and notice file. Use fictional records; verify local create/edit/restart and balance consistency with Vercel blocked.
3. With disposable accounts, test direct Auth/cloud sync and owner isolation, then each enabled API feature. Synthetic/local tests do not establish production provider or signed-device acceptance. Keep unsynced device data and idempotency/recovery state intact.
4. Preserve store webhook JWT/signature/audience checks. If the callback URL changes, update the real Apple/Google configuration; do not disable verification. Configure an external authenticated schedule for `/api/purchases/retry-acknowledgements` every ten minutes with the existing `CRON_SECRET`. `vercel.json` does not schedule jobs on a Node host.
5. Preserve `.well-known` app-link/security files, public legal/support/invitation/download pages and all configured auth callbacks. Check native URLs as well as React API routing.
6. Only after the host passes, change the owned domain's traffic to that concrete destination, verify externally and retain the old route for rollback when available. There is no tested destination or DNS change in this commit. A new Vercel project inside the same blocked account does not provide an independent failure boundary.

Rollback changes routing to the last verified backend/build; it does not roll back the database, clear records or overwrite owner snapshots. Existing clients retain their configured API origin until rebuilt. Keep a single authoritative Supabase database and the existing operation IDs rather than copying ledgers between providers.
