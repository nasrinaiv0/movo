# PR #287 merge-conflict resolution — 2026-11-12

## Progress before the merge commit
- Owner requested conflict resolution in [PR #287](https://github.com/nasrinaiv0/movo/pull/287), keeping it unmerged pending tests.
- Main head: `e7d71262976e0ffdc9c5c80daf9dfd3a8aaa8c1b`; PR #287 head: `3e47d692459e4e72212763dcfbafa6b93600d55b`; common merge base: `7a65b55bf366115132582bfcb5ac6a5e29f6d10c`.
- Checked GitHub commit comparison: **only two main-side changed paths**, both documentation. The single overlapping path is `docs/PR_PROGRESS.md`, edited by PR #287 to prepend its offline-sync and referral update and by main to prepend its PR #286 Android sign-in release-gate progress.
- The PR's `docs/PR_PROGRESS.md` equals its exact new prefix followed by the entire merge-base document. Therefore the conflict-free union is: PR's full new prefix + the entire updated main document. This retains all notes, old and new, without duplicating or losing sections.
- Main also added `docs/engineering/updates/2026-11-12-android-auth-release-gate-test-isolation.md`; bring its exact blob into the merged tree.
- All **other PR #287 source files** stay byte-for-byte as in its head. The merge commit includes both parent commits, so GitHub tracks main integration correctly.

## Data and security implications
- No change to Supabase, payment provider credentials, environment values, auth flows, RLS, hybrid sync, encrypted storage, financial computations, subscription entitlements, mobile runtime, legal policies, i18n or production deployments.
- Retain prior release gates: Vercel preview still requires confirmation, and physical-device offline-sync/account-isolation tests are not demonstrated by this documentation merge.

## Precommit tests performed
- Verified exact main and PR head SHAs against GitHub before writing.
- Confirmed main-side changed paths and the merge-base relationship.
- Confirmed both progress additions are preserved and the entire main progress document is included; checked absence of conflict-marker tokens.
- Confirmed no runtime source blobs are replaced.
- The exact merge commit must still pass GitHub CI; any failures should be addressed on PR #287 without merging.

## Rollback
- Revert the conflict-resolution merge changes on PR #287 or reset the PR branch to previous head **only with a verified branch lease**; never touch main as part of rollback.

## Status
- Resolution prepared; exact-head CI, GitHub mergeability and Vercel preview remain to be checked after commit.
