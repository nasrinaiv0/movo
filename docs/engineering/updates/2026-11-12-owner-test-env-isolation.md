# 2026-11-12 — Owner billing test no longer depends on the build machine's settings

## What happened
The production deployment of `main` after #284 (3d96b2e) failed on Vercel at the build step. `npm run build` runs the
tests first (`prebuild`), and one test failed there while passing locally and in GitHub CI:
`src/owner/ownerApi.test.js` › "billing view reports store checkout readiness by setting NAME only, never values".

Cause: the test set the App Store settings it needed but left the Google Play settings as they were. Vercel's build
environment has the real Google Play settings, so Google checkout read as ready (`enabled: true`) and the assertion
`google.enabled === false` failed. Production kept serving the previous deployment; nothing reached users.

## Fix
`src/owner/ownerApi.test.js`: the test copies the whole environment, removes every store billing setting
(`MOVO_STORE_*`, `MOVO_IAP_*`, `APPLE_*`, `GOOGLE_PLAY_*`, `CRON_SECRET`) before setting its own fake values, and
restores the environment exactly afterwards. Test only; no app or API code changed.

## Validation
- Reproduced first: with fake but well-formed Google Play settings exported, the test failed with the same
  "Expected: false, Received: true" as the Vercel log. After the fix it passes with and without them.
- Full Jest suite (219 suites / 1,320 tests) passes with Vercel-like settings present (fake Google Play keys,
  `MOVO_STORE_BILLING_ENABLED=true`, `APPLE_APP_ID`, `OPENROUTER_MODEL`), and without them.
- No secret values were read or printed; the Vercel build log was read for the failing test name only.

## Data and security
None. Test-only change.

## Rollback
Revert this commit (the test would again fail on any machine that has real Google Play settings).

## Remaining
- Vercel currently refuses new deployments for the team ("Account is blocked"); the owner must resolve it in the
  Vercel dashboard before a preview or the production deploy can run.
