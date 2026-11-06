# MOVO PR #225 — Symmetric header action group spacing

Date: 2026-11-06

## Problem
The user's Home header screenshot showed a Search/Bell/Settings capsule with uneven perceived edge spacing. Existing CSS used a separate Home pill definition, a shared non-Home capsule, and multiple legacy mobile overrides. Their inner padding, gaps, and SVG geometry were inconsistent.

## Scoped fix
- Share 5px capsule insets (all four sides) and 4px gaps between equally sized utility buttons.
- Standardize each visible header utility to a centered 22px SVG inside a 45px round touch target; preserve the accent and current theme, existing hovered/active/focus visuals and unread marker.
- Keep plus actions outside grouped utility capsules with 8px separation.
- Below 360px, the Home pill shifts to a separate right-aligned grid row so the mascot and user greeting are not compressed; never shrink 45px controls. Leave parent iOS safe-area sizing intact.
- No changes to finance functionality, account routing, transaction behavior, accessibility names, policy language, legal compliance or social links.

## Verification
- New src/components/HeaderButtonSpacing.test.js covers shared insets/gap, 45px controls/22px SVG, narrow layout and real callbacks.
- Existing header, Home, Wallet and Transactions regression tests and CI production build remain required.
- Check visual layouts in light/dark/accent modes at 320/344/359/360/390/430 CSS pixels and on the native iPhone header before merging.
