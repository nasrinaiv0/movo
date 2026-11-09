# 2026-11-09 — Premium UI, motion and performance (audit phases 2–7)

Owner request: "merge and finish the remaining" (sections 1–10 of the premium UI/UX brief; plan in
`docs/audits/2026-11-09-premium-ui-ux-audit-and-plan.md`). Section 5 (sync) stays in the owner's draft PR #261.
Decisions taken on the owner's behalf, as proposed in the audit: two decimals on every money amount (chart axis labels
may stay whole); only functional gradients stay (content fades, sticker scrims, theme swatches).

## Phase 2 — correctness and touch

- **No sideways scroll.** With reduced motion, the Menu page was 408px wide on a 390px phone after a tab change (a
  decorative badge layer). `.screen` now clips horizontal overflow (`overflow-x: clip`, which keeps sticky headers).
- **44×44 tap targets** for every small control, without changing how they look: an invisible centred `::before`
  hit area on the balance eye, the wallet arrow (grows rightwards, the card edge clips the left), "Change mascot",
  section links (See All, Manage, Add), money-flow ranges, filter chips and Settings switches. The eye's row is raised
  above the balance figure, which used to swallow the lower part of its hit area. Money-flow ranges are 40px like the
  other filters. Measured in the built app at 390×844: no control under 44px on Home, Wallet, Transactions, Menu or
  Settings (filters at the owner's 40px and chart bars exempt).
- **Two decimals.** `money()` already always formats two decimals (`format.test.js`); the `digits` option that 22
  callers passed was ignored, so it is removed to avoid confusion. No displayed value changes.
- **Cent-exact totals.** `totalBalance`, `netAfter` and `balanceAsOf` now sum whole cents (`sumMoney`), so the total
  is exactly the sum of the rounded balances shown, with no float drift (new test: three ₱0.335 balances show ₱0.34
  each and total ₱1.02; the old float sum gave ₱1.01).
- The billing-cycle select (invisible, inside its 40px filter) loses its default browser border.

## Phase 3 — motion system

- **Tokens** (`App.css`, end): press 120ms, modal 220ms, page 260ms, chart 380ms, one ease-out curve with no
  overshoot. Measured in the running app before: the donut sweep and balance art took 1.2s, the bottom-nav entrance
  0.7s, bar growth and the donut centre 0.6s, list rows 0.5–0.55s, page sections 0.38s, sheets 0.4s with children at
  0.32s and up to 0.23s of stagger. They now fall inside the brief's ranges (buttons 100–160, modals 180–250, pages
  180–300, charts 250–450ms), with start delays cut to 40–120ms.
- **Balance count-up** 950ms → 400ms, and it now ends on the exact value (no float a hair off the target).
- **Card stack** animations 0.52–0.72s → 300ms; `CardDeck.js` clears the leaving card after 320ms (was 560ms) to match.
- The hero badge no longer pulses twice after appearing; the NasrinAI orb no longer has a breathing loop listed.
- Correction to audit finding 1.4: `--spring-bounce` was already redefined without overshoot (`App.css` line 853),
  so no animation overshoots; the token block keeps it that way.
- Press feedback already exists on every button family (41 `:active` rules, scale .92–.985 or opacity); unchanged.
- Reduced motion still switches these animations off (existing blocks), and celebrations (badge unlock, tutorial
  video) keep their own timing.

## Phase 4 — solid surfaces

- Decorative gradients replaced by solid colours: streak badges (radial fills → the badge colour; tier rings →
  silver #9aa4b2, gold #d9a521, platinum #8b6cff), tier ribbons, the card's bottom accent line, plan detail cards
  (accent or gold mixed into the card colour), the tutorial video player and its cards, bars and badge. The mascot's
  radial glow and the portrait card's glass sheen are removed. The badge shine and Ultra sparkle, which looped every
  4–7 seconds forever, stop.
- Kept because they do a job: scroll-edge masks, the content fades under headers and above the bottom bar, the scrims
  that keep text readable on sticker cards, the split light/dark theme swatches, the clarity slider's fill, the EMV
  chip contacts, the scanner line and the donut chart's own segments (data).
- Measured in the built app: no element with a gradient background on Home, Wallet, Transactions, Menu or Settings
  other than the donut chart. Screenshots of the badges in light and dark checked.

## Data and security

No schema, API, RLS or entitlement change. Totals can differ from before by at most a cent when foreign balances
convert to fractional cents; they now match the per-account figures shown.

## Rollback

Revert the commits; no migration.

## Remaining release gates

Native iOS/Android builds are not run for these web changes.
