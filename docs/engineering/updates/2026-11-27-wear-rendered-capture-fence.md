# Wear: correlate native screenshots with asserted action geometry

Contributor: Codex. Recorded before commit, 2026-11-27 UTC. Parent `af6d51a851cd27fda7c8a031ba63a1b1acc2802b`.

## Actual evidence gap

Inspecting final-head small-watch SVG artifact `15233062977` found its enlarged image still showing the initial MOVO heading/subtitle, despite the paired geometry recording a focused window and a fully visible 270 by 179px action at (57,103), scrollY 252. The image contains zero pixels near the action's native background tint. The baseline artifact `15232977133` contains 34,056 matching pixels. A grid in the recorded action's inset bounds yields 0/81 matching samples on the inconsistent frame and 65/81 on the real centered-action frame. Therefore focus, geometry and PNG validity alone did not establish that the captured compositor frame showed the asserted state. This is an evidence synchronization defect; an underlying platform timing cause is not proven and no production layout change is inferred.

## Change and preservation

Strengthen only the native acceptance test. Before saving its successful wear-layout frame, drain the UI queue and obtain the current focused, fully visible action bounds and its actual background tint. Require a real UiAutomation screenshot to contain that tint within the bounds. Allow up to three seconds for the compositor frame, with 100ms bounded sampling and recycling of unmatched bitmaps. At least one quarter of an inset grid must match within a 20-channel tolerance; the real contrasting artifact pair exercises rejection/acceptance of this condition. No offscreen render or injected image is used. A timeout fails acceptance.

Retain all original focus, actual font scale, complete rectangle, round corner, text fit, 48dp and real click/handoff recovery assertions. Failure diagnostics still capture the actual screen unconditionally and preserve the original throwable; optional before-tests startup frames receive no acceptance credit. Bitmaps are released even if writing geometry or PNG evidence fails. No production app, watch interaction, font, padding, dependency, account, permission, API, SQL or financial logic changes in this commit.

## Verification and rollout

The wearable privacy/manifest host contract passed all 12 checks. The pixel condition rejects the actual inconsistent frame (0/81) and accepts the actual centered frame (65/81); whitespace/diff review passed. Local Android native compilation was not available, so fresh exact-head Java compilation and real emulator default/enlarged acceptance on both watch sizes are mandatory before claiming the fix passed. Fresh full CI must verify the final head; superseded runs may be stopped by exact old SHA, without weakening the new head's required matrix.

Vercel now has a READY production deployment from merged #335; an authorized read retrieved its actual MOVO HTML with HTTP 200. A direct request to the canonical domain returned 403/error 1010, so public-domain availability is not certified. This establishes a production deployment path: merging changes that require the missing database capabilities must be coordinated with a safe database rollout. The owner confirms no backup and no secure direct backup connection is configured. Keep both merge/deployment and production DDL held until recovery and migration readiness prevent a broken live rollout. No Vercel, protection, DNS, billing, production record, flag or database setting was changed. This operational hold is missing recovery readiness, not a request to repeat the owner's merge/migration authorization.
