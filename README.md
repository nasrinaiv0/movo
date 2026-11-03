# MOVO

MOVO is a financial-tracking web app prototype with a calm, iOS-inspired interface.

## UI redesign (mockup match)

The front end follows the supplied mobile mockups: floating bottom navigation with the NasrinAI orb, Home, Wallet (All / Cards / Bank Accounts / E-Wallets, card carousel, "Your Cards" and "Choose Theme" sheets), Transactions (All / Income / Expenses / Transfers, month picker, breakdown, day grouping, sort chips), Profile, Edit Profile, Settings, Appearance, Notifications (list, detail, settings), and Light / Dark / System / Blue / Purple / Orange / Custom themes with six accent colours.

- Sample data (`src/lib/demoData.js`) is shown until sign-in and is labelled as sample; comparison percentages in sample mode are fixed demo figures, real accounts get computed month-over-month changes.
- Merchant logos are neutral monogram tiles; no third-party brand artwork is bundled.
- Settings: Plan & Usage shows this account's real usage (Movo is free, no billing). App Lock sets a 4–6 digit passcode on this device (PBKDF2-SHA256 hash, never the passcode) with optional Face ID / Touch ID via WebAuthn; it re-locks after a minute in the background and does not encrypt records. "Forgot passcode" wipes Movo data on this device. Push alerts (renewals, limits, monthly report, money tips, new sign-ins, updates) are shown by this browser while Movo is open or installed; there is no server push and no email yet. Quiet hours hold device alerts. Auto Categorization picks a category from the description.
- NasrinAI chat: the composer is pinned just above the tab bar; Enter adds a new line and only the send button sends. A shortcut row opens Expense, Income, Transfer, Scan receipt, Budgets, Renewals, Transactions and Accounts, and answers Today / This month from this device's records (never sent to NasrinAI). Chat logging also reads Filipino ("Bumili ako ng saging 20 pesos gamit ang savings account ko") and picks the named account.
- Duplicate guard (`lib/duplicates.js`): an entry with the same direction and amount, within a day, and a matching merchant (on the same or no named account) is treated as already logged. Chat shows "Already logged … Not added twice" with *Log anyway*; manual saves and receipt scans warn once (Save again to log anyway); bank / Apple Pay / Google Pay notification links are skipped with a notice. CSV import keeps its own fingerprint check.
- Logged moment: saving a transaction shows the Movo wallet mark with a drawn check (calm ease-out, reduced-motion aware).
- Adaptive interface (`lib/layout.js`): phones keep the bottom dock; tablets (≥768px) get an icon rail and wider content; desktops (≥1100px) get a labelled sidebar with Add transaction and Settings, a two-column dashboard and centred dialogs. Dual-screen phones and foldables that report two viewport segments split content into one column per screen, with the gap spanning the hinge. It switches automatically on resize or rotation.
- Elevation: three soft, neutral shadow levels (`--elev-1/2/3`) plus `--elev-card`; no tinted halos, and the card scroller leaves room so shadows fade out instead of clipping.
- Streak badges (`lib/streak.js`): a day counts when Movo is opened; 3, 7, 14, 30, 60, 100 and 365-day badges glow in their tier colour, stay earned after a reset, show a one-time ring and glint when unlocked, and sync with preferences (merged by latest day and best streak).
- Automatic logging setup: Settings → Set Up Phone Automation shows the exact iPhone Shortcuts steps for Apple Pay (log automatically, or ask Log / Skip) and Siri voice, with a copyable prompt for Describe a shortcut. The device key is masked on screen and only included in what is copied. Payments log to the bank account of the card's bank; a per-device default account covers names that match nothing.
- Sign-in is passwordless: Continue with Apple, Continue with Google, or a one-time code sent by email (the first code creates the account). Terms/Privacy acknowledgement is required first. Apple and the email code need Supabase dashboard settings (see `docs/NASRINAI_CHAT_INTEGRATION.md`).
- Cards follow the owner's card spec: landscape cards like a real debit/credit card (chip at the ISO contact position), portrait cards like the vertical BPI reference. Bank logos are curated Google favicons; anything without a logo shows the MOVO mark.
- Transaction categories follow `docs/TRANSACTION_CATEGORIES.md`: 12 compact categories for quick entry with an optional subcategory (22 detailed groups, 233 subcategories) or Needs review. Stored as stable ids (`transport:ride_hailing`); older labels map on read, custom text is kept. Receipts, chat, voice and automations share one rule set that asks for review instead of guessing when signals disagree.
- Streak badges show the MOVO mark, with Pro (30/60 days), Max (100) and Ultra (365) finishes. These are badge tiers only, not paid plans.
- While you were away: on opening MOVO (or returning after 2+ minutes), a sheet lists what was logged since the last visit, grouped as Apple Pay, Google Pay, Automatic (bank alerts, Siri, Android assistant) and Manual, plus phone automations that could not be logged (no matching account, unclear amount, rate limit, server error). Those are kept server-side in `movo_automation_inbox` (owner-only RLS, migration `20261102020000`) and can be logged to a chosen account or dismissed.
- Every record belongs to an account: nothing is logged (chat, form, scan or automation) until an account or card exists.
- Reference IDs: scanned receipts and automation links record the reference / transaction / invoice / OR number and the time; details show "Date & time" and "Reference ID", and a matching reference marks a duplicate.
- Voice conversation: the mic keeps listening, sends each finished sentence, reads replies aloud and stops talking when you speak. Common money questions (spending, income, balance, top categories, limits, renewals, latest record) are answered instantly from this device (`lib/localAnswer.js`); other questions go to NasrinAI.
- Wallet cards (`components/CardDeck.js`): in landscape format the chosen card sits in front of a stack and the others peek below as strips (tap or swipe to bring one forward); in portrait format cards turn on a 3D cylinder as you swipe.
- Receipt scanner: take a photo, upload a photo, or upload a receipt/invoice (image or PDF, up to 15 MB). Text is read on the device (Tesseract; PDF text via self-hosted pdf.js with eval and XFA off).
- **Liquid Glass** (Settings → Appearance): translucent, blurred surfaces on cards, nav bar, buttons and sheets. A *Glass clarity* slider runs from Frosted to Clear and can be switched off entirely. Nav bar and sheets keep a minimum opacity so text stays legible, and `prefers-reduced-transparency` falls back to near-solid surfaces.
- **Motion**: direction-aware screen transitions (push/pop/tab), staggered entrances, count-up balances, self-drawing donut/sparkline/bars, a sliding glass pill in the tab bar and a sliding selector in filter chips, spring bottom sheets with swipe-down dismiss, glass sticky headers on scroll. All motion is disabled when the device requests reduced motion.
- Buttons use 44 px touch targets, iOS-style press feedback, filled SF-style tab icons, and squircle icon tiles.
- Preferences are stored under `movo.preferences.v3` (v2 values are migrated).

## Current functional scope

### Implemented frontend behavior
- Responsive Home dashboard and five-item navigation.
- Exchange Rates screen (Menu → Exchange rates): multi-currency converter, currency search, tracked FX pairs, manual refresh, cached reference-rate timestamps and stale/fallback status. FX requests send currency codes only; the upstream free feed is a reference-rate service, not a tick-by-tick executable quote.
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
- Preferences follow the signed-in person: card styles, layouts, theme, accent, subscriptions, plans and custom sticker artwork are saved to `public.user_preferences` (owner-only RLS, migration `20261030160000_user_preferences.sql`, test `supabase/tests/user_preferences_isolation.test.sql`) and load on any device after sign-in. Local-only mode keeps them in this browser.
- NasrinAI chat answers from MOVO data only: the proxy never continues NasrinAI-side conversations (whose documents or memory could leak in), sends `context_scope: "movo"`, and passes recent turns from MOVO's own chat history.
- Wallet card actions: View Details, Add amount (Transfer into this account, or Manual top-up), Limits, More. A plus button beside the view toggle adds a card, bank, e-wallet or cash account.
- Movo brand mark (`components/MovoLogo.js`), app icons and a loading screen in `public/index.html` whose mark eases between the green and graphite colourways.
- No demo mode or sample data: MOVO starts empty, with a one-time walkthrough (welcome, then Home balance, Wallet, NasrinAI and Menu) for first-time users; Skip or Escape ends it.
- Log transactions by chatting: type "Spent 250 on Grab", "Grab 250", "Salary 50000" or several lines in NasrinAI. Lines are parsed on the device (amount, currency, merchant, category, yesterday/today, account mentioned), saved like any record, and shown as a card with Undo. Works without signing in; questions still go to NasrinAI only after sign-in and consent.
- Menu tab (replaces Profile in the bottom nav) with Profile, Subscriptions, Plans and Limits.
- Subscription tracker: catalog of 120+ apps and services, including US and Philippine providers listed first for those regions, shown with each service's own logo downloaded once from its official website by `npm run brands` (`scripts/fetch-brand-logos.mjs`, validated, saved to `public/brands/` and served from MOVO's origin so the app never contacts these companies), falling back to Simple Icons marks (`src/lib/brandMarks.js`) and then initials under a trademark notice that MOVO is not affiliated with or advertising for them, or custom entries, weekly/monthly/quarterly/yearly cycles, upcoming list, renewal calendar and insights. Stored on this device only (`subscriptions` in preferences); MOVO reminds, it never charges or cancels anything. A renewal can be logged as an expense.
- NasrinAI daily briefing and money tips: rule-based summary (spending vs last month, top category, largest purchase, savings rate, renewals this week, budgets) and tips, computed on the device from the user's own records. Shown once a day on open (Settings toggle) and pinned at the top of Notifications to reopen anytime; nothing is sent to the AI unless the user opens the chat.
- Separate, explicit consent for sharing a limited user-scoped financial snapshot with NasrinAI. Production chat authentication still requires verification.
- Terms of Service, Privacy Policy, Help Center, onboarding acknowledgement, and privacy-request contact links.
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

## iOS app
The iOS app wraps this same code with Capacitor (`ios/`, `capacitor.config.json`, `src/lib/platform.js`); the website is unchanged. Builds run in the cloud, so no Mac is needed. See [docs/IOS_APP.md](docs/IOS_APP.md) for phases and prerequisites.

## Remaining production-readiness requirements

1. Legal: the Terms of Service and Privacy Policy were published as final on 2026-11-03 (owner decision). The operator is identified by the MOVO service team and the support@nasrinai.com contact; no legal name or registered address is shown. Update both pages and their effective dates when the product's data handling changes.
2. Apply the four production migrations still pending (`20261030160000_user_preferences`, `20261101120000_bills_payments`, `20261102010000_automation_sources_and_cross_source_dedup`, `20261102020000_automation_inbox`; see `docs/PR_PROGRESS.md`). Configure Supabase Auth for passwordless sign-in: add `{{ .Token }}` to the Magic Link template, enable Apple, allow the production redirect URL. Leaked-password protection only matters for older password accounts.
3. Review and remediate the dependency vulnerabilities reported by `npm audit` using targeted upgrades and regression tests; do not blindly force major upgrades.
4. Resolve the NasrinAI upstream HTTP 401 and verify an authenticated production request without exposing credentials.
5. Re-run owner-isolation/RLS checks and test authentication, financial writes, consent, import/export, and deletion behavior in the actual production deployment. Test phone automations (Siri Shortcut, Apple Pay, Android voice) and NasrinAI voice chat on real devices; none has been device-tested.
6. Add or complete end-to-end accessibility checks across supported mobile and desktop browsers.
7. Implement supported bank integrations only through documented provider APIs and explicit consent; never collect or scrape banking credentials.
8. Product work not built yet (see `docs/claude/FINANCIAL_PLANNING_HANDOFF.md`): Home cards for Net worth, Bills due, Debt and Owed to you; bill reminders; spending limits by account/merchant with a warning level; savings interest estimates; FX historical charts; crypto market, watchlist, alerts and portfolio; import of loans/receivables/bills; Android voice logging setup; profile photo crop and a cloud-sync off switch; paid Quick/Pro/Max/Ultra plans (needs pricing confirmation and a PayMongo/NasrinAI entitlement design).

## Icons

All icons share one smooth, rounded iOS-style set (`src/components/Icon.js`): round caps and joins, soft corner radii, filled variants for the active tab. The bottom dock is icon-only with a sliding capsule highlight, a hover capsule and a spring-scaled icon; every tappable icon elsewhere scales smoothly on hover and press.

## Card stickers

Wallet → Cards → **Card style** lets users dress each card with a sticker. The library (`src/lib/stickers.js`) generates 272 original, anime-inspired vector designs (17 motifs × 16 palettes, grouped into Shonen, Ninja & Samurai, Fantasy, Sci-fi, Night and Manga), so they stay razor sharp at any size. Bank logo, chip, card number, holder and balance sit in reserved zones with an automatic light/dark text colour. Users can also upload their own artwork (cropped at 1712×1080 for HD); uploads stay on the device. The choice is stored per card in preferences (`cardStyles`). The library contains no third-party characters or franchise artwork.

## Home ram mascot

Home shows the MOVO ram, an original 3D mascot, in the header's avatar slot with the greeting right after it and its feet resting on the first card (`src/components/RamMascot.js`, scene in `src/lib/ramScene.js`, model in `public/mascot/`). Its mood follows this month's spending limits (`src/lib/mascotMood.js`): it **smiles** (hops, waves, ^ ^ eyes) when every budget is under 50%, stays **cute** (head tilts, blush, toe taps) in between, looks **disappointed** (head down, drooping ears, sighs, a tear) when a budget reaches 80%, and gets **angry** (stomps, shakes a fist, steam, furrowed brows) once a budget passes its limit. Without budgets, the month's income stands in as the limit. Tapping the ram makes it react and shows a short message; Settings for it live in the mascot sheet ("3D ram" or your own photo, `mascotStyle` preference). three.js and the model load lazily (three is its own chunk), rendering pauses off screen and in the background, reduced-motion users get a still pose, and tests or browsers without WebGL get the `ram-poster.png` still.

## Motion

Motion is calm by design: no device vibration, no overshooting "bounce" springs, no breathing or pulsing orb. Transitions use a single smooth ease-out curve.


## Financial Planning

The financial planning area tracks loans and debts, money owed to you, savings goals, and goal allocations. Accounting rules separate loan principal from interest, receivable collections from income, and goal reservations from actual assets. The migration in `supabase/migrations/20261031170235_obligations_receivables_goals.sql` has been applied to the Movo Supabase project. Cross-currency transfers and live database behavior remain subject to verification.
