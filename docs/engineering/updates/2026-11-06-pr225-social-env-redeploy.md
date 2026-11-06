# PR #225 — Vercel social-link environment deployment clarification

Date: 2026-11-06

## Operational rule
The social profile API reads the environment bound to its deployed Vercel Function. Changes to Vercel Environment Variables are **not** retroactive to existing deployments. Configure the official MOVO profile URLs in Project → Settings → Environment Variables, select the intended environments, then create a **new deployment**. Once active, expect up to 300 seconds of edge cache age before all responses reflect the new deployment.

## Files and safety
- Corrected the inline server endpoint comment and the previous social footer documentation; no runtime logic changed.
- Updated \`docs/PR_PROGRESS.md\` and this dated engineering update in the same commit.
- No credentials, private account details or invented social URLs are checked into Git.
- Official reference: https://vercel.com/docs/environment-variables/managing-environment-variables

## Validation
No functional changes to server response, finance data, app layout, or user navigation. The exact PR branch must still pass its full GitHub CI gates.
