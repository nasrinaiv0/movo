# 2026-11-09 — Referral points convert to Pro (500 points = 1 month); "iOS" download label

## Owner request

"I want users can convert their every 500 points to 1 month subscription" and "Use iOS instead of iPhone".

## What changed

- **Redemption (migration `20261109153000_verified_referral_points.sql`, not applied anywhere yet).**
  `movo_redeem_referral_points(user, months)` (service role only; `/api/referrals/redeem`, open only when
  `MOVO_REFERRAL_POINTS_ENABLED=true`) spends 500 points per month for 1–12 months of **Pro**. It takes the same
  per-person lock as the points award, checks the balance (`movo_referral_points_balance`: ledger total minus
  redemptions) and records the months in `movo_referral_point_redemptions`. The ledger is never edited.
- **Months queue.** A redeemed month starts at the latest of now, the end of earlier redeemed months, the free month,
  the 10-subscriber reward, a manual grant or a store subscription period, so it is never spent on top of another plan.
- **Plan status.** `movo_plan_status` gains source `points` for an active redeemed month; everything else is the
  definition from `20261108230330_owner_manual_plan_grants.sql`, which is the one live in production (checked
  2026-11-09). Queued months do not count until they start.
- **Refunds.** A refund after a redemption still subtracts 100; the balance can go below zero and no month can be
  redeemed until it is positive again. Months already redeemed stay.
- **App (Refer MOVO).** "500 points = 1 month of Pro" with months ready to use, the Pro-from-points end date or
  progress toward the next 500, and **Use 500 points** (confirmation first; the plan refreshes afterwards).
- **iOS label.** The download QR codes and the share text say **iOS** (App Store) and **Android** (Google Play).

## Tests

- SQL: balance and months available, not enough points, 0/13 months refused, unverified account refused, one month
  of Pro from points (source `points`, one calendar month), no double spend, second month queued after the first and
  not counted early, a month redeemed during the free month starts when the free month ends, ledger untouched,
  refund clawback to −50 with no months available, and no client access to the function, balance or table.
  Removing the queueing or the balance check makes the suite fail.
- Jest: `ReferralSheet.test.js` (iOS label, redeem flow, below 500, cancelled confirmation), `referralApi.test.js`
  (route closed when points are off, month validation, only the verified user, error mapping), `referrals.test.js`.

## Release gates

Unchanged plus: the Terms must describe points and the 500-point conversion before `MOVO_REFERRAL_POINTS_ENABLED=true`.
The owner analytics "How paid access was obtained" list does not yet count `points`; plan totals already include it.
Rollback: points stay off by default; dropping the redemption table and restoring the previous `movo_plan_status`
removes the feature.
