# 2026-11-17 — Plan-coloured nav icon as a glowing foil, colour-coded icons switch, simpler friend header

## Owner requests
- A screenshot of the active bottom-nav icon (Pro+ platinum). This follows the earlier note "Do not use stipe style. Make it real mix that glows and has animations".
- "Add option in settings to off/on the icons color coding."
- A screenshot of the friend page's two status chips ("Shares a summary with you", "You share a summary"): "remove this".

## Changes
- **Active nav icon in the plan colour (`components/NavTierDefs.js`, `App.css` block "Plan-coloured nav icon").**
  - **Before:** the icon was filled with one diagonal six-stop gradient, which read as stripes.
  - **After:** each paint (platinum and gold, light and dark) is an SVG pattern. It has a soft base and four colour clouds that fade to nothing, so the colours blend like holographic foil. A faint white sheen sweeps across.
  - **Motion:** the clouds turn slowly (a 14s loop) and the sheen drifts (7s). There is no pulsing, and all of it is still under Reduce Motion (`canAnimate`).
  - **Glow:** the icon has a steady two-colour glow.
  - **Unchanged:** the ids the CSS fills with. The iOS native dock still tints the icon with a solid plan colour, because it cannot draw an SVG paint.
- **Colour-coded icons switch (Settings → Appearance → Display & Layout).**
  - It is a new preference, `iconColors` (default on, synced like other preferences).
  - Turned off, the Menu tool tiles and the Profile row tiles turn neutral grey (`.no-icon-colors`), and their shape stays.
  - Category colours keep their own switch.
- **Friend page header (`components/FriendFinanceSummary.js`).** The two sharing-status chips under the friend's name are removed. Your own sharing state is still shown on "Your summary for {name}".

## Translations
Two new strings ("Colour-coded icons" and its description) are in `ui-2026-11-16-charts-friend-page.js`, in 11 languages. The four chip strings were removed.

## Tests
- `NavTierDefs.test.js`: every paint is a pattern of fading clouds, and nothing animates when motion is off.
- `Settings.test.js`: the switch is on by default, and turning it off saves `iconColors: false`.
- `FriendProfile.test.js`: no status chips under the name.

## Visual check
The mock-cloud build was checked at 390 px:
- the old and new active icon in dark and light, captured three times over about 5 seconds;
- Menu with colour-coded icons off;
- the friend page header;
- the new switch.
