# Transactions filter and graph, plans panels, sign-in buttons, referral line — 2026-11-11

Owner requests with screenshots.

## What changed
- **Transactions billing-cycle filter** (`screens/Transactions.js`): the control showed a cut-off label ("Prese…").
  It is now the filter icon only, 40px; its accessible name still says the chosen cycle, and a small dot marks a
  cycle other than the present one.
- **Graph under Total Spent follows the filter** (`lib/billingCycleSpending.js`): a chosen cycle shows one bar per
  day ("Nov 2026" runs Nov 1 to Nov 30, today marked in the current cycle); "All" shows every cycle from the first
  one with data to the present (most recent 36). It used to show the last twelve cycles whatever was chosen.
- **Notification detail merchant logo**: MR DIY added to the curated merchant list (`lib/merchantFavicons.js`), so
  "Mr Diy Zmta" shows its logo. Only curated names map to a domain; nothing is derived from typed text.
- **Plans panel** (`components/PlanOffer.js`): lighter weights and tighter spacing; the subtitle, the arrows and the
  dots beside the three tiles are gone and the free month is stated once; the action stays fixed at the bottom; the
  chosen tier and the action glow in the tier colour; price and features fade in on a tier change and one highlight
  sweeps the action. Ease-out only, no looping pulse, nothing moves with reduced motion. Buttons keep the
  borderless control policy, so the glow is a drop-shadow filter.
- **Plan & Usage** (`screens/Settings.js`): one compact current-plan row, usage rows, and one fixed action
  ("Upgrade MOVO" / "View plans") instead of a second plan comparison and a secondary button.
- **Sign-in** (`components/AuthPanel.*`): Apple and Google buttons share one neutral surface and read
  "Continue with" followed by the company mark; the accessible names still say Apple and Google.
- **Refer MOVO**: the "n of 10 friends subscribed" line is removed (referrals are counted in points).

- **Profile photo**: the image type check had an over-escaped pattern that rejected every file; it accepts any
  `image/*` type again (`screens/Profile.js`, `screens/EditProfilePhoto.test.js`).

## Second pass, same day (owner requests with screenshots)
- **Sign-in page** (`components/AuthPanel.*`): centred text and a calm staggered entrance; after a code is sent the
  field becomes six boxes that arrive one after another, each digit rises into its box and the next box takes the
  highlight (one real field underneath, so paste and the phone's code autofill still work; main's automatic check at
  six digits is unchanged). No transparent buttons on the page. Apple and Google buttons are black on light themes and
  white on dark ones, with marks of the same size.
- **Filter icon**: the Transactions billing-cycle filter uses the solid three-bar mark from the owner's reference
  (`Icon` name `filterBars`).
- **Device Back** (`lib/backNavigation.js`, `App.js`, `components/ui.js`): the Android back button and gesture and
  the browser's Back close the open sheet first, then return through the screens visited, then to Home; from Home
  with nothing open they leave the app as usual. A link that only changes the "#" part (a MOVO log link) is not
  treated as Back. No native code changed: the Android WebView's own back handling drives it.

## Third pass (owner confirmed)
- **The first screen waits for the opening sync** (`App.js`, `LAUNCH_SYNC_WAIT_MS` = 4s): the saved copy is loaded
  underneath, but the launch screen stays until the cloud check finishes, so the first screen shows the latest
  records. With no connection the saved copy shows at once; a cloud that does not answer within 4s gives way to the
  saved copy, which updates when the check lands. This changes #271's cache-first first paint on purpose; its test now
  covers the wait, the 4s cap and the offline case. Checked in Chromium against a local stand-in for the cloud: after
  a change made elsewhere, reopening showed only the new balance.
- **Sign-in, calmer**: the agreement, the "code sent" note, "Use a different email", "Resend" and "Continue with this
  device only" are plain text again (no panels or filled buttons), with tighter spacing and smaller type.

## Platinum, metallic (owner, same day)
- Pro+ platinum was lavender (#dcd9ef / #9d97c4). It is now a neutral white-silver with a brushed-metal sheen on the
  MOVO mark (`MovoLogo` tone `platinum`, the only tone drawn with gradients), a graphite badge tile with a fine silver
  edge, neutral silver glows in the plans panel and Plan & Usage, a platinum Pro+ action and platinum check marks.
- The iOS Platinum app icon was re-rendered with the same sheen (`scripts/app-icons/render.cjs`); the Bronze, Silver
  and Gold icons re-rendered byte-identical. The icon only changes on a phone after a new iOS build.

## Platinum, holographic (owner follow-up)
- The platinum finish is now a platinum base with a holographic, iridescent sheen (rose, aqua, champagne, lilac over
  silver) on the MOVO mark, an iridescent rim and one slow light sweep (every 6s, none with reduced motion) on the
  badge tile, and a pearlescent Pro+ action. The iOS Platinum icon is re-rendered with the same sheen.

## Bottom navigation in the plan colour (owner follow-up)
- With a server-verified Pro+ plan the active bottom-nav icon (and the tablet side-rail icon) is filled with a
  platinum, prismatic gradient by default (bright on dark themes, a deeper steel on light themes so it reads against
  the grey inactive tabs); Pro is gold. The sliding highlight is a quiet platinum (or gold): soft silver with a faint
  sheen, plain linear gradients and rgba only, which render the same in iOS WKWebView and Android WebView.
- The iOS app draws its own native dock and tints the active tab with the colour it reads from the page; it now reads
  the plan colour (a solid platinum or gold, since the native bar cannot draw the web gradient), else the app accent.
  No Swift change; seen only after a new iOS build, not tested on a device. The free month keeps the app accent. Settings → Appearance (and Profile → App Appearance) has
  **Navigation accent**: the plan colour or the app accent (pref `navAccent`, synced like other preferences).

## Payments logged at the device's time (owner follow-up)
- Logging a scheduled transaction, a bill payment from a reminder, a credit-card payment or a credit purchase used a
  fixed time (noon UTC on the due date, which reads as 8 PM in the Philippines and can land on the wrong day further
  west). They now record the moment they are logged, in the device's own time zone (`lib/loggedAt.js`). A credit-card
  payment or purchase back-dated to another day keeps that day, at noon local time.
- A scheduled occurrence is still logged once: the app now finds an earlier log by its occurrence reference
  (`movo-schedule:<id>:<date>`, unique per account in the database) instead of by its time.
- Loan and money-owed reminders and the subscription form already used the current time.

## Test robustness
- `AccountDetailsSheet.test.js` built each record with its own `new Date()`; a clock tick between them reordered the
  newest-first list and failed the test intermittently (seen locally, unrelated to this branch's code). The records
  now share one timestamp; 8 of 8 reruns passed.

## Not changed (needs a device)
- Sync speed and Google Play release smoothness were not measured or tuned here: no Android build or device run was
  possible in this environment.

## Merged with main on 2026-11-11
The branch was merged with `main` keeping main's hybrid sync (#261) and sign-in startup fix (#271) wherever the two
differed (owner decision). The branch's own parallel sync work and its one-time-code change were dropped; this branch
now differs from `main` only by the changes on this page.

## Verification
New tests for the daily and all-cycle rows, the graph, the MR DIY match, the plans panel tile selection and the
referral sheet; screenshots from the built app at 390px (light, and dark for sign-in). Full Jest, typecheck and
strict build: see `docs/PR_PROGRESS.md`. WebKit and native builds were not run.

## Data / security
Display only. No data, auth, plan-rule, RLS or API change; the server reward rules for referrals are untouched.
Rollback: revert the commit.
