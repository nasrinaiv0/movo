# 2026-11-16 — Less space at the top of every page

## Owner request
"Reduce the padding here at the top across all pages." The screenshot showed the top of Home: the status bar, then the header photo, with the greeting and buttons starting well below.

## Cause
On phones in the browser and the home-screen web app (no top safe area there; the page starts below the status bar), every page had an 18 px top base (`.screen` `padding-top: max(18px, safe-area)`). Home's header photo adds 10 px on top of the same base (`--hero-pull`).

## Change (`src/App.css`, last block)
- The shared base is 8 px on phones. Every page's header and Home's greeting and buttons move up 10 px, and they stay aligned with each other.
- Measured (dark, 430 px):

  | Page | Before | After |
  |---|---|---|
  | Home buttons | 28 px | 18 px |
  | Wallet, Transactions, Menu buttons | 28 px | 18 px |
  | Settings title | 40 px | 30 px |

- Devices that report a top safe area still keep at least that inset.
- Unchanged:
  - the iPhone app (`native-chrome`), whose page offset reserves room for its own glass top bar (`GlassChrome.swift`, 56 pt + 14 pt);
  - tablet and desktop layouts.

## Validation
- Browser measurements before and after on Home, Wallet, Transactions, Menu and Settings, plus screenshots. No console errors.
- Jest full suite, `tsc`, strict build.
- Not done: no device check. If the iPhone app also needs less top space, that is a change to the native bar's height in `GlassChrome.swift` and needs an iOS build.

## Rollback
Remove the "Less space at the top of every page" block at the end of `App.css`.
