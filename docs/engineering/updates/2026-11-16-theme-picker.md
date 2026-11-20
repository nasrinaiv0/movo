# 2026-11-16 — Theme picker: one clean look in Profile and Settings

## Owner request
"Fix this in all settings." The screenshot showed Profile → App Appearance:
- a square grey strip behind the rounded Light / Dark / System / Custom tiles;
- the selected tick hanging over the tile edge;
- a dark "Light" swatch in dark mode.

## Findings
The same `ThemePicker` (`screens/Settings.js`) appears in Profile → App Appearance and Settings → Appearance (Theme).
- **Grey strip:** a shared segmented-control rule gave the picker group a `--surface-2` background. The Appearance page cancelled it, but Profile did not.
- **Swatch colours:** a catch-all "control text inherits its colour" rule outranked the swatch colours, so icons took the label colour. The sun was invisible in dark mode; the moon and palette were invisible in light mode.
- **Light swatch:** it had no colour of its own.
- **Selection:** shown differently on each page (grey tile vs. border), with the tick on the outer corner.
- The other pickers on these pages (navigation accent, home header, background, font, text size, app icon) were checked in light and dark and have no such problem.

## Change
- The picker group has no background on any page.
- Each swatch is a true preview in both themes:
  - Light: light tile, dark sun;
  - Dark: near-black, white moon;
  - System: split dark and light;
  - Custom: the accent.
  
  The swatch colours are marked important over the inherit rule.
- **Selection:** an accent ring on the swatch, a bold label, and the tick inside the swatch's top-right corner (top-left in right-to-left languages). No grey tile behind it.
- The label is its own element and ellipsizes at large text sizes.

## Validation
- Picker screenshots before and after: Profile and Appearance, dark (Dark and System selected) and light (Light selected). No console errors.
- Jest full suite, `tsc`, strict build.
- Not done: no device check.

## Rollback
Revert the commit. One CSS block plus the badge moving into the swatch in `Settings.js`.
