# Isolate sequential iPhone and iPad simulator acceptance

Contributor: Codex. PR #335. Source parent: `646d5eb0d96e531f182aa210dd609d792cb79207`. The owner reopened the listed PRs for fixes and conditional merge on 2026-11-27.

Run 45398839035 reached the iPad launch after completing iPhone assertions while the first simulator remained booted. Both bounded iPad launch attempts timed out. Record the selected iPhone identifier and shut down that completed disposable simulator before starting iPad acceptance, using the same sequence already exercised successfully by PR #347's iOS jobs.

No application, device-selection, accounting, signing, timeout or acceptance assertion changes. All 28 simulator-host tests and four toolchain tests passed; workflow ordering and whitespace checks passed before commit. Actual iPad/native acceptance requires fresh exact-head CI and artifact inspection; this note does not claim it passed. Rollback is a source revert of the workflow change.
