# MOVO wearable compatibility — initial companion PR (2026-11-12)

## Implementation progress and release boundaries

- **Scope:** add a separate Wear OS module and a watchOS SwiftUI companion target to the existing Android/iPhone app, with one explicit **Quick Log on phone** handoff.
- **Privacy:** watch UIs receive **no balances, accounts, transactions, receipt images, bank or card identifiers, credentials, access tokens, or financial summaries**. No cloud API, database migrations, permissions for sensors, or background sync. Watches cannot create/edit/delete ledger rows. Existing phone authentication, local unlock, user consent, offline save, calculations and audit behavior stay authoritative.
- **Android:** wearable-only `android.hardware.type.watch` manifest, `standalone=false` and separate :wear output. A foreground user tap sends only fixed `movo://wear-log` to the paired phone through AndroidX RemoteActivityHelper. The Android phone's allowlisted intent opens its existing transaction sheet **only after** setup, auth initialization and local unlock.
- **Apple:** watchOS SwiftUI target with WatchConnectivity reachable-message handoff. iPhone accepts only exact `quickLog` action, saves a boolean one-shot pending request, and consumes it through MOVO's existing Capacitor bridge while the iPhone app is foregrounded/unlocked. A watch request never opens the phone by itself or logs a transaction.
- **App Store:** same iPhone app + embedded watchOS companion, iPhone bundle `com.nasrinai.movo`, Watch bundle `com.nasrinai.movo.watchkitapp`. Xcode watch target/scheme must compile and signing/provisioning must be verified before release.
- **Google Play:** watch module uses the same applicationId `com.nasrinai.movo` as phone but must be released as a **separately signed Wear OS AAB** with a unique, monotonically increasing `MOVO_WEAR_VERSION_CODE`; it must use the **same app-signing identity**. Do not upload unsigned CI builds. Require watch-form-factor Play listing images/screenshots and complete financial features/marketing declarations before publishing.

## Security / abuse checks

1. Watch handoffs never include user data or arbitrary parameters; reject unexpected URI query/fragment and unsupported actions. Any installed Android app can invoke public deep links; these only ask MOVO to open its phone UI, never perform a write.
2. No watch-side biometric/auth assumption. **Phone must unlock and finish setup** before opening a form. The user chooses fields and explicitly saves as usual.
3. Apple Watch `sendMessage` is best-effort while the paired iPhone is reachable; no delayed financial payload or broadcast. iPhone pending flag contains *only* a boolean, consumed once; no token, PII or replayable financial command.
4. Watch UIs contain no bank logos, Google favicons, financial identifiers or user-generated text. Existing logo and privacy notices do not expand.
5. Confirm app data deletion still removes phone records and that no watch data backup, account linkage, or lingering finance cache is introduced.
6. No existing entitlements, IAP/store products, Apple/Google Billing paths, SQL migrations, RLS policies, mobile banking integrations, or production configuration changed.

## Testing and review gates

- Run `python3 scripts/test-wearable-contract.py`, `npm test -- --runInBand src/lib/native.test.js` and full `CI=true npm run build`.
- Android CI: `npx cap sync android`, `gradlew :app:assembleDebug :app:assembleRelease :wear:assembleDebug :wear:bundleRelease`. Wear AAB is unsigned and **not** automatically uploaded.
- iOS CI: `npx cap sync ios`, iPhone simulator compile plus `xcodebuild -target MOVOWatch -sdk watchsimulator CODE_SIGNING_ALLOWED=NO build`. On a paired Apple Watch, test both reachable/unreachable iPhone cases.
- Device acceptance: Wear OS tap -> paired Android launch -> phone unlock -> manual expense entry -> Save (one row); Apple Watch tap -> open iPhone -> unlock -> manual expense entry -> Save. Also test declined/watch offline, stale pairing, uninstalled phone, account switching and reduced motion.
- Before merge verify all required GitHub checks, Play and App Store signing, both real-device flows and *no changes to production*. App icon and store media for watches need product approval. **This PR must not auto-merge.**

## Rollback

- Revert this PR to remove watch modules, the Android `movo://wear-log` phone intent, iPhone watch delegate and JS one-shot handler. Phone data, database and stores remain unchanged.
- Existing installed phone versions keep working: watch features are isolated optional companions, and the old app has no dependency on any watch code.
- If watch delivery fails review, disable watch uploads; keep existing phone releases untouched. Play Store/watch provisioning requires separate, deliberate publishing approval.
