# 2026-11-12 — Android sign-in: "not configured" fixed for every app build

## Report
Owner: on Android, Google and email sign-in do not work; the app says it was not configured.

## Cause
Both messages appear only when the app was built **without** MOVO's public Supabase connection
(`REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_ANON_KEY`):
- Google: "Cloud sign-in is unavailable until deployment configuration is completed."
- Email: "Secure cloud sign-in is not configured yet…"

Create React App bakes these values in at build time. They were set only in Vercel (the website), in the protected
GitHub `google-play-release` environment and in Codemagic. Any Android build made another way had no connection:
- Android Studio or a local `npm run build`;
- the `android-build.yml` CI build;
- an older upload.

The signed release run on main at 08:11 UTC today passed its connection check. So the app on the owner's phone came
from one of the other paths, or from an older build. Which build is installed cannot be seen from here.

Checked on the live project (public settings endpoint, with the publishable key):
- Google and email sign-in are enabled; Apple is not (known, owner action);
- the `movo://auth-callback` return link is declared in `AndroidManifest.xml`.

## Fix
- **`.env.production`** (committed) holds the two public values: the project origin and the current `sb_publishable_`
  key ("movo"). Every production build now has them. Values set in the environment (Vercel, GitHub Actions,
  Codemagic) still take precedence, and tests do not load this file. These values are public by design: they ship
  inside every copy of the website's code, and Supabase row-level security protects the data.
- **`src/lib/publicEnvFile.test.js`** keeps the file to exactly those two names. It runs the Android release validator
  (right project, public key) and rejects anything secret (`sb_secret_`, service role, OpenRouter, NasrinAI, private
  keys).
- **`scripts/check-bundled-cloud-config.cjs`** fails a build whose app code lacks the MOVO cloud origin. It now runs in
  the Android CI build, in both Google Play jobs, and in the Codemagic iOS build. The old Codemagic "env required"
  check is replaced by this check on the actual output.
- Docs: `CLAUDE.md`, `codemagic.yaml` comments and `docs/IOS_APP.md` say the Codemagic/GitHub values are now optional
  overrides.

## Validation
- A build with **no** settings contains the MOVO origin and publishable key, and the check passes.
- A build with settings (the mock-server e2e build) keeps its own values, and the check fails on it, as it should.
- `node scripts/validate-android-auth-config.cjs` accepts the committed values.
- The live auth settings endpoint answers with this key: Google and email enabled.
- Jest (new `publicEnvFile.test.js`), `tsc`, strict build.

## Owner action
Install a **new** Android build made after this change is merged to main: run "MOVO Google Play signed AAB (manual)"
and upload it, or rebuild locally. The app already on the phone keeps its old code until it is replaced.
Not run here: sign-in on a real Android device.

## Rollback
Delete `.env.production`, then revert the workflow steps. Builds then depend on environment settings again.
