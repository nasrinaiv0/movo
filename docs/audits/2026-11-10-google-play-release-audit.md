# MOVO Google Play release gate — audited 2026-11-10

## Verdict
**NO-GO for public production.** Audited `main` at `b914b35494a934869726e2c32a7f676a9130c9d2`. Website build is not proof of Android readiness. This commit fixes the Android native callback filter only and corrects the subscription catalogue documentation. It does not upload an AAB, grant production access, enable billing, migrate data, or change Vercel/Supabase.

## Verified
- Android `applicationId` is `com.nasrinai.movo`; `targetSdkVersion=36`, `minSdkVersion=24`; `versionCode=1` is acceptable for the *first* upload only.
- `main` Vercel production deployment for `b914b354` reports READY.
- Isolated Vercel Sandbox, same source SHA: `npm ci`, `CI=true npm run build` completed; 184 Jest suites, 1,119 assertions passed; production dependency `npm audit --omit=dev` reported 0 advisories.
- PR #264 CI green: Android native compile, general suite, local PostgreSQL tenant isolation. Its signed Google Play AAB workflow remains unmerged at audit time and cannot produce an upload without publisher signing credentials.
- Supabase: 43/43 `public` base tables have RLS enabled. Advisors flag 14 authenticated-callable `SECURITY DEFINER` functions for review, plus disabled leaked-password protection; callable does not prove exploitable.
- Native OAuth parser handles `movo://auth-callback` with PKCE token exchange; Android manifest lacked the corresponding browser `VIEW` handler. This commit adds explicit filters for `auth-callback` and `log`, plus tests. Native Chrome / actual OAuth and Play Store device validation are still required.
- `src/lib/store-products.json` contains Pro monthly/annual and Pro+ monthly/annual (4 IDs); old store setup document incorrectly listed Pro / Max / Ultra (6 IDs). Documentation corrected here.

## Critical release blockers
1. **PR #261:** hybrid IndexedDB outbox not wired as all financial writes' source of truth; server operation ID idempotency/CAS and reversals missing; draft and not merge-safe. Complete with two-user RLS/accounting tests, cross-tab and migrations before releasing its architecture.
2. **Signing:** create or recover the Google Play *upload* keystore (do not regenerate if Play already has its certificate), then set all four secrets under protected GitHub `google-play-release` environment. Run signed AAB workflow after PR #264 is merged, validate AAB signature/manifest/package, upload to Internal testing. No signed artifact verified yet.
3. **Billing:** the current production checkout flag is intentionally off. Vercel config inventory lacked `GOOGLE_PLAY_RTDN_SUBSCRIPTION`, `MOVO_IAP_TOKEN_ENCRYPTION_KEY`, and `CRON_SECRET` at audit time. Existing `billingConfigurationIssues()` also requires Apple server credentials even for Google-only checkout; this must be separated and tested before Android paid sales. Google Play subscription IDs/base plans, license tests, purchase ownership, renewals, RTDN, acknowledgment, hold/refund/revocation are not attested by a successful web build.
4. **Device:** Android 15/16 install, cold start, signed-in and signed-out navigation, Google/OTP OAuth redirect, camera receipt scanner, permissions, local/online handoff, financial import, accessibility, dark/light UI, low-memory and airplane-mode tests are not signed off.
5. **Security:** manually review all 14 callable definer RPCs for `auth.uid()` ownership and hostile IDOR cases. Check security advisors again after fixes, leaked-password Auth setting, key management, backups/restore, tenant isolation under hostile request conditions.
6. **Play Console:** complete Data safety, financial features classification, account deletion URL, content rating, screenshots, support details, privacy policy, reviewer instructions, store listing and account verification. Personal developer accounts created after 2023-11-13 require 12 opted-in closed testers for 14 continuous days before production access application; confirm directly in the current Play Console.

## Evidence links
- `https://github.com/nasrinaiv0/movo/pull/264` — clean, green unsigned checks; signed bundle pending.
- `https://github.com/nasrinaiv0/movo/pull/261` — draft sync changes and blockers.
- `https://github.com/nasrinaiv0/movo/actions/runs/42683816527` — Android native build CI.
- Google Play API target: `https://support.google.com/googleplay/android-developer/answer/11926878`.
- Testing: `https://support.google.com/googleplay/android-developer/answer/14151465`.
- Financial declaration: `https://support.google.com/googleplay/android-developer/answer/13849271`.
- Account deletion: `https://support.google.com/googleplay/android-developer/answer/13327111`.

## Go/no-go sign-off
Do not release until every blocker has *dated, verifiable evidence* for the **same AAB/source commit**. Keep billing disabled and do not promote to production based only on these unit tests. A Vercel Sandbox UI smoke test cannot substitute for Android AAB install or Google Play certification.
