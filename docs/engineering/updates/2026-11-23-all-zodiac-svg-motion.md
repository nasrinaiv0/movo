# 2026-11-23 — Animated SVG zodiac lineup

The thirteen sign-in mascots now render in SVG. Both Aries designs keep their existing shared motion. The eleven remaining guardians use their character-specific body keyframes inside an SVG group and a separate hand-drawn vector effect that appears during the gesture. Each SVG crops its artwork from the same bundled atlas. Sign-in remains decorative, monochrome and compatible with browser and native iOS Reduce Motion.

Node 26.13.1 passed type checking, all 266 Jest suites and 1,772 tests, the production build and offline packaging. The sign-in regression checks order, both Aries components, eleven SVG crops and separate body and effect nodes. Rendering every nested SVG crop preserved the source alpha and premultiplied color within one channel value.

The separate reference-matched alternate collection contains twelve fresh artwork variants. The downloadable package contains all thirteen current designs and twelve alternate designs as self-contained animated SVG files. The two contact sheets and all twenty-five SVG documents were decoded and checked. The alternate designs are delivered separately from the sign-in lineup.

The change uses the existing bundled asset URLs. It adds no networking, account behavior, entitlement or persisted data. Revert this change to return the eleven non-Aries characters to their former background-image renderer.
