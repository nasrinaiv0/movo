# Aries motion, personality and Home hero entrance

Owner request (2026-11-22): improve the mascot's motion and character, and add hero motion where it helps.

## Changes

- **Settle-in per expression** (`src/components/AriesMascot.js`, `.css`):
  - The SVG is keyed on the expression, so each mood change replays a short rise-and-fade (0.55 s, ease-out, no overshoot).
  - The visibility observer re-attaches to the new node each time.
- **Idle personality per mood.** Only the head and arms move, so on Home the feet stay planted on the balance card:
  - Hello (welcome): slow look-around.
  - Happy: gentle nod that keeps its tilt.
  - Close to a limit (sad): droop and sigh, with arms easing.
  - Over the limit (angry): a short huff and arm pump every few seconds.
  - The existing expressions keep their own head tilts (thinking, shy, waving and the others), and the surprised peek is kept.
- **Home hero entrance** (`src/components/RamMascot.js`):
  - The first time Home appears in an app session, Aries rises onto the balance card (0.7 s, ease-out) and waves. After 2.4 s it returns to the spending mood.
  - Returning to Home later in the same session does not replay it.
- Reduced motion turns all of it off (existing rules plus the new entrance rule), and tests stay still through `canAnimate()`. No vibration was added.

## Tests

- `src/components/RamMascotHero.test.js` covers three things:
  - the entrance and greeting happen once per session, then Aries follows the mood;
  - every mood has an idle animation;
  - the entrance stops under reduced motion, with no overshoot scale.
- The existing Aries and RamMascot suites are unchanged and pass.

## Data, security, rollback

- No data, preference, API or legal change. Revert the commit to roll back.
