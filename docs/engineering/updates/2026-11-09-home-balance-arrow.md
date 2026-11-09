# Home balance box: wallet arrow back at the bottom right — 2026-11-09

## What was wrong
The round arrow on the Home **Total Balance** box (opens Wallet) appeared at the bottom **left**, on top of the
"vs last month" chip. This was a regression from the premium UI pass (#263): its 44px tap-area rule listed
`.balance-go` among the controls made `position: relative`. That selector is an `:is()` list, which takes the highest
specificity of its entries, so it overrode the balance box's own `position: absolute` and the arrow fell into the text
flow under the chip. Production carried the defect from the #263 deploy until this fix.

## What changed
- `src/App.css`
  - The tap-area rule no longer changes the arrow's positioning; the arrow keeps `position: absolute` at
    `bottom/right: var(--box-pad)` and its 44px tap area is centred on it like every other small control. The
    left-shifted tap area written for the wrong position is removed.
  - New last block **Home balance arrow**: right-to-left languages mirror the arrow to the bottom left (their trend
    chip starts from the right; the old right-to-left rule lost to the balance-box rule and left the arrow on the chip).
  - Found while checking the box at every width, text size and direction: the month pill is cut into the top-right
    corner in every language, and at larger text sizes (and in Arabic at any size) it covered the "Total Balance"
    label and made the show/hide eye button untappable. The label row now stops short of the cut, the text shortens
    with an ellipsis before the eye is ever covered, right-to-left languages keep the row on the left, and text sizes
    above the default use the short month ("Nov 2026") in the pill, as phones under 360px already did.
- `src/components/NotchedBox.js`: publishes the measured width of the cut as `--notch-w` for the rule above.
- `src/screens/Home.js`: the label text has its own element (`.balance-label-text`); the pill gets a `short` class
  when the text size is above the default. Both month forms stay in the pill, so its accessible name is unchanged.

## Verification
- New `src/screens/HomeBalanceArrow.test.js` (5 tests) reads `App.css`: no rule may give `.balance-go` any position
  other than `absolute`; the box rule pins it bottom/right and the right-to-left rule mirrors it; the shared 44px tap
  area is centred; the label guard and short-month rules exist. The first three tests fail against the stylesheet on
  `main` and pass with this change.
- New `src/components/NotchedBox.test.js` (2 tests): the cut width is published; an unmeasured box is left alone.
- `src/App.test.js`: the Home balance box keeps the arrow as its last control, it opens Wallet, and the pill is
  short only for larger text.
- Full Jest 184 suites / 1,119 tests, `npx tsc --noEmit` and `CI=true npx react-scripts build` pass.
- Production build in headless Chromium: 14 arrow cases (320/360/390/430/820px, light/dark, largest text, German,
  Arabic) — arrow 17px from the trailing and bottom edges, never over the chip or the amount, tap tests at the
  centre and ±4px pass, no sideways page scroll; 32 label cases (English/Arabic/German/Japanese × 320/360/390/430 ×
  default/largest text) — label and eye clear of the pill and the eye tappable in all of them.

## Known limits
- At 320px with the largest text the label shortens ("Total Bal…"); the eye stays fully tappable.
- At 360px with the largest text and a currency code instead of a symbol ("17.794,05 PHP"), the amount's line box
  and the arrow's box overlap by 4px; the glyphs do not touch the arrow. The arrow position is the one approved
  before #263.
- The long month name in the pill follows the browser language, not the app language (unchanged here).
- Checked in Chromium only; WebKit and native iOS/Android builds were not run.

## Data / security
CSS, one class name and one CSS variable; no data, auth, sync, RLS or API change.
