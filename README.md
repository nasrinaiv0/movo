# MOVO

Build-tool security remediation and its remaining release gates are recorded in [the November 20 engineering update](docs/engineering/updates/2026-11-20-build-tool-security.md). This candidate does not change application structures or production dependencies.

MOVO is a financial-tracking web app prototype with a calm, iOS-inspired interface.

## UI redesign (mockup match)

The front end follows the supplied mobile mockups: floating bottom navigation with the NasrinAI orb, Home, Wallet (All / Cards / Bank Accounts / E-Wallets, card carousel, "Your Cards" and "Choose Theme" sheets), Transactions (All / Income / Expenses / Transfers, month picker, breakdown, day grouping, sort chips), Profile, Edit Profile, Settings, Appearance, Notifications (list, detail, settings), and Light / Dark / System / Blue / Purple / Orange / Custom themes with six accent colours.

- Sample data (`src/lib/demoData.js`) is shown until sign-in and is labelled as sample; comparison percentages in sample mode are fixed demo figures, real accounts get computed month-over-month changes.
- Merchant logos are neutral monogram tiles; no third-party brand artwork is bundled.
- Settings: Plan & Usage shows this account's real usage and store-verified Pro, Max, and Ultra entitlements. Native subscription billing is available only after matching App Store / Google Play products and server credentials are configured. App Lock sets a 4–6 digit passcode on this device (PBKDF2-SHA256 hash, never the passcode) with optional Face ID / Touch ID via WebAuthn; it re-locks after a minute in the background and does not encrypt records. "Forgot passcode" wipes Movo data on this device. Push alerts (renewals, limits, monthly report, money tips, new sign-ins, updates) are shown by this browser while Movo is open or installed; there is no server push and no email yet. Quiet hours hold device alerts. Auto Categorization picks a category from the description.
- NasrinAI chat: the composer is pinned just above the tab bar; Enter adds a new line and only the send button sends. A shortcut row opens Expense, Income, Transfer, Scan receipt, Budgets, Renewals, Transactions and Accounts, and answers Today / This month from this device's records (never sent to NasrinAI). Asking for a chart, graph, breakdown, trend, income vs expenses or a budget chart draws it from this device's records (`lib/chatCharts.js`), offline and on any plan. Chat logging also reads Filipino ("Bumili ako ng saging 20 pesos gamit ang savings account ko") and picks the named account.
- Duplicate guard (`lib/duplicates.js`): an entry with the same direction and amount, within a day, and a matching merchant (on the same or no named account) is treated as already logged. Chat shows "Already logged … Not added twice" with *Log anyway*; manual saves and receipt scans warn once (Save again to log anyway); bank / Apple Pay / Google Pay notification links are skipped with a notice. CSV import keeps its own fingerprint check.
- Logged moment: saving a transaction shows the Movo wallet mark with a drawn check (calm ease-out, reduced-motion aware).
- Adaptive interface (`lib/layout.js`): phones keep the bottom dock; tablets (≥768px) get an icon rail and wider content; desktops (≥1100px) get a labelled sidebar with Add transaction and Settings, a two-column dashboard and centred dialogs. Dual-screen phones and foldables that report two viewport segments split content into one column per screen, with the gap spanning the hinge. It switches automatically on resize or rotation.
- Elevation: three soft, neutral shadow levels (`--elev-1/2/3`) plus `--elev-card`; no tinted halos, and the card scroller leaves room so shadows fade out instead of clipping.
- Streak badges (`lib/streak.js`): a day counts when Movo is opened; 3, 7, 14, 30, 60, 100 and 365-day badges glow in their tier colour, stay earned after a reset, show a one-time ring and glint when unlocked, and sync with preferences (merged by latest day and best streak).
- Automatic logging setup: Settings → Set Up Phone Automation shows the exact iPhone Shortcuts steps for Apple Pay (log automatically, or ask Log / Skip) and Siri voice, with a copyable prompt for Describe a shortcut. The device key is masked on screen and only included in what is copied. Payments log to the bank account of the card's bank; a per-device default account covers names that match nothing.
- Sign-in is passwordless: Continue with Apple, Continue with Google, or a one-time code sent by email (the first code creates the account). Terms/Privacy acknowledgement is required first. Apple and the email code need Supabase dashboard settings (see `docs/NASRINAI_CHAT_INTEGRATION.md`).
- Cards follow the owner's card spec: landscape cards like a real debit/credit card (chip at the ISO contact position), portrait cards like the vertical BPI reference. Bank logos are curated Google favicons; anything without a logo shows the MOVO mark.
- Transaction categories follow `docs/TRANSACTION_CATEGORIES.md`: 12 compact categories for quick entry with an optional subcategory (22 detailed groups, 233 subcategories) or Needs review. Stored as stable ids (`transport:ride_hailing`); older labels map on read, custom text is kept. Receipts, chat, voice and automations share one rule set that asks for review instead of guessing when signals disagree.
- Streak badges show the MOVO mark, with Bronze (3/7/14 days), Silver (30/60), Gold (100) and Platinum (365) finishes. Pro unlocks every badge up to Gold and Pro+ unlocks Platinum, whatever the streak.
- While you were away: on opening MOVO (or returning after 2+ minutes), a sheet lists what was logged since the last visit, grouped as Apple Pay, Google Pay, Automatic (bank alerts, Siri, Android assistant) and Manual, plus phone automations that could not be logged (no matching account, unclear amount, rate limit, server error). Those are kept server-side in `movo_automation_inbox` (owner-only RLS, migration `20261102020000`) and can be logged to a chosen account or dismissed.
- Every record belongs to an account: nothing is logged (chat, form, scan or automation) until an account or card exists.
- Reference IDs: scanned receipts and automation links record the reference / transaction / invoice / OR number and the time; details show "Date & time" and "Reference ID", and a matching reference marks a duplicate.
- Voice dictation: recognized speech stays in the composer for review; only Send submits it. NasrinAI transcription has a server-only OpenRouter STT fallback using the existing key, without financial records or user identifiers. Errors, interruptions and leaving the page release the microphone; a bounded request deadline prevents stuck Listening. Normal Stop finishes the last clip, including quiet iPhone recordings. Common money questions (spending, income, balance, top categories, limits, renewals, latest record) are answered from this device (`lib/localAnswer.js`); other questions go to NasrinAI.
- Wallet cards (`components/CardDeck.js`): in landscape format the chosen card sits in front of a stack and the others peek below as strips (tap or swipe to bring one forward); in portrait format cards turn on a 3D cylinder as you swipe.
- Receipt scanner: take a photo or upload an image or PDF up to 15 MB. Choose AI analysis with per-receipt consent or basic text recognition on the device. Pick the paying account to convert a foreign total automatically, enter the statement amount if needed, and log directly. The transaction note keeps the original receipt total and the review shows the date and source of the estimate.
- **Liquid Glass** (Settings → Appearance): translucent, blurred surfaces on cards, nav bar, buttons and sheets. A *Glass clarity* slider runs from Frosted to Clear and can be switched off entirely. Nav bar and sheets keep a minimum opacity so text stays legible, and `prefers-reduced-transparency` falls back to near-solid surfaces.
- **Motion**: direction-aware screen transitions (push/pop/tab), staggered entrances, count-up balances, self-drawing donut/sparkline/bars, a sliding glass pill in the tab bar and a sliding selector in filter chips, spring bottom sheets with swipe-down dismiss, glass sticky headers on scroll. All motion is disabled when the device requests reduced motion.
- Buttons use 44 px touch targets, iOS-style press feedback, filled SF-style tab icons, and squircle icon tiles.
- Preferences are stored under `movo.preferences.v3` (v2 values are migrated).

## Current functional scope

### Implemented frontend behavior
- Responsive Home dashboard and five-item navigation.
- Exchange Rates screen (Menu → Exchange rates): multi-currency converter, searchable currency selector, tracked FX pairs, manual refresh, cached reference-rate timestamps, stale/fallback status and historical daily-rate charts (1W/1M/3M/1Y). FX requests send currency codes only; the upstream free feed is a reference-rate service, not a tick-by-tick executable quote.\n- Crypto market (Menu → Crypto market): provider-backed searchable market list, rank/price/24-hour change/market cap/volume, sort controls, local watchlist, coin detail and historical daily-price chart windows (24H/7D/30D/90D/1Y where the provider plan permits). Market data is delayed reference data, not trading quotes. Crypto watchlist and manual portfolio holdings stay in MOVO preferences. Portfolio supports quantity, acquisition date, optional average cost, market value and unrealized P/L when matching-quote provider prices are available; no implicit FX conversion is used. Crypto values never enter cash/income/expense totals.
- Balance visibility toggle that masks balances and transaction amounts.
- Income and expense totals are calculated from posted records; internal transfers affect account balances but never inflate income, expenses or net activity.
- Account balances derive from opening balances plus routed ledger entries. The Savings tile sums eligible non-cash account balances (excluding credit cards and cards whose debit/credit kind is unknown); it is distinct from monthly net cash flow.
- Week/month/year period selection and spending-category breakdown.
- Create, edit, and delete transaction records; create, edit, and archive tracked accounts.
- Record income, expenses, and transfers; transfer records do not move money between financial institutions.
- Search and filter transactions, review recent activity, and view calculated totals and category breakdowns.
- Import CSV statements through a local parsing and review step; export available records to CSV.
- Email/password and Google authentication paths, subject to deployment configuration and provider availability.
- Optional cloud account/transaction storage through the authenticated repository with Supabase Row Level Security (RLS); local-only mode remains browser-specific.
- Financial integrity hardening (migration `20261119222104`, pending deployment): transaction updates/deletes use owner-checked sync/reversal RPCs, linked payments cannot change posting status without reversal, and account-backed allocations count only posted transactions. Cloud reset reverses transaction effects atomically and verifies the expected owner. Apply the migration before deploying the updated reset client; see [validation and rollout](docs/engineering/updates/2026-11-19-finance-integrity-audit-fixes.md).
- **Profile → Friends** includes QR invites, opt-in username search, and recipient-approved friend requests. Open a connection from the Friends page to see the sections they approved. Each person can preview, replace or revoke their own shared summary for that connection. Profile photos sync privately to the signed-in account and update the profile and menu avatars. Settings → Appearance → Colour-coded icons turns the Menu and Profile icon colours on or off.
- Preferences follow the signed-in person: card styles, layouts, theme, accent, subscriptions, plans and custom sticker artwork are saved to `public.user_preferences` (owner-only RLS, migration `20261030160000_user_preferences.sql`, test `supabase/tests/user_preferences_isolation.test.sql`) and load on any device after sign-in. Local-only mode keeps them in this browser.
- NasrinAI chat answers from MOVO data only: the proxy never continues NasrinAI-side conversations (whose documents or memory could leak in), sends `context_scope: "movo"`, and passes recent turns from MOVO's own chat history.
- Wallet card actions: View Details, Add amount (Transfer into this account, or Manual top-up), Limits, More. A plus button beside the view toggle adds a card, bank, e-wallet or cash account.
- Movo brand mark (`components/MovoLogo.js`), app icons and a loading screen in `public/index.html` whose mark eases between the green and graphite colourways.
- No demo mode or sample data: MOVO starts empty. Setup runs in order, and the dashboard and bottom navigation stay locked until it is finished: a one-time narrated MOVO guide (screenshots of the real app with invented sample records: each feature stays sharp while the rest blurs, led by Aries, the welcoming mascot, with a clear female voice and translated captions; it covers Home, Wallet, logging, AI receipt scanning, NasrinAI, automatic logging, Transactions, Subscriptions, Menu, Settings and Pro), the walkthrough (sign in, sign up or this device only, then Home balance, Wallet, NasrinAI and Menu), the free month of Pro for first-time users, then accepting the Terms of Service and Privacy Policy. Everyone is asked again after either document changes (`src/lib/legalVersion.js`). Re-making the guide: `scripts/tutorial-guide/README.md`.
- Log transactions by chatting: type "Spent 250 on Grab", "Grab 250", "Salary 50000" or several lines in NasrinAI. Lines are parsed on the device (amount, currency, merchant, category, yesterday/today, account mentioned), saved like any record, and shown as a card with Undo. Works without signing in; questions still go to NasrinAI only after sign-in and consent.
- Menu tab (replaces Profile in the bottom nav) with Profile, Subscriptions, Plans and Limits.
- Subscription tracker: catalog of 120+ apps and services, including US and Philippine providers listed first for those regions, shown with each service's own logo downloaded once from its official website by `npm run brands` (`scripts/fetch-brand-logos.mjs`, validated, saved to `public/brands/` and served from MOVO's origin so the app never contacts these companies), falling back to Simple Icons marks (`src/lib/brandMarks.js`) and then initials under a trademark notice that MOVO is not affiliated with or advertising for them, or custom entries, weekly/monthly/quarterly/yearly cycles, upcoming list, renewal calendar and insights. Stored on this device only (`subscriptions` in preferences); MOVO reminds, it never charges or cancels anything. A renewal can be logged as an expense.
- NasrinAI daily briefing and money tips: rule-based summary (spending vs last month, top category, largest purchase, savings rate, renewals this week, budgets) and tips, computed on the device from the user's own records. Shown once a day on open (Settings toggle) and pinned at the top of Notifications to reopen anytime; nothing is sent to the AI unless the user opens the chat.
- Separate, explicit consent for sharing a limited user-scoped financial snapshot with NasrinAI. Production chat authentication still requires verification.
- Private friends through Profile. Share a single-use invite via a QR or HTTPS link, accept explicitly, and remove a connection from either account. Native sharing uses the platform share sheet.
- Terms of Service, Privacy Policy, Help Center, onboarding acknowledgement, and privacy-request contact links.
- Refer MOVO uses a personal QR and short code. New members earn 20 points after in-app verification and 100 after the first confirmed paid charge. When enabled, Android and web redeem 500 points for one month of Pro or 750 for one month of Pro+.
- Light/dark/system appearance, accent colors, balance visibility, and browser preferences.
- Accessible sheets with keyboard focus handling and Escape dismissal, plus automated UI tests and a production build gate.
- Baseline HTTP security headers on Vercel.

### Data and privacy boundaries
- First-launch records are clearly marked **Sample** and can be removed from the Appearance menu.
- Local-only records are stored in this browser's local storage and persist across reloads in the same browser profile. They are not encrypted by MOVO itself and do not sync to other devices. Clearing browser data can remove them.
- In cloud mode, account and transaction requests use the authenticated MOVO repository; access depends on the deployed Supabase configuration and database RLS policies. Do not assume cloud access is available until sign-in and owner-isolation checks have been verified in the target deployment.
- NasrinAI chat requires a signed-in cloud session and a separate, explicit consent step. The intended payload is the user's message plus a limited, user-scoped snapshot—not general database access. Production upstream authentication was returning HTTP 401 on 2026-10-29, so live chat must be treated as unverified until a successful authenticated request is confirmed.
- MOVO does not currently connect to banks, read private Apple Pay history, initiate payments, or control/block cards. Push and email notification delivery are not connected; in-app notifications are not an urgent-alert service.
- Displayed balances and totals are calculated from available records and are not verified bank balances or proof that money moved.
- CSV exports can contain sensitive financial information. Store and share exported files carefully; CSV import is parsed locally and reviewed before saving.

### Working with Claude Code
Project rules, commands, conventions and security boundaries for Claude Code live in [`CLAUDE.md`](CLAUDE.md).

### Local development
```sh
npm install
npm test -- --runInBand
npm run build
npm start
```

Production builds run the test suite before building. GitHub Actions also runs the test suite and build on feature-branch pushes and pull requests targeting `main`.

### Crypto market provider setup\n\nCrypto market data is proxied through `GET /api/crypto`; the provider key is never sent to the browser. Configure `COINPAPRIKA_API_KEY` as a Vercel server-side environment variable and use a CoinPaprika plan/licence that permits displaying market data inside MOVO. The keyless CoinPaprika tier is for personal exploration and is not licensed for redistribution in a customer-facing product. Without a configured licensed key, the screen shows a clear unavailable state and preserves the local watchlist. Provider responses are cached for three minutes and retain the upstream `last_updated` timestamp.\n\nThe first crypto phase includes market discovery, local watchlist, coin details and provider-supported history. Price alerts and manual portfolio holdings/valuation are implemented locally; no exchange connections, custody, private keys, deposits, withdrawals or trading are supported.\n\n## iOS app
The iOS app wraps this same code with Capacitor (`ios/`, `capacitor.config.json`, `src/lib/platform.js`); the website is unchanged. Builds run in the cloud, so no Mac is needed. See [docs/IOS_APP.md](docs/IOS_APP.md) for phases and prerequisites.

## Production readiness

See the [November 20 production audit and remediation matrix](docs/audits/2026-11-20-full-movo-product-audit.md) for the audited commit, evidence and implementation PRs. Public expansion and paid launch depend on accounting integrity, account isolation and deletion, signed-device sign-in and billing, and store acceptance. Use the latest branch, migration and deployment evidence before making release decisions.

## Icons

All icons share one smooth, rounded iOS-style set (`src/components/Icon.js`): round caps and joins, soft corner radii, filled variants for the active tab. The bottom dock is icon-only with a sliding capsule highlight, a hover capsule and a spring-scaled icon; every tappable icon elsewhere scales smoothly on hover and press.

## Card stickers

Wallet → Cards → **Card style** lets users dress each card with a sticker. The library (`src/lib/stickers.js`) generates 272 original, anime-inspired vector designs (17 motifs × 16 palettes, grouped into Shonen, Ninja & Samurai, Fantasy, Sci-fi, Night and Manga), so they stay razor sharp at any size. Bank logo, chip, card number, holder and balance sit in reserved zones with an automatic light/dark text colour. Users can also upload their own artwork (cropped at 1712×1080 for HD); uploads stay on the device. The choice is stored per card in preferences (`cardStyles`). The library contains no third-party characters or franchise artwork.

## Home ram mascot

Home shows Aries, MOVO’s soft cream ram with curled horns, fluffy wool, little arms and hooves, and a green scarf. The shared vector character (`src/components/AriesMascot.js`, artwork in `src/lib/ariesArt.js`) also welcomes people at sign-in, reacts to plan selection, accompanies bill reminders and savings goals, and guides the welcome tour and Help Center. Fourteen expressions are available in Home → tap Aries → Change mascot → Aries. The gallery is a preview: it never changes financial records or overrides spending moods. On Home, the existing spending thresholds (`src/lib/mascotMood.js`) still select happy, cheerful, disappointed or upset; the feet stay grounded on the balance card and tapping briefly waves and opens the existing message. Photo mascots and the saved `mascotStyle: 'ram'` preference remain compatible. Motion pauses off screen and in background tabs, respects live reduced-motion changes, and can be paused in the expression preview. Aries needs no WebGL, model download or external image service.

## Motion

Motion is calm by design: no device vibration, no overshooting "bounce" springs, no breathing or pulsing orb. Transitions use a single smooth ease-out curve.


## Financial Planning

The financial planning area tracks loans and debts, money owed to you, savings goals, and goal allocations. Accounting rules separate loan principal from interest, receivable collections from income, and goal reservations from actual assets. The migration in `supabase/migrations/20261031170235_obligations_receivables_goals.sql` has been applied to the Movo Supabase project. Cross-currency transfers and live database behavior remain subject to verification.
