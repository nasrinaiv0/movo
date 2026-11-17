# 2026-11-16 — Menu tool icons: one glyph and colour per tool

## Owner request
"Improve the icons in the menu page."

## Problems found
- **Scheduled showed a sparkle:** Menu asked for an icon named `calendar-clock`, which did not exist, so `Icon` fell back to the spark glyph.
- **Crypto market and Stocks market used the same bar chart.**
- **Five of ten tiles were green:** the "blue" tone rendered green under the accent theme, so tools were hard to tell apart.
- **Glyphs were small:** 18 px in 34 px tiles.

## What changed
- **New original glyphs** in `components/Icon.js`, on the same rounded 24 px grid with round caps and joins:

  | Glyph | Used for | Drawing |
  |---|---|---|
  | `renew` | Subscriptions | circular arrows around a card |
  | `goal` | Plans | target with an arrow |
  | `cashback` | Cashback | coin with a returning arrow |
  | `calendarClock` | Scheduled | calendar with a clock |
  | `planning` | Financial planning | pie chart |
  | `exchange` | Exchange rates | two opposite arrows |
  | `crypto` | Crypto market | cube block |
  | `stocks` | Stocks market | rising line with an arrow |

  Archive and the owner's traced Limits gauge are kept.
- **One colour per tool** (`Menu.js` `mt-*` classes; App.css block "Menu tool icons"):

  | Colour | Tool |
  |---|---|
  | purple | Subscriptions |
  | green | Plans |
  | pink | Cashback |
  | orange | Scheduled |
  | blue | Financial planning |
  | teal | Exchange rates |
  | amber | Crypto market |
  | indigo | Stocks market |
  | grey | Archive |
  | red | Limits |

  Each tile is a solid tint (no gradients). In light the glyph is a deeper shade; in dark it is a lighter one on a stronger tint.
- **Tiles:** 40 px squircles (`--r-tile`) with 22 px glyphs (26 px for the filled Limits gauge) at stroke 1.9.

## Validation
- Jest full suite, `tsc`, strict build.
- Before and after browser screenshots of the Menu grid in light and dark (sample data), with no console errors.
- Glyph preview sheet at 22 px and 44 px.
- Not done: no device check.

## Rollback
Revert the commit. The old icon names still exist in `Icon.js`.
