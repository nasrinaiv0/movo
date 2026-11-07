# PR #229 — Settings Icon Consistency (2026-11-07)

## Scope and rationale
Home and shared MOVO headers use the solid adaptive gear. Profile's Settings header, Financial Settings row and wide-screen sidebar previously used a different outlined gear. Reuse the existing gearSolid for all Settings destinations, and alias the old gear name to the same artwork in the shared Icon renderer.

## Preservation
All original icon dimensions stay the same: Home 24px, shared header 23px, Profile header 19px, Profile menu 20px and sidebar 22px. Preserve currentColor appearance adaptation, 45px header targets, agreed 0.5px internal padding, layout, accessibility labels and click handlers. The shield for Security & Privacy and sliders for Preferences remain distinct. No data, finance, authentication or policy wording changes.

## Quality gates
New SettingsIconConsistency.test.js tests the canonical/legacy SVG shape, adaptive path fill, real Settings navigation callbacks and all known sources. Run Vercel Sandbox focused/full tests and build, verify GitHub CI, and review light/dark visuals before merging. PR_PROGRESS is updated in the same commit.
