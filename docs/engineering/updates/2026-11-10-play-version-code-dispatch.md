# 2026-11-10 — Google Play workflow_dispatch versionCode input fix (PR #270)

## Incident and reproduction
- Signed AAB manual GitHub Actions runs #4 (42764097270) and #5 (42766158542) passed npm installation, web tests/build, and Android asset synchronization, then failed in `Validate requested Play versionCode` before signing.
- Both runs received `MOVO_ANDROID_VERSION_CODE: 1.0` when an integer was intended. The workflow used `workflow_dispatch.inputs.version_code.type: number`, which serializes the GitHub UI input as a floating-point string, while `^[1-9][0-9]*$` intentionally rejects decimal strings.
- Pull-request CI with disposable signing key passed on the earlier release workflow; that is not evidence that production secrets are valid or a real signed Play AAB exists.

## Minimal corrective change
- Switch only the manual dispatch input to `type: string`. Leave required input validation and upper bound 2100000000 intact.
- Do not normalize a fractional number or broaden the validator. Prompt the owner to enter an unused whole-number Android versionCode, which is distinct from visible `versionName` and GitHub run number.
- Preserve main-only workflow dispatch, protected `google-play-release` environment, secret masking, signing checks, manual Play Console upload and 7-day artifact retention.

## Validation and release gates
- PR required checks: documentation per implementation commit, Phase 1 CI, disposable-key Google Play signing test, financial tenant isolation as applicable.
- After merge, rerun the manual workflow on main with a string whole number and confirm `Validate requested Play versionCode`, keystore decoding, release Gradle bundle, jarsigner verification, and signed AAB artifact all succeed.
- Do not upload/enable paid billing or claim Play production readiness until hardware Android testing, offline/cloud accounting acceptance, licensing/purchase verification, data-safety/listing and Google Play production eligibility are verified.
- No UI or production database changes; Vercel visual testing is not applicable to this input-type patch.

## Reversal
- Revert the commit if GitHub's string input misbehaves; the release pipeline otherwise remains unchanged. Never paste signing secrets in logs or the repository.
