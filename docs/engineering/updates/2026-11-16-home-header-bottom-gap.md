# 2026-11-16 — Home header: less space under Total balance

## Owner request
"Reduce the padding here." The owner's screenshot showed the scenery visible below the Total balance card, at the bottom of the Home header.

## Cause
Inside the header block (`.home-hero-block`), the gap below the card was 28 px: the header's own 14 px bottom padding plus the balance card's 14 px bottom margin.

## Change (`src/App.css`, last block)
- The balance card has no bottom margin inside the header.
- The header keeps 10 px of bottom padding, so the card sits close to the rounded bottom edge (28 px header corners, 22 px card corners).
- The cards below Home's header move up by the same 18 px.
- When the header stands alone (balance not first, or while customizing), nothing changes.

## Validation
- Measured in the built app with sample data, dark at 440 px and light at 375 px: the gap went from 28 px to 10 px. Before and after screenshots taken.
- Jest full suite, `tsc`, strict build.
- Not done: no device check. The top inset differs inside the iOS app, but the bottom of the header does not depend on it.

## Rollback
Remove the "Home header: less space under Total balance" block at the end of `App.css`.
