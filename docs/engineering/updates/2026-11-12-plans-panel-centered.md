# 2026-11-12 — Plans panel as a centered pop-up

## Request
Owner, with a screenshot of "Upgrade MOVO" rising from the bottom: "this should be centered to the screen".

## Change
- `src/components/PlanOffer.js`: the plans panel's `Sheet` gets `center`, so it opens as a dialog (the same as the
  transaction details) instead of a bottom sheet. The close button stays; the drag handle goes, as on every
  centered dialog. The "Local mode active" sheet is unchanged.
- `src/App.css` (appended block, plus the transaction-details backdrop rule now also matching `.plan-panel`):
  - The pop-up sits at the middle of the screen with equal space above and below. Both gaps are
    `max(16px, safe-area top, safe-area bottom)`, so a notch or home indicator does not shift it.
  - Its height is capped at the screen minus those gaps. When it does not fit, the panel scrolls and the
    Continue button stays pinned inside the rounded corners.
  - No bottom safe-area padding, because the panel no longer touches the screen edge.
  - No border. In light mode a soft shadow sets it apart, in dark mode a deeper one.
- No change to plans, prices, purchase or entitlement logic.

## Validation
- Jest 219 suites / 1,320 tests and `tsc --noEmit` pass. The strict build compiles.
- Playwright, Settings → Plan & Usage → Upgrade, free account. Measurements in CSS px:

| Viewport | Theme | Top gap | Bottom gap | Scrolls | Continue inside panel |
| --- | --- | --- | --- | --- | --- |
| 430×932 | light / dark | 187 | 187 | no | yes |
| 390×844 | light / dark | 134 | 134 | no | yes |
| 375×667 | light / dark | 45 | 45 | no | yes |

- Not run: real iPhone / Android devices, and store prices (the website shows "Price in app").

## Data and security
None. Presentation only.

## Rollback
Remove `center` from the plans `Sheet` and revert the appended CSS block.
