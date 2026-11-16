# MOVO PR #288 — iOS simulator CI runner hardening (2026-11-13)

## Original failure evidence
At exact PR head `7af5cb32641c096d00fe6240b779b983821df7dd`, six GitHub workflows passed and the Vercel preview was READY; verified HTML, JavaScript, CSS HTTP 200. The iOS macOS-26/Xcode 26.6 job and a fresh-job retry both compiled, installed, launched `com.nasrinai.movo`, and opened the `movo://log` deep link. Both hung on `xcrun simctl io screenshot` after 90 seconds; even diagnostic `simctl list devices` timed out. The iOS *screenshot* gate failed; this is not a Node 26 compiler regression or confirmed app crash.

## Targeted change documented before commit
1. Prefer the latest available runtime in `simctl list devices available --json` instead of choosing the first iPhone from a potentially older runtime; prefer a booted phone within that runtime and log the selected runtime.
2. Retry **only** a timed-out screenshot once, with a 15-second wait. Persistent screenshot hangs and non-timeout errors remain fatal, and a screenshot file is still required. Native app launch and deep-link failures remain fatal.
3. Add five Python host-independent tests: newest runtime, booted within newest, screenshot transient retry, persistent timeout failure, and non-timeout immediate failure. Preserve existing tests and production behavior.
4. Run a new exact-head verification suite and Vercel preview after commit; do not merge until all requirements pass.

## Pre-commit evidence and risk
- PR #288 conversation documents both incident logs and the planned fix before this commit.
- Seven independent Python algorithm checks passed locally before implementation. This is **not** a substitute for full modified-module tests.
- No application/business logic, dependency, billing, signing, database or Vercel production settings changed.
- iOS screenshot still must pass after the patch; a repeated timeout is reported as a failure and never softened into a passing job.
