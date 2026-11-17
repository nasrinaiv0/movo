# 2026-11-17 — PR #291 brought up to date with main (#314, #315)

## Why
The owner asked to merge finished PRs. This PR changes the Terms and Privacy text to describe its device encryption. After #314, `main` had its own Privacy changes (friend summary sections) and effective dates of November 17 (Terms) and November 18 (Privacy).

## Resolution
- The two policy texts merged without conflicts: the encryption wording and the friend-sharing wording are both kept. Only the page headers conflicted. Both pages keep this PR's "Security" link.
- Both effective dates are now **November 19, 2026** (`legalVersion.js`), later than `main`'s, so people accept the changed text again. The tests that pin the dates were updated.
- `scripts/update-legal-pages.cjs` hard-coded "November 16, 2026" when it rebuilt the static pages, which would reset every later date. It now reads each date from `legalVersion.js`, and `--check` confirms both pages match.
- #290 is fully contained in this PR: its only extra commit is a merge from `main`. It will be closed once this PR merges.

## Validation
- Jest passes on the merged tree, including the legal, security-assurance and App suites.
- `tsc --noEmit` passes.
- `node scripts/update-legal-pages.cjs --check` reports both pages current.
