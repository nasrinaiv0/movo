# Sign-in startup repair — 2026-11-11

The entitlement refresh callback changed identity on sign-in/token refresh. App's auth effect depended on that callback via refreshCloud, so a session update could tear down the listener while IndexedDB recovery was awaiting completion. The replacement listener then skipped the same user because cloudAuthUserRef was already set. This could strand startup behind the loading screen.

OTP completion also replaced the full Supabase session with `{ user }` and started cloud refresh independently. That lost the access token needed for entitlement checks and raced the auth listener. The callback now handles navigation only; Supabase's listener owns session initialization. Native OAuth success also leaves the sign-in view.

The entitlement refresher now has stable identity and reads the current session. Concurrent requests for the same owner/token share a bounded promise; an unanswered request expires after the existing 25-second cloud-read deadline so subsequent refreshes can retry. A late response for another owner cannot grant current-account access.

After durable journal recovery, a confirmed or dirty owner-specific device workspace can render immediately while entitlement and reconciliation proceed. An account without that cache retains the first-load gate; another account's records and guest records are never substituted. Paid cloud access still requires server verification.

## Verification

Regression coverage exercises delayed journal recovery using the real entitlement hook, pending cloud checks, token refresh, cross-owner isolation, request sharing, and timeout/retry. Existing OTP, OAuth and offline accounting tests are included in validation.

Vercel Sandbox creation for MOVO returned HTTP 402 `payment_required`. No Vercel CLI is installed, and recent Sandbox sessions are stopped. Sandbox browser/functionality validation and production rollout remain blocked pending resolution of the team's Sandbox billing restriction. Local automated checks do not substitute for that required validation.
