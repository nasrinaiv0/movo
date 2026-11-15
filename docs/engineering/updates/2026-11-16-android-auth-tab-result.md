# Android Auth Tab result handling

The confirmed `1.0-authcheck-authtab` build returned to Sign in. At 02:51 Manila on November 16, Supabase accepted the Auth Test return route and issued an S256 PKCE code, with no token request. The outgoing redirect headers and the device's activity result were unavailable.

The previous implementation redispatched the Auth Tab result as a synthetic new intent and gave no feedback for a cancellation, an empty result, or a rejected callback. Use the existing MOVO bridge to deliver the activity result directly to the app's OAuth handler. Keep the existing intent handling for email links and older browsers. Display fixed labels for browser cancellation (`OA-BROWSER-CLOSED`), callback rejection (`OA-CALLBACK`), and a missing PKCE verifier (`OA-VERIFIER`). Credentials, codes, and redirect URLs are never logged or printed.

The 44 focused tests passed, covering the shared parser and exchange handoff, duplicate callbacks, and canceled or malformed results. The exact-head Auth Test APK and native compilation are the next gates. The PR needs one physical Android sign-in and session restoration test. Roll back by reverting this commit and rebuilding the APK. Production settings, Play releases, and user data are outside this change.
