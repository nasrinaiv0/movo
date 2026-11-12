# MOVO Google + email sign-in recovery — 2026-11-12

## Progress record (created before implementation commits)
- Checked the **active MOVO** Supabase project: `cjsjmorqvuvvwbfyztiz`. No database, users, service keys or production Auth settings were changed.
- Supabase Auth logs in the latest available 24-hour window include Google provider redirects and login events, and a limited email login event; this proves some traffic reached MOVO Auth but does **not** prove all installed Android versions work.
- Checked Vercel variable *names* for MOVO; public `REACT_APP_SUPABASE_*` entries exist, but protected values/provider state cannot be validated from this inspection. Vercel production settings are separate from the GitHub Actions signed AAB build.
- Source inspection: `scripts/validate-android-auth-config.cjs` validates URL shape and public key role, but currently permits a URL for an **unrelated Supabase project**. Signed AABs embed `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY` from the GitHub **google-play-release** environment.
- `AuthPanel` displays generic OAuth, email-send and OTP errors; it does not distinguish missing provider, SMTP delivery, invalid API key, rate limit, or network failure.
- The reviewed OTP email file in `supabase/templates/otp-email.html` does **not** automatically deploy to Supabase Auth templates. The 2026-11-09 update documented a live template rendering failure; we cannot assume that configuration is resolved.

## Proposed minimal fix
1. Fail signed Android builds when `REACT_APP_SUPABASE_URL` targets any project other than MOVO, and reject mismatched legacy anon JWT project-reference claims.
2. Surface **safe actionable** provider/email errors without showing raw messages, tokens, headers or user information; keep consent and OTP throttling intact.
3. Add deterministic regression tests, preserve all 11 supported translations for new messages, recheck Android/mobile login code paths and provide a no-secret dashboard setup checklist for Google redirect and Supabase Email OTP template.
4. Keep changes on a PR; no production deployment, merge or signed store publication before required CI, preview and device verification.

## Environment gates — manual operations
- **Supabase MOVO Auth > Providers > Google:** enable Google, use the Google OAuth **Web application** client ID/secret in **Supabase Auth** (Vercel `GOOGLE_CLIENT_ID` is not sufficient).
- **Google Cloud Auth Platform:** add the precise Supabase callback `https://cjsjmorqvuvvwbfyztiz.supabase.co/auth/v1/callback` as authorized redirect URI. Use MOVO origin where applicable.
- **Supabase Auth > URL Configuration:** allow canonical `https://movo.nasrinai.com` and native `movo://auth-callback`, rather than broad untrusted wildcards.
- **Supabase Auth > Providers > Email and SMTP:** verify email enabled; configure working production custom SMTP and correct sender, limits; publish the reviewed **Magic Link** OTP template `supabase/templates/otp-email.html` to the MOVO project.
- **GitHub > Settings > Environments > google-play-release:** `REACT_APP_SUPABASE_URL` must be `https://cjsjmorqvuvvwbfyztiz.supabase.co`; `REACT_APP_SUPABASE_ANON_KEY` must be the **public key from that project**. Never place a service role or secret key in an app.
- After gates pass, manually build a higher-version signed AAB and test real-device Google OAuth return, OTP delivery/verification, persisted session and account isolation.

## Exact-head CI repair\n- Initial 2026-11-12 CI found precisely seven new UI keys absent from the 11-language catalogue, failing the translation coverage test. Full regression had 1,277 tests pass and one translation coverage failure; finance tenant-isolation passed. Added seven 12-column catalogue entries in `src/i18n/catalog/ui-2026-11-12-auth-recovery.js`, preserving the mandatory coverage gate. The normal Phase 1 PR CI also now runs the signed Android public-auth configuration contract tests (`node --test scripts/validate-android-auth-config.test.cjs`) before dependency audit. Translations should receive native-speaker review before public multilingual release.\n- Recheck exact-head CI and Vercel preview after this patch; no green result is assumed.\n\n## Verification record
- Vercel isolated Sandbox creation attempted on 2026-11-12: HTTP 402 `payment_required`. This **blocks sandbox UI testing**, not proof that the app itself is broken.
- No live Google OAuth or email-delivery tests have been performed on a physical phone during this task.
- GitHub CI, Vercel preview status and live provider checks: **pending implementation and checks**.

## Android-only follow-up (2026-11-12, before code changes)
- Owner clarified: MOVO sign-in fails in the **Android app**, not on the website. Keep web/iOS Auth, live provider credentials, SMTP and production data unchanged.
- Read the exact signed Google Play bundle from successful run #43149512317 (artifact `movo-google-play-aab-17`), built at commit `6370248799a4d964bf232eb42c2ca8c8788ae9c5` **before PR #282**. The compiled JS contains `https://cjsjmorqvuvvwbfyztiz.supabase.co` and an active MOVO `sb_publishable_` key verified against MOVO's Supabase publishable key listing. No keys are copied to documentation.
- Compiled AAB includes `movo://auth-callback` in the Android manifest, and both Capacitor Browser/App plugins. These facts rule out wrong URL, wrong public key and missing packaging *in that particular AAB*. They do not prove the version installed on a device, a successful callback, or availability of Android Keystore.
- Supabase's browser OAuth succeeded on the web; do **not** instruct changing the Google Cloud credentials or live SMTP solely due to an Android-only issue. The **Android** `movo://auth-callback` redirect still needs to be present in MOVO Supabase Auth URL Configuration.
- Source finding: `sendEmailCode()` passes a website URL even for the installed Android app, so a code-email *link* returns to the website instead of the Android package. Change only Android to the already-registered native callback; retain web/iOS destinations and six-digit in-app OTP handling.
- Source finding: Android Browser or Keystore bridge failures appear as generic 'OAuth not configured' and email errors. Add safe error classification for native browser / secure-storage errors, and Android-specific regression tests for redirect and callback; retain PKCE and encrypted device-only sessions without plaintext fallback.
- Known limitation: the physical installed release/version, Chrome browser handoff, live allowlist and device-specific Keystore behavior cannot be verified with CI alone. Sandbox creation returned 402. **No merge, AAB publication or production configuration change** before an internal-test device shows both Google and email sign-in working.

## Follow-up implementation record
- Android email link `emailRedirectTo` now uses `movo://auth-callback` so native email links can complete on the installed app; the six-digit OTP verification path remains unchanged.
- Web and iOS email redirect destinations are unchanged. Native Google OAuth already used the custom scheme; it remains PKCE and external-browser based.
- Android Browser launch failures are classified without exposing the OAuth URL/state; native KeyStore/secure-storage failures have a separate safe user message. No plaintext fallback, no logging of OAuth codes or credentials, and no auth bypass added.
- New tests: `src/lib/androidNativeAuth.test.js`, `src/lib/nativeBrowserAuth.test.js`, `src/lib/authErrorCategory.test.js` and `src/components/AuthPanel.test.js`. Three Android-specific messages are included in all 11 supported non-English translations in `src/i18n/catalog/ui-2026-11-12-android-auth.js`.
- For deployment, confirm only Android native return URL `movo://auth-callback` is on MOVO Supabase Auth Redirect URLs allowlist. Do not change the otherwise-working Google Web OAuth client, Email provider or SMTP on this evidence.
- Hold PR until GitHub CI, Vercel preview, Android native compile, same-version signed internal AAB and physical sign-in validation pass. Do not merge automatically. Device testing should confirm Chrome returns to MOVO, OTP arrives and verifies, encrypted session survives restart, and a second identity sees no previous user's data.
