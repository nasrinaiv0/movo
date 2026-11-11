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
