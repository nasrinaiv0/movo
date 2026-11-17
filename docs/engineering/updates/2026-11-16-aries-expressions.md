# Aries expressions and app journeys

The owner's reference keeps Aries' curled grey horns, cream wool and green scarf. This update softens the shared vector artwork with a round fluffy face and body, tiny arms and short hooves, and adds 14 expressions: welcome, happy, thinking, celebrate, reminder, sleeping, shy, love, focused, surprised, cheering, waving, sad and angry. It extends the existing Aries work on PR #313 rather than creating a second mascot implementation.

## Behavior and paths

- `src/lib/ariesArt.js` and `components/AriesMascot.*`: one fixed-markup SVG character, stable per-instance gradient IDs, gentle CSS movements, optional in-place walking, live reduced-motion handling, offscreen/background pausing. Legacy guide poses and static SVG exports remain supported; receipt and automation props retain their meaning.
- `components/RamMascot.js` and `screens/Home.js`: Aries replaces the WebGL Home ram. Spending thresholds and message semantics are unchanged. A tap waves briefly and opens the existing message/photo chooser. The feet remain anchored to the balance card; the former model assets are retained for rollback.
- `components/AriesExpressions.*`: a 14-state preview in the existing mascot sheet, a pause control, static thumbnails and localized labels. Preview selection does not save preferences or override the real Home mood.
- `components/AuthPanel.*`: welcome while entering email, thinking while requests run, focused for the email code, reminder after errors. Passwordless providers, legal consent, OTP validation and resend behavior remain unchanged.
- `components/PlanOffer.js` / `Plans.css`: expressions respond to Free/Pro/Pro+ selection and pending/error states. Prices and entitlement checks still come from the existing store flow; a happy expression does not verify a purchase.
- `components/BillsPanel.js`, `screens/FinancialPlanning.js` / `AriesPlanning.css`: real current-cycle bills trigger reminders; loaded error-free empty lists show happy Aries. Positive fully funded goals/plans celebrate; incomplete goals stay focused and released allocations do not count.

## Validation

- Node 26.13.1: full Jest suite passes, 240 suites / 1,491 tests. New coverage includes all expression artwork, stable gradient IDs, legacy guide poses, live reduced motion/background pausing, local gallery selection, auth consent/OTP/errors, plan/purchase states, and real bill/goal conditions.
- `npm run i18n` validates 3,117 strings across 11 translated languages; `npm run typecheck` passes; strict production build passes.
- Chromium against the final production build: 32 screen checks across 320/430px, light/dark and 100%/130% text. Each configuration exercised all 14 expressions, plan selection, sign-in consent, the pause control and live reduced motion. Gallery/plan targets are at least 44px; no horizontal overflow or console errors. Home feet stay fixed across animation samples and meet the balance card edge within 0.7px. All requests outside the local preview were blocked; no production account or data was used. Screenshots were visually checked.
- Browser checks found and fixed a previously hidden tapped bubble in scrolled Home and a plans close-button/mascot overlap. The strict Node 26 build and 3 affected suites / 9 tests pass after those CSS fixes. Full-suite JS inputs are unchanged from the 1,491-test run.
- Real iPhone/Android device checks, multilingual translation review, and the exact-head hosted PR preview remain release gates.

## Data, compatibility and rollback

No schema, API, auth, entitlement, RLS, privacy or financial-calculation changes. SVGs contain internally generated vector markup only, with no remote assets or user text in markup. Existing photo mascots, the `ram` preference value, legacy guide pose props and 200×200 static export functions remain compatible. The old 3D model files are retained but no longer imported by Home. Revert this follow-up commit to restore the previous art and Home renderer without changing saved records or preferences.
- `i18n/catalog/ui-2026-11-16-aries-expressions.js` and generated locales: the gallery's labels and explanation in all 11 supported languages.

## Validation

Focused component tests cover rendering, distinct states, stable unique IDs, generated-markup escaping, legacy guide poses, motion preferences/background pause, tap cleanup, gallery-only selection, OTP/consent preservation, plan selection and failed purchases, current bill state and real funded goals. Final full-suite, typecheck, strict-build and browser results are recorded in the PR and central progress register after they finish.

## Data, security and rollback

No API, database, migration, authentication or entitlement changes. No user text enters SVG markup. The artwork uses local fixed paths and gradients, with no image or model request and no per-frame WebGL rendering. Existing saved ram/photo preferences remain valid. Revert this update to return Home to the retained 3D implementation.

## Release checks

Check the built screens at 320/430px, light/dark, 130% text and reduced motion. Real iOS/Android device and store-purchase tests remain release checks; component tests do not establish those results. Translation wording needs normal language review. Do not merge until the owner requests it.
