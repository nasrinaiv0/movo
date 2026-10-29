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

## Phase 1 — Home dashboard MVP

### Functional in this phase
- Responsive Home dashboard and five-item navigation.
- Balance visibility toggle that masks balances and transaction amounts.
- Income, expense, and net-activity totals calculated from stored records.
- Week/month/year period selection and spending-category breakdown.
- Add and delete transaction records.
- Transaction search and recent activity list.
- Light/dark appearance and selectable accent colors, persisted in this browser.
- Transaction, theme, and balance-visibility preferences persisted in browser local storage.
- Baseline HTTP security headers on Vercel.
- Automated UI tests and a production build gate.

### Data and privacy boundaries
- First-launch records are clearly marked **Sample** and can be removed from the Appearance menu.
- Manually added records are stored in the current browser's local storage. They are not encrypted by this app and do not sync to other devices.
- Do not enter sensitive financial details or account credentials in this MVP.
- No live bank, card, Apple Pay, wallet, notification-reading, Supabase, or AI integration is active.
- Displayed totals are calculated from tracked records; they are not verified bank balances.
- This phase has no authentication or server-side financial data store.

### Local development
```sh
npm install
npm test -- --runInBand
npm run build
npm start
```

Production builds run the test suite before building. GitHub Actions also runs the test suite and build on feature-branch pushes and pull requests targeting `main`.

## Before production use

1. Resolve and verify the dependency vulnerabilities reported by npm audit; do not blindly apply breaking upgrades.
2. Introduce authenticated server-side storage with row-level access controls before syncing financial data.
3. Implement account linking through supported provider APIs and explicit user consent; never scrape banking credentials.
4. Define encryption, retention, export/deletion, audit logging, and incident-response policies.
5. Add end-to-end and accessibility checks across supported mobile and desktop browsers.
