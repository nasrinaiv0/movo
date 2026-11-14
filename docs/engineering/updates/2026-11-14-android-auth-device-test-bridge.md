# Android auth real-device acceptance bridge — November 14, 2026

## Progress documented before the implementation commit

- Owner reports that **both Google and email sign-in still fail on the installed Android app**.
- PR #298 is open at `1057216fafdfc5f4e1479fe90bb8749c012d6099` (base main has since advanced), and its code is **not present** in the installed Google Play release. Prior exact-head Phase 1, Android/iOS, IAP and finance CI are green, but **none proves physical Android login**.
- Live MOVO Supabase project `cjsjmorqvuvvwbfyztiz` is healthy. The checked-in `.env.production` URL matches that project and its public key matches a **currently active** Supabase publishable key. Vercel has React public auth variable names for all targets, which is **not** the same as GitHub signed-Android build configuration.
- Last-24-hour Auth logs show successful OAuth callbacks and PKCE exchanges (platform not provable), but no observed email OTP issuance requests. That does **not** prove the email provider or Android app works end to end.
- PR #298 already includes Android Custom Tab callback and PKCE dedup fixes from PR #295; **do not duplicate risky production auth rewrites without a reproducible device defect**.
- Vercel isolated sandbox provisioning was attempted and rejected with HTTP 402 payment_required. No deployment or production configuration was modified.

## Release deadlock and narrow plan

The existing `android-build.yml` compiles a debug APK but does not upload it. The protected Google Play signed AAB workflow intentionally permits signing on **main only**. This makes it impossible to install PR #298 for pre-merge real-device acceptance without changing the protected release pipeline or publishing unverified code.

Provide one **debug-only**, isolated `authTest` Android variant:
- Android package `com.nasrinai.movo.authcheck`, separate from production `com.nasrinai.movo`; does not uninstall/overwrite the Play app or its local financial records.
- Distinct launcher label “MOVO Auth Test”; uses the same reviewed auth implementation and public Supabase configuration, but never any service role or signing secret.
- PR Android CI builds and validates the isolated package and uploads its debug-signed APK for manual download. Existing unsigned release, production package, iOS, billing, migrations, and protected Play signing stay unchanged.
- The test APK uses the existing `movo://auth-callback` URL. With both apps installed Android may show a chooser; select **MOVO Auth Test** for the callback. If the Play app is a default handler, clear its link defaults on the test phone. Do not change Supabase allowlists to a broad wildcard.
- Never treat a debug APK pass as signed Play release or license-test acceptance. Real Play signing, restart/session persistence, email delivery, Google callback, and logout/tenant isolation still need a reviewed internal-test release at the exact approved commit before production.

## Real-device acceptance checklist (test account only)

1. Download the APK artifact from this PR's exact-head **MOVO Android native security build** after GitHub reports success. Its name begins `movo-android-authcheck-`.
2. Install it on a spare Android phone or separate test profile; keep the Play-installed MOVO app and its data intact. Confirm the launcher says **MOVO Auth Test**.
3. Enable Chrome (or a supported browser), open MOVO Auth Test, accept its Terms/Privacy acknowledgement, and attempt Google sign-in.
4. Confirm the browser opens, Google account selection completes, and `movo://auth-callback` returns to **MOVO Auth Test** with an authenticated session. Do not share callback URLs, tokens or OTPs in bug reports.
5. Sign out, request an email sign-in code for a test inbox, observe an actual **six-digit** email, enter it in-app and confirm a session. If no email arrives, review Supabase Auth Email settings, custom SMTP and the deployed `{{ .Token }}` template; committing the HTML file alone does not publish it.
6. Force-stop/restart the app to verify encrypted Keystore session persistence; sign out; use a second test identity and confirm no previous identity's finances appear.
7. On a separately reviewed same-head Play internal-testing signed build, repeat all steps, including Google OAuth/browser return, OTP and secure session persistence. Only then consider merge/Play release after explicit approval.

## Security and rollback

- No production release, native signing credentials, Vercel/Supabase changes, paid sandbox or DB migration.
- This is a **test harness** and not a claim to have repaired the already-installed app. The shipping fix remains blocked until the reviewed auth code is included in a new signed Android release and verified.
- Rollback by reverting this test-only build type and its CI artifact step; production appId, AAB signing and user data are untouched.
