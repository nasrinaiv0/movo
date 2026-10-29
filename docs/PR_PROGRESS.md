# MOVO Pull Request Progress Register

Last reconciled: 2026-10-29 (UTC date; update this register whenever PR state changes).

This is the repository's durable, human-readable index of pull requests. GitHub's PR page, commits, reviews, and Actions runs remain the authoritative event-by-event history; this register is the cross-PR summary.

## Open pull requests

| PR | Title | Scope | Progress / evidence | Remaining work / risk | Status |
|---|---|---|---|---|---|
| [#12](https://github.com/nasrinaiv0/movo/pull/12) | feat: match MOVO MVP to reference UI with demo finance data | Responsive reference-screen UI and clearly labeled local sample finance data | PR description records scope and validation expectations. Available checks reported for the reviewed SHA were successful; a Vercel status reported “Canceled by Ignored Build Step,” so that status is not proof of a fresh preview deployment. | Confirm latest-head CI and production build; review UI against reference screenshots; preserve sample-data/privacy boundaries. | Open; do not treat as merged or fully accepted. |
| [#13](https://github.com/nasrinaiv0/movo/pull/13) | feat: expand MOVO reference screen parity | Notifications, filters/read state, preference toggles, quiet-hours UI | PR description records scope and notes that notifications/preferences are mock/UI state, not backed by delivery services. Available checks reported for the reviewed SHA were successful; a Vercel status reported “Canceled by Ignored Build Step,” so that status is not proof of a fresh preview deployment. | Confirm latest-head CI and production build; test notification filters/read state; backend delivery and persistence remain unimplemented unless separately verified. | Open; do not treat as merged or fully accepted. |

## Historical PRs

Add one row for every closed, merged, or declined PR. Keep the PR number, title, scope, final disposition, merge/close date, merge commit (if any), validation evidence, and any follow-up issues. Never delete old rows; amend only to correct factual errors and note the correction.

| PR | Title | Scope | Final disposition | Validation / follow-up |
|---|---|---|---|---|
| _No historical entries reconciled in this register yet._ | | | | |

## Update rule

For every PR, record progress when it is opened, materially updated, reviewed, blocked, ready for review, merged, or closed. Update this register in the same change where practical, and leave a concise PR timeline comment linking to the relevant commit/checks. Do not report a check as passing unless its result corresponds to the current PR head SHA. Record skipped, canceled, and unavailable checks explicitly. See [PR workflow](PR_WORKFLOW.md) and the [pull request template](../.github/PULL_REQUEST_TEMPLATE.md).
