# iOS system-adaptive interface — 2026-11-20

## Purpose

Follow the owner's request for buttons and panels that respond to iOS UI settings, without replacing MOVO's React/Supabase/Capacitor architecture or removing its appearance controls. Extend existing PR #330; keep dependency fixes in #331. This is a hybrid interface with native UIKit navigation, not a conversion of every web control into UIKit.

## Implementation

- `ios/App/App/GlassChrome.swift`: native actions have 44pt minimum targets; dock tabs fill their stack instead of imposing conflicting fixed width/height constraints. Safe-area anchors protect landscape sides. Native titles use the preferred headline text style, update with Dynamic Type and reserve matching header space. System appearance uses `.unspecified`; explicit app appearance remains an override. Reduce Transparency selects opaque system surfaces; Reduce Motion also applies to selection movement. Hidden bars are excluded from accessibility navigation. Disabled state follows the actual web control.
- `MovoNativePlugin.swift`: local interface-preference API/events report Dynamic Type, system semantic panel/field/separator colors, Reduce Motion, Reduce Transparency, Bold Text and Increase Contrast. Updates come from system notifications and successful chrome/theme updates. No identity, financial record, permission, token or network request is included.
- `src/lib/iosInterface.js`: ephemeral device presentation state and keyboard viewport dimensions update shared CSS variables; newer changes win over delayed initial snapshots; listeners and properties are removed on stop. Older binaries retain web/app fallbacks; Android/web do not call the new iOS API.
- `src/lib/nativeChrome.js`: mirror system appearance and disabled states, reject stale/covered taps, discard obsolete icon renders, activate hidden-web chrome only after native success, and preserve a web fallback when the bridge fails. Resolved light/dark changes refresh semantic colors even while UIKit remains in system mode.
- `App.js`, `fontPrefs.js`, `motion.js`: default iOS font uses the system stack; OS text scale multiplies the existing app text preference, inputs retain a 16px floor, and native Reduce Motion reaches JavaScript transitions. Existing custom fonts/themes stay selectable.
- Append-only `App.css`: shared iOS target/height/surface tokens, expanded switch interaction area, content-driven row heights, text-driven Wallet action grid, wrapping switch rows, safe-area and keyboard-aware scrolling panels. No phone-model dimension or new financial layout is introduced.

## Validation and evidence

Node 26.13.1: full regression passes 256 suites / 1,682 tests; focused bridge/font/interface suite passes 23 tests. Type checking and strict production compilation, offline-worker integration and browser measurements are recorded in the [interface review](../../audits/2026-11-20-ios-interface-review.md). The browser test supplies device presentation tokens to an isolated local build; it does not emulate UIKit or prove a real iPhone keyboard. Native builds and simulator/device acceptance must use the newly published exact head.

## Preservation, rollback and gates

No schema, financial data shape, accounting calculation, auth/session storage, backend API, pricing, entitlement or production setting changes. The only bridge extension is device-local presentation. No persistent device-accessibility preference is uploaded to another account. Existing recovery and owner-isolation tests remain intact.

Revert this commit to restore the prior UI behavior; no database/data rollback. Do not downgrade or delete recovery copies. Apple-compiled native verification, physical VoiceOver, very large Dynamic Type, actual keyboard/safe-area behavior and multiple OS versions remain acceptance gates; this is not universal HIG/WCAG certification.

Vercel explicitly rejected production recovery with `402 resource_creation_blocked`: the team has an overdue balance and must add a valid payment method/reactivate billing. Project unpause did not restore HTTP service. Keep hosted acceptance blocked until the owner resolves that provider requirement. No billing charge, plan change, protected-preview link, production migration or store release is included.
