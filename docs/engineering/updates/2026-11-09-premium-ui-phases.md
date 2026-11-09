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

## Data and security

No schema, API, RLS or entitlement change. Totals can differ from before by at most a cent when foreign balances
convert to fractional cents; they now match the per-account figures shown.

## Rollback

Revert the commits; no migration.

## Remaining release gates

Native iOS/Android builds are not run for these web changes.
