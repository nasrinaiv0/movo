# MOVO PR #225 — Mascot speech bubble borderless text control

Date: 2026-11-06

## Problem
The Home mascot's "Change mascot" inline link sat inside a header that inherited a global 0.25px button border, producing an unwanted small rectangle in both appearance modes.

## Resolution
Change only the global hairline selector to exclude `.ram-bubble-link`. Preserve the bubble surface, link action and keyboard focus. Add regression coverage and append the full explanation to `docs/engineering/2026-11-06-wallet-transactions-compact-summary.md`.

## Verification
On the original feature branch, all 619 tests, TypeScript check and production build passed in the Vercel Sandbox. Recheck exact-head PR CI after rebasing.
