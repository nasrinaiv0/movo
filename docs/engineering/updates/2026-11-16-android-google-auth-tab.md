# Android Google OAuth via Auth Tab

## Evidence

After the PR #306 device test, the owner reported returning to MOVO Sign in after completing Google's form. Supabase recorded two Android Auth Test authorize requests and two Google callback redirects at 02:19–02:20 Manila time on November 16. Both pending flows targeted the exact Auth Test URI and issued PKCE codes. Neither reached the token endpoint. The gateway did not retain the response Location, so these records do not identify exactly where the earlier handoff stopped.

## Implementation

- Android requests a supported browser's Auth Tab for Google OAuth. The native activity receives the complete returned URI as an activity result. It verifies the callback belongs to this package before dispatching it through the existing Capacitor app URL handler.
- The browser launch is limited to a normal HTTPS Google authorization request from the configured Supabase client, with the package's existing callback. Keep the AndroidX Browser version aligned with the Capacitor Browser dependency.
- Android falls back to its existing external Custom Tab if the browser provider does not implement Auth Tab. iOS, web, email OTP, PKCE exchange and secure storage keep their current paths.

## Validation and rollback

Six local browser-selection, native routing and app callback suites passed with 32 tests. The full web test/build and exact-head Android CI, including the isolated APK, are the next gates. On the physical phone with a browser that supports Auth Tab, verify Google returns to Home and the session survives relaunch. The APK should also pass typed email OTP. Synthetic callback tests cannot establish that a device completed real Google authorization. No callback URLs, codes, tokens, passwords, or verifier values are written to logs or UI. Roll back by reverting this commit before building another APK. Production, Google Play and Supabase configuration remain outside this change.
