# MOVO Android Chrome → Auth Test return diagnostic · 2026-11-15

## Evidence before commit
The Android user again confirmed Google account selection completes but the MOVO session never starts. At 2026-11-15 00:50 UTC (08:50 Philippine time), Supabase edge logs show two Android authorize and two Google callback HTTP 302 events using requested `movo-authcheck://auth-callback`. There are no matching POST /auth/v1/token exchanges. Server edge logs do not include the final Location header and cannot tell if Android received the URI. PR #304 is already merged into main (`79be04b6b48c2eace513308b7ba4386b78758afb`) by another actor.

## Scoped implementation
Create a static staging-only HTML page under `public/android-oauth-handoff-test.html` with:
- Standard `movo-authcheck://auth-callback` *without any code*, matching the Auth Test app's registered scheme.
- Chrome `intent://auth-callback#Intent;scheme=movo-authcheck;package=com.nasrinai.movo.authcheck;end` explicit package alternative.
- Fixed human-readable result instructions. The expected in-app error `OA-NO-CODE` is benign for this diagnostic.
- No JavaScript, browser storage, passwords, tokens, URL parameters, external script calls or form submissions.

## Acceptance and next decision
On affected Android phone use **Chrome** (not an in-app browser) to load the Vercel preview's diagnostic page and click the first link; if it succeeds, Auth Test should open and show OA-NO-CODE. If not, test the second link and inspect installed app/Chrome association. If both work but Google OAuth still fails, confirm the exact redirect `movo-authcheck://auth-callback` is present under **Supabase Authentication → URL Configuration → Redirect URLs**, alongside original `movo://auth-callback`. Configuration is NOT readable or writable through this inspection, so no verification claim or mutation is made.

Do not merge this diagnostic page, upload an AAB, change main/production/Supabase secrets or reset user data. Passing a no-code handoff test does not prove Google session exchange.