# Android sign-in release gate: isolate deployment secrets from owner billing test (2026-11-12)

## Progress documented before commit
- PR #282 was merged into main at `91142455d673e213d0f9ee4977fbcaa17e4ccf88`; signed Google Play artifact #17 was built before this fix. The installed Android binary has not been verified against a post-merge signed AAB.
- Read `AndroidManifest.xml`, `native.js` and `financeRepository.js`: code handles `movo://auth-callback` and uses the native browser with PKCE, but no live Android device OAuth/OTP login was verified.
- Latest production Vercel build of `3d96b2e` failed 1 of 1,320 tests: `src/owner/ownerApi.test.js` assumes the Google service account variable is missing. That assumption fails when Vercel's real production Google Play billing settings are configured.
- Auth project `cjsjmorqvuvvwbfyztiz` is healthy. Vercel public configuration names exist. GitHub's protected `google-play-release` Android build credentials are distinct and must be checked for each signed AAB.

## Scope
- Test-only fix: save/restore `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` in the billing test's environment fixture and explicitly unset it within the test's `try/finally` scope.
- This reliably exercises the intended missing-setting path without removing live credentials, changing the owner endpoint, leaking secrets, modifying runtime authorization, or impacting billing and native authentication.
- Update this dated record and `docs/PR_PROGRESS.md` in the same commit. No database migrations, live environment changes, or App Store / Google Play changes.


## Follow-up evidence: signed Android versionCode 7 recovered and inspected
- Signed Google Play workflow [run #43180913336](https://github.com/nasrinaiv0/movo/actions/runs/43180913336) completed successfully on `main` at `3d96b2e` (after PR #282). Artifact `movo-google-play-aab-28` (artifact ID `13925439791`) contains `app-release.aab` and expires 2026-11-19.
- Independently extracted the AAB and inspected its compiled main.js and protobuf AndroidManifest.xml. `versionCode=7`, `versionName=1.0`, `applicationId=com.nasrinai.movo`. Compiled assets contain MOVO Supabase URL and `movo://auth-callback`; manifest declares the native callback host.
- Confirmed the single embedded `sb_publishable_` public key matches an **enabled** key returned by MOVO's connected Supabase project, comparing only fingerprints without exposing the key. `jarsigner -verify` returned `jar verified.` and exit code 0 (warnings about JAR reader differences were present; this is not device testing).
- There is therefore **a valid post-merge signed AAB**. Do not claim that #17 is the latest or regenerate unnecessarily. The device's installed version and Google Play track distribution remain unknown.
- Both exact-head GitHub CI checks on initial test-fix commit `88075ce` were green; Vercel preview still blocked by the deployment/account-level gate. Updating documentation creates a new exact head that must be rechecked before merge.
- Action: verify whether Android versionCode **7** is installed through the testing track. If not, distribute the already signed AAB #28 to internal/closed testing if Play has not already consumed that versionCode. If already installed and sign-in still fails, gather the **on-screen sanitized error category** and check Supabase redirect allowlist/native browser and secure storage on a real device. Never uninstall or clear data before backing up local-only records.

## Verification and release gates
- Before commit: reviewed exact failing Vercel assertion and billing readiness condition; verified fixture save/delete/restore anchors and Android callback URI shape. These are static checks, not full CI.
- Pending: exact PR head Jest, TypeScript, translation, production CRA build, Android Gradle compilation, Vercel preview, security checks and native device acceptance.
- In MOVO Supabase Auth URL Configuration, confirm `movo://auth-callback` is an exact allowed redirect. Preserve web Google OAuth credentials and SMTP.
- Build a fresh signed AAB from reviewed main with a Play-unused higher versionCode after CI succeeds; upload to internal/closed testing first. Test Chrome Custom Tab return, Google and email OTP, encrypted session after restart, account isolation, offline and failure states on a physical Android device.
- **Do not merge/publish** until required checks and verified Android device sign-in pass.
- Rollback: revert this single test/docs commit. No runtime rollback or data migration is needed.

## Security and evidence limits
- The fixture never serializes real service-account content. Existing test asserts API outputs expose setting names only, never values.
- Vercel's previous failed build is a documented fact; this PR's own CI, Vercel deployment and Android sign-in results are not presumed green.
