# MOVO Google Play-only release preparation — 2026-11-10

## Scope
Android Google Play distribution only. This change does not modify iOS code, live billing, Supabase, customer records, or production Vercel. Public release is blocked until explicit evidence completes the checklist below.

## Manual signed-bundle workflow
`.github/workflows/google-play-release.yml` only runs by manual dispatch from `main`. The job uses the protected `google-play-release` GitHub Environment; configure required reviewers and a branch deployment restriction to `main` before adding credentials. The upload keystore and passwords must be created/owned by the publisher and kept outside source control. **Keep a separate backup of the upload keystore and its passwords.**

Environment secrets (GitHub repository Settings → Environments → google-play-release):
- `PLAY_UPLOAD_KEYSTORE_BASE64`: base64 of the **existing** Google Play upload keystore; do not generate a new key if the app already has an established upload certificate
- `PLAY_UPLOAD_KEY_ALIAS`: keystore key alias
- `PLAY_UPLOAD_STORE_PASSWORD`: keystore password
- `PLAY_UPLOAD_KEY_PASSWORD`: key password

On your iPhone after the PR is merged and secrets set: GitHub → MOVO → Actions → **MOVO Google Play signed AAB (manual)** → Run workflow (main). Download the `movo-google-play-aab-<run>` artifact ZIP to Files, extract `app-release.aab`, upload to Play Console → MOVO → Testing → Internal testing. Do not upload the artifact ZIP itself.

The build fails closed without every signing secret. The signed AAB is retained for 7 days; do not share its download link publicly. The workflow never auto-publishes, never enables billing, and never ships to production.

## Release acceptance gates (not completed by adding workflow)
- [ ] GitHub main CI green; workflow signed AAB build successful; confirm `com.nasrinai.movo`, monotonically increasing `versionCode` for each upload, and the Play upload certificate
- [ ] Internal test track installs/runs on Android; Android 15/16 permissions and deep links verified
- [ ] Google OAuth and OTP login/logout tested on real Android including account isolation
- [ ] Local-only mode and offline ↔ cloud reconciliation, idempotency, financial balance exactness, delete and retry tested; PR #261 remains draft
- [ ] Google Play Billing products, base plans, secure server verification, RTDN delivery, renewal, grace, refund/revoke and no unauthorized entitlement pass
- [ ] Production RLS, auth, import/export, receipt scan, privacy and data deletion paths verified
- [ ] Play Data safety questionnaire, financial features declaration, privacy policy, screenshots, content rating, target API and signed artifact complete
- [ ] Applicable closed testing completed before production access is requested
- [ ] Vercel Sandbox UX/web verification on exact reviewed commit and Android real-device tests documented
- [ ] No open release-critical PR/regression, product owner approves production release

## Test evidence and limitations
- Code change: optional env-gated Android Gradle release signing plus new manual GitHub Actions job.
- This PR has no credentials; signed build and Google Play upload **cannot be tested without protected signing secrets**.
- Existing Android native CI still compiles unsigned variants with no signing secrets.
- Vercel Sandbox cannot substitute for signed Android Gradle compilation or Play Console/device verification. This PR does not change web UI.
- Rollback: revert new workflow and optional signing configuration; no database or production migration.
