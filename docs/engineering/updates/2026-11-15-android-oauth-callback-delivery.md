# Android OAuth callback delivery

## Evidence

After completing Google account selection, the owner saw MOVO Auth Test open and show `OA-NO-CODE`. The two prior PR #305 handoff checks intentionally sent no auth code. Read-only Supabase logs and flow-state aggregates corroborated three issued PKCE codes for the isolated Auth Test route at 11:14–11:15 a.m. Manila time and no same-window token exchange. The final response Location and the exact intent from the failing attempt were unavailable.

The installed APK's bundled handler reproduced `OA-NO-CODE` when its initial launch URL was the bare probe. It accepted a later correctly formed code. Capacitor Android 8.6.0 dispatches the initial intent through `onNewIntent` during bridge setup. Capacitor App 8.1.2 publishes cold and warm ACTION_VIEW intents as retained `appUrlOpen` events. The extra Android `getLaunchUrl()` can replay the original probe independently of the fresh event.

## Change and verification

- `src/lib/native.js` uses `appUrlOpen` as the single Android delivery path. iOS retains its launch URL fallback and browser close behavior.
- `src/App.js` and `src/components/AuthPanel.js` clear the native callback alert when a new sign-in starts, a valid code arrives, or the user navigates away. Fresh callbacks with missing codes still show the existing fixed diagnostic.
- Regression coverage exercises stale launch URLs, retained cold start events, fresh warm callbacks, and same-code deduplication. Run native auth, app callback, full unit suite, typecheck, production compilation, Android native build and preview.

Node 26.13.1 passed typecheck, all 233 Jest suites (1,452 tests), the strict web build, the bundled cloud connection check and eight Android public-config contract checks before commit. Hosted CI, preview and physical Android acceptance are pending.

## Security and rollback

Package schemes, verifier storage, the Supabase SDK exchange, OTP handling, URL validation, data and infrastructure stay as configured. Callback values are never logged or displayed. Roll back by reverting this commit before preparing another Android build.

## Device acceptance

Install the CI Auth Test APK alongside Play MOVO. Test a Google return after a cold launch, then repeat with Auth Test already open. Verify Home loads, the session survives force-stop and relaunch, and email OTP still works. If `OA-NO-CODE` recurs, record the Manila time and fixed label. The next evidence needed is whether the same run's outgoing Location and Android intent each have a query code, observed as presence flags. Do not copy raw auth URLs. Keep the PR unmerged pending this check.
