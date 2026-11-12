## 2026-11-13 — Security assurance / encrypted QR cache follow-up (DOCUMENTED BEFORE COMMIT)

- Owner requested an evidence-based document explaining why MOVO is designed to protect user data and safe security hardening inside the code. Read live Supabase schema/advisors, open PRs #289/#290, Vercel production commit, legal pages and QR local storage.
- **Verified** 44/44 public tables have RLS; selected finance/AI table policies enforce `auth.uid() = user_id`; security advisor still has 15 callable SECURITY DEFINER warnings, 15 intentional/no-policy informational findings and 1 leaked-password protection warning. No database, billing or auth-console modification made.
- **New code (staged)**: seal offline bank/e-wallet QR PNGs with the finance vault; atomic IndexedDB legacy data migration and fail-closed tamper detection; pre-render migration and regression tests. Adds accessible `/security` trust page and non-exaggerated user data security assurance documentation; fixes outdated Privacy/Terms version-dependent encryption descriptions.
- Existing main production remains at `2b9a1cf7`, and PRs #289/#290 are open. New PR must be stacked on #290 and **not merged or deployed**. All new CI tests, Vercel preview, iOS native and real-device acceptance still pending.
- Detailed log: `docs/engineering/updates/2026-11-13-security-assurance-qr-cache.md`. Security document: `docs/security/MOVO_USER_DATA_SECURITY_ASSURANCE_2026-11-13.md`.

## 2026-11-13 — PR #290 exact-head CI red; non-destructive repair before commit

- Exact initial head `89e159c`, Phase 1, hybrid-sync accounting, and Android CI stopped at Jest; **220/227 suites passed, 7 failed (1,347/1,368 tests passed)**. Disposable PG tenant isolation and IAP integrity both passed; no production deploy.
- Found and corrected **native restore regex with double-escaped literal backslashes**; it prevented reading harmless `movo.preferences.v3`. Use correct regex escaping, still skip sensitive raw finance keys during generic restore.
- Removed a **static financeVault import in Jest global setup** which preloaded native/platform code before per-test mocks, breaking native auth/browser/back-button tests. Test-only finance key now passed as a global byte array read only during financeVault module init in `NODE_ENV=test`. Ensure JSDOM supplies full WebCrypto, not just `getRandomValues`.
- Updated `src/App.test.js` to assert through normal decrypted storage interfaces instead of interpreting encrypted localStorage as plaintext arrays; retain actual UI/accounting expectations.
- IndexedDB interrupted-upgrade test expects a failed abort, and still verifies the entire original raw journal is byte-for-byte unchanged; fake-indexeddb reports a standard AbortError instead of the injected exception.
- Release gates: rerun all exact-head tests + Android/iOS compiles + Vercel preview. Preserve both pending journal and old installation data. **Do not merge or deploy**.

## 2026-11-13 — Separate staged financial ledger encryption PR (precommit)

- Scope: protect synchronous `offlineWorkspaceStore` and `localFinanceStore` and the atomic IndexedDB `hybridLocalStore` pending outbox, without changing accounting transaction IDs, tombstones, approvals or cloud state.
- Design: audited sync XChaCha20-Poly1305 cipher and HKDF domain separation from PR #289's mobile Keychain/Keystore seed; browser non-extractable HMAC-based local key; encrypted, verified pre-render legacy migration and whole-transaction IDB rollback.
- Protect startup against key loss (block UI, never show empty wallet), keep legacy pref conflict in encrypted recovery capsule, and retain async native mirroring of ciphertext.
- Tested: standalone Python AEAD round-trip/tamper-property check. Vercel temporary sandbox **unavailable due 402 payment_required**; no billing action taken. Use GitHub's disposable CI. Native hardware acceptance and rollback/downgrade safety are release blockers.
- This is a **stacked PR based on #289, not a production change**. Do not merge or redeploy. Exact-head tests pending.
- Detailed precommit record: `docs/engineering/updates/2026-11-13-encrypted-finance-ledger-nondestructive.md`.

## 2026-11-12 — PR #289 native test mock lifecycle repair (documented before commit)

- The second CI rerun reached 224/225 passing Jest suites; Vercel preview build failed only for `financeCacheNative.test.js` (4 checks), while Web AES-GCM tests now passed.
- Cause: React-scripts/Jest resets mock implementations between tests; the native test attached `MovoNative.secureGet`, `secureSet` and Preferences methods in `beforeAll`. Their implementation was gone when called, so test-only wrapped-key verification failed.
- Fix mocks in `beforeEach`; retain sealed test key for the test module to validate persistence. No production, native encryption implementation or accounting data changed. Recheck exact new SHA; keep PR unmerged.

## 2026-11-12 — PR #289 CI repair (documented before commit)

- Initial exact-head Phase 1 CI on `73db23e` **failed**; 220/225 suites passed. Root evidence: new encryption tests could not persist a non-extractable CryptoKey under jsdom's fake IndexedDB; the Jest-only TextEncoder polyfill was read-only and broke existing suites assigning it.
- Fix **test harness only**: writable TextEncoder/TextDecoder and Node's native structuredClone for CryptoKey preservation in jsdom. Do not weaken AES-GCM or tampering tests. Add direct cryptographic assertions so a future failure surfaces its original exception instead of a masked cache miss.
- Additional independent hardening: serialize the browser key's final check-and-put in one IndexedDB read/write transaction to prevent two tabs creating different keys. No signed-in data, backend schema or live systems changed.
- Validate with exact-head CI, native Android/iOS builds and preview; PR remains open and unmerged.

## 2026-11-12 — Offline financial read-cache encryption (PR staging, production unchanged)

- Owner asked to harden financial data stored in plaintext by PR #287's new `offlineReadCache.js`.
- Prepared AES-256-GCM authenticated encryption per owner/list; native random key wrapped by existing Keychain/Keystore plugin; browser non-extractable WebCrypto key stored in IndexedDB; new ciphertext is never mirrored to Capacitor Preferences.
- Legacy list-cache JSON is migrated write-verify-then-delete, retried safely after incomplete migration; finance list retrieval remains cloud-first with offline fallback, owner isolation, and no auth-denial downgrade.
- Expanded tests for encryption, manipulation/cross-account, migration, quota failure, native vault allowlists, Preferences cleanup. New native plugin key allowlist requires separately signed mobile releases.
- **Scope limitation:** other plaintext accounting stores (`offlineWorkspaceStore`, `localFinanceStore`, and IndexedDB `hybridLocalStore` ledger/outbox) are not changed: rewriting their synchronous/atomic persistence without a proven compatibility plan risks destroying unsynced transactions. This remains a high-priority unresolved whole-app storage issue.
- Precommit evidence: exact main SHA `2b9a1cf` and a standalone Python AES-GCM/AAD test. **GitHub full suite, native compiles and physical devices still pending.** No Supabase/production modification, no merge/redeploy.
- Detailed record: `docs/engineering/updates/2026-11-12-financial-offline-cache-encryption.md`.

## 2026-11-12 — PR #287 merge-conflict resolution (docs-only overlap)

- **Before commit:** compared the exact branches `3e47d69` (PR #287) and `e7d7126` (main) against merge base `7a65b55`. Only `docs/PR_PROGRESS.md` overlaps; main adds `docs/engineering/updates/2026-11-12-android-auth-release-gate-test-isolation.md` which is absent from PR #287.
- Preserve all PR #287 offline-first sync, subscriber offline records, referral and Android sign-in progress, followed by the whole updated main progress (including PR #286 release-gate notes). Carry forward main's added Android release-gate report. No app, tests, build, database or production environment code is changed as part of the conflict resolution.
- Test gates: require exact-merge-head GitHub checks and mergeability verification. No claims of real Android/iPhone, cloud financial data, or live Vercel preview tests. **Leave PR #287 open and do not merge.**
- Detailed record: `docs/engineering/updates/2026-11-12-pr287-conflict-resolution.md`.

## 2026-11-12 — Subscribers' records offline; referral field loads with the panel

- **Offline records (owner: "all data should be available offline after the customer subscribes"):**
  - Budgets, bills and bill dates now come from the synced device copy offline; budgets previously switched to the device's guest list.
  - Financial planning and the Home planning card work offline; they used to say "Sign in to manage your financial records".
  - A new per-account read cache (`lib/offlineReadCache.js`) keeps the last copy of every cloud list: loans, receivables, goals, allocations, bills and payments, scheduled transactions, payment attempts, reminders, budgets and the ledger. It shows that copy when the cloud can't be reached; it never hides server errors and never mixes accounts.
  - Changes to these records wait until back online, with a clear note.
  - Signed-out people still see no account records (privacy); they reappear after signing in, online or offline.
- **Referral code:** the field shows as soon as the plans panel opens, with no extra step and no waiting for sign-in. A code typed while signed out is kept for after sign-in.
- **Android Google sign-in (v7):** the auth logs show the app's pre-check succeeding and no request reaching Google's step, so the failure is on the phone, either in the secure-storage or the browser step. The exact on-screen message is needed to choose the fix.

Validation: Jest 224 suites / 1,349 tests, `tsc`. See `docs/engineering/updates/2026-11-12-offline-records-and-referral.md`. Not run: real devices.

## 2026-11-12 — Offline/online sync: local first, silent cloud sync, back-online prompt

Owner request: online, input → local → dashboard → silent cloud sync; offline, input → local → dashboard; back online, a setting chooses automatic sync or asking first with a professional pop-up.
- **Online:** a new or edited transaction (form, NasrinAI chat, card purchase or payment) is committed on the device and shown at once, and the cloud upload finishes in the background.
  - A confirmed upload swaps in the server copy.
  - A dropped connection falls back to the existing offline path.
  - A server refusal removes the row and explains why.
  - Form mistakes are still caught first. A subscription payment still waits for the cloud.
- **Offline:** unchanged.
- **Back online:** new setting, Settings → Data & Sync → "Sync automatically when back online" (off by default).
  - Off: a centered pop-up, "You're back online", asks to sync the N changes made offline, with "Not now", "Sync now" and an "Always sync automatically" option. "Not now" keeps a small reminder.
  - On: the changes upload by themselves, one attempt per reconnection, falling back to the pop-up if it can't finish.
  - Uploads always go through the same verified sync (sign-in, plan, conflict checks).

No RLS, policy or server changes. Validation: new writer, pop-up and end-to-end tests; Jest 223 suites / 1,342 tests, `tsc`, strict build; browser check offline → online in light and dark. Not run: real devices. See `docs/engineering/updates/2026-11-12-offline-online-sync.md`.

## 2026-11-12 — #286 brought up to date with main

Main gained the same owner billing-test isolation in #285 (20beb70), in a broader form: it clears every store billing setting and restores the whole environment, so it covers `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` and the other Google Play keys. The merge keeps main's version of `src/owner/ownerApi.test.js`. #286 contributes its documentation and the verified AAB v7 evidence below. No app code changes.

## 2026-11-12 — Android sign-in: "not configured" fixed for every app build

Owner report: Google and email sign-in in the Android app said "not configured".

- **Cause:** that app was built without MOVO's public Supabase connection. Those values lived only in Vercel, the protected GitHub release environment and Codemagic, so Android Studio, local, CI or older builds had none.
- **Fix:** the two public values (project URL and publishable key) are now committed in `.env.production`, so every production build has them, while environment settings still override them.
  - A new test keeps that file to exactly those two public values and rejects anything secret.
  - A new build check fails any Android or iPhone build whose app lacks the connection. It runs in the Android CI build, the Google Play jobs and Codemagic.
- **Verified:** a build with no settings now includes the connection, a build with settings keeps its own, and the live sign-in service accepts the key with Google and email enabled.
- **Owner action:** install a new Android build made from main after this merges (the app on the phone keeps its old code).

Not run: sign-in on a real Android device. See `docs/engineering/updates/2026-11-12-android-signin-config.md`.

## 2026-11-12 — "Save 20%" on the plans when Annual is chosen

Owner follow-up, with a reference paywall whose layout was not copied: the saving belongs on the plans. When Annual is selected, Pro and Pro+ each show a green "Save 20%" pill on the card's top edge. The figure comes from each plan's own store prices when loaded, else the owner's 20%. The current plan keeps its "Current" badge, Monthly shows no saving, and the toggle no longer carries the badge. Restore purchases and Manage subscription drop the "·" separator, which dangled when they wrapped. Validation: `PlanOffer.test.js` updated, full Jest suite, `tsc`, strict build, browser screenshots in light and dark at 430, 375 and 360px including German and Filipino at the Largest text size. Not run: real devices.

## 2026-11-12 — Restore purchases and Manage subscription always shown

Owner request: there should always be buttons to restore purchases and manage subscriptions. Both now appear in the plans panel and in Plan & Usage, for every person, in the apps and on the website, signed in or not, and they are never disabled.
- **In the apps:** Restore uses the App Store or Google Play restore, which the server verifies. Manage opens the store's subscription page.
- **On the website:** Restore re-checks the account's verified plan. Manage offers the App Store and Google Play subscription pages.
- **Signed out:** Restore opens sign-in.

No change to purchase verification or entitlements. Validation: new `SubscriptionLinks.test.js`, updated plans panel and Plan & Usage tests, Jest 221 suites / 1,328 tests, `tsc`, strict build, browser check (see `docs/engineering/updates/2026-11-12-restore-manage-always.md`). Not run: the store dialogs on real devices. Follow-up: 7d20d6f was pushed with one outdated `App.test.js` assertion (the old website note). It is fixed in the next commit, and the full suite passes.

## 2026-11-12 — "Save 20%" on the Annual plan

Owner request: show a 20% saving for the annual plan. The Annual toggle in the plans panel now reads "Save 20%", translated into 11 languages. In the apps the figure comes from the App Store or Google Play prices, so it always matches what the store charges. It reads 20% when the annual plans are priced at 80% of twelve months, which is now in `docs/commercial/STORE_BILLING_SETUP.md`. The website has no store prices and shows the owner's 20%. The toggle grows to fit the badge on one line; checked at 430, 375 and 360px, including German and Filipino at the Largest text size. Validation: new `storeProducts.test.js`, updated `PlanOffer.test.js`, full Jest suite, `tsc`, strict build (see `docs/engineering/updates/2026-11-12-annual-save-20.md`). Owner action: set the annual prices in the store consoles. Not run: real devices.

## 2026-11-12 — Plans panel: centered pop-up

Owner request: the "Upgrade MOVO" plans panel should be centered on the screen. It now opens as a centered pop-up, like the transaction details. It sits in the middle of the screen with equal space above and below, using the larger safe area on both sides. It has no border, only a soft shadow, and no drag handle; the close button stays. The Continue button stays inside the rounded corners. If the panel is taller than the screen it scrolls, with Continue pinned. Checked in the browser at 430×932, 390×844 and 375×667 in light and dark: top gap equals bottom gap, and no scrolling at any of those sizes. No plan, price or purchase logic changed. Validation: Jest 219 suites / 1,320 tests, `tsc`, strict build (see `docs/engineering/updates/2026-11-12-plans-panel-centered.md`). Not run: real devices.

## 2026-11-12 — Production build fix: owner billing test isolated from the build machine

The production deployment of `main` after #284 failed on Vercel: `npm run build` runs the tests first, and the owner billing-readiness test read Vercel's real Google Play settings and saw Google checkout as ready. The test now clears every store billing setting before it runs and restores the environment afterwards. Production kept serving the previous deployment. Reproduced locally with fake Google Play settings, then fixed. The full suite passes with and without Vercel-like settings. Test-only change (see `docs/engineering/updates/2026-11-12-owner-test-env-isolation.md`). Separately, Vercel now refuses new deployments ("Account is blocked"); this needs the owner in the Vercel dashboard.

## 2026-11-12 — Transaction details: middle of the screen, no outline

Owner follow-up: "center meaning center of the screen, and less border especially for dark mode". The details pop-up now sits in the middle of the screen with equal space above and below. On phones with a notch or home indicator the larger safe area is used on both sides, so it stays at the exact middle. It has no border, outline or inner highlight; a soft shadow sets it apart. In dark mode the lines between rows are gone and spacing separates them; in light mode they are fainter. CSS only. Measured in the browser at 430×932, 390×844 and 375×667 in light and dark: top gap equals bottom gap and the border width is 0. Validation: Jest, strict build. Not run: real devices.

### Follow-up: verified post-merge signed AAB v7 and CI evidence (2026-11-12)
- Signed manual Play workflow run #43180913336 succeeded on main `3d96b2e`. Recovered artifact `movo-google-play-aab-28`, inspected packaged JS, Android manifest, versionCode **7**, current MOVO Supabase URL and matching enabled publishable key; independent JAR signature verification succeeded.
- **Installed versionCode / live device OAuth result unknown**. Do not change working web OAuth settings or publish production; check existing Play internal/closed release before uploading another AAB. Main Vercel build failed an env-dependent test; PR #286 isolates it, with both GitHub CI checks green on initial head. Vercel preview remains blocked by account/deployment status, not verified.
- Detailed proof and gates: `docs/engineering/updates/2026-11-12-android-auth-release-gate-test-isolation.md`.

## 2026-11-12 — Android sign-in release gate: isolate Vercel billing test from live secrets

- Earlier PR #282 Android Google/email auth code merged, but prior signed AAB #17 predates it; currently installed Android version unverified.
- Latest main Vercel deployment failed 1/1,320 tests because owner billing readiness test inherited live `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` and expected missing credentials. Add that key to the test's save/restore fixture and explicitly unset it before the negative-case assertion; business logic, auth, credentials, database and production remain unchanged.
- No merge/store publication until exact-head CI, Android release compilation, preview and real-device Google/email sign-in pass. See `docs/engineering/updates/2026-11-12-android-auth-release-gate-test-isolation.md`.

## 2026-11-12 — Transaction details: centered, with spent and logged times

Owner request: place the transaction details at the center and add the time it was logged and the time it was spent. The details now open as a centered pop-up, with the name, the signed amount and the type centered on top. The details card adds two times: **Spent** (Received for income, Transferred for transfers), which is the transaction's date and time, and **Logged**, which is when the record was saved in MOVO (`created_at`). Cloud records already had a logged time; new records saved on the device now get one too. That stamp is display-only: uploads build their own payloads and reconciliation ignores `created_at`. Older local records without a saved time show only Spent. Validation: Jest 219 suites / 1,320 tests, strict build, browser screenshots in light and dark (see `docs/engineering/updates/2026-11-12-transaction-details.md`). Not run: real devices.

## 2026-11-12 — Plans panel: follows light/dark mode; amounts on every plan

Owner request: improve the plans panel's colour adaptability in light and dark mode, and organize it with amounts.
- In light mode the panel now uses MOVO's off-white sheet, with readable gold and platinum accents and light selected-tile tints; dark mode keeps the black panel.
- Each tier tile shows its amount. Free shows ₱0 (home currency). In the apps, Pro and Pro+ show the store's own localized price per month or year for the chosen period, and Annual shows the best saving (for example −17%). On the website, where there is no store, they say "Price in app"; no price is invented, per `docs/commercial/STORE_BILLING_SETUP.md`.
- The repeated "Price shown by the App Store or Google Play" line is gone, and the large price appears only when the store provides one.
- The panel sizes to its content instead of a fixed 800px height.

Validation: Jest 219 suites / 1,320 tests (PlanOffer tests updated: tile amounts, saving badge, no invented web price), strict build, browser screenshots in light and dark. See `docs/engineering/updates/2026-11-12-plans-panel-light-and-prices.md`. Not run: store prices on a real device.

## 2026-11-12 — Account pickers: icon and amount only for the available balance

Owner request: in the transfer sheet, remove the "Available balance" text and show only the wallet icon and the amount. The account pickers in the transaction sheet (From, To and Paid with) now show the wallet icon, or the card icon for credit, followed by the amount. "Available balance" and "Available credit" stay as screen-reader text, so VoiceOver and TalkBack still say them. With the room freed, the full amount shows instead of "₱1…". Below 400px wide, the two side-by-side pickers use a 24px logo and tighter gaps, so amounts such as ₱123,152.00 fit. Checked in the browser at 430, 390, 375 and 360px with no truncation. Validation: Jest (`AccountPicker.test.js` asserts the label is screen-reader-only), strict build. Not run: real devices.

## 2026-11-12 — Transaction details: solid, compact and organized

Owner request: make the transaction details solid (not transparent), more compact and organized. The sheet is now a solid surface with no glass blur in light and dark. The amount leads, large and signed by type (− expense, + income in green), with a Type chip. Account and Category (with subcategory) sit in one grouped card, and Note, references and Receipt note appear only when present. The duplicate "Date & time" row is gone, since the date is the subtitle. View receipt is a full-width row, and Edit and Delete are 48px buttons; Edit is no longer glaring white in dark mode. Validation: Jest, strict build, browser screenshots in light and dark (see `docs/engineering/updates/2026-11-12-transaction-details.md`). Not run: real devices.

## 2026-11-12 — Receipt picker in the transaction sheet

Owner request: improve the receipt upload UI (it showed the browser's "Choose File · no file selected"). It is now a tappable card: a receipt icon, "Add receipt", "Photo or PDF · up to 10 MB" and a plus button. Once chosen, it shows a photo thumbnail (or a document mark for PDFs), the file name, size and where it is kept, with Replace and Remove. Wrong types and files over 10 MB are refused at once (the save still checks). Removing a receipt already saved marks it for deletion when the change is saved. Translated into 11 languages; the old label was untranslated. Validation: Jest (`ReceiptField.test.js`), strict build, browser screenshots in light and dark (see `docs/engineering/updates/2026-11-12-receipt-picker.md`). Not run: real devices.

## 2026-11-12 — Plan & Usage: more room for the text

Owner request: "give more space to the texts". Plan & Usage now has more space between the plan row, the usage tiles and the note, inside the tiles and in the note's line spacing, with a clear gap above the button and no fading shadow over the last line. Tile labels wrap (hyphenated in the reader's language) instead of being cut. The tiles become two rows of two below 400px wide, and the plan's date wraps instead of truncating. Checked in the browser with no truncated text at 375 and 430px, at the Largest text size, in English, German and Filipino. Validation: Jest, strict build. CSS only (see `docs/engineering/updates/2026-11-12-plan-usage-and-ai-fallback.md`).

## 2026-11-12 — Plan & Usage opens on the current plan; OpenRouter as MOVO's fallback AI provider

- **Plan & Usage (owner recording):** the sheet showed "Free · On this device" and "Upgrade MOVO" for about 3 seconds before switching to "Pro+". It now opens on the plan MOVO already verified at launch and re-checks quietly in the background, so the current plan shows in the first frame (12–19ms in the browser check). A plan not yet checked shows "Checking…", never "Free". The layout is now compact: one plan row with a Cloud/Local tag, usage as four small tiles, one billing note, Restore and Manage as text links, and the main button.
- **Fallback AI provider:** when NasrinAI cannot answer (not configured, unreachable, timeout, busy, rejected the request or key, or an unusable reply), the server asks OpenRouter instead (`api/nasrinai/openrouter-fallback.cjs`).
  - Every MOVO version (web, iPhone, Android) uses this one route, so the fallback covers all of them.
  - OpenRouter gets the same question and bounded, sanitized context, with no user id or email. Providers that may store or train on data are excluded (`data_collection: deny`).
  - A reached NasrinAI budget is not bypassed. Voice transcription stays on NasrinAI. Voice replies from the fallback are spoken with the device voice.
  - Needs the server-only `OPENROUTER_API_KEY` in Vercel (optional `OPENROUTER_MODEL`, default `openrouter/auto`).

Validation: Jest 218 suites / 1,316 tests, tsc, strict build, production dependency audit (0), browser screenshots in light and dark. See `docs/engineering/updates/2026-11-12-plan-usage-and-ai-fallback.md`. Not run: real devices; a live OpenRouter call (no key is configured yet).

## 2026-11-12 — The ram stays standing on the Total balance box

Owner request: "keep the mascot stand in the box like before" (confirmed: keep the bigger ram standing on Total balance). The 3D ram's body no longer leaves its feet line in any mood or tap reaction (`FEET_Y` in `lib/ramScene.js`; the rig's origin is at the feet). Happy moods still bounce, stretch and squash in place, and the happy hop now lifts one foot at a time instead of both. Measured over 14 frames in the browser: the lowest point stays at 129.5–131.5px against the card's top edge at 128px (before: up to 5px above it on each hop). Validation: Jest, tsc, strict build, `ramGrounded.test.js` (see `docs/engineering/updates/2026-11-12-ram-stays-grounded.md`). Not run: real devices.

## 2026-11-12 — Settings → Profile route; sign-in and subscription audit (iOS and Android)

- **Settings → Profile** now opens the Profile screen, not the edit form. Profile's back arrow returns to the screen it was opened from (Settings or Menu), using the screen trail.
- **Sign-in audit** (production, read only):
  - Email codes and Google work on the web and in the apps. `movo://auth-callback` is accepted as a return address.
  - **Apple is switched off in Supabase Auth** (`Unsupported provider: provider is not enabled`), so Continue with Apple fails everywhere. Owner action: enable Apple under Supabase → Authentication → Providers with an Apple Services ID and key. App Store guideline 4.8 expects it for an iOS app that offers Google.
  - Fixed: a switched-off provider used to open Supabase's raw error page in the browser. MOVO now checks the public provider list first and shows its own customer message. The Apple and Google messages are rewritten for customers in 11 languages.
- **Subscription audit** (production, read only):
  - Google Play checkout is ready (`/api/purchases/config?platform=google` → enabled).
  - **App Store checkout is blocked** (`enabled:false`): one Apple billing setting fails validation, most likely `APPLE_APP_ID`, which must be the numeric Apple ID from App Store Connect.
  - The billing tables and functions exist. `movo_plan_status` only reports on the caller's own account, and only production purchases count.
  - New: the owner Command Center's Billing view lists store checkout readiness with the names of failing settings, never values (owner and two-factor only).

Validation: Jest 215 suites / 1,306 tests, tsc, strict build. See `docs/engineering/updates/2026-11-12-signin-subscriptions-audit.md`. Not run: real devices, real purchases.

## 2026-11-12 — Rate MOVO reminder (App Store / Google Play)

Owner request: remind people to rate MOVO. The iPhone and Android apps now ask the store's own rating dialog to appear: Apple's StoreKit review request (`AppStore.requestReview` on iOS 16+, `SKStoreReviewController` on 15) and Google Play In-App Review. Both stores require their own dialog (Apple guideline 5.6.1 disallows custom review prompts, and Google asks apps not to pre-ask), so MOVO adds no screen of its own and only chooses the moment.

The request comes about 1.8 s after a new record is saved, never over a sheet, the lock screen or setup. It needs at least 7 days with MOVO, 5 different days of use and 10 records, and then at most once every 120 days and 3 times a year. The stores may still show nothing and never report a rating. The counters stay on the device (`movo.reviewPrompt.v1`, removed by Clear All Data); the website never asks.

No legal text change: MOVO collects and shares nothing new. Validation: Jest 214 suites / 1,301 tests, tsc, strict build. Native compile runs in CI (`build-ios`, `native-android`). See `docs/engineering/updates/2026-11-12-rate-movo-reminder.md`. Not run: real devices or store review dialogs (they appear only in installed TestFlight / Play builds).

## 2026-11-12 — Zodiac Home headers follow the owner's reference video (softer)

Owner request with a reference video: zodiac headers now use the same indigo-purple night for every sign. A thin gold zodiac wheel carries all twelve symbols, with the person's sign at the top and brightest; they are drawn as vector paths because phones may render the Unicode symbols as colour emoji. A flowing purple ribbon of light replaces the hills, and the slow drifting light over zodiac headers is lavender. Opacity is kept lower than the reference, as asked. The element now only tints the ribbon's far end. Validation: Jest 212 suites / 1,294 tests, tsc, strict build, browser screenshots of several signs (see `docs/engineering/updates/2026-11-12-zodiac-reference-video.md`). Not run: real devices.

## 2026-11-12 — PR #282 Android-only sign-in follow-up (before new implementation)
- Verified downloaded signed Google Play AAB run #43149512317 against actual project URL and active MOVO public key, Browser plugin and native auth callback. The broken installed Android version still needs identification; web authentication is not being modified.
- Implemented: Android-only email-link callback to `movo://auth-callback`, safe native Browser/Keystore failure diagnostics, and tests for Android, web and iOS behavioral isolation, plus three new messages translated across 11 languages. Live Android device callback and delivery still not proven; keep website/iOS intact. See `docs/engineering/updates/2026-11-12-google-email-auth-recovery.md`. **No merge or production change.**


## 2026-11-12 — PR #282: Google and email sign-in recovery; Android public project binding
- Investigated MOVO production Auth logs (Google redirects/login and limited email events) and Vercel/GitHub build-env separation; did not assume that Google or email is disabled globally.
- Hardened signed Android AAB configuration: only the verified MOVO Supabase project origin is accepted, and unsafe/non-anon/mismatched legacy keys are rejected at build time. Public `sb_publishable_...` keys still require manual confirmation that they come from MOVO.
- Google, Apple, and email OTP now classify provider-disabled, bad API key, SMTP/template, rate-limit and network errors into safe user-facing messages; no raw server errors or secrets are rendered. Native browser cancellation releases the loading state.
- Added focused guard and UI unit tests plus seven new error messages translated in all 11 supported languages; see `docs/engineering/updates/2026-11-12-google-email-auth-recovery.md` for complete investigation, provider settings and release checklist.
- First exact-head CI found missing new i18n keys (1,277 / 1,278 tests passed), so seven 11-language catalogue rows were added without weakening translation coverage; added signed Android auth validator tests to Phase 1 PR CI. This PR is **no-merge/no-publish** pending all exact-head CI tests, Vercel preview (Sandbox create returned 402 payment_required), live Supabase Google OAuth + SMTP/template configuration, physical Android Google/OTP login and data isolation verification. Production not modified.

## 2026-11-12 — Fix: Portrait card format preview without a plan

Bug (owner screenshot): on Free, the Portrait tile in Wallet → Sort & view drew a landscape card squeezed into the portrait box, because `CardArt` turns every card landscape without `portraitCards`. The tile now passes `formatSample`, so it shows the true portrait layout as a sample, marked Pro. Choosing it still opens plans, and cards in the wallet stay landscape until Pro is active. Validation: Jest 209 suites / 1,257 tests, tsc, strict build, browser check as Free and Pro+ (see `docs/engineering/updates/2026-11-12-portrait-format-sample.md`). Not run: real devices.

## 2026-11-12 — Home header: edge to edge, grounded ram, glowing Pro edge

Owner request:
- The pinned Home header now reaches both screen edges (0px). Total balance keeps the page's 18px side space.
- The ram is bigger (131px; 112px under 390px wide, 100px under 350px). Its top sits 1px under the top inset, and it stands on the Total balance card's top edge instead of floating. Its size and footing stay the same while scrolling. The greeting moves right, from 98px to 141px.
- Pro and Pro+ get a glowing header edge in their badge colour: gold for Pro, platinum for Pro+. It is brightest at the lower centre and fades up the sides. Free gets no edge.

The ram's happy hop in its idle animation is unchanged; it takes off and lands back on the card.

Validation: Jest 209 suites / 1,256 tests, tsc, strict build, browser screenshots (Pro, Pro+, Free, 360px, right-to-left, a header without Total balance, scrolled). See `docs/engineering/updates/2026-11-12-home-header-edges.md`. Not run: real devices.

## 2026-11-12 — Cloud Sync paused: a calm panel instead of the red banner

Owner request: remove the top banner "Cloud Sync requires verified active access. Local records remain on this device." When a cloud write is refused because the plan is not active, MOVO now shows a centred panel (`components/CloudPlanNotice.js`): "Cloud Sync is paused", records are safe on this device, nothing is deleted, sync restarts once Pro is active, with View plans and Not now. It shows at most once a day (`cloudPlanNoticeDay`), never over another sheet, the setup gate or the lock screen. Other sync errors still use the banner. Translated into 11 languages. Validation: Jest 208 suites / 1,253 tests, tsc, strict build, browser check against the mock cloud with an inactive plan in light and dark (panel shown, no banner) (see `docs/engineering/updates/2026-11-12-cloud-sync-paused-panel.md`). Not run: real devices.

## 2026-11-12 — Faster buttons and pop-ups on phones

Owner report: animations delayed and unresponsive on Android and iPhone. The 3D mascot is capped at 30 fps and pauses while touching, scrolling or with a sheet or dialog open. Glow headers no longer repaint every frame. Press states are instant, sheets and dialogs enter within about 200 ms without staggered content, and the nav highlight moves on touch-down. Measured at 4× CPU: sheets settle in 260–340 ms (was 355–645), and Home has no long tasks with a sheet open. Validation: Jest 207 suites / 1,252 tests, tsc, strict build (see `docs/engineering/updates/2026-11-12-tap-and-popup-responsiveness.md`). Not run: real devices.

## 2026-11-12 — Video guide shown in a phone frame

Owner request with a reference image: the tutorial recording now plays on a CSS-drawn modern phone (slim bezel, side buttons, dynamic-island cut-out, status bar, home indicator) on a light stage. Controls sit above and the translated caption and button below. The 9:20 phone shows the whole recording uncropped. Validation: Jest 206 suites / 1,250 tests, tsc, strict build, screenshots at 390/430 px and desktop (see `docs/engineering/updates/2026-11-12-tutorial-phone-frame.md`).

## 2026-11-12 — Zodiac headers in the style of the owner's reference (kept subtle)

The zodiac art now follows the owner's reference, restrained: a night sky with a faint Milky Way, a thin golden zodiac wheel framing the sign's constellation, a few sparkles and gold-rimmed hills above the balance card. There is a new Celestial glow (green and gold) and a soft glow around the balance card on premium headers. Validation: Jest, tsc, strict build, browser screenshots for each element (see `docs/engineering/updates/2026-11-12-celestial-zodiac-art.md`).

## 2026-11-12 — Pinned header down to Total balance, new search icon, equal header spacing

Owner requests: the search icon has a bigger lens and a shorter handle. The pinned Home header now reaches down to the bottom of Total balance, which is drawn inside it. Header buttons start 28 px from the top on Home, Wallet, Transactions and Menu (measured; was 44 on Home). Validation: Jest 206 suites / 1,249 tests, tsc, strict build, browser measurements (see `docs/engineering/updates/2026-11-12-header-block-search-icon.md`).

## 2026-11-12 — Pinned Home header with scenery, zodiac and glow backgrounds

Owner request: the Home header stays pinned at the top with rounded bottom corners over a background. It defaults to a scenery picture for everyone; Pro and Pro+ can pick all 12 zodiac constellations (original generated SVG) or 6 glowing backgrounds in Settings → Appearance → Home header. Free users see them locked; choosing one opens plans. Validation: Jest 206 suites / 1,247 tests, tsc, strict build, light/dark browser screenshots (see `docs/engineering/updates/2026-11-12-home-header-hero.md`). Not run: real phones.

## 2026-11-12 — Plain header buttons and an off-white light background

Owner request: top header icons have no capsule, border or fill and sit closer together (40 px apart, 44 px tall touch areas); only the Plus buttons stay filled, on the web/Android and in the iPhone app's native top bar. Light mode with no scenery uses an off-white `#faf9f6` page. Validation: Jest 204 suites / 1,240 tests, tsc, strict build, light/dark header screenshots (see `docs/engineering/updates/2026-11-12-header-buttons-milk-white.md`). Not run: real phones.

## 2026-11-12 — Back shows the previous page faster

Owner request: going back now shows the previous page at once. Back moves (device Back, swipe, on-screen back arrow) skip the entrance motion, finish nested entrance animations before the first paint, show amounts at their value instead of counting up, and restore the page's scroll position. Measured after Back (production build, mobile emulation): 490–1,090 ms before, 20–120 ms after. Forward navigation is unchanged. Validation: Jest 204 suites / 1,239 tests, tsc, strict build (see `docs/engineering/updates/2026-11-12-faster-back.md`).

## 2026-11-12 — Screenshots work on Android

Owner request: screenshots (and screen recording) now work in the Android app; `FLAG_SECURE` is no longer set while MOVO is in use. The recent-apps preview still hides balances: blank via `setRecentsScreenshotEnabled(false)` on Android 13+, and `FLAG_SECURE` only while the app goes to the background on older versions. iOS already allows screenshots and keeps its app-switcher cover. Validation: security contract test updated, Jest, strict build; Android compile in CI `native-android`. Not run: a real Android phone (see `docs/engineering/updates/2026-11-12-android-screenshots.md`).

## 2026-11-12 — Blurred previous-page preview during swipe back

Owner request: while swiping back on iPhone, the previous page now shows underneath, blurred, dimmed and parallaxed, clearing as the swipe completes; it is a static copy taken when the page was left. The returned page opens without an entrance animation at its previous scroll position, with no flash (per-frame browser check). Validation: Jest 203 suites / 1,237 tests, tsc, strict build (see `docs/engineering/updates/2026-11-12-swipe-back-preview.md`). Not run: a real iPhone.

## 2026-11-12 — Swipe back on iPhone and Android

Owner request: swipe from the edge to go back. The iPhone app gets an edge swipe (left edge → right, or right edge → left) that follows the finger and closes the open sheet or returns to the previous screen. Android's back button and system gesture now call MOVO's Back directly, and at Home the app moves to the background. Browsers keep their own swipe. Validation: Jest 203 suites / 1,234 tests, tsc, strict build, browser touch check (see `docs/engineering/updates/2026-11-12-swipe-back.md`). Not run: real devices.

## 2026-11-11 — Narrated video guide of the real app and setup gate

Owner request: the video guide now shows the real MOVO interface with invented sample records, narrated in the owner's "MOVO" ElevenLabs voice (62 s, 3.8 MB H.264/AAC in `public/tutorial/`), with translated captions, chapter skipping, a sound button and the animated scenes as fallback. It flashes account deletion, the no-bank-connection and logo/favicon disclosures and the Terms. New setup gate: dashboard and navigation stay locked until video, walkthrough, sign-in choice, free-month panel and the new Terms/Privacy agreement are done; accepting opens the dashboard. Terms §17 added (effective November 11, 2026); acceptance syncs (newest wins). Validation: Jest 201 suites, tsc, strict build, local browser flow (see `docs/engineering/updates/2026-11-11-video-guide-setup-gate.md`). Not run: iOS/Android devices.

## 2026-11-11 — PR #273: Repair Android auth build and native navigation

Fix Android's missing top and bottom bars by limiting iOS Liquid Glass native-chrome substitution to iOS; keep Android's five-tab web dock and page headers. Add Android platform regression coverage. Repair Google Play's signed AAB pipeline by injecting the public Supabase project URL and anon/publishable key from the protected GitHub release environment at CRA build time; reject missing/invalid public values and server-secret roles. Add Node release-guard tests to PR signing CI. No billing, accounting, database, iOS layout, or production release changes. Vercel Sandbox testing was attempted but blocked with HTTP 402 payment_required. CI and real Android testing are required before merging or publishing. Details: `docs/engineering/updates/2026-11-11-android-auth-chrome.md`.

## 2026-11-11 — PR #271: Repair sign-in startup and owner-cache hydration

Keep the entitlement refresher stable while the auth listener recovers the owner journal, preserve the full Supabase session after OTP verification, and render a recovered confirmed/dirty owner cache while cloud checks continue. Concurrent entitlement checks share a bounded request per owner/token. New accounts keep the initial-load gate and paid cloud access remains server-verified. Regression coverage includes delayed recovery, token refresh, cross-owner isolation and timeout/retry. Local validation: 194 suites / 1,183 tests, typecheck and production build passed. Vercel Sandbox verification is blocked by HTTP 402 payment_required; no production rollout. Details: `docs/engineering/updates/2026-11-11-signin-startup.md`.

## 2026-11-10 — PR #270: Correct GitHub manual Play versionCode input serialization

GitHub Actions manual runs #4 and #5 failed before signing: the workflow_dispatch number input formatted integer versionCode 1 as `1.0`, which the strict integer validator correctly rejected. Change the workflow input to string to preserve owner-entered integer text without relaxing validation. Keep the signed AAB build restricted to reviewed main and the protected google-play-release environment. The four signing repository secrets are set but the real signed AAB, physical Android-device tests, hybrid financial sync acceptance, and Google Play production authorization are not yet verified. See `docs/engineering/updates/2026-11-10-play-version-code-dispatch.md`.

## 2026-11-10 — Owner audit foreign keys blocking user account deletion

Stage ON DELETE SET NULL and strictly verified internal-FK-only audit anonymization for four owner tables. Prevents the immutable audit trigger from obstructing account erasure while preserving append-only event history. Adds synthetic full deletion/forgery regression to isolated PostgreSQL finance CI. No production migrations or customer data changes. See docs/engineering/updates/2026-11-10-owner-account-deletion-fks.md.

## 2026-11-10 — Non-destructive release database performance indexes (staged)

Addressed five Supabase advisor findings with idempotent FK indexes and local PostgreSQL assertions wired into the financial tenant-isolation CI. No customer database changes, RLS weakening, or billing enablement. Independent CI and Vercel Sandbox verification are required before merge; production migration awaits explicit release verification. See docs/engineering/updates/2026-11-10-release-db-fk-indexes.md.

## 2026-11-10 — Fix false negative after successful CI test signing

The disposable CI-only signing test reached `app:signReleaseBundle` and Gradle reported `BUILD SUCCESSFUL`, but the subsequent `printf | grep -q` verification was vulnerable to SIGPIPE under `pipefail`. Replaced the pipeline with a captured-string assertion that still fails closed on unsigned bundles. The workflow must pass anew on its exact head before merging. Source: `docs/engineering/updates/2026-11-10-google-play-release.md`.

## 2026-11-10 — Require explicit monotonic Google Play Android versionCode

The protected main-only signed AAB workflow now asks for an owner-selected Android `version_code` and rejects invalid/out-of-range values. Android Gradle reads this value only when set; normal CI remains at versionCode 1. On each subsequent Google Play upload, the owner must choose a code greater than all prior uploaded bundles; only Play Console can confirm this. The ephemeral-key PR signature test remains non-publishable. Implementation and release limitations: `docs/engineering/updates/2026-11-10-google-play-release.md`.

## 2026-11-10 — Reconcile Google Play signing PR #264 and add disposable signed-path CI

Rebased the Google Play-only signing workflow over the reviewed Google-only provider readiness fix. Production bundle creation stays manual, main-only and protected by the GitHub `google-play-release` environment. Added an isolated, PR-triggered CI job using a disposable test key to exercise the Android release signing path and `jarsigner` without publishing any artifact or using production secrets. Existing unsigned native CI remains. This is not a signed Play AAB or launch authorization. See `docs/engineering/updates/2026-11-10-google-play-release.md`.

## 2026-11-10 — Google-only provider checkout readiness isolation (draft PR #267)

Addressed Google Play native checkout readiness incorrectly requiring Apple IAP signing credentials. Added strict Google/Apple-specific checks, fail-closed handling of unknown platforms, backwards-compatible legacy all-provider gate, and native purchase regression coverage. Vercel Sandbox based on main f2311f2 passed targeted billing tests (2 suites / 7 tests) and full CI-style production build. No production key, billing activation, or database writes. Exact-PR-head GitHub CI and preview must pass before merge. Release remains blocked on signed AAB, Google Play license/device tests, hybrid sync and console compliance. Engineering notes: docs/engineering/updates/2026-11-10-google-only-billing-gate.md.

## 2026-11-09 — Integration hardening for #258 and #259

Resolved shared-app, plan panel and translation conflicts while retaining verified native referrals and the premium plan UI. Android CI retries only transient Gradle download errors; native compilation failures remain blocking. Evidence, rollback and outstanding gates: `docs/engineering/updates/2026-11-09-pr258-259-integration.md`. Do not enable rewards or apply the production migration without approval.

# MOVO Pull Request Progress Register

## 2026-11-11 — Transactions filter icon and graph by filter, plans panels, sign-in buttons, referral line

The Transactions billing-cycle filter is the filter icon (its label was cut off) and the graph under Total Spent follows it: the days of the chosen cycle, or every cycle for "All". MR DIY shows its logo in the notification detail. The plans panel and Plan & Usage are compact with lighter text, nothing repeated, a fixed bottom action and a tier-coloured glow with calm fade-ins. Apple and Google sign-in buttons share one surface and show "Continue with" plus the company mark. The "n of 10 friends subscribed" line is removed. Scheduled, bill and card payments are logged at the device's current date and time instead of a fixed noon UTC. Pro+ and Pro colour the active bottom-nav icon platinum or gold by default, with a quiet matching highlight (the iOS native dock gets a solid plan tint), with a Navigation accent switch in Appearance. Pro+ platinum is a platinum base with a holographic, iridescent sheen (mark, badge, Pro+ action, iOS app icon) instead of flat lavender. Third pass (owner confirmed): opening MOVO waits for the sync (at most 4s, at once when offline) so the first screen shows the latest records, changing #271's cache-first first paint on purpose; sign-in secondary actions are text links again and the page is more compact. Second pass: the sign-in page is centred and animated with a six-box code entry, solid buttons only and black/white Apple and Google buttons; the filter uses the owner's solid three-bar icon; the device Back button and gesture close sheets and return through the screens visited. An intermittently failing account Money Flow test was made deterministic. The profile photo picker accepts images again (an over-escaped type check rejected every file). Display only; details in `docs/engineering/updates/2026-11-11-transactions-plans-signin-polish.md`.

Validation after merging `main` (main's sync kept): 200 suites / 1,210 tests, typecheck and strict build pass locally. No pull request, preview or CI run yet; WebKit and native builds were not run.

## 2026-11-10 — Section 5 sync work on `claude/movo-ui-motion-refinement-vafrxa` (superseded by #261)

The parallel offline/online sync work on this branch (held changes, conflict review sheet, backoff, status bar) was dropped on 2026-11-11 when the branch was merged with `main`: the owner chose to keep the hybrid sync merged in #261 and the sign-in startup fix from #271. No part of that parallel engine is on the branch any more; its commits remain in the branch history only. What was kept from the branch is listed in the 2026-11-11 entry above.

## 2026-11-09 — Home balance arrow back at the bottom right (fix for a #263 regression)

The round arrow on the Home Total Balance box (opens Wallet) had dropped to the bottom left, over the "vs last month" chip: the 44px tap-area rule from #263 made it `position: relative`, overriding the box's own absolute position. It is back at the bottom right (bottom left in right-to-left languages, where the chip starts from the right) with a centred 44px tap area. While checking every width, text size and direction: the month pill no longer covers the "Total Balance" label or blocks the show/hide eye button at larger text sizes and in Arabic (the label stops short of the pill and text sizes above the default use the short month). CSS, one class and one CSS variable only; no data, sync, auth or API change. Details, checks and limits: `docs/engineering/updates/2026-11-09-home-balance-arrow.md`.

Validation: 184 suites / 1,119 tests, typecheck and strict build pass locally; production build checked in headless Chromium at 320–820px, light/dark, largest text, English/German/Japanese/Arabic. WebKit and native builds were not run.

## 2026-11-09 — Premium UI phases 2–7 (in progress)

Following the merged confirmation dialog (#262) and the audit plan: phase 2 fixes the Menu page's sideways scroll, gives every small control a 44×44 tap area without visual change, removes the ignored `digits` money option (two decimals were already enforced) and sums total balances in whole cents. Phase 3 puts every entrance, sheet and chart animation on one set of durations (120/220/260/380ms, ease-out, no overshoot) and shortens the balance count-up to 400ms. Phase 4 replaces decorative gradients with solid colours and stops the looping badge shine. Phases 5–6 show loading placeholders instead of provisional figures on Financial planning, Bills and the crypto market, and shorten the splash's forced minimum to 0.45s. Phase 7 splits 15 secondary screens out of the main bundle (−17% gzip, preloaded when idle so they also open offline), renders long transaction lists progressively (3,000 rows: 2.56s → 0.12s) and defers search filtering. On phones under 360px the month pill no longer covers the balance's eye button. Details: `docs/engineering/updates/2026-11-09-premium-ui-phases.md`.

## 2026-11-09 — Log out and every delete ask first in one dialog (review)

One compact confirmation dialog (`components/ConfirmDialog.js`) now guards log out and every deletion of a financial or personal record: transactions (including the chat Undo), allocation reversal, account archive, budgets, plans, limits, subscriptions, loans, receivables, cashback, crypto holdings and alerts, membership cards, Archive delete/empty, stickers, profile photo, other-device sign-out, points redemption and the lock-screen reset. Cancel, Escape and a tap outside never confirm; double taps and taps during the closing animation never run twice; failures stay in the dialog with Try again; bulk and reset need typed DELETE. Log out warns when this account has unsynced device changes, saves pending offline changes before ending the session (previously after), still works offline (device session removed) and opens sign-in. Details: `docs/engineering/updates/2026-11-09-logout-delete-confirmations.md`.

Validation on this branch: 181 suites / 1,107 tests, typecheck and strict build pass locally; light/dark screenshots at 430×932 and 375×667 from the built app (Cancel kept the row; Delete removed and archived it). Vercel preview and Sandbox results are reported on the PR.

## 2026-11-09 — PR #260 billing audit follow-up (review; production rollout pending)

Pinned Zod 4.6.7 to clear the production dependency vulnerability, updated bounded Pub/Sub record validation, made checkout fail closed on incomplete server configuration, and removed optional payment-history lookup from Google revocation processing. Added isolated PostgreSQL billing CI. Backend JavaScript IAP tests remain in all Jest/prebuild runs; only the frontend TypeScript 4.9 program excludes those two Node-only files.

Vercel Sandbox: zero production dependency vulnerabilities; 174 suites / 1,068 tests, typecheck, production build, real forged-JWS rejection and database replay/refund/concurrency checks passed. Mobile guest accounting flow retains the correct balance across reload with no cloud writes. Required secrets, coordinated database migration and real store purchase/refund delivery remain release prerequisites. No production changes. Details: `docs/engineering/updates/2026-11-09-mobile-iap-hostile-audit.md`.

## 2026-11-09 — Plans offer on one panel, Gold/Platinum MOVO logos, badge app icons

The plans offer is one compact dark panel (fits 375×667 without scrolling): Monthly/Annual, Free (green MOVO), Pro (gold MOVO), Pro+ (platinum MOVO) — no "Gold/Platinum MOVO" labels on the tiles, store prices only, the free month with the white MOVO mark and no renewal line. Plan badges use the same tier logos. Subscribers can switch the home-screen icon to a badge icon (Settings → Appearance → App icon): Pro unlocks Bronze–Gold right after payment, Pro+ all four; iOS uses alternate app icons. See `docs/engineering/updates/2026-11-09-plans-panel-app-icons.md`.

## 2026-11-09 — Membership and rewards cards follow the owner's merchant card references

Each card also carries its own geometric pattern (hexagons, triangles, diamonds, discs, chevrons or low-poly shards) in three shadowed depth layers, seeded by the card so it is stable everywhere and unique per card, kept to the right third so text stays clear (`docs/engineering/updates/2026-11-09-card-geometric-patterns.md`).

Memberships, loyalty, rewards and tokens now use the layout of the owner's 25 Philippine merchant-card references: mark and name on top, the program title large, member number and date, rewards balance, and one flat MOVO motif (rings, diagonal band, stripes, foil edge or two-tone split) in each merchant's colours. 14 programs from the references were added to the provider list; program titles (Suki Card, Happy Plus, Value Card, Go+ …) show unless the person typed their own. No merchant artwork is reproduced, logos stay on the curated favicon list (no new domains), and card text is tested at WCAG 4.5:1 on both the card and motif colours. See `docs/engineering/updates/2026-11-09-merchant-card-layouts.md`.

## 2026-11-09 — PR #258: short referral codes, iPhone/Android download QR codes, referral points (review; points gated)

**Short codes (owner request):** every person now has one reusable referral code, `M` + five digits (for example `M78038`), replacing the 24-character free-month code and the 64-character single-use invite tokens this PR first proposed. Codes are case- and space-insensitive and are generated server-side from a secure random source; once digit codes run short they continue with five characters from 0-9 and A-Z without I/O. Each account may enter at most 10 codes an hour (attempts are kept even when a code is wrong), so short codes cannot be guessed in bulk. A code can be added only by a verified account created in the last 7 days that has not been referred and has not bought a plan; starting the free month never clears or replaces an existing referral (fixes a latent bug where a later code-less trial claim set `referred_by` to null).

**Download QR codes:** Profile → **Refer MOVO** shows the code with Copy/Share, progress toward the existing 10-subscriber reward (3 months of Pro), and two QR codes — iPhone (App Store) and Android (Google Play). Both point to `/api/download?platform=ios|android&ref=CODE`, which redirects to the store addresses set in the server settings `MOVO_IOS_APP_STORE_URL` / `MOVO_ANDROID_STORE_URL` (exact store URLs only; no open redirect) and, until MOVO is listed, to the web app, which keeps the friend's code on the device and fills it in on the free-month panel and in Refer MOVO.

**Points to Pro:** every 500 referral points convert to 1 month of Pro (Refer MOVO → Use 500 points, confirmation first); the server checks the balance, spends the points in a separate redemptions table and queues the month after any current plan. The download QR codes say **iOS** and **Android**.

**Points (unchanged rules, still off):** +5 after server-verified App Attest / Play Integrity, +100 once after the first verified production Pro/Pro+ purchase, −100 once on refund; isolated ledger, service-role-only RPCs, RLS, review holds. `MOVO_REFERRAL_POINTS_ENABLED=false` keeps the native-proof routes closed and hides points in the app; linking a code works once the migration is applied.

Validation: SQL suite (isolated PostgreSQL) passes, including deliberate-break checks for the attempt limit and the trial referral fix; Jest, typecheck and strict build on the current head. **No production migration or environment change was made.** Before enabling points: apply the migration (rotates the 3 existing production codes, none used yet), set the store URLs, signed-device attestation tests and privacy text for referrals. See `docs/engineering/updates/2026-11-09-short-referral-codes-download-qr.md`.

## 2026-11-09 — Owner Access sign-in email template failure (requires live Supabase action)

Verified MOVO Supabase Auth HTTP 500 on `POST /otp`: live Magic Link template fails Go `html/template` rendering in unclosed CSS double-quote context. Replaced committed OTP email with inline-style, text-only code interpolation and added static validation plus regression tests. **GitHub/Vercel deploy does not publish the Supabase email template**: update the live Magic Link body in the Supabase dashboard and verify a real owner OTP plus MFA before calling the incident resolved. See `docs/engineering/updates/2026-11-09-owner-otp-template-rendering.md`.


## 2026-11-09 — Memberships and rewards cards open Account details (review)

Tapping a membership, loyalty, rewards, tokens or custom card opens the same Account details layout as other cards (card, Account overview / Transactions / Connected items / More, actions) with rewards-only figures, member code, earning account and purchases that earned points. Card face shows Valid thru and no longer truncates the program early. See `docs/engineering/updates/2026-11-09-loyalty-card-details.md`.

## 2026-11-09 — Profile: signed-in people see no Sign in button (review)

The Profile Sign in button and the Cloud Sync row now follow the signed-in session, not cloud mode, so a signed-in person in local/offline mode no longer sees "Sign in". Account rows on Profile add up like Total Balance (linked debit cards once, archived out). See `docs/engineering/updates/2026-11-09-profile-signed-in-state.md`.

## 2026-11-09 — Total balance fixes and complete device-transfer backup (review)

Total balance no longer rises with card payments that moved no money (new "Paid from" records a real transfer), excludes archived and unconvertible accounts, follows the Home month filter, and month-over-month compares like periods. Backup export/restore now carries subscriptions, plans, budgets, limits, card styles/payments, loyalty, archive, settings, receipts, QR, scenery and stickers, re-linked to the restored accounts; CSV keeps transfers, notes and categories. No migration or production change. See `docs/engineering/updates/2026-11-09-total-balance-and-full-backup.md`.

## 2026-11-09 — Owner Command Center consolidated from #253, with live analytics (review)

#253 failed the per-commit docs gate; its net change is carried in one documented commit on PR #255. Fixes the strict-build import order, plans in the user directory (trials/referrals showed "Not verified"), and entitlement-row counts shown as plans. New aggregate-only `movo_owner_kpis` / `movo_owner_user_plans` (service_role only, isolated SQL tests pass). Key figures, 30-day activity, plan mix, capture channels, user plan filter and last sign-in. Production migrations need owner approval. See `docs/engineering/updates/2026-11-09-owner-console-analytics.md`.

## 2026-11-09 — Offline-first saving, automatic upload, imports under Cloud Sync, plan badges (review)

With Cloud Sync on, saves that cannot reach the cloud (offline or >12 s) land on the account's device copy and upload automatically on reconnect, on foreground and every minute; offline transaction edits (CAS), deletions (revision-checked server procedure) and device receipts now sync. CSV/backup "Save locally" works under Cloud Sync and refreshes every page, then uploads. Pro features stay on during an outage with the last verified plan. Fixes main's online-delete drop to local mode. Gold (Pro) / Platinum (Pro+) plan badge. No migration or production change. See `docs/engineering/updates/2026-11-09-offline-first-autosync-plan-badges.md`.

## 2026-11-09 — Confirmed local backup immediately refreshes financial views (review)

Restores same-name accounts by stable source identifiers rather than rejecting multiple BPI/GoTyme accounts or connecting payments to the first matching name. Guest and signed-in offline saves read back persisted accounts/transactions, then refresh Home, Wallet, Transactions and Menu-derived financial state and return to Home. Cloud accounting rows no longer leak into local transactions. Import preview rows use content-height grid tracks to avoid overlapping on small screens. Added malicious/ambiguous ID, idempotency, transfer and end-to-end reload regression coverage. No cloud writes or production migration. See docs/engineering/updates/2026-11-09-identity-safe-local-backup-dashboard-refresh.md. Full CI/preview and signed iPhone verification remain release gates. The follow-up CI localization correction restores the existing 11-language-confirmed confirmation copy; import behavior is unchanged.


## 2026-11-09 — PR #252 documented import verification and manual plan grants

Confirmed local backups are read back from device storage before Home/Wallet/Transactions show success; zero-row imports keep a retryable preview. New administrator-only, expiring and revocable Pro/Pro+ grants integrate into server-side status, with disposable PostgreSQL tests and no purchase fabrication. Vercel Sandbox previously passed 936/936 frontend tests, TypeScript and isolated SQL. The earlier incremental implementation commits omitted per-commit register/dated updates, so this PR is consolidated into one documented implementation commit rather than weakening the guard. Exact rewritten-head CI, real-device tests and deployment-schema rehearsal remain required. No production data or billing configuration changed. Details: `docs/engineering/updates/2026-11-09-confirmed-import-and-owner-plan-grants.md`.


## 2026-11-09 — Vercel Sandbox access restored; PR #247 verification

820 tests / 146 suites, typecheck, optimized build without source maps, isolated plan/RLS SQL including 150 first-time Pro grants, 36 component + 6 app + 30 header cases, and exact-cent Free local save/reload passed. Header 0.5px padding and 34 build/test dependency advisories remain. Production plan RPC/trigger migration and cross-user cloud/offline release blockers remain unresolved; no production changes or signed-device certification. See the dated access/finance/UI audit for scope and failure/retry evidence.

## 2026-11-09 — Access audit and replacement welcome offer

First-100 Pro+ promotion superseded: one calendar month of Pro for every eligible first-time verified account, using the existing uncapped claim flow. Live plan RPCs/triggers are missing; cloud/local races, incomplete balance inputs and precision gaps require resolution. Vercel Sandbox authorization is blocked (403), so interactive validation and release remain pending. No production changes.

See [dated audit](engineering/updates/2026-11-09-access-finance-ui-audit.md).

**Last reconciled:** 2026-11-05  
**Source of truth:** GitHub PR pages, commit SHAs, Actions runs, and Vercel deployment records. This register is a concise operational index, not a substitute for those records.

## Open pull requests

**2026-11-09 — Video guide, plan badges, free month, polish:** first-run video guide then walkthrough then plans; automatic free month for eligible first-time accounts; Pro = Gold badges, Pro+ = Platinum; compact translated plans sheet; Add Card back under Wallet → All; shorter Menu copy. See `docs/engineering/updates/2026-11-09-guide-badges-polish.md`.

**2026-11-09 — PR #241 consolidated:** keeps masked emails and the network-failure-safe entitlement refresh; its separate offline workspace is dropped in favour of #250's. See `docs/engineering/updates/2026-11-09-pr241-consolidated.md`.

**2026-11-09 — PR #246 alignment:** inherits #245's payment-link render-loop fix; App test updated to #246's storage-retry wording. Jest 926/926, TypeScript and strict build pass locally. See `docs/engineering/updates/2026-11-09-pr246-test-alignment.md`.

**2026-11-09 — PR #245 render-loop fix:** the payment-link effect re-opened the plans sheet on every render in local mode (App tests hung). Links are now marked handled and cleared before the Pro+ check. App tests 49/49. See `docs/engineering/updates/2026-11-09-pr245-payment-link-loop-fix.md`.

**2026-11-08 — PR #227 free security hardening:** New disposable-local PostgreSQL 18 runner applied all 28 MOVO migrations, verified all 12 privileged finance RPCs with two synthetic users and successful owner-only controls; no paid Supabase branch or production mutations. Added PR CI job, strict localhost-only runner and native OAuth/deep-link URL validation. See `docs/engineering/updates/2026-11-08-pr227-free-local-security.md`; remain DRAFT pending exact-head CI and signed-device checks.


**2026-11-08 — PR #227 localization CI correction:** Restored translation-catalog completeness for the new Profile remote-session-revocation controls: five strings in all 11 MOVO locales, regenerated locale dictionaries and version. Isolated Vercel Sandbox i18n and scope tests pass; require complete final-head CI before merger. See dated PR227 security implementation note.

**2026-11-08 — PR #227 session controls:** Added user-confirmed sign-out of other sessions via Supabase `scope: 'others'` while preserving the current session. Verified with focused tests; current access JWTs remain valid until expiry. See `docs/engineering/updates/2026-11-08-pr227-security-implementation.md`.

**2026-11-08 — PR #227 native security remediation:** Secure legacy token deletion and logout tombstones are implemented; combined main/security Sandbox 814 tests passed. Preserve DRAFT until iOS/Android signed-device tests, 12 privileged RPC cross-user checks, and branch protection. See `docs/engineering/updates/2026-11-08-pr227-security-implementation.md`.

**2026-11-08 — PR #244 Philippine rewards reference presets (draft):** Reconciled against main after #239 and #240 and restored full engineering registers; compact eight-category collapse/expand, editable OFF-by-default cashback/points suggestions, and accounting-safe calculations. Exact combined tree Vercel Sandbox: 820/820 Jest tests across 146 suites, TypeScript, optimized build PASS. GitHub documentation-gate repair squashes the original implementation and dated engineering update into one reviewable commit, preserving all code; branch remains DRAFT pending provider terms verification, native/signed-device UI checks, and cloud/local override validation. Details: `docs/engineering/updates/2026-11-08-ph-rewards-presets-collapsible-categories.md`.

**2026-11-08 — Transaction running balances (review, accessibility regression correction):** Add optional after-transaction balance/remaining credit history with paired transfer balances, cents accuracy, privacy masking and dedicated Settings toggle. Prepared in isolated Vercel Sandbox; verify exact-head CI and preview UI before merge. Details: docs/engineering/updates/2026-11-08-transaction-running-balances.md.

**2026-11-07 — Plans and Wallet UI follow-up:** Removes cloud-read-only banner, adds swipeable plan cards with visible trial controls, and renders loyalty/rewards as cards with header-only creation. Badge hierarchy becomes Bronze/Silver/Gold/Platinum. Branch `fix/plans-wallet-ui-20261107`; details in `docs/engineering/updates/2026-11-07-plans-wallet-ui.md`.

**2026-11-07 — Pro / Pro+ trials and restrictions:** `feat/pro-plans-trial-restrictions` adds expiring plan gates, native-store product tiers, one-month Pro claim, verified referral rewards, cloud read-only transition and local backup access. Vercel Sandbox: 765 tests / 135 suites, TypeScript, production build and isolated PostgreSQL checks pass. Draft pending staging migration and signed-device store lifecycle checks. Details: `docs/engineering/updates/2026-11-07-pro-plans-trials-referrals.md`.

**2026-11-07 — Membership, tokens, Cashback, and unified Others filter:** Branch feat/movo-others-membership-rewards-20261107 preserves five Wallet filters, puts cash/miscellaneous financial accounts plus membership/rewards into Others, adds secure non-cash provider cards, and introduces reversibly derived reward estimates from matching purchases in Cashback. Vercel Sandbox full build, Jest and Chromium QA; same-commit docs in docs/engineering/updates/2026-11-07-loyalty-membership-rewards-and-others-filter.md. Require exact-head CI before merge.

**2026-11-07 — E-wallet QR upload:** Separate branch feat/ewallet-account-qr-20261107 extends Wallet account QR upload to e-wallet add/edit, preserving bank flow. Sandbox full tests 717/717, TypeScript, production build and Chromium mobile create/upload/reload/remove QA passed. Details: docs/engineering/updates/2026-11-07-ewallet-payment-qr-upload.md. Merge only after exact-head CI checks, no migration.

**2026-11-07 — TTS / receipt scan repair:** Isolated branch, fixes local OCR contrast collapse, WASM CSP, iOS image decode fallback, scanner recovery, bounded SSE/NDJSON voice streaming and chunked TTS. Vercel Sandbox build: 712 tests pass; detailed manual/automated verification recorded in dated engineering update. Unmerged until exact-head CI review.

**2026-11-07 — Follow-up on PR #230:** All shared RootHeader and SubHeader back-arrow buttons are now transparent across light/dark, hover, active and focus states (with accessible focus ring preserved). No changes to 45px hit targets or standalone controls; Vercel Sandbox browser QA (375px light, 320px dark, 1024px desktop) and 692 automated tests passed; GitHub CI to confirm. Details: `docs/engineering/updates/2026-11-07-grouped-header-zero-padding.md`.

**2026-11-07 — Grouped header zero-padding change:** `ui/header-group-zero-padding-20261107` removes utility capsule and grouped-button padding across MOVO, preserves icon geometry, and adds a CSS regression test. Vercel Sandbox validation and GitHub CI to be recorded in PR; no production merge implied. Details: `docs/engineering/updates/2026-11-07-grouped-header-zero-padding.md`.

**2026-11-08 — PR #227 updated security gap audit:** Review of exact security branch and live MOVO DB identified 12 privileged RPCs pending two-user negative tests, unprotected main, 34-commit divergence and three merge conflicts, native legacy secret cleanup caveat, and canceled iOS CI. Sandbox 644/644 tests and build passed. Audit: `docs/security/PR227_GAP_AUDIT_2026-11-08.md`. PR remains DRAFT.

| PR | Scope | Current state | Next action |
|---|---|---|---|
| [#214 — Credit-card ledger and compact card details](https://github.com/nasrinaiv0/movo/pull/214) | Financial Planning credit-card ledger reconciliation, complete payment/credit history, expandable details and responsive card layout. | Open; ready for review. Local tests, typecheck, build, translation coverage and GitHub Actions CI passed; Vercel Sandbox viewport checks passed. Hosted Vercel preview skipped by the configured Ignore Build Step. | Review the implementation and test results; merge after approval. |
| [#177 — FX converter and crypto market](https://github.com/nasrinaiv0/movo/pull/177) | FX converter, tracked pairs and history; crypto market discovery, local watchlist, coin detail and provider-supported history. | Closed; crypto market implementation added; validation pending. | Configure licensed CoinPaprika API Pro key as Vercel `COINPAPRIKA_API_KEY`; complete tests, typecheck, build and preview verification. Price alerts are implemented locally with above/below thresholds, enable/pause/delete controls and permission-aware notifications; portfolio lots remain pending. |
| [#175 — Deep security audit implementation plan](https://github.com/nasrinaiv0/movo/pull/175) | Security remediation documentation and penetration-test plan. | Open draft. | Continue implementation under issue #143. |

2026-11-04 — Crypto market implementation on PR #177: added the responsive market screen, provider-backed searchable ticker list, sorting, local watchlist, coin detail, provider-supported daily history, foreground refresh, and server-side CoinPaprika proxy with validated inputs and cached responses. The latest web CI run is queued; no crypto implementation checks are marked passed until the current head completes. Required deployment action: configure a licensed CoinPaprika plan/key in Vercel as `COINPAPRIKA_API_KEY`. Price alerts now support local above/below thresholds, crossing detection/rearming, enable/pause/delete, and foreground permission-aware notifications. Translation coverage was fixed for both market and alert UI copy. CI now uses `npm install` because this repository does not commit a lockfile; the first CI attempt exposed this workflow assumption and was corrected. Manual portfolio holdings/valuation are implemented; native iOS requests now route through `apiUrl('/api/crypto')` so the bundled app calls the production API. The CoinPaprika key remains a required Vercel server environment variable. CI now runs dependency install (repository has no lockfile), production dependency audit, typecheck, dedicated translation coverage, full tests and production build.\n\nChecked against GitHub on 2026-11-04. This register is reconciled for the currently open work; historical entries below remain a summary of prior changes.

2026-11-05 — PR #214 created from `main` for credit-card ledger reconciliation and the compact expandable Financial Planning card UI. The live ledger balance takes precedence over stale liability snapshots; valid unique payment logs are subtracted without the previous 120-entry cutoff. Full payment and credit-spend histories are available in the expanded panel. Added responsive Wallet and Transactions filters, updated Home/Transactions/all screen-header icon accents, extended accent styling to the custom NasrinAI chat header actions, and replaced transaction-search initials with the MOVO mark plus category badges. Final verification on head `31f2917c2bf831b5373451a6e8b1326bbc9b12f3`: 94 Jest suites / 560 tests, TypeScript, production build, translation catalogue validation, and Vercel Sandbox checks passed. GitHub Actions passed; hosted Vercel preview was skipped by the configured Ignore Build Step.

## Production database (checked 2026-11-02 20:00 UTC)

Supabase `cjsjmorqvuvvwbfyztiz` has **every migration on `main`**, through `20261103010000_automation_transfers`.
`user_preferences` was applied on 2026-11-02 via the Supabase tools; `bills_payments`,
`automation_sources_and_cross_source_dedup`, `automation_inbox` and `automation_transfers` were applied by the owner
in the SQL Editor from one reviewed script. Before that, the script was run on a local Postgres 16 copy built to
match production, and the SQL test suites passed there. A production read-back confirmed:
- the bills tables and the automation inbox exist, with RLS on;
- both automation loggers exist and are server-only;
- `user_preferences` has RLS on.

**Supabase advisors (2026-11-02, after applying):**
- `assert_movo_finance_child_ownership()` (a trigger function) is executable by anon/authenticated. Calling it directly
  only errors, but EXECUTE should be revoked.
- 34 RLS policies call `auth.uid()` per row; they should use `(select auth.uid())` (bills, loans, receivables, goals,
  postings).
- 15 foreign keys have no covering index.
- Also reported:
  - 8 authenticated SECURITY DEFINER RPCs: intended, each checks `auth.uid()`;
  - leaked-password protection off: no passwords since #133;
  - `movo_ai_upstream_conversations` has RLS with no policy: server-only by design;
  - 13 unused indexes on new, nearly empty tables.
- A hardening migration with tests is proposed; applying it needs the owner's approval.

**Security audit (2026-11-03) → `fix/db-hardening`, migration `20261103020000_harden_trigger_execute_rls_initplan_fk_indexes`:**
- Bug found while testing: `assert_movo_finance_child_ownership()` read `new.transaction_id` on `financial_loans` and
  `financial_receivables`, which have no such column. Every loan or receivable insert/update failed (production has 0 of
  each). The migration fixes this; ownership checks are unchanged.
- Revokes EXECUTE on that trigger function from anon/authenticated (service_role keeps it, like
  `assert_movo_bill_ownership`); rewrites the 34 policies to `(select auth.uid())`; indexes the 15 foreign keys.
- `supabase/tests/security_hardening.test.sql` passes on a local Postgres 16 copy matching production (same policies,
  same function source), fails without the migration, and the migration re-runs cleanly. **Not applied to production yet.**

**Bank-app notification logging (`feat/notification-logging`, 2026-11-03):** Automatic logging now opens on **Bank notifications** (iOS 27 Notification trigger, one automation per app) and no longer offers the text-message recipe. `/api/log` replies carry `notice` (left out for duplicates and ignored promos/OTPs) so background shortcuts need one "has any value" check. The parser reads push wording ("You've paid", "card … was used for", "PHPx" without a space) and ignores offers and statements. Prompts were rewritten per mode; they can't be tested on an iPhone from CI.

## Recent merged implementation

| PR | Result | Validation / notes |
|---|---|---|
| [#146 — Account deletion in the app](https://github.com/nasrinaiv0/movo/pull/146) | Merged 2026-11-02 as `a44b22e`. | iOS phase 3 (App Store 5.1.1(v)): Settings → Delete Account → `POST /api/account/delete` (verified token; transactions, then the Auth user via the Admin API; the rest cascades). Local Postgres check: no `user_id` row left in any public table. 366 tests; `verify` + `build-ios` green. |
| [#145 — Siri income and transfers](https://github.com/nasrinaiv0/movo/pull/145) | Squash-merged 2026-11-02 as `21cd33d`. | Voice transfers between own accounts as one transfer row via `log_automation_transfer` (migration `20261103010000`, SQL test + mutation checks); more income phrasing. 373 tests; `verify` + `build-ios` green. |
| [#144 — Bank and e-wallet payment texts](https://github.com/nasrinaiv0/movo/pull/144) | Squash-merged 2026-11-02 as `32fae1c`. | `api/_lib/messageText.js` reads GCash / Maya / bank SMS, email or Android notifications into income, expense or transfer with reference, date and account hint; OTPs and promos ignored and never stored; "Bank texts" Shortcut recipe. 362 tests. |
| [#141 — iOS phase 2](https://github.com/nasrinaiv0/movo/pull/141) | Merged 2026-11-02 as `8187aca`. | Sign-in through the system browser + `movo://auth-callback`, native storage mirror, local notifications, Face ID app lock, `movo://` links, native Liquid Glass top bar and dock (`GlassChrome.swift`), macOS 26 CI compile (`build-ios`). |
| [#139 — iOS phase 1](https://github.com/nasrinaiv0/movo/pull/139) | Merged 2026-11-02 as `51f55c4`. | Capacitor 8 iOS project (SPM, bundled, `com.nasrinai.movo`), `apiUrl()` / `appOrigin()`, CapacitorHttp; the website is unchanged. See `docs/IOS_APP.md`. |
| [#140](https://github.com/nasrinaiv0/movo/pull/140), [#138](https://github.com/nasrinaiv0/movo/pull/138) — Money Flow | Merged 2026-11-02 (`0541847`, `ed39c36`). | The last column is today; compact From/To fields with labels inside; legend colours match the bars. Production deploy of `ed39c36` READY. |
| [#137](https://github.com/nasrinaiv0/movo/pull/137), [#136](https://github.com/nasrinaiv0/movo/pull/136) — Categories | Merged 2026-11-02 (`d6725ab`, `6805489`). | 12 compact categories, 22 groups / 233 subcategories with stable ids; category icon badge on transaction rows. |
| [#133 — While you were away, card layout, badges, passwordless sign-in](https://github.com/nasrinaiv0/movo/pull/133) | Squash-merged 2026-11-02 as `3215631`. | Recent-logs popup and failed-automation inbox (migration `20261102020000`, not applied); automation matches the bank account; card faces per owner spec (landscape and vertical BPI reference); Pro/Max/Ultra streak badges with the MOVO mark; MOVO logo fallback; email-code + Google + Apple sign-in (no passwords). `verify` passed on the final head `ea0124e`; 61 suites / 337 tests locally. |
| [#132](https://github.com/nasrinaiv0/movo/pull/132), [#131](https://github.com/nasrinaiv0/movo/pull/131) — Card layout dimensions | Merged 2026-11-02. | Owner-approved card spec block in `App.css`; logo and name sizes later superseded by #133 at the owner's request. |
| [#130 — Automation, voice, adaptive CSS, card faces](https://github.com/nasrinaiv0/movo/pull/130) | Merged 2026-11-02 as `c99d94a`. | Automation sources and cross-source dedup (migration `20261102010000`, not applied), NasrinAI voice on iPhone, adaptive CSS audit, network marks. |
| [#127 — Bills & Payments](https://github.com/nasrinaiv0/movo/pull/127) | Merged 2026-11-01. | Bills tab and idempotent payments. Migration `20261101120000` **not applied** in production. Bill reminders (`reminderFor`) are computed but not wired. |
| [#126 — First-run welcome + import](https://github.com/nasrinaiv0/movo/pull/126) | Merged 2026-11-01. | Local CSV/JSON import; does not cover loans, receivables or bills. |
| [#80 — Tappable tiles, receipt scanner, rich replies](https://github.com/nasrinaiv0/movo/pull/80) | Merged 2026-10-31. | |
| [#42 — Accessible disabled cloud-auth guidance](https://github.com/nasrinaiv0/movo/pull/42) | Merged 2026-10-29. | The auth panel was later rebuilt as passwordless in #133; the disabled-state guidance is kept. |
| [#41 — NasrinAI financial-context consent](https://github.com/nasrinaiv0/movo/pull/41) | Closed without merge 2026-10-29. | |
| [#34 — Wallet validation and security status](https://github.com/nasrinaiv0/movo/pull/34) | Merged as `e43670bb56295e2fcf881b0c897d8d808b81bedc`. | Documentation refresh. Main CI [run 40852563341](https://github.com/nasrinaiv0/movo/actions/runs/40852563341) passed 13 suites / 76 tests, typecheck, and production build. Vercel production deployment `dpl_61HwBdJZwg1hpQZshMH8SB4uZr2p` is READY with `movo.nasrinai.com` attached. |
| [#33 — Wallet quick-action correction](https://github.com/nasrinaiv0/movo/pull/33) | Merged as `8fed594d571602c8d7f0cdca55afb286d47dabab`. | Replaced the duplicate Transfer action with Add Transaction. CI [run 40851881401](https://github.com/nasrinaiv0/movo/actions/runs/40851881401) passed 13 suites / 76 tests, typecheck, and production build; preview reached READY. |
| [#32 — Validated profile form](https://github.com/nasrinaiv0/movo/pull/32) | Merged as `782ac74568570ef27cc942f7e7a1bc5147ddd7a6`. | Profile editing now validates and saves browser-local fields; CI [run 40845667667](https://github.com/nasrinaiv0/movo/actions/runs/40845667667) passed 13 suites / 74 tests and build. |
| [#31 — Accessibility verification notes](https://github.com/nasrinaiv0/movo/pull/31) | Merged. | Documented disabled-setting accessibility and release limitations. |
| [#30 — Disabled-setting explanations](https://github.com/nasrinaiv0/movo/pull/30) | Merged. | Associated disabled settings with visible explanatory text for assistive technology; regression tests added. |
| [#29 — Inactive unsupported controls](https://github.com/nasrinaiv0/movo/pull/29) | Merged. | Unsupported card/issuer controls are disabled and explained. |
| [#28 — Frontend audit refresh](https://github.com/nasrinaiv0/movo/pull/28) | Merged. | Updated validation evidence and release blockers. |
| [#27 — Storage disclosure](https://github.com/nasrinaiv0/movo/pull/27) | Merged. | Corrected browser-local storage wording and related documentation/tests. |
| [#26 — Reconciled frontend/legal/finance implementation](https://github.com/nasrinaiv0/movo/pull/26) | Merged. | Combined frontend controls, legal/help flows, finance actions, accessibility, CSV hardening, and server-only NasrinAI mapping restrictions. |
| [#21 — NasrinAI upstream diagnostics](https://github.com/nasrinaiv0/movo/pull/21) | Merged. | Added safe upstream diagnostics. Production authentication still needs successful end-to-end verification. |
| [#20 — Authenticated NasrinAI integration](https://github.com/nasrinaiv0/movo/pull/20) | Merged. | Server-side chat proxy, user-scoped context/history, consent enforcement, and server-only upstream mapping. A production upstream HTTP 401 remains unresolved. |

## Closed without merge / superseded

| PR | Disposition |
|---|---|
| [#19 — Functional finance core](https://github.com/nasrinaiv0/movo/pull/19) | Closed without merge after reconciliation; useful local finance persistence, editing, transfer validation, CSV import/export, and regression coverage were carried forward into the reconciled frontend work. |
| [#23 — Earlier frontend completion](https://github.com/nasrinaiv0/movo/pull/23) | Closed without merge; superseded by the reconciled PR #26 and follow-up fixes. |
| [#22 — Earlier legal/help pages](https://github.com/nasrinaiv0/movo/pull/22) | Closed without merge; legal/help functionality was consolidated into the in-app Legal and Help Center screens to avoid duplicate policy sources. |
| [#12 and #13 — Reference UI / notification parity](https://github.com/nasrinaiv0/movo/pull/12) | Closed without merge; superseded by the later merged responsive frontend and notification implementations. |
| [#41 — NasrinAI financial-context consent](https://github.com/nasrinaiv0/movo/pull/41) | Closed without merge on 2026-10-29; the consent disclosure in the chat was reworked in later merged chat changes. |

## Current release blockers

These are not resolved by a green frontend CI run or a READY deployment:

- **Legal:** Terms of Service and Privacy Policy published as final on 2026-11-03 by owner decision (effective 2026-11-03). The operator is identified as the MOVO service team with the support@nasrinai.com contact; no legal name or registered address is shown. The publication warning was removed.
- **Email sign-in codes (2026-11-02):** Supabase Auth logs show every `/otp` request since 16:02 UTC failing with SMTP
  `535 "Authentication credentials invalid"`. The custom SMTP credentials in Authentication → Emails → SMTP Settings
  need correcting by the owner, so codes are not delivered until then. Google sign-in works. Apple fails with
  `provider is not enabled`.
- **iOS app:** phases 1–3 are merged (`docs/IOS_APP.md`). Phase 4 (Codemagic signing, TestFlight) and phase 5
  (device testing, App Store submission) need the owner's Apple Developer Program membership, App Store Connect API
  key and Codemagic account. The look of the native Liquid Glass bars is unverified on a device.
- **Database hardening:** the Supabase advisor findings above are not yet fixed (a proposed migration needs approval).
- **Supabase Auth (sign-in is passwordless since #133):**
  - Paste the MOVO code email (with `{{ .Token }}`) into the Magic Link and Confirm signup templates.
  - Enable the Apple provider (Services ID, Team ID, Key ID, private key).
  - Allow `https://movo.nasrinai.com/**` and `movo://auth-callback` as redirect URLs. Leaked-password protection still matters only for older accounts that had a password; enable it through authorized project settings: [Supabase password-security guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- **Dependencies:** Latest main CI install reports 34 npm audit findings (16 low, 5 moderate, 13 high). Review advisories and use targeted upgrades with regression tests rather than a blind forced upgrade.
- **NasrinAI chat:** Production logs on 2026-10-29 showed upstream HTTP 401 responses (last observed 2026-10-29T05:42:54Z). Not re-checked since; a successful authenticated production chat request is still unconfirmed. Never expose or log credential values.
- **Interactive verification:** Full browser smoke tests on the production custom domain, including mobile, auth, consent, financial writes, CSV flows, and keyboard/focus behavior, remain unverified. Phone automations (Siri Shortcut, Apple Pay, Android voice) and NasrinAI voice chat have not been tested on a real device.
- **Data isolation:** Read-only production catalog checks confirm RLS enabled on profiles, financial accounts, transactions, budgets, and NasrinAI chat tables. Owner-scoped policies are present; the upstream mapping intentionally has no browser policy/grants and remains server-only.

## Required PR lifecycle

1. Review open PRs before starting duplicate work; update an existing branch when scopes overlap.
2. Use a dedicated branch and keep the PR summary, known limitations, and progress evidence current.
3. Run typecheck, the complete test suite, production build, and relevant security/data-isolation checks on the exact head SHA.
4. Verify the preview deployment for that exact SHA. A canceled/ignored Vercel build is not successful verification.
5. Merge only after checks pass and the PR is conflict-free. Verify the merge commit and resulting deployment separately.
6. Never include secrets, credentials, private financial data, or unverifiable legal details in code or documentation.


## Latest current-main snapshot — 2026-10-30 09:35 Asia/Manila

- **Main / production:** `277051e4ec2216a6b598c784a50b32ba37b89dee`; deployment [dpl_FRVNFKYmKHcrhnfvF8uhi7fwELVh](https://vercel.com/nasrin-ai/movo/FRVNFKYmKHcrhnfvF8uhi7fwELVh) READY.
- **Merged:** PR #57 (production dependency audit gate; 0 production dependency vulnerabilities) and PR #59 (generic demo identity, visible fictional sample-data notice, functional Sign in CTA). Production Playwright verified 200, no owner-like demo identity, responsive 390px layout, consent/legal navigation and no browser errors. Preview smoke exercised Home, Wallet, Transactions, NasrinAI, Profile, Settings, Notifications, and Search/Escape.
- **PR #56:** still draft; exact head `36c486424a2f37591edb13d5a43936140515e217`; Actions [40985264768](https://github.com/nasrinaiv0/movo/actions/runs/40985264768) passed 18 suites / 101 tests, typecheck, production audit and build; preview READY. Authenticated scoped request and unrelated-document canary remain unverified. Keep issue #47 open.
- **PR #55:** still draft and currently not mergeable against current main; reconcile with the merged demo disclosure before considering merge. **PR #43 / #52:** still draft; authenticated finance/chart validation remains outstanding. PR #58 is the documentation reconciliation branch.
- **Security:** RLS enabled on the seven checked tables; 22 owner-scoped policies across six user-facing tables; no checked anon/PUBLIC grants; upstream mapping remains server-only. Supabase leaked-password protection remains disabled. Full npm tree still reports 34 findings (16 low, 5 moderate, 13 high), while production-only audit is clean.
- **Legal:** Terms and Privacy pages and consent links were browser-verified, but publication warning remains until operator/controller identity/address, actual retention/deletion periods, providers/data recipients and jurisdiction-specific wording are confirmed.
- **Production chat:** no-token POST returns 401 `sign_in_required`. This is an auth-gate check, not proof of authenticated MOVO context isolation. Protected preview SSO prevented the exact-head scoped POST/canary test.
- Full detailed snapshot: `docs/engineering/updates/2026-10-30-0935-production-demo-disclosure-and-chat-checks.md`.


## Current main and release-gate snapshot — 2026-10-30 10:10 Asia/Manila

- **Main:** `ca1a680c78baf7c87347c960d56c7bc207041bc3`. PR #58 is merged (not open).
- **Production app:** PR #59 merged as `277051e4ec2216a6b598c784a50b32ba37b89dee`; Vercel deployment [dpl_FRVNFKYmKHcrhnfvF8uhi7fwELVh](https://vercel.com/nasrin-ai/movo/FRVNFKYmKHcrhnfvF8uhi7fwELVh) READY. Demo now uses generic identity and a fictional sample-data notice. Production Playwright smoke evidence is recorded in the 09:35 audit delta; not rerun in the 10:10 pass.
- **PR #60:** open/draft, head `d80077b05067282fa76de16e7947aa73557e7550`, 23 ahead / 0 behind. Exact-head run [40989633601](https://github.com/nasrinaiv0/movo/actions/runs/40989633601) passed 20 suites / 111 tests, typecheck, `audit:controls`, build and production-only audit; preview check succeeded. Manual accessibility and authenticated finance tests remain open.
- **PR #56:** open/draft, head `30aaaf0fedb50e7b73bb36f285c5b744247a2c0c`, 19 ahead / 0 behind. Current run [40990086352](https://github.com/nasrinaiv0/movo/actions/runs/40990086352) was in progress at 10:10; Vercel status succeeded. Do not reuse older run #40989833432 as validation for this exact head.
- **Issue #47:** open until authenticated scoped POST and unrelated-project canary prove isolation across retrieval, provider prompt, response, transcript, caches and logs. A no-token 401 is not sufficient.
- **Security/legal:** full dependency tree still has 34 findings (16 low, 5 moderate, 13 high); production-only audit reports zero. Supabase leaked-password protection remains reported disabled. Legal publication warning remains.
- Detailed update: `docs/engineering/updates/2026-10-30-1010-monitoring-delta.md`.



### Exact-head follow-up — 2026-10-30 10:11 Asia/Manila

- PR #56 head `30aaaf0fedb50e7b73bb36f285c5b744247a2c0c`: run [40990086352](https://github.com/nasrinaiv0/movo/actions/runs/40990086352) completed successfully; 18 suites / 103 tests, typecheck, production-only audit (0 vulnerabilities), and production build passed. Vercel check [CaaFALv6sPd7vWa1xRFqUwDRiHh2](https://vercel.com/nasrin-ai/movo/CaaFALv6sPd7vWa1xRFqUwDRiHh2) is successful.
- Full install still reports 34 findings (16 low, 5 moderate, 13 high), plus glob/eslint and Node.js 20 action deprecation warnings.
- Context-isolation release gate remains open: no authenticated scoped POST and unrelated-project canary evidence yet.


## 2026-10-30 10:35 Asia/Manila — branch protection/release-control audit
- Main branch API reports protected=false, required status checks enforcement off, and no configured contexts/checks; repository rulesets endpoint returned []. External organization/user-level policy was not separately verified.
- No new app merge/deployment since the previous checkpoint. Main's latest commit ca1a680c78baf7c87347c960d56c7bc207041bc3 is documentation-only; production app deployment remains READY at 277051e4ec2216a6b598c784a50b32ba37b89dee.
- PR #61 exact-head CI #40990360004 passed and preview dpl_DgProVYtiyPMD7ZQEndJt1b9Zhjh is READY. PR remains draft/unmerged.
- PR #56 exact-head CI #40990086352 passed (18 suites/103 tests), but authenticated context isolation remains unverified. PR #60 exact-head CI #40989633601 passed (20 suites/111 tests), but manual accessibility checks remain open. PR #52 exact-head run #40988481343 passed (18 suites/101 tests), but authorized finance-data chart verification remains open.
- Full dependency tree still reports 34 findings (16 low, 5 moderate, 13 high); production-only audit reports 0. Keep scopes distinct.
- Detail: docs/engineering/updates/2026-10-30-1035-branch-protection-and-release-control.md. No code/settings/deployments changed.

## Monitoring checkpoint — 2026-10-30 11:14 Asia/Manila

- **Current main:** `815ab66919894b271b90a5b1570b2fae949406c9`. PR #61 (documentation-only audit refresh) is merged. Current main's production deployment is READY; no new application code was merged by #61.
- **PR #43 finance:** current head `600c49ab9f1b5cb0e0034afe59d00fdbd4a0d6dc`, 17 ahead / 0 behind main, open/draft/mergeable. The profile currency correction is validated: code/test head `5308948502127be913921522b598693feb21e533` passed Actions #40996734432; the latest docs head passed Actions #40997019508. Both runs passed 20 suites / 118 tests, typecheck, production-only audit (0 vulnerabilities), and production build. Latest preview dpl_FxojvcDKrnLv1rQJC1HfewT6mJwy is READY. Authenticated cloud finance/CSV/currency-isolation checks remain open.
- **PR #52 charts:** current head `64cfa5b9e746b249a07735ae934badcb7d842610`, 7 ahead / 0 behind main, open/draft/mergeable. Exact-head Actions #40996821611 passed 18 suites / 101 tests, typecheck, production-only audit (0 vulnerabilities), and build. Preview dpl_HkwPPhisFzvU6MqLCW5uXvXvKmMF is READY; root returned HTTP 200. Authenticated chart-data verification remains open.
- **PR #56 context isolation/legal copy:** current head `337332bea5cabd533447e0913503b188794bca8e`, 20 ahead / 0 behind main, open/draft/mergeable. Exact-head Actions #40996840860 passed 18 suites / 103 tests, typecheck, production-only audit (0 vulnerabilities), and build. Preview dpl_9t1ykdVhWkhHxLanDZK2xFnh33Wp is READY; root returned HTTP 200. Authenticated live scoped POST and unrelated-project canary remain unverified; issue #47 stays open.
- **PR #60 UI controls/accessibility:** current head `015c35d041972080249e0bc71a6114bbbc4e6e19`, 24 ahead / 0 behind main, open/draft/mergeable. Exact-head Actions #40996861622 passed 20 suites / 111 tests, typecheck, `audit:controls`, production-only audit (0 vulnerabilities), and build. Preview dpl_3zM4sjjSTbQbTkrGuv9sTPZ9pnJp is READY; root returned HTTP 200. Keyboard-only/focus, screen-reader, responsive, and authenticated finance-flow checks remain open.
- **Fresh MOVO Supabase catalog check:** RLS enabled on all 7 checked tables; 22 policies across the six user-facing tables all reference `auth.uid()`; no `anon`/`PUBLIC` grants on the checked set; upstream-conversation mapping has no policies and no `authenticated` grants, with grants restricted to `service_role`.
- **Security carry-forward:** Supabase Security Advisor still reports leaked-password protection disabled. The available Supabase tools expose no Auth configuration write action, so no setting was changed. Full dependency tree still reports 34 findings (16 low, 5 moderate, 13 high); production-only audit reports 0. These are distinct scopes.
- **Legal:** PR #56 carries separate Terms/Privacy effective dates and corrected Privacy Policy wording. It is not merged, so production does not yet contain that revision. Publication warning must remain until formal operator/controller identity/address, verified retention/deletion schedule, provider/data-recipient disclosures, and jurisdiction-specific wording are confirmed.
- **Validation boundary:** all four open application PRs have passing exact-head automated checks and READY previews, but none is fully release-verified. No authenticated finance CRUD/CSV, chart provenance, live upstream scope canary, or manual accessibility session was completed in this checkpoint. The Vercel protected fetch attempt was blocked before reaching the app endpoint and is not application API evidence.
- **Data/security boundary:** no database schema, RLS/grants, production financial records, Auth settings, provider secrets, or separate NasrinAI repository were changed.

## Post-merge checkpoint — NasrinAI disclosure hotfix — 2026-10-30 11:30 Asia/Manila

- **PR #63 merged** as `1df043bcc54d59bee16fce806b601e09d647b06e`. Exact-head Actions #40997576900 passed 17 suites / 95 tests, TypeScript typecheck, production-only audit (0 vulnerabilities), and production build. Preview was READY and the served bundle had the new caveat.
- **Production verified:** deployment dpl_CoSq9dcgCG2qVbCkm1BBSeRU2r1U is READY at the merged commit; root returned HTTP 200. The production JS bundle contains “Important privacy limitation” and the explicit upstream-boundary warning, contains the October 30, 2026 Privacy Policy date, and no longer contains “Your account stays isolated.”
- **Important scope distinction:** this corrects misleading copy; it does not prove the full upstream context boundary. Issue #47 stays open until authenticated scoped POST and unrelated-project canary evidence is recorded.
- **Current application PR heads after reconciliation:** #43 `d6f2fcd40ad9c5438e031400dd5120d77272bec0` (20 suites / 118 tests); #52 `4b645666108174f31d4875d0da063bd8fe1c0170` (18 / 101); #56 `06b5680b069ce17b75b9e2d63e3e0904bdda703e` (18 / 103); #60 `43087d907be095ef42d8fbcd7b8d9b2cc6723662` (20 / 111). All exact-head Actions runs passed, Vercel previews are READY, and preview root requests returned HTTP 200. All remain drafts due the authenticated/manual gates below.
- **Finance gates:** authenticated cloud CRUD, CSV import/export, and owner-scoped currency isolation remain unverified; chart data provenance against authorized records remains unverified.
- **Accessibility gates:** keyboard-only/focus, screen-reader, responsive interaction, and complete live-control behavior remain unverified. Static `audit:controls` does not replace these checks.
- **Fresh Supabase catalog check:** 7 checked tables have RLS enabled; all 22 policies on six user-facing tables reference `auth.uid()`; no checked `anon`/`PUBLIC` grants; upstream mapping has no policies or authenticated grants and remains service-role-only. Security Advisor still reports leaked-password protection disabled; no Auth write action was available.
- **Governance/dependencies/legal:** main still reports unprotected with no repository rulesets (rechecked after PR #63); full dependency tree has 34 findings (16 low, 5 moderate, 13 high), distinct from zero production-only findings. Legal publication warning remains until operator/controller identity/address, retention/deletion schedule, provider/data-recipient disclosures, and jurisdiction review are confirmed.
- No database schema/RLS/grants, production financial records, Auth settings, or secrets changed.


## Post-disclosure monitoring checkpoint — 2026-10-30 12:06 Asia/Manila

- **Main / production:** current main `9438e7c01c916a6b27f62e026fe9b4a4f6952f94`; Vercel production deployment [dpl_3kHKpwFatSAawrVCtU19XNEECR3E](https://vercel.com/nasrin-ai/movo/3kHKpwFatSAawrVCtU19XNEECR3E) is READY at the same SHA.
- **PR #63 merged:** [`1df043bcc54d59bee16fce806b601e09d647b06e`](https://github.com/nasrinaiv0/movo/pull/63). Removed unverified absolute isolation claim, disclosed that upstream boundary is not independently verified, advised against real/highly sensitive financial details, and corrected Terms/Privacy effective dates. Exact-head CI #40997576900 passed 17 suites / 95 tests, typecheck, production-only audit (0), build. Recorded production bundle smoke verified caveat/date and absence of old claim.
- **PR #64 merged:** documentation-only audit reconciliation at `9438e7c...`; paths: progress register, Claude handoff, master ledger, and dated disclosure-hotfix evidence.
- **Current application heads:** #43 `ad532e1df7ca14a0c0aebe0244d7b82d2bb0578e` — CI #41000693424, 20 suites / 125 tests, preview READY; #52 `78b776497c8125f1637b2fb601965c1cc94e9b03` — CI #40999382232, 18 / 101, preview READY; #56 `15e112149bf70b6ee1f141365a4b9ed9ffb9e6e5` — CI #40999433274, 18 / 103, preview READY; #60 `12ba5b3b45065949626e3ecf49a777b9de44387b` — CI #41000977707, 20 / 112, typecheck + `audit:controls`, preview READY. All four remain open/draft.
- **Security:** each latest checked install log reports 34 full-tree dependency findings (16 low, 5 moderate, 13 high), while production-only audit reports 0. Fresh merged ledger evidence: 7/7 checked tables RLS enabled; 22/22 user-facing policies reference `auth.uid()`; no checked anon/PUBLIC grants; upstream mapping remains service-role-only. Leaked-password protection remains disabled; main branch protection/rulesets remain absent.
- **Do not overclaim:** PR #63 is a disclosure correction, not a fix for issue #47. Authenticated scoped POST/canary, finance CRUD/CSV/currency isolation, chart provenance, manual accessibility, legal publication facts, leaked-password protection, branch governance and full-tree dependency remediation remain open.


## 2026-10-30 12:52 Asia/Manila — latest implementation follow-up

- [PR #56](https://github.com/nasrinaiv0/movo/pull/56): added missing/blank upstream-key fail-closed guard and regression test. Exact-head CI [41004999162](https://github.com/nasrinaiv0/movo/actions/runs/41004999162): 18 suites / 104 tests, typecheck, production-only audit (0), build passed; Vercel preview READY/root 200. Authenticated scope canary still unverified; historical upstream 401 requires authorized credential remediation.
- [PR #60](https://github.com/nasrinaiv0/movo/pull/60): added tests for disabled/explained unsupported settings and functional In-App Alerts. Exact-head CI [41005003149](https://github.com/nasrinaiv0/movo/actions/runs/41005003149): 20 suites / 113 tests, typecheck, `audit:controls`, production-only audit (0), build passed; Vercel preview READY/root 200.
- Full dependency tree still has 34 findings (16 low, 5 moderate, 13 high); leaked-password protection, branch governance, legal publication facts, authenticated finance/chart checks, and manual accessibility remain open.
- Detailed trace: `docs/engineering/updates/2026-10-30-1252-frontend-hardening.md`.


## Fresh Supabase read-only security recheck — 2026-10-30 12:54 Asia/Manila

- Catalog query: RLS is enabled on **7/7 checked public tables**: profiles, financial_accounts, transactions, budgets, movo_ai_conversations, movo_ai_messages, and movo_ai_upstream_conversations.
- The six user-facing tables have **22 policies**; each checked policy expression references `auth.uid()`. The upstream mapping has no client policy.
- `information_schema.role_table_grants` returned **73 grants** for `authenticated` and `service_role` across the checked tables, with **no `anon` or `PUBLIC` grants** in the checked set. The upstream mapping grants are limited to `service_role`; do not add a client policy/grant.
- Fresh Security Advisor findings: `auth_leaked_password_protection` remains WARN (disabled); `rls_enabled_no_policy` for the server-only upstream mapping remains INFO and intentional. Performance Advisor reports seven unused indexes; no index was dropped without query evidence.
- This was a read-only metadata/advisor check. No schema, RLS policy, grant, Auth setting, financial row, or secret was changed.

## PR #60 notification-settings accessibility regression — 2026-10-30 13:02 Asia/Manila

- Current PR #60 head: `8005fbc695c5a8f30f2817e99b3fb8226ea1a429`, reconciled with current `main`.
- Added regression coverage for unsupported Push/Email delivery and demo-only Account & Security, NasrinAI Updates, Promotions, and Reports. Each disabled switch must expose a visible explanation through `aria-describedby`. In-App Alerts and the Transactions category remain interactive and must call the preference handler.
- Updated the disabled-category descriptions to explicitly say that live delivery is not connected and sample/demo alerts only.
- The first attempt at `776b9af8d955f220406f48dbc7f573950ae89380` failed (1 failed / 113 passed) because the visible explanation did not match the test's sample/demo expectation. The source-only follow-up `02155f4501f56d8b7fa2fb79143af33730dc28a1` still failed against the stale assertion. The test was corrected at `9c38028cbf3a11675f16db09d0fb41190fd5f71d`; latest branch reconciliation is `8005fbc695c5a8f30f2817e99b3fb8226ea1a429`.
- Exact-head GitHub Actions run [41006039735](https://github.com/nasrinaiv0/movo/actions/runs/41006039735) passed: **20 suites / 114 tests**, TypeScript typecheck, production-only npm audit (**0 production vulnerabilities**), `audit:controls`, and production build.
- Exact-head Vercel preview [dpl_EYB99rVuHay4i4MA3QfH9WKueW7X](https://vercel.com/nasrin-ai/movo/EYB99rVuHay4i4MA3QfH9WKueW7X) is READY; preview root and JavaScript bundle returned HTTP 200, and the four explicit demo-only descriptions were present in the deployed bundle.
- The full dependency tree still reports **34 findings (16 low, 5 moderate, 13 high)**. No dependency changes were made. The previous production-only audit passed on this exact head.
- **Not release-complete:** interactive keyboard/focus, screen-reader, responsive, and authenticated finance/CSV/currency flows remain unverified. PR #60 remains draft.
- No database schema, RLS/grants, Auth setting, financial record, provider secret, or separate repository was changed.

## PR #52 current-main reconciliation — 2026-10-30 13:10 Asia/Manila

- Code/test head before reconciliation: `78b776497c8125f1637b2fb601965c1cc94e9b03`.
- Exact-head Actions run [40999382232](https://github.com/nasrinaiv0/movo/actions/runs/40999382232) passed **18 suites / 101 tests**, TypeScript typecheck, production-only npm audit (**0 production vulnerabilities**), and production build.
- Exact-head preview [dpl_76bUJdnfATaWSKRof8z33HKyZXzu](https://vercel.com/nasrin-ai/movo/76bUJdnfATaWSKRof8z33HKyZXzu) is READY; root returned HTTP 200.
- Chart formatting and data validation preserve currency-specific labels and summaries, validate values before rendering, and avoid combining unlike currencies without an exchange rate.
- This main reconciliation is documentation-only. Chart values/provenance still require verification against authenticated, authorized financial records; keep draft until that end-to-end check passes.
- No database schema, RLS/grants, Auth setting, financial record, provider secret, or other repository was changed.

## Phone automation sources and cross-source dedup — 2026-11-02 Asia/Manila
- **Found:** production `transactions_source_check` (verified read-only) rejects `applepay`/`googlepay`/`bank`, so every source-aware automation insert from PR #123's function failed; production holds 0 automation transactions. Request dedup was per device key and per source only, so Apple Pay + bank alert (or two devices) logged the same purchase twice. The in-app link path saved everything as `notification`.
- **Changed:** migration `20261102010000_automation_sources_and_cross_source_dedup.sql` (wider source allowlist incl. `siri_shortcut`/`android_assistant`, event `source`/`outcome`, `log_automation_transaction_v2` with cross-source matching and per-user lock); `api/log.js` (v2, income, currency, category, Siri/Android `text` parsing via `api/_lib/voice.js`, safe error mapping, rollout fallback); client keeps real sources (`src/lib/transactionSources.js`, `financeRepository.js`, `App.js`); Siri voice prompt; 83 more institutions with curated favicon domains.
- **Verified:** Jest 318/318; `tsc`; strict build; `supabase/tests/automation_dedup.test.sql` plus the existing SQL tests on a local Postgres 16 copy of all migrations (bug reproduced before the migration; mutation of the dedup rule makes the test fail).
- **Not done:** migration not applied to production (needs owner confirmation); no physical iPhone/Android test; Android relies on third-party automation apps (no native app/App Actions).


## Unified MOVO automation prompts — 2026-11-03

- Branch: `feat/unified-automation-shortcut-prompts`.
- Added interactive and hands-free bank notification recipe variants; interactive Siri confirmation variant; retained Apple Pay automatic/interactive recipes.
- Added prompt safety requirements for server-confirmed success, non-financial notification filtering, no fabricated transaction details, and no POST on Skip.
- Added regression tests for the new recipe variants and updated Siri progress documentation.
- Pending: exact-head CI/typecheck/build, review of the shared-preference wiring, actual iPhone trigger-variable validation and While You Were Away end-to-end test. No Supabase migration, production data change, deployment or merge performed.


## Crypto portfolio implementation — 2026-11-04 Asia/Manila

- Branch: `feat/live-fx-crypto-markets` (existing PR #177).
- Added manual holding records with asset, quantity, quote currency, acquisition date and optional average acquisition price. Supports separate position records, edit and remove.
- Added responsive portfolio view matching MOVO's existing card surfaces, accent tokens, rounded controls, muted labels, tab switcher and compact position rows. Portfolio summary shows total value, cost basis and unrealized P/L only when inputs and provider prices support a valid same-quote calculation.
- Holdings are persisted under `cryptoHoldings` in MOVO preferences and merged by stable ID across local/signed-in preference copies. They are not written to cash accounts, transactions, income or expenses. No Supabase migration/RLS change is required for this preference-backed implementation.
- Added validation/valuation helper and unit tests for invalid quantities/costs, quote mismatch, missing market prices, unknown cost basis and ID upsert.
- No implicit FX conversion is performed. Portfolio values are reference estimates, not exchange execution quotes. Exchange/wallet integrations, fees, realized P/L and custody/trading remain out of scope.
- Validation on the new head is pending GitHub Actions; live Vercel preview and device smoke testing are still required.


## Crypto portfolio implementation — 2026-11-04

- Added manual crypto holding records with validated asset IDs, positive quantities, optional non-negative average acquisition price, quote currency, and stable IDs. Added edit/remove and portfolio valuation/unrealized P/L helpers with regression tests.
- Added a Market / Portfolio switch, premium responsive overview and holdings cards, add/edit form, empty state, and explicit data/cash-separation disclosures. Portfolio values use only matching quote-currency market prices; missing or incompatible prices and unknown cost basis are shown as unavailable rather than estimated.
- Added `cryptoHoldings` to preference defaults and ID-based preference merging so holdings persist across signed-in preference sync and local-only use. No Supabase migration or new financial-account/transaction rows are used; crypto remains outside cash, income, expense and net-worth accounting totals.
- Exact-head CI [41745638862](https://github.com/nasrinaiv0/movo/actions/runs/41745638862) failed at translation catalogue coverage because the new accessible tab label “Crypto sections” was not in the English-first exclusion set. Production audit (0), typecheck passed; test/build stages were skipped by fail-fast. Added the missing label to `scripts/i18n-extract.js` in commit 8de5520. Re-run exact-head CI is pending.
- Vercel preview remains unverified: the prior Vercel commit status was canceled by an ignored build step; do not treat this as a successful deployment. Keep PR #177 open and do not merge until exact-head CI and a real preview smoke test pass.


2026-11-04 — Crypto API routing fix: `src/lib/crypto.js` now uses the shared `apiUrl()` helper. This is important for the Capacitor iOS app, where a relative `/api/crypto` URL would resolve against the bundled `capacitor://localhost` origin rather than MOVO production. Commit `5583368`. The market still requires `COINPAPRIKA_API_KEY` configured in Vercel; verify the production endpoint and preview after that server-side setting is present.


## Crypto market provider outage follow-up — 2026-11-04
- Confirmed PR #179 is merged; native iOS market requests now route through the production MOVO API.
- The production proxy intentionally returns HTTP 503 when `COINPAPRIKA_API_KEY` is absent. It uses CoinPaprika's paid REST host and does not silently fall back to the keyless personal-use endpoint.
- Follow-up adds actionable, non-secret configuration guidance and regression coverage for missing credentials, paid-host selection, server-only Authorization handling, provider rate limits, and invalid actions.
- **External release gate:** configure the licensed CoinPaprika credential as Vercel's server-only `COINPAPRIKA_API_KEY` for the MOVO production project and redeploy. Do not use the free personal-use endpoint for MOVO's commercial/customer-facing market display. No credential was added to source control.
- Live production response and physical iOS verification remain pending; automated CI alone is not proof that the market feed is live.

## 2026-11-06 — Sandbox recovery, financial accuracy and adaptive UI

- Recovered unpushed sandbox commit `7ab3ad7` onto current main `a1c6fd9`; preserved commercial-readiness changes.
- Fixed shared bank/debit ledgers, posted transaction filtering, credit payment duplication, separate estimated interest, cross-currency plan allocation totals and cent-safe sums. Monetary labels always display two decimal places, including summaries and Cryptocurrency.
- Added Pay/Edit/Delete loan actions; deletion archives the obligation and preserves recorded payments/account balances.
- Compacted reminder, Financial Planning and Cryptocurrency layouts; removed duplicate watchlist; made header buttons 45px circles and action/filter labels monochrome with theme-aware contrast.
- Validation in Vercel Sandbox: actual React component fixtures with synthetic data, 36 screen/width/theme combinations (320/390/430px, light/dark, green/orange); no page/dialog overflow; header dimensions checked; screenshots reviewed. Store-table SQL privilege assertions passed in isolated PostgreSQL 18. Full production build and exact head test results are recorded in the PR.
- Store checkout remains disabled until credentials, database migration and signed-device purchase/refund/restore tests are complete. Native store tests use mocked SDK responses; no customer payment was made. New release copy currently has English fallbacks pending native-language review.
- PR175 was rechecked: closed without merging on 5 November; its historical audit follow-up remains documented. No other open PR was returned at publication time. No production database data was modified.


## 2026-11-06 — Production accounting and commercial blocker remediation
- Branch fix/release-accounting-security-20261106, base main 703f31f. Release NOT CLEARED.
- Fixed truncated account ledger/posting/activity fetches, pending versus posted balance treatment, missing exchange-rate behavior, and non-finite currency formatting.
- Added public Terms and Privacy standalone HTML and Vercel routes; existing account deletion page retained. Legal review required before store publication.
- Applied additive store entitlement persistence migration to live Supabase with RLS and minimal grants; store billing remains disabled pending official test purchases and server credentials.
- Required change documentation per code-containing commit: update this file plus docs/engineering/updates/ dated record. GitHub CI enforces this, template updated.
- Vercel Sandbox 619/619 initial full tests, 110 suites, typecheck, build, production-only dependency audit successful; final PR head to be reverified.
- Remaining blockers: actual Apple/Google billing sandbox verification and native signed builds, permission/tenancy security testing, snapshot-consistent finance projections, booked FX policy, legal approval.
- Detailed evidence/rollback: docs/engineering/updates/2026-11-06-financial-commercial-remediation.md

- Policy expansion: canonical English Terms/Privacy supplements shared with static pages and in-app view, November 6 effective date, sync regression tests; reviewed legal translation/operator disclosure remains a release gate.

- Legal navigation regression expectation updated for November 6 policy date; tested as part of the same code/documentation commit.

- CI dependency follow-up (PR #226): the lockfile generated under npm 11 was rejected by the GitHub runner npm 10 because of an npm-version-specific optional yaml peer dependency. Pinned npm 11.19.1 for the CI install to match the validated lockfile; no dependency/lockfile change or financial-data write.

- PR #226 exact-head CI caught a missing in-app Legal screen change in the initial Git tree; restored src/screens/Legal.js (November 6 effective date and canonical supplements) in the same commit as this update and the dated engineering note. Retest before merging.


## PR #225 — Wallet/Transactions adaptive icons, compact summary and billing-cycle dues (2026-11-06)
- Base: refreshed to main 9c423c71. Scope: Wallet edit and Transactions quick-action SVGs use adaptive accent ink; compact Total Spent card aligns comparison with month axis.
- Bills/Financial Planning: overdue unpaid obligations plus one current billing cycle per bill; future periods are not counted as currently due; duplicate occurrences do not inflate totals. No ledger data is changed.
- Regressions: cycle/deduplication/cents and icon rendering tests, plus all 11 locale outputs. Source documentation: docs/engineering/2026-11-06-wallet-transactions-compact-summary.md.
- Validation: initial Vercel Sandbox 108 suites / 618 tests, typecheck, production build passed; deployment/preview requires separate verification. PR remains open.


## PR #225 — Mascot bubble text-link border follow-up (2026-11-06)
- In the Home header, exempt only `Change mascot` (`.ram-bubble-link`) from MOVO's global 0.25px button hairline; preserve accent color, callback, keyboard focus and card panels.
- Added `RamMascot.test.js` regression and updated the detailed engineering documentation alongside this code change.
- Vercel Sandbox: 108 suites / 619 tests, typecheck and build passed before rebasing. Live PR CI/preview must verify the rebased revision.


## PR #225 — Empty-only record surfaces across MOVO (2026-11-06)
- Removed decorative horizontal background/border/shadow on **empty-only** record lists: Scheduled payments/transfers, overdue obligations, reminders, Cashback lists and other empty-single-paragraph cards.
- CSS limits selection to direct empty children or empty categories; populated cards, buttons, charts and onboarding CTAs retain their styling. Truly empty list cards render no blank capsule. No changes to financial calculations or storage.
- Regression test: `EmptyRecordSurfaces.test.js`; full Vercel Sandbox 109 suites / 622 tests plus TypeScript check and production build passed. Rebased exact-head CI and preview validation remain the merge gates.


## PR #225 — Consistent headers, legal spacing and Vercel-configured social profiles (2026-11-06)
- Root and back-navigation headers use 10px upper/lower internal padding with 10px bottom separation. Home mascot/header row is more compact while retaining 45px actions and safe-area spacing.
- Terms, Privacy and Help Center share 14px section gaps, including canonical supplemental policy sections; adjusted sticky fade and bottom scroll clearance for fixed navigation.
- Added a compact social logo row after each of those pages, shown only for valid links from Vercel server environment variables through \`/api/social-links\`. No fake profiles or client-side embedded links.
- Changed files, new security/API and rendering tests, translations and documentation are committed together with a dated engineering update, as required by MOVO CI. No finance/ledger or policy wording changes.
- Sandbox tests and GitHub exact-head CI required before merging. Vercel preview can be canceled by ignored-build setting and must not be assumed verified.

- Social-env deployment clarification: setting or editing MOVO social profile URLs in Vercel Project Settings requires a new deployment, because previously deployed functions retain their old environment. Links remain hidden until a valid URL is present in the running deployment. Cached public profile output may take up to five minutes to refresh.


## PR #225 — Equal header button insets and responsive action groups (2026-11-06)
- Home Search/Bell/Settings capsule and the shared root-screen utility capsule now use symmetric 5px interior padding, 4px inter-button gaps and 45px circles with centered 22px icons. This preserves theme-specific icon colors, notifications dots and selection backgrounds.
- Separately grouped Plus controls stay outside their utility capsule with 8px header spacing. On screens narrower than 360px, the Home action pill moves to its own right-aligned grid row rather than clipping the greeting or shrinking 45px hit targets.
- Additional regression coverage in src/components/HeaderButtonSpacing.test.js checks equal geometry, responsive grid and real button callbacks. No financial, legal or social-link runtime calculations change.
- Previous Vercel env redeployment documentation correction and this change are documented in dated notes and verified against the exact PR head.


## PR #225 — Chat status, solid More icon, and edge-to-edge Google favicons (2026-11-06)
- Removed chat status pill and green badge background, leaving only the animated NasrinAI dot mark in adaptive accent and accessible progress text.
- Replaced outlined More dots with three solid currentColor dots.
- Eliminated CSS padding/percentage insets from Google S2 fetched favicons, scoped to true images and matching catalog wrapper; restored full logo area in account, transaction, subscriptions, crypto and stocks lists while leaving other images intact.
- New ChatMoreFavicons.test.js regression coverage. Engineering update: docs/engineering/updates/2026-11-06-pr225-chat-more-favicons.md. Require full GitHub CI and sandbox build at this commit before merging.


## PR #228 — Borderless controls across all MOVO screens (2026-11-07)
- Eliminated visual borders and faux inset-shadow outlines on buttons, tabs, calendar days, clickable rows, action links, header controls and bottom navigation in light and dark appearances.
- Corrected the global `border-width: var(--hair) !important` selector to exclude controls and their pseudo-elements. The final control policy outranks legacy high-specificity button border declarations; structural card/panel/field boundaries and keyboard focus-visible outlines are preserved.
- Vercel Sandbox verification: 117 suites / 656 tests passing, TypeScript check and production React build successful; headless Chromium computed-style audits found zero button-border violations on Home (both themes), Wallet, Transactions, Menu, Subscriptions and its tabs, Cashback and Add form, Financial Planning, Limits and transaction search. Focus indicator remains 2px. No browser page errors on main navigation.
- Implementation, automated regression checks, this PR progress entry, and `docs/engineering/updates/2026-11-07-borderless-controls.md` are included in the same commit to satisfy per-commit documentation gates.
- Keep independent security PR #227 unchanged. Merge only after exact-head GitHub CI and deployment checks succeed.


## Header 0.5px padding and back navigation — 2026-11-07
- On latest merged main, use 0.5px internal padding for header buttons without changing the established 45px touch targets, 22px icons, utility group spacing, colors or states.
- Cashback and Scheduled (entered from Menu) gain an optional Back button returning to Menu, while retaining original large titles and all actions, including Scheduled Plus. At narrow widths (<360px), only these pages' header utilities wrap to a second row.
- Broad MOVO button border removal is already in main. Preserve CSS icon pseudo-element borders needed to draw indicators while removing decorative shadows.
- Added navigation, responsive CSS, exact padding and icon safety tests; a dated engineering update accompanies this single code commit.


## PR #229 — Unified Settings icon across MOVO (2026-11-07)
- Profile header, Profile Financial Settings row and sidebar now use the same solid Settings gear already shown on Home and shared headers.
- Per-context SVG sizes stay unchanged (Home 24px, shared header 23px, Profile header 19px, menu 20px, sidebar 22px). Theme-adaptive currentColor, 45px touch targets, 0.5px header padding and borderless controls are preserved.
- The legacy gear icon name aliases to canonical gearSolid in the shared Icon component to prevent a second design recurring. Other icons such as shield and sliders remain distinct.
- New SettingsIconConsistency.test.js covers matching SVG artwork, click routing and existing size contracts. Dated engineering documentation accompanies this commit.


## PR #229 — Adaptive Financial Planning filters, 10px headers and scrolling mascot (2026-11-07)
- Shared filter buttons now show the application's main foreground color when unselected; selected chips use contrast-safe white text on the light-mode dark sliding pill, or dark text on the dark-mode white pill. Preserve button sizes and tap behavior.
- Standardized all direct root/sub/Home/Wallet/Transactions/Menu headers at exactly 10px top/bottom internal padding and 10px lower separation. Preserve the iPhone safe-area inset on screen, existing icon sizes and 0.5px button interior padding.
- Home ram avatar slot compacted from 80px to 68px (60px on narrow phones). Animated artwork scales to 88% on scroll, photo mascot to 90%, while retaining the existing interaction target; reduced-motion disables transitions.
- Added AdaptiveFilterHeaderMascot.test.js with CSS cascade, real tab-click, scroll integration, responsive and accessibility checks. Dated engineering documentation included. No financial/data logic changes.


## PR #229 — Transactions filters spacing (2026-11-07)
- Standardized Transactions type filters and billing selector onto one aligned row, with consistent gaps, no negative inherited margins, and clear 16px separation beneath the row.
- Date / Amount / From-To / Account sort chips use equal-width 3- or 4-column layout, 8px gaps (6px narrow), and 16px of clear separation above transaction cards/date headings. No more active chip touching the card.
- Narrow <=390px spacing retains click targets, accessible labels and no overlaps. Preserved existing theme, colors, selection indicator, filter/sort logic and all other pages.
- Added TransactionFilterSpacing.test.js plus a dated engineering record in this same code commit. Gate on Vercel Sandbox full CI/build and exact-head GitHub CI before merging.


## PR #229 — Compact Wallet card actions and enlarged icons (2026-11-07)
- For View Details / Add amount / Limits / More beneath the selected card, decrease vertical bar padding from 14px to 8px, enlarge each icon from 20px to 26px and reduce icon/label gap from 7px to 5px. Keep the 4-column arrangement, horizontal padding, 11px labels and 44px minimum touch target.
- No changes to click actions, labels, card boundaries, outline-free button styling, themes or financial functionality. Added WalletCardActionSpacing.test.js and dated engineering record. Require Vercel Sandbox test/build and GitHub CI before merging.


## PR #229 — Financial Planning: Collect, Edit and Delete in Owed to you (2026-11-07)
- Each receivable now uses the Loans & Debts three-action card, preserving compact layout and icons. Collect reuses the existing record_receivable_event SQL RPC (account- and owner-validated) and is disabled on settled or fully collected records.
- Edit updates metadata only, leaving principal, currency, outstanding balances, account links and event history intact. Delete presents a confirmation and soft-archives the receivable without erasing collections or changing cash balances.
- Owner-scoping, date validation, archive filtering and real UI callbacks have targeted regression tests. Internationalized UI copy is available in all 11 languages.
- Detailed same-commit documentation: docs/engineering/updates/2026-11-07-pr229-receivable-actions.md. Existing Wallet four-action compact strip was committed already in a4a7a3e and is preserved here.
- Require full Vercel Sandbox tests/build, GitHub exact-head CI and live mobile visual review before merge.

## Transactions sort filter side-fade correction (2026-11-07)
- Screenshot defect: the Date/Amount/Account sort buttons fade at the left and right edges due to the global `.chip-row` scroller mask.
- Transactions sorting uses a fixed non-scrollable grid, so override only its mask to `none` (including WebKit); remove only the sort indicator's box shadow.
- Preserve active pill appearance, gaps, 44px targets, arrow-free labels, sorting callbacks and the horizontal fades of genuinely scrolling rows. No change to financial records, auth or calculations.
- Includes a focused regression test and the engineering record `docs/engineering/updates/2026-11-07-transactions-sort-edge-shadows.md`. Require Vercel Sandbox checks and exact-head GitHub CI before merging.
- Verification: focused Sandbox tests 18/18, full test suites 124/124 and 694/694 tests, TypeScript and optimized build passing. Chromium mobile-width computed-style checks confirmed both masks and indicator shadow are `none` in light and dark appearance; three options and 44px target intact.

## Transactions and Wallet — exactly 40px filter heights (2026-11-07, PR #232 follow-up)
- Align Transactions type/date-sort/account-sort filters and billing-cycle select to 40px, Wallet category filters and Wallet sort/layout selectors to 40px. Preserve all current horizontal spacing, responsive widths, selected-pill animation, semantic button labels, and existing side-shadow removal in PR #232.
- Only filter controls are targeted; header actions and unrelated cards/navigation remain unchanged.
- Added `TransactionWalletFilterHeight.test.js`, updated existing Transactions filter spacing / shadow regression expectations and extended dated engineering docs in the same commit. Vercel Sandbox and exact-head GitHub CI required before merge.
- Follow-up final verification: isolated Vercel Sandbox 704/704 tests in 125 suites, TypeScript and build passed. Browser verified 36 40px controls per mobile width across light/dark at 320/390/430px; exact-head GitHub CI remains a separate merge gate.

## Adaptive summary-card accent contrast (2026-11-07)
- Correct five screenshot-referenced surfaces: Home Total Balance, Transactions Total Spent / billing cycle graph, Financial Planning Net worth, Cashback tracked, and Monthly subscriptions.
- Reuse the existing WCAG black/white `--on-accent` algorithm for all summary-card text and SVG/bar graph colors; use subtle matching translucent chart backgrounds instead of fixed white. Accent fill and existing component layouts are preserved.
- Scope: stylesheet + dedicated regression tests + dated engineering record. No financial data, API, account, layout, theme preference or user interaction changes.
- Merge gate: full Vercel Sandbox install, test/typecheck/build, followed by same-commit PR CI and visual review. See docs/engineering/updates/2026-11-07-adaptive-financial-summary-contrast.md.
- Verification: Vercel Sandbox targeted 20/20; full prebuild 701/701 tests / 124 suites; TypeScript and optimized build passed; 28/28 computed-style browser assertions on real built app for pastel pink and dark charcoal passed. PR checks and authenticated human visual review remain merge gates.

### 2026-11-08 — Import & Export preview/save PR
- Compact Upload file, no-file status, JSON backup preview and explicit Save records. CSV selection routes to existing CSV importer. Restore add-only and tested; not a complete restoration of all backup tables.
- See docs/engineering/updates/2026-11-08-import-export-preview-commit.md.

- 2026-11-08 — PR #240 additional import accounting safeguards: fail closed for duplicate account labels, incompatible account type/currency, dangling account/transfer references, and incomplete transaction rows; regression tests and Vercel Sandbox evidence in dated engineering update.

- 2026-11-08 — PR #240 CSV hardening: duplicate matching wallet account labels now require user correction; no accidental first-result posting. Added 11-language error message, focused tests, audit notes.

### 2026-11-08 — Cloud/offline and profile email privacy PR
- Implemented account-scoped local browser workspace, complete-snapshot-gated cloud toggle, offline transaction support after verified Pro expiry, and masked email in Profile.
- Production release blocked pending full offline record coverage, signed device and two-account security tests; see docs/security/2026-11-08-offline-cloud-handoff-and-email-masking.md.


### 2026-11-08 — Offline storage mode pauses plan-access features
- Proposed policy: Cloud Sync off -> local features only; Pro/Pro+ effective access paused while existing verified subscription/billing remain unaffected.
- Cloud Sync on -> verified, active, unexpired entitlements only; UI premium content and cloud sync writes are mode-gated.
- UI explains offline mode and provides Cloud Sync settings action without encouraging duplicate plan purchases.
- No cloud finance snapshot migration, backend plan change or production database mutation; blocked high-risk migration remains PR #241.
- Evidence: docs/engineering/updates/2026-11-08-local-mode-plan-access-policy.md; Vercel Sandbox + GitHub exact-head CI required.

### 2026-11-08 — Local CSV/JSON import: Discard or Save with confirmations
- Uploaded files are preview-only until an explicit, separate confirmation. Discard removes preview only; Save commits validated local accounts and transactions.
- No imported file is written to Supabase; active cloud mode blocks committing and prompts local-mode switch.
- Wallet, Home and Transactions refresh from successfully saved device records. Invalid, duplicate, unsupported or stale records do not silently overwrite financial data.
- Cloud plan access is paused in local mode without affecting store subscription. PR #241 full offline migration remains blocked.
- Reference: docs/engineering/updates/2026-11-08-local-import-discard-save-confirmation.md.

### 2026-11-08 — Translation-catalog coverage fix for PR #245
- Added 67 missing English interface keys to the 11-language catalog, including local/cloud mode, save/discard confirmations and sync safeguards. Translations are machine-assisted and should be professionally reviewed before localization sign-off.
- Verified `src/lib/i18n.test.js` in isolated Vercel Sandbox: 2/2 tests passing, 2,540 catalog strings and complete placeholder coverage; existing English source keys unchanged.
- No finance code or subscription records changed in this CI-only patch. Full GitHub Phase 1 CI and signed-device audit are still release gates.

### 2026-11-08 — Draft offline/online reconciliation foundation (NOT commercial release-ready)
- Owner-scoped v2 device journal with last-confirmed snapshot; local offline writes marked pending, cloud download mirrored into device before switch.
- Three-way baseline/local/cloud reconciliation, no clock-based last-write-wins, no silent deletion/resurrection or guest-to-account import.
- Safe subset: account create/CAS-update and new simple transaction upload with owner/RLS checks, UUID/cents validation and cloud refetch; rollback preserves local unsynced queue.
- Settings sync status and online-event reconnect retries; Pro/Pro+ still paused in offline local mode without cancelling store subscription.
- JSON/CSV and onboarding uploads require Save/Discard confirmation and local-only import; unsupported backed-up groups remain preview-only.
- Not complete: linked transaction revisions/reversals, loans, obligations, allocations, schedules, attachments, owner-pref isolation, encrypted device storage, multi-device concurrency and real signed-device QA. Do not merge as full offline support.
- Engineering evidence: docs/engineering/updates/2026-11-08-offline-online-reconciliation-design.md; GitHub exact-head CI and Vercel Sandbox QA required.

### 2026-11-08 — Interrupted-upload reconciliation idempotency
- Hardened three-way sync to recognize an already committed offline row after the network response was lost, comparing stable financial fields rather than remote-created timestamps/default values.
- Same-ID rows with different amount, account, transfer, merchant or meaningful transaction data remain unresolved conflicts. No duplicate second upload and no silent last-write-wins.
- Updated transport verification to use the same audited financial-field comparison as the pure planner; CI regression adds 3 retry/corruption cases.
- Exact candidate Vercel Sandbox tree tests: 55/55 in 8 suites plus TypeScript passed; production merge remains blocked by broader accounting/multi-device/signed-device privacy requirements.
- Engineering evidence: docs/engineering/updates/2026-11-08-offline-online-reconciliation-design.md.


### 2026-11-09 — PR #246 cloud/offline guard (still draft)
Required financial cloud reads now fail closed rather than silently returning empty records, and Cloud Sync off requires a last-confirmed matching device workspace. See `docs/engineering/updates/2026-11-09-offline-snapshot-read-and-handoff-guard.md`. Incomplete domain coverage, non-atomic cloud snapshots and signed-device verification remain blockers; no production release authorized.


### 2026-11-09 — PR #246 translation catalog release gate
Regenerated 11 language catalogs (2,543 keys each) and catalog version with exact byte-for-byte SHA parity to Vercel Sandbox. Restores release-gate coverage for the three sync reconnect strings and the 67 inherited local-mode/import strings. See the 2026-11-09 sync guard evidence; full new-head CI and device QA remain mandatory.


### 2026-11-09 — PR #245 localization CI repair
Regenerated all 11 locale catalogs + version from branch source (2,540 strings). Focused i18n (2) and import/plan/walkthrough (15) tests pass in Vercel Sandbox. Exact new-head CI and device verification still required; PR #246 remains separate draft synchronization work. See `docs/engineering/updates/2026-11-09-pr245-localization-gate.md`.

### 2026-11-09 — PR #246 network-loss guard
A second network-offline transition now checks the last confirmed owner-scoped baseline rather than overwriting it with UI rows. Dirty local journals restore device mode; stale views show the last confirmed local copy; missing/unsafe caches block local editing and pause paid UI. Focused regression and exact-head verification required; release remains blocked.

**2026-11-09 — PR #248 Apple SDK & native simulator validation:** Consolidated Siri App Intents expense-review flow, native Keychain bridge, authenticated cloud-load guard, verified StoreKit/Google Play environment names, and simulator-install/deep-link test workflow. Native Xcode Simulator compile succeeded on run #119; additional simulator smoke test pending exact-head result. The simulator stage was time-bounded to fail diagnostically instead of hang. The PR remains draft until true native smoke, full CI, and real-device verification are green. Details: `docs/engineering/updates/2026-11-09-apple-sdk-native-build-ci.md` and `docs/APPLE_SDK_INTEGRATION.md`.


**2026-11-09 simulator CI correction:** Exact-head iOS run #122 failed in the macOS runner's first-boot CoreSimulator migration (`com.apple.locationd.migrator`), with `simctl bootstatus` exceeding 180 seconds; all Xcode compilation had passed. The workflow allows a bounded 600-second boot initialization for cold runners, retaining installation/launch timeouts and a mandatory smoke-test pass. See the engineering update; exact-head rerun remains required.

## 2026-11-06 — Native session vault and mobile safety PR
- Branch security/native-auth-backup-privacy-20261106, base main 9c423c7. Open UI PR #225 preserved. Release NOT CERTIFIED.
- Native Supabase sessions migrated to iOS Keychain/AndroidKeyStore vaults; legacy session and PKCE verifier copies purged only after successful secure storage.
- Android backup and device transfer disabled, privacy screenshots restricted, iOS switcher snapshot cover; Android R8 and native CI added. Public security.txt.
- Source and tests: 17 focused tests passed initially. Require full suite, production build and Apple/Android simulator compile before merging. Signed physical device tests remain mandatory for app stores.
- Not addressed: web cookie sessions, passwordless MFA/passkeys, verified deep links, app attestation, 12 privileged-RPC cross-user tests, login alerts, active device controls and comprehensive rate limiting.
- Detailed dated update: docs/engineering/updates/2026-11-06-native-session-hardening.md. Full 22-control matrix: docs/security/SECURITY_HARDENING_22_POINT_2026-11-06.md.

- PR #227 Android CI first attempt stopped before compilation in android-actions/setup-android@v3 because sdkmanager rejected obsolete package 'tools'. Removed the action and used the preinstalled ubuntu-latest SDK command-line tools with explicit API 36 packages. Native compilation still needs a passing rerun; this follow-up modifies the workflow and same-commit docs only.

- PR #227 second Android CI attempt found sdkmanager present under the hosted Android SDK but absent from PATH. The workflow now discovers its absolute executable location under ANDROID_HOME/cmdline-tools, rather than assuming PATH. Compiling the app remains a separate verification step.

- PR #227 follow-up: automation device secret had remained embedded in native general preferences; now stored only in the platform vault after write-first migration, scrubbed from mirrored preferences, and safely rotated before old-token revocation. Native/browser behavior covered by additional unit and source contract tests. Native CI and physical-device validation still required.

### 2026-11-09 — PR #255 iOS simulator smoke reliability (strict)
- Run #42546337168: native simulator Xcode build passed, while CoreSimulator first-boot migrations took 7+ minutes and `simctl launch` timed out after 90 s; the smoke test, not the compilation, failed.
- iOS CI now exercises a separately unit-tested launch script: deterministic iPhone choice, bounded 600 s cold boot, 180 s install/launch, exactly one retry **only** for launch timeouts after cold boot, and mandatory deep-link plus screenshot success. Nonzero launch errors and repeat timeouts remain hard failures.
- Local/Vercel Sandbox Python unit tests are NOT evidence of native simulator success. Await exact-head GitHub macOS runner smoke and full regression gate before merging. See `docs/engineering/updates/2026-11-09-pr255-ios-simulator-launch.md`.

## 2026-11-09 — Mobile subscription integrity

Implemented production-only Apple/Google verification, pinned Apple trust root, strict OIDC/schema validation, fenced atomic state transitions, revocation tombstones, event deduplication, predecessor cleanup and encrypted server-acknowledgment retries. Includes a source-level hostile audit, deployable SQL, setup changes and regression tests. Vercel Sandbox: integrated build/typecheck and 170 suites/1,036 tests passed; final focused 33 tests passed; PostgreSQL behavioral and separate-connection concurrency tests passed; mobile browser render smoke passed. Migration and three new server settings are required before deployment; no production migration performed. See `docs/engineering/updates/2026-11-09-mobile-iap-hostile-audit.md`.

- PR #260 integration with PR #258: 173 suites / 1,063 tests, typecheck and build passed in Vercel Sandbox. Atomic referral awards/refund reversals and points-to-Pro plan access passed PostgreSQL regressions. The GitHub source tree matches the tested Sandbox tree. No production changes.


## 2026-11-10 — Google Play Android OAuth release audit (PR #266)
- Registered restricted browser-resolvable Android `movo://auth-callback` and `movo://log` native intent filters to match existing Supabase PKCE and log handlers; no extra permissions or broad catch-all schemes.
- Added Android manifest deep-link and backup regression tests.
- Aligned historical store setup documentation with live Pro/Pro+ four-product catalogue, without changing checkout or subscriptions.
- Vercel Sandbox on unchanged production base SHA plus these files: 185 Jest suites / 1,123 tests passed, typecheck/optimized build passed; XML parser passed; production dependency advisory count zero. Browser smoke at phone and desktop widths: HTTP 200, no JS exceptions or horizontal overflow. This does not certify native Android device behavior.
- Full evidence and pending *NO-GO* gates: `docs/audits/2026-11-10-google-play-release-audit.md` and `docs/engineering/updates/2026-11-10-google-play-native-oauth-release-audit.md`.
- PR #264 signed AAB pipeline remains separately reviewed; cannot publish without signing secrets/real device testing. PR #261 hybrid sync remains draft. Production unchanged.


## 2026-11-12 — PR #275: Bank and linked-card transactions; e-wallet cards
- Bank Accounts → Account details now displays a read-only combined transaction history for the bank and all active explicitly linked debit and issuing-bank credit cards, with Bank-only and individual-card filters. A transaction involving both sides of the group appears once; each card's standalone history stays isolated. Transactions tab pages through full history at 50 rows per page.
- Wallet → Cards includes e-wallets in the existing carousel and My Cards pile while keeping their independent E-Wallets filter, type, balances, QR codes, and sync state. No database, accounting, or RLS migrations.
- Added source-isolation, transfer dedupe, per-card history, 65-row pagination, and filter tests. Added seven new UI labels translated in all 11 supported non-English languages.
- Initial GitHub suite: 195/196 suites passed; i18n key coverage was the one failure and has since been fixed; await exact-head verification. Vercel Sandbox returned HTTP 402 payment_required for create/resume: UI test blocked. Release stays unmerged. Details: docs/engineering/updates/2026-11-12-bank-card-activity-ewallet-cards.md.

- **2026-11-12 PR #275 CI infrastructure hardening:** GitHub's two-user PostgreSQL tenant-isolation workflow failed *before executing any SQL* because Ubuntu's apt mirror DNS failed during `postgresql-client` installation. Replaced network-dependent apt installs with short-lived, stdin-safe `psql`, `createdb`, and `dropdb` wrappers that execute the official PostgreSQL 18 client binaries inside the same disposable GitHub Actions service container (no host-mapped database port). The Python tenant-isolation tests remain unchanged and must still complete successfully. Source, shell invocation/STDIN forwarding validated before commit; rerun all required checks on the new exact head, verify preview and preserve NO-MERGE gate until all checks are green.
