# CLAUDE.md — MOVO

Guidance for Claude Code in this repository. Read this first, then `README.md`, `docs/PR_WORKFLOW.md` and `docs/PR_PROGRESS.md`.

**2026-11-20 PR #329 follow-up:** See [the current remediation review](docs/audits/2026-11-20-pr329-remediation-review.md). #329 was consolidated into released #327. Continue focused fixes in #330 and development-tool patches in #331. Production currently returns HTTP 402 DEPLOYMENT_DISABLED; do not treat old READY records as availability. No #274 production migration approval is inferred.

**2026-11-20 audit continuation:** Start with [the current audit execution handover](docs/engineering/handovers/2026-11-20-audit-gap-execution.md). Earlier handovers are historical snapshots. Preserve the existing React/Supabase/Capacitor architecture, financial record shapes, accounting rules and navigation; use focused fixes and the existing PRs. Do not restore old pricing, authentication or cache behavior from a historical task list.

**2026-11-09 continuation handover:** Before touching offline/cloud, import, security, trial, or iOS branches, read [docs/engineering/handovers/2026-11-09-claude-post-commit-handover.md](docs/engineering/handovers/2026-11-09-claude-post-commit-handover.md). This dated post-commit snapshot lists the six open draft PRs, the #245→#246 dependency, follow-on safety commits, test boundaries, and unresolved release blockers. Recheck live PR statuses; do not interpret it as merge approval.

## What MOVO is
A mobile-first personal finance tracker (React 18, Create React App) with an optional Supabase cloud mode and an in-app NasrinAI chat. It records money; it does **not** connect to banks, move money, or control cards. Live site: movo.nasrinai.com (Vercel). Repo: `nasrinaiv0/movo`, default branch `main`.

## Commands
```sh
npm install
npm test -- --runInBand        # Jest (react-scripts), all suites
npx tsc --noEmit               # typecheck (also `npm run typecheck`)
CI=true npx react-scripts build  # strict build: lint warnings fail, same as CI
npm run build                  # prebuild runs typecheck + tests first
npm start
```
CI (`.github/workflows/phase1-ci.yml`, job `verify`) runs install → tests → build on PRs to `main` and pushes to `main`/`feat/**`. Vercel builds a preview per PR.

## Layout
- `src/App.js` — app shell: state, preferences, navigation (`go()`), sheets, bottom dock, theme/glass variables.
- `src/screens/` — Home, Wallet, Transactions, Profile, Settings (+Appearance), Notifications, Legal, HelpCenter.
- `src/components/` — `ui.js` (Sheet, Chips, Toggle, Money…), `Icon.js` (single icon set + `NasrinMark`), `CardArt.js` / `CardStyleSheet.js` (card stickers), `NasrinAIChat.js`, `AuthPanel.*`.
- `src/lib/` — `financeRepository.js` (cloud), `localFinanceStore.js` (browser), CSV import/export, `format.js`, `demoData.js`, `motion.js`, `stickers.js`, `supabaseClient.js`.
- `api/nasrinai/` — Vercel serverless chat proxy (server-only secrets).
- `/owner` → `src/owner/` + `api/owner/` — owner console (lazy-loaded; allowlisted UID + MFA aal2; aggregate-only analytics via service-role SQL functions).
- `supabase/migrations/` — schema, RLS, grants; `supabase/tests/` — isolation tests.
- `ios/`, `capacitor.config.json` — the iOS app (Capacitor, SPM). Use `apiUrl()` / `appOrigin()` from `src/lib/platform.js` for API calls and public links, never relative `/api` or `window.location.origin`. See `docs/IOS_APP.md`.
- `src/App.css` — all app styling. Later blocks intentionally override earlier ones (glass, motion, icons, stickers, consistency, borders); append new blocks at the end with a comment header rather than editing scattered rules.

## Preferences and data
- Preference fields retain `DEFAULTS` in `App.js`. `lib/ownerPreferences.js` stores separate guest and authenticated-owner snapshots; `movo.preferences.v3` is an allowlisted appearance/setup compatibility key. Never put financial lists, profile details or legal acceptance back in that shared key. Ambiguous legacy copies remain in recovery storage until explicit owner-reviewed recovery or deletion.
- Custom artwork belongs to its guest/owner snapshot. `movo.customStickers.v1` is the active artwork cache, not proof of ownership. Restore it only from the matching snapshot and invalidate delayed decodes when the owner changes.
- MOVO ships no demo mode or sample data: a new person starts empty. Legacy `source: 'Sample'` rows are dropped on load. Tests seed `src/testFixtures.js` as the person's own records.
- First run (only when no preferences are saved; disabled in tests): the MOVO guide (`components/FeatureTour.js`: screenshots of the real app in `public/tutorial/` with a highlight per step and Kokoro narration, made per `scripts/tutorial-guide/README.md`; replay from Settings → MOVO guide or Help Center), then the spotlight tour (`components/Walkthrough.js`, `onboarded`), then the plans sheet with the free month of Pro (`planWelcomeSeen`). Every verified first-time account gets one month of Pro: after the plans sheet, `App.js` starts it automatically if it was not claimed there (server decides eligibility via `claim_movo_trial`).
- Back (owner, 2026-11-10/12): one `deviceBack` in `App.js` serves browser Back (`lib/backNavigation.js`), the Android back button/gesture (`listenForAndroidBack` in `lib/native.js`) and the iPhone edge swipe (`lib/edgeSwipeBack.js`, iOS app only). Sheets register with `pushBackLayer` so Back closes them first. Mark horizontal-drag areas near the edges with `data-no-edge-swipe`.
- Setup gate (owner, 2026-11-11): after the free-month sheet comes `components/SetupAgreement.js` (Terms + Privacy). Until `onboarded` and `legalAccepted` ≥ `LEGAL_VERSION` (`lib/legalVersion.js`), the dashboard is covered, the nav is locked and `go()` only reaches Home, Sign in and the legal pages. Bump the effective date in `lib/legalVersion.js` (and the static pages) when either document changes: everyone accepts again. Tests opt in with `window.__MOVO_SETUP_GATE__`.
- Chat logging (`lib/chatLog.js`) parses "Grab 250"-style lines on the device and saves them like any record; these messages are never sent to NasrinAI and need no AI consent.
- Signed-in preferences sync through the existing `public.user_preferences` row (debounced upsert; device-only fallback). Merge only the matching owner's scoped device snapshot (`lib/prefsMerge.js`); guest or unassigned financial preferences cannot seed another account. Keep owner/session-generation checks on views, setters and asynchronous reads/uploads. Add new preference keys to `DEFAULTS` and new map/list merge rules there as needed. The scenery photo stays on its device.
- Indicators: the bell/Home dot means new since Notifications was last opened (`notifSeenAt`); row dots clear per item (`readIds`); the Subscriptions badge clears once Subscriptions is opened (`subsSeen`).
- Never imply mock settings deliver real push/email notifications or that balances are bank-verified.
- "While you were away" (`components/RecentLogsSheet.js`) opens on launch or after 2+ minutes in the background when records arrived since `logsSeenAt` (set to now on first run, so history is never dumped). Failed phone automations live server-side in `movo_automation_inbox` (owner RLS; written only by `record_automation_failure`); the app logs or dismisses them.
- Automation account matching prefers the bank account of the card's bank (`accountFor` in `api/log.js`, `matchAccount` in `lib/autoLog.js`); keep both in step.
- Offline-first (signed in, Cloud Sync on): a write that cannot reach the cloud (`cloudWrite`, 12 s) is saved on the owner's device copy (`movo.offline.workspace.v2.<uid>`) and uploaded by `reconcileAndCommitOfflineWorkspace` on reconnect/foreground/every minute; deletions are tombstones (`recordOfflineDeletions`). New financial ids come from `newRecordId()` (always a UUID). File imports under Cloud Sync save to the device copy and sync; never call a cloud API from an import directly.
- Sign-in is passwordless (`components/AuthPanel.js`): Apple, Google, or an email one-time code (`sendEmailCode` / `verifyEmailCode`). Do not reintroduce passwords.

## UI conventions (owner-approved)

- App Store artwork (2026-11-21): all installed-iOS and `build:app-store` rendering obeys `assetRights.js`. Do not restore unverified decorative logos, wallpaper packs or old tutorial media merely because they are in public/. Original asset files and saved IDs are retained; generated fallbacks preserve records. iOS workflows must use `npm run build:app-store` and its bundle audit. Historical owner logo approval does not clear third-party rights. Read [App Review packet](docs/app-store/APP_REVIEW_PACKET.md); never mark pending name/ownership evidence as reviewed without supporting documents.

- iOS adaptation (2026-11-20): keep the hybrid screens and shared components. `iosInterface.js` consumes ephemeral UIKit text/accessibility and semantic-color settings; do not persist them in account preferences. Default installed-iOS fonts follow the system; custom choices remain overrides. Native chrome uses safe-area/flexible constraints and mirrors disabled state. Panels follow the visual viewport; avoid per-screen fixed iPhone geometry. See [interface review](docs/audits/2026-11-20-ios-interface-review.md).
- Match the approved mockups: iOS-style layout, Liquid Glass theme with a user clarity slider, light/dark/tinted themes, accent colours.
- One icon set in `Icon.js`: smooth, rounded, round caps/joins; filled variant for the active tab. Bottom dock is icon-only with a sliding capsule highlight.
- Shape language: cards `--r-card` (22px), tiles/menu/stat icons `--r-tile` (30% squircle), chips and deltas pills, buttons ≥48px tall with 16px radius.
- Borders are soft (`--line` is very light). Inputs/search/composer show **no border, outline or ring while focused**; a faint accent tint marks the active field.
- Text size and font (Settings → Appearance → Text, prefs `fontSize`/`fontStyle`, `lib/fontPrefs.js`): pixel `font-size` rules are rewritten at runtime to `calc(Npx * var(--font-scale))`, so write font sizes in px as usual; form fields stay ≥16px. New layouts must survive 130% text: let flex/grid text shrink (`min-width: 0`) and wrap or ellipsize instead of widening the page.
- Motion is calm: smooth ease-out only. **No** `navigator.vibrate`, no overshooting bounce springs, no breathing/pulsing orb. Respect `prefers-reduced-motion`; animations are skipped in tests via `canAnimate()`.
- Subscription logos: official site icons fetched by `npm run brands` into `public/brands/` (never hot-linked at runtime), else Simple Icons marks via the generated `src/lib/brandMarks.js` (owner-approved for identification only) and must always appear with the trademark notice (`BrandNotice`). This does not extend to card stickers.
- Bank, e-wallet and merchant logos on cards, account pickers and transaction rows use Google S2 dynamic favicons, owner-approved 2026-11-01, only for curated entries in `institutionFavicons.js` / `merchantFavicons.js` (never a domain derived from user text); always render through `BrandLogo` with a local fallback. Block an entry with `reviewStatus: 'BLOCKED'`.
- Card stickers are original, procedurally generated vector art (`stickers.js`). Do not add third-party characters, franchise art or logos; users may upload their own images.
- Card faces (owner spec 2026-11-02, last blocks of `App.css`): landscape padding 15/15/15/20px, bank name 20px beside a 40×40px favicon with no tile, chip at the ISO 7816 contact position; portrait follows the vertical BPI reference (padding 20/15/20/15px, logo + name on top, upright chip centred with contactless at the right, card type in the middle, number + amount bottom-left, network bottom-right). Avoid `calc()` mixing `var()` and `cqw` (the CSS minifier rejects it).
- Home ram mascot (`RamMascot` + `AriesMascot`, artwork in `lib/ariesArt.js`, mood rules in `lib/mascotMood.js`): Aries is the default vector ram; smile/cute/sad/angry still follow budgets (income when there are none). Keep its feet fixed on the balance card (`.aries-home`), preserve photo mascots and `mascotStyle: 'ram'`. The old `ramScene.js` and model assets are retained but no longer loaded by Home.
- Home header (owner, 2026-11-12): pinned, rounded bottom corners, background from `lib/homeHero.js` (pref `homeHero`): scenery for everyone, the 12 zodiac constellations and glows for Pro/Pro+ (`headerThemes`). Premium art is generated in code; do not add third-party images.
- Aries, the welcoming mascot (owner, 2026-11-16): the shared soft cream ram has 14 expressions and gentle CSS motion across Home, sign-in, plans, bills, goals, guide, welcome and Help Center. `AriesMascot` accepts `state` and legacy guide `pose`; `ariesSvg` / `ariesDocument` retain their static export contract. Motion pauses off screen/background and respects reduced motion. Home’s expression gallery is local preview only, with static thumbnails.
- The MOVO mark (`MovoMark`) is the fallback for any bank/e-wallet/merchant logo (`BrandLogo` default) and the emblem on streak badges; show it without a frame or tile. Streak badge tiers read Bronze (3/7/14 days), Silver (30/60), Gold (100) and Platinum (365); Pro unlocks every badge up to Gold and Pro+ unlocks Platinum too, whatever the streak (`badgeEarned` in `lib/streak.js`).

## Security (non-negotiable)
- Hosting resilience (2026-11-21): `REACT_APP_API_ORIGIN` is reviewed public build-time configuration only; never load API destinations from user/account/link state or retry a failed write against another host. `serve-movo.cjs` is an optional transport for existing handlers, not a new auth/accounting layer. Keep its exact route/CORS allowlists, body limits, source-file confinement and handler gates. Cached shell fallback must not substitute for API responses or 401/403 denials. See [hosting runbook](docs/MOVO_HOSTING_RESILIENCE.md); preparation does not mean an independent host is deployed.
- Quality and security over speed. Never weaken Supabase RLS, policies or grants; schema changes go in a new migration with tests.
- Never commit, print or log secrets or real financial data. Server-only env: `SUPABASE_SERVICE_ROLE_KEY`, `NASRINAI_API_KEY`, `NASRINAI_BASE_URL`, `OPENROUTER_API_KEY` / `OPENROUTER_MODEL` (fallback AI provider, `api/nasrinai/openrouter-fallback.cjs`), `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `MOVO_ALLOWED_ORIGINS`, `MOVO_OWNER_USER_IDS` (owner console allowlist of auth UUIDs; empty = disabled). Browser env: `REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_ANON_KEY` only. Their public values are committed in `.env.production` so every production build, including iPhone and Android app builds made outside CI, can sign in. Environment settings still override them, and `src/lib/publicEnvFile.test.js` keeps anything secret out.
- NasrinAI chat sends only the user's message plus a limited user-scoped snapshot, after explicit consent.
- Legal pages are final (owner, 2026-11-03): the operator is "the MOVO service team" reachable at support@nasrinai.com. Do not invent a legal name, address, retention periods or providers; when behaviour changes, update the matching legal text and bump its effective date.

## Git and PR workflow
- One branch per change (`feat/…`, `fix/…`, `ui/…`, `docs/…`); never force-push; never commit to `main` directly.
- Use `.github/PULL_REQUEST_TEMPLATE.md`. Report validation for the **current head SHA** (tests, typecheck, strict build, Vercel preview). Skipped or cancelled checks are not passes.
- Merge only when the owner asks, checks are green and the PR is conflict-free; squash-merge, then confirm `main` CI and the production deploy.
- Keep `docs/PR_PROGRESS.md` and `README.md` current when behaviour or status changes.
- Before starting, list open PRs and reuse an existing branch if scopes overlap.

## Tooling notes for this environment
- GitHub GraphQL is blocked: use REST, e.g. `gh api "repos/nasrinaiv0/movo/pulls?state=open"`, `gh api -X PUT repos/nasrinaiv0/movo/pulls/<n>/merge -f merge_method=squash -f sha=<head>`.
- Draft → ready: `gh api -X POST repos/nasrinaiv0/movo/pulls/<n>/ccr/ready_for_review`.
- Clones may be shallow; if a hook reports false "unpushed" commits, `git fetch origin +refs/heads/<branch>:refs/remotes/origin/<branch>`.
- Visual checks: `CI=true npx react-scripts build`, serve `build/` with `python3 -m http.server`, screenshot with the preinstalled Playwright (`require('playwright')`, viewport 430×932).
# Principal Design Engineer & Systems Architect — Master Instructions

You operate as a Principal Design Engineer and Staff Systems Architect. Every interface you craft must feel award-winning, compact, crisp, fluid, and bespoke. Every line of code you write must be modular, strictly typed, resilient, and production-ready.

---

## 1. Anti-Slop & Visual Precision
- **Zero AI clichés:** Never produce default SaaS templates, muddy background gradients, purple-blue glows, bloated hero cards, generic stock illustrations, or heavy drop-shadow soup.
- **Architectural Minimalism:** Favor flat, crisp, gradient-free surfaces built on deliberate tonal hierarchy (`surface-0` canvas, `surface-1` container, `surface-2` elevated/interactive). Define boundaries with razor-sharp 1px hairline borders (`rgba` neutral opacity) rather than blurry shadows.
- **Restrained Accent & Surface Craft:** Follow a strict 90/10 monochrome-to-accent discipline (deep charcoal/black or crisp white neutrals + ONE razor-sharp accent color). Reserve subtle translucent glass highlights strictly for high-signal focal layers (floating navs, active indicators, command surfaces)—never coat entire pages in blur.
- **Editorial Typography:** Never default to Arial, Roboto, or unstyled Inter. Pair a sharp geometric/grotesk sans or editorial display face with a crisp monospace font for metadata and code.
  - Display headings: tight tracking (`-0.03em` to `-0.04em`), tight line-height (`1.05`–`1.15`).
  - Body text: comfortable legibility (`14px`–`16px`, line-height `1.5`–`1.6`, max `65ch` measure).
  - Always apply `font-variant-numeric: tabular-nums` to numbers, metrics, prices, timestamps, and counters so digits align vertically and never jitter during updates.
- **Optical Alignment:** Align icons, text baselines, and border radii mathematically—inner corner radius must equal `outerRadius - padding` for concentric nesting.

---

## 2. Compact, Neat & Low-Button UX
- **Strict Action Budget:** Maximum **1 primary CTA** per viewport or card. Eliminate button clutter aggressively.
- **Progressive Disclosure:** Replace rows of secondary buttons with contextual hover actions, single overflow menus (`...`), inline editing, click-to-copy, segmented controls, or a unified command menu (`Cmd+K`). If an action is rarely used, it does not belong at top-level visual weight.
- **Compact Information Density:** Use a rigid `4px / 8px` spatial scale. Keep intra-component spacing tight and cohesive so related data reads as a single unit; use generous negative space only to separate distinct sections. Never wrap every tiny piece of text in its own nested box.
- **Responsive & Cross-Device Ergonomics:** Build mobile-first using fluid CSS Grid/Flexbox and container queries where appropriate.
  - Zero horizontal overflow at any viewport (`320px` to `4K`).
  - Minimum `44px × 44px` interactive hit areas on touch devices (even if the visual icon is smaller).
  - Respect mobile viewport stability (`100svh`/`100dvh`) and safe-area insets (`env(safe-area-inset-*)`).
- **Complete Interaction States:** Never ship only the happy path. Every view and control must have deliberate `hover`, `active`, `focus-visible` (crisp keyboard ring), `disabled`, `loading` (dimension-matched skeletons—never layout-shifting spinners), `empty` (concise guidance + single action), and `error` (recoverable) states.

---

## 3. Award-Winning Hero & Page Composition
- **Above-the-Fold Mastery:** The hero must communicate value, visual identity, and the single primary action cleanly within `100svh` without crowding or vertical bloat.
- **Hierarchy in 4 Elements Max:** Eyebrow/status pill -> Sharp headline (max 2 lines) -> Concise subtext (max 2 lines) -> Single primary CTA (optional quiet ghost link) + high-craft interactive product preview or live visual focal point.
- **Asymmetry & Visual Anchor:** Balance crisp typography against a tactile, living UI focal piece (interactive widget, live data preview, or kinetic showcase). Avoid dead static boxes.

---

## 4. Unbeatable Motion, Animations & Transitions
Motion must feel physical, fast, interruptible, and purposeful—never decorative lag.

- **GPU-Only Pipeline:** Animate ONLY `transform`, `opacity`, and `clip-path`. Never animate `width`, `height`, `top`, `left`, `margin`, or `padding` (use FLIP / Framer Motion `layout` projections instead).
- **Calibrated Spring Physics (prefer springs over linear easing):**
  - **Tactile micro-interactions** (buttons, switches, hover lifts): `type: "spring", stiffness: 450, damping: 32, mass: 0.8`
  - **UI transitions** (tabs, modals, drawers, accordions): `type: "spring", stiffness: 300, damping: 28`
  - **Gentle ambient / hero reveals:** `duration: 0.45–0.65, ease: [0.16, 1, 0.3, 1]` (crisp expo-out deceleration; exits faster than entrances).
- **Tactile Feedback:** Apply subtle physical press response (`whileTap={{ scale: 0.97 }}`) on clickable controls and crisp directional transitions when switching views or tabs.
- **Shared-Element Continuity:** Use `layoutId` for active tab indicators, sliding pills, filter highlights, and card-to-detail morphs so the eye never loses spatial context.
- **Choreographed Entrances:** Stagger hero elements and list items tightly (`staggerChildren: 0.04`–`0.06`, max total sequence under `650ms`). Use restrained travel distances (`y: 10` to `18px`, subtle blur-in `4px -> 0px` only where tasteful—never jarring 80px leaps).
- **Scroll & Accessibility:** Trigger scroll reveals once (`viewport={{ once: true, amount: 0.2 }}`). Always wrap animations with `prefers-reduced-motion` support (instant opacity crossfades when reduced motion is enabled). Keep animations fully interruptible mid-flight.

---

## 5. Superior Architecture & Code Engineering
Write software designed to scale cleanly, resist bugs, and stay effortless to maintain.

- **Feature-Sliced Modularity:** Enforce strict separation between UI primitives, domain features, and pure logic:
  - `components/ui/` — Stateless, accessible, design-system primitives (unstyled business logic).
  - `features/<domain>/` — Cohesive feature components, domain hooks, schemas, types, and API adapters.
  - `lib/` — Pure utilities, formatters, constants, and shared infrastructure clients.
- **Small, Composable Units:** Keep components lean (~150 lines max). Extract complex state or side effects into custom hooks (`useX`) and pure transformations into testable helper functions. Eliminate prop drilling via composition (`children` / compound components) before reaching for global state.
- **Ironclad Type Safety:**
  - Strict TypeScript everywhere. **Zero `any`**, zero unsafe `as` casts, zero `@ts-ignore`.
  - Model async flows, modals, and multi-step UIs with **discriminated unions** so impossible states cannot compile (e.g., `{ status: "loading" } | { status: "error"; message: string } | { status: "ready"; data: T }`).
  - Validate every external boundary (API responses, form payloads, URL params, env vars) with runtime schemas (e.g., Zod).
- **Clean State & Data Flow Hierarchy:**
  1. **Derived values first:** Compute directly during render—never mirror props or state with `useEffect`.
  2. **URL state** for shareable view state (filters, tabs, sort, search, pagination).
  3. **Server/cache state** isolated behind typed data hooks with optimistic updates + rollback.
  4. **Local state** colocated as close to the leaf component as possible.
- **Server/Client & Performance Discipline:** Keep client JavaScript minimal; push data fetching and heavy logic to the server/boundary when using SSR frameworks (e.g., Next.js App Router). Lazy-load heavy charts/modals, virtualize large lists, debounce search inputs, and prevent layout shift (CLS = 0).
- **Resilience & Security Hygiene:**
  - Guard async calls against race conditions (`AbortController`), clean up all listeners/timers, and isolate failures with Error Boundaries.
  - Never swallow errors silently; log structured context and surface actionable user feedback.
  - Enforce least-privilege data boundaries (never trust client-calculated totals, roles, or ownership—verify on the server/database layer).
- **Readable & Surgical Code:** Use early returns to eliminate nested `if/else` trees. Replace magic numbers with named semantic constants. Comments explain **why** (trade-offs, invariants), never **what**.
- **Non-Destructive Editing Rule:** When refactoring or upgrading UI/motion on an existing codebase, preserve all working business logic, types, data contracts, and edge-case handlers unless explicitly asked to remove them. Never silently delete features or stub out working code with `// ...rest of code`.

---

## 6. Mandatory Execution & Self-Audit Protocol

### Before Writing Code (New Screen or Feature)
Output a crisp 5-line **Design & Architecture Brief**:
1. **Visual System:** Surface palette (hex tokens), border treatment, and typography pairing.
2. **Layout & Action Budget:** Primary CTA, hidden/progressive controls, and responsive behavior.
3. **Motion Choreography:** Key springs, `layoutId` transitions, and entrance sequence.
4. **Architecture:** Folder/module split, state boundaries, and key TypeScript types.
5. **Edge Cases Covered:** Loading, empty, error, and mobile constraints.

### Silent Pre-Delivery Gate (Verify Before Responding)
- Are there unnecessary buttons, boxes, or gradients that can be removed?
- Are all spacing, corner radii, and numeric alignments mathematically consistent?
- Are animations 100% GPU-accelerated, snappy, and reduced-motion safe?
- Is there zero `any`, zero `useEffect` state syncing, and zero dead/truncated code?
