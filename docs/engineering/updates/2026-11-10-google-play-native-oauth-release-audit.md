# 2026-11-10 — Android OAuth deep-link and Google Play release audit

## Scope
Google Play-only pre-release hardening for MOVO. No production Supabase or Vercel changes, no purchase enablement, no secrets, and no app-store upload.

## Changes
1. Android `MainActivity` now declares browser `VIEW` intent filters with `DEFAULT` and `BROWSABLE` for *only* `movo://auth-callback` and `movo://log`. These match `src/lib/native.js` and `src/lib/financeRepository.js` current handlers. A missing native manifest declaration previously prevented Android from resolving the OAuth return URI. PKCE and error validation remain in JavaScript; custom scheme collisions are not cryptographically prevented and native-device return testing is still mandatory.
2. Node/Jest regression tests verify both intent filters, absence of broad `movo` catch-alls, backup exclusions, and manifest XML validation.
3. Google Play product documentation matches `src/lib/store-products.json`: Pro monthly/annual and Pro+ monthly/annual, not retired Max/Ultra labels.
4. New detailed Google Play NO-GO release report under `docs/audits/2026-11-10-google-play-release-audit.md`.

## Verification
- Main baseline `b914b35494a934869726e2c32a7f676a9130c9d2`; exact four changed files built in isolated Vercel Sandbox.
- `npm ci`; `npm audit --omit=dev` zero reported vulnerabilities; `CI=true npm run build` passed 185 suites / 1,123 tests and optimized CRA output.
- `CI=true npm test -- --runInBand src/lib/androidManifestRelease.test.js src/lib/native.test.js` passed 2 suites / 10 tests; AndroidManifest parsed as XML.
- Static sandbox browser smoke in 390px and 1280px viewports loaded with HTTP 200, no JavaScript page errors or document horizontal overflow. This is a static web smoke only, not Android Play device proof.
- GitHub-native Android CI / main preview must be independently green on this PR's exact commit before merge.

## Outstanding release blockers
Signed publisher-controlled AAB, Google Play Console testing, 14 authenticated-callable Supabase privileged functions review, owner-scoped hybrid sync / offline reversals (#261 draft), Google-only billing configuration split, RTDN subscription and encryption/retry secrets, Play financial declaration/data safety/account deletion/legal and distribution testing. Do not claim Google Play production readiness until fully verified.
