# 2026-11-23 — Shared motion for both Aries mascots

The new gold-horned Aries uses a layered SVG with the same artwork at rest. Its figure, eyes and free arm share the original lineup Aries' hop, blink and wave keyframes on the same 2.65-second timeline. The gold-horned design raises its free hand into the wave while its spear stays in its other hand. The shared sign-in row continues to respect browser and native iOS Reduce Motion.

The original ram still renders through `AriesMascot`. `GuardianAries` uses one lossless transparent portrait, referenced from several SVG clips with React-generated IDs, so the original colors and painted details remain intact. The other eleven characters still use the original atlas. The SVG download embeds its portrait for standalone playback.

The sign-in regression checks both Aries variants, two independent eye groups, the wave group and all eleven atlas positions. A rendered preview was checked at the start, at the wave and blink, and at the hop. The SVG rest render matches the source alpha and premultiplied color within one channel value.

Node 26.13.1 passed type checking, all 266 suites and 1,772 tests, and the optimized build. The final service worker precaches the matching lossless portrait. Hosted preview and native acceptance are tracked on PR #337.

Revert this follow-up to restore the gold-horned Aries' previous portrait motion. The update has no data, entitlement, sign-in behavior or configuration changes.
