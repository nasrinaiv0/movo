# MOVO — Header button padding and child-page navigation

Date: 2026-11-07

## Scope
- Every real header action receives 0.5px internal padding (top/right/bottom/left), following the global borderless control policy already merged into main. Keep hit target 45px, icons 22px, capsule insets 5px and between-icon gap 4px.
- Cashback and Scheduled show an accessible back-arrow to Menu, their actual navigation parent in the current routing table. The existing RootHeader component gains an optional onBack callback so the two pages retain their large title and Search, Notifications, Settings and Scheduled Plus controls.
- The new back action uses the same existing 45px size and 22px icon. Only these pages wrap actions onto a second row below 360px; unrelated pages remain unchanged.
- The global pseudo-element borderless rule now removes decorative hairline shadows without deleting real borders used by CSS-drawn icons.

## Quality and safety
- App.css only receives scoped CSS changes; real cards, containers, panels, fields, ledger calculations, data and authentication are unchanged.
- Regression checks cover the onBack click callback and Menu destination, preservation of utility actions, unchanged Home header, 0.5px specificity without dimension overrides, small-screen back-button size, and CSS pseudo-icon preservation.
- Validate in Vercel Sandbox with npm ci, focused tests, full test suite, typecheck and build. Merge only after exact-head GitHub CI and visual review if a hosted preview becomes available.
