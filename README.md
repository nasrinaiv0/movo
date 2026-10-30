# MOVO

MOVO is a financial-tracking web app prototype with a calm, iOS-inspired interface.

## UI redesign (mockup match)

The front end follows the supplied mobile mockups: floating bottom navigation with the NasrinAI orb, Home, Wallet (All / Cards / Bank Accounts / E-Wallets, card carousel, "Your Cards" and "Choose Theme" sheets), Transactions (All / Income / Expenses / Transfers, month picker, breakdown, day grouping, sort chips), Profile, Edit Profile, Settings, Appearance, Notifications (list, detail, settings), and Light / Dark / System / Blue / Purple / Orange / Custom themes with six accent colours.

- Sample data (`src/lib/demoData.js`) is shown until sign-in and is labelled as sample; comparison percentages in sample mode are fixed demo figures, real accounts get computed month-over-month changes.
- Merchant logos are neutral monogram tiles; no third-party brand artwork is bundled.
- Plan & Usage, quiet hours and some Settings rows are visual placeholders with no backend yet.
- **Liquid Glass** (Settings → Appearance): translucent, blurred surfaces on cards, nav bar, buttons and sheets. A *Glass clarity* slider runs from Frosted to Clear and can be switched off entirely. Nav bar and sheets keep a minimum opacity so text stays legible, and `prefers-reduced-transparency` falls back to near-solid surfaces.
- **Motion**: direction-aware screen transitions (push/pop/tab), staggered entrances, count-up balances, self-drawing donut/sparkline/bars, a sliding glass pill in the tab bar and a sliding selector in filter chips, spring bottom sheets with swipe-down dismiss, glass sticky headers on scroll. All motion is disabled when the device requests reduced motion.
- Buttons use 44 px touch targets, iOS-style press feedback, filled SF-style tab icons, and squircle icon tiles.
- Preferences are stored under `movo.preferences.v3` (v2 values are migrated).

## Current functional scope

### Implemented frontend behavior
- Responsive Home dashboard and five-item navigation.
- Balance visibility toggle that masks balances and transaction amounts.
- Income, expense, and net-activity totals calculated from stored records.
- Week/month/year period selection and spending-category breakdown.
- Create, edit, and delete transaction records; create, edit, and archive tracked accounts.
- Record income, expenses, and transfers; transfer records do not move money between financial institutions.
- Search and filter transactions, review recent activity, and view calculated totals and category breakdowns.
- Import CSV statements through a local parsing and review step; export available records to CSV.
- Email/password and Google authentication paths, subject to deployment configuration and provider availability.
- Optional cloud account/transaction storage through the authenticated repository with Supabase Row Level Security (RLS); local-only mode remains browser-specific.
- Menu tab (replaces Profile in the bottom nav) with Profile, Subscriptions, Plans and Limits.
- Subscription tracker: catalog of common apps and services (brand-colour initials, no third-party logos) or custom entries, weekly/monthly/quarterly/yearly cycles, upcoming list, renewal calendar and insights. Stored on this device only (`subscriptions` in preferences); MOVO reminds, it never charges or cancels anything. A renewal can be logged as an expense.
- NasrinAI daily briefing and money tips: rule-based summary (spending vs last month, top category, largest purchase, savings rate, renewals this week, budgets) and tips, computed on the device from the user's own records. Shown once a day on open (Settings toggle) and as a Home box; nothing is sent to the AI unless the user opens the chat.
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

## Remaining production-readiness requirements

1. Publish and review the operator/data-controller's formal legal identity, registered address where required, verified retention schedule, and actual provider disclosures. The in-app legal pages currently warn that these launch details remain incomplete; do not use MOVO with real or highly sensitive financial data until resolved.
2. Enable Supabase Auth leaked-password protection. The Security Advisor reported it disabled on 2026-10-29.
3. Review and remediate the dependency vulnerabilities reported by `npm audit` using targeted upgrades and regression tests; do not blindly force major upgrades.
4. Resolve the NasrinAI upstream HTTP 401 and verify an authenticated production request without exposing credentials.
5. Re-run owner-isolation/RLS checks and test authentication, financial writes, consent, import/export, and deletion behavior in the actual production deployment.
6. Add or complete end-to-end accessibility checks across supported mobile and desktop browsers.
7. Implement supported bank integrations only through documented provider APIs and explicit consent; never collect or scrape banking credentials.

## Icons

All icons share one smooth, rounded iOS-style set (`src/components/Icon.js`): round caps and joins, soft corner radii, filled variants for the active tab. The bottom dock is icon-only with a sliding capsule highlight, a hover capsule and a spring-scaled icon; every tappable icon elsewhere scales smoothly on hover and press.

## Card stickers

Wallet → Cards → **Card style** lets users dress each card with a sticker. The library (`src/lib/stickers.js`) generates 272 original, anime-inspired vector designs (17 motifs × 16 palettes, grouped into Shonen, Ninja & Samurai, Fantasy, Sci-fi, Night and Manga), so they stay razor sharp at any size. Bank logo, chip, card number, holder and balance sit in reserved zones with an automatic light/dark text colour. Users can also upload their own artwork (cropped at 1712×1080 for HD); uploads stay on the device. The choice is stored per card in preferences (`cardStyles`). The library contains no third-party characters or franchise artwork.

## Motion

Motion is calm by design: no device vibration, no overshooting "bounce" springs, no breathing or pulsing orb. Transitions use a single smooth ease-out curve.
