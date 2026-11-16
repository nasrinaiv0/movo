# 2026-11-15 — Android Google sign-in: return link dropped on WebViews older than Chromium 130

**Owner request:** "Continue and fix the Google sign in of MOVO."

## Evidence (read-only Supabase gateway logs, 2026-11-14 18:00 to 2026-11-15 18:00 UTC; paths, status and user agent only)
| Device (user agent) | `/authorize` | `/callback` | `POST /token` |
|---|---|---|---|
| Android phones with Chrome 156 / 157 (TECNO, Samsung, Infinix, Honor) | 302 | 302 | 200 |
| Affected phone: Huawei NAM-LX9, Android 12; browser Chromium 114 / Chrome 138 | 302 | 302 | never sent |

Email one-time codes work on the affected phone (`/otp` and `/verify` 200), so storage, network and the Supabase
project are fine. The code is issued and the app is reopened, but the app never asks to exchange it.

## Cause
`readAppUrl` in `src/lib/native.js` parsed the return link with `new URL(url)` and required
`hostname === 'auth-callback'` with an empty path. Chromium implemented standards-compliant parsing of
non-special (custom) schemes in version 130. Before that, `new URL('movo://auth-callback?code=abc')` gives
`hostname: ''` and `pathname: '//auth-callback'`. The affected phone's WebView is older than 130 (Huawei's system
WebView is not updated through Google Play), so every return link was treated as invalid and ignored silently.
Jest runs on Node, whose URL parser follows the standard, so tests never saw it. The first version of the parser
(2026-11-02) had the same dependence, so this phone has never completed a browser-based sign-in.

## Change
- `readAppUrl` matches the accepted links by hand:
  `^(movo|movo-authcheck)://(auth-callback|log)/?(?:\?query)?(?:#fragment)?$`. Query and fragment values still go
  through `URLSearchParams`, which behaves the same on old WebViews.
- Kept: 4,096-character limit, one code only, code length and character checks, no `access_token` / `refresh_token`,
  no code in the fragment, `movo-authcheck://log` refused, no fragment on log links.
- Stricter: any control character in the link is refused; the route is case-sensitive; the scheme is not
  (iOS opens `MOVO://…` too).
- `movo://log?…` payment and Siri links are fixed by the same change.

## Tests
- `native.test.js`: the parser is run with `global.URL` replaced by a stand-in that behaves like the old WebView
  (hostname empty, path `//auth-callback`). Sign-in, error and log links are read; spoofed forms are refused.
  These tests fail on the previous parser.
- A second test pins the accepted and refused shapes.
- Jest 233 suites / 1,449 tests, `tsc --noEmit`, strict CRA build.
- Not run: the affected phone; a real Chromium 114 (a downloaded copy could not be run under this session's
  permission rules).

## Security
No change to PKCE, the Keystore/Keychain session storage, the single-use exchange or redirect allowlists. The
parser accepts a strict subset of what it accepted before on current WebViews, plus the same links on old ones.
Nothing from the link is logged or shown.

## Relation to open PRs
- #306 (Auth Tab) delivers its result through the same `readAppUrl`, so on the affected phone that build would
  show `OA-CALLBACK`. This fix does not touch the lines #306 changes.
- #305 (diagnostic) and #295 are unaffected.

## Rollback
Revert the commit. No data, schema or server setting is involved.

## Release gates still open
- A new Android build (Auth Test APK or Play internal test) installed on the affected phone: Google sign-in reaches
  Home and survives an app restart.
