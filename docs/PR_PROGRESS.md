# MOVO Pull Request Progress Register

**Last reconciled:** 2026-11-05  
**Source of truth:** GitHub PR pages, commit SHAs, Actions runs, and Vercel deployment records. This register is a concise operational index, not a substitute for those records.

## Open pull requests

**2026-11-08 â€” Transaction running balances (review, accessibility regression correction):** Add optional after-transaction balance/remaining credit history with paired transfer balances, cents accuracy, privacy masking and dedicated Settings toggle. Prepared in isolated Vercel Sandbox; verify exact-head CI and preview UI before merge. Details: docs/engineering/updates/2026-11-08-transaction-running-balances.md.

**2026-11-07 â€” Plans and Wallet UI follow-up:** Removes cloud-read-only banner, adds swipeable plan cards with visible trial controls, and renders loyalty/rewards as cards with header-only creation. Badge hierarchy becomes Bronze/Silver/Gold/Platinum. Branch `fix/plans-wallet-ui-20261107`; details in `docs/engineering/updates/2026-11-07-plans-wallet-ui.md`.

**2026-11-07 â€” Pro / Pro+ trials and restrictions:** `feat/pro-plans-trial-restrictions` adds expiring plan gates, native-store product tiers, one-month Pro claim, verified referral rewards, cloud read-only transition and local backup access. Vercel Sandbox: 765 tests / 135 suites, TypeScript, production build and isolated PostgreSQL checks pass. Draft pending staging migration and signed-device store lifecycle checks. Details: `docs/eng¶»§q«^