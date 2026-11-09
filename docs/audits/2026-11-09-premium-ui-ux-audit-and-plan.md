# 2026-11-09 — Premium UI/UX, motion and performance: audit and phased plan

Owner brief: "MOVO — Premium UI/UX, Animation & Performance Engineering", sections 1–10, plus section 11. Section 11
(log out and delete confirmations) is implemented in PR #262. Section 5 (hybrid sync), startup cache hydration for
signed-in owners and OTP auto-submit are in the owner's draft PR #261 and are **not** duplicated here.

Everything below was measured on `main` + #262 (`467ef3d`), unless noted:
- the production build;
- Playwright (Chromium) at 320×640 and 390×844, reduced motion, 40 local transactions seeded;
- greps over `src/`.

Nothing in this document changes code.

## Findings

### 1. Global UI

| # | Finding | Where | Evidence |
|---|---|---|---|
| 1.1 | **Menu scrolls sideways.** The page is 408px wide at a 390px viewport (also +18px at 320px). | Streak badges in `App.css` (≈4079–4125). | Badges are 44px in 41px cells (`.streak-badges li` scroll 44 > client 41). The shine/tier layers push `.screen` to 408px. |
| 1.2 | **47 `gradient()` uses**, against the "no gradient backgrounds" rule. | `App.css` only. | **Decorative:** plan detail cards (7744–7756), tutorial video (7693–7727), streak tiers (4079–4125), mascot glow (4316), card glass sheen (4593). **Functional:** content fades (`.bottom-fade` 1353, `.screen-header::after` 1359, `.tx-bottom::before` 1390/3522), sticker legibility scrims on cards (1385, 3153), and split-colour theme swatches (253, 312). |
| 1.3 | **344 `box-shadow` and 294 `!important`** in one 7,983-line `App.css`. Later blocks override earlier ones by design (CLAUDE.md). This makes spacing, shadows and button colours hard to keep consistent. | `App.css` | grep counts. |
| 1.4 | **15 uses of `--spring-bounce`** (`cubic-bezier(.34,1.56,.64,1)`, which overshoots). CLAUDE.md forbids overshooting springs. | e.g. `.donut-hole` 590, `.nav-item.nav-active .nav-icon` 615, `.nav-dot` 617 | Some may already be overridden by later blocks; each needs checking. |
| 1.5 | Safe areas are handled (`env(safe-area-inset-*)` ×46). No gradient or overflow problems on Home, Wallet, Transactions or Settings. | — | Overflow 0 on those screens at both widths. |

### 2. Hero and dashboard

| # | Finding | Where |
|---|---|---|
| 2.1 | Cold load shows the balance with **zero layout shift** (CLS 0 at both widths). Keep this. | — |
| 2.2 | The balance count-up runs **950ms**, longer than the 250–450ms chart range. It never changes values, only the displayed tween. | `lib/motion.js:10` (`useCountUp(target, duration = 950)`) |
| 2.3 | The mascot does **not** scale on scroll. Home already listens to scroll for the period chip; a rAF-throttled CSS variable could drive `transform: scale()` without re-rendering. | `screens/Home.js:61–64`, `components/RamMascot.js` |

### 3. Motion

| # | Finding | Where |
|---|---|---|
| 3.1 | Durations outside the brief's ranges include: `item-in` .5–.55s, `reveal` 1.2s, `sweep` 1.2s, `pop-in` .6s, `grow` .8s, `fill` 1.1s, `tab-pop` .55s, `nav-in` .7s, `sheet-up` .55s, and `transform .5s` on cards. | `App.css` (grep) |
| 3.2 | Reduced motion is respected (44 `prefers-reduced-motion` blocks plus `canAnimate()`). No `transition: all`. | — |
| 3.3 | The confirmation dialog (#262) already follows the target: 200ms, transform/opacity only. | `components/ConfirmDialog.js` |

### 4. Loading

| # | Finding | Where |
|---|---|---|
| 4.1 | The launch screen is a plain "m" mark plus text. It is shown only until the auth session is read. | `App.js:2335` |
| 4.2 | Signed-out and local users hydrate synchronously: records, accounts and prefs come from `useState` initialisers before the first paint. Signed-in owners load their device copy after the session resolves. **#261 covers this (owner-scoped startup hydration).** | `App.js:308, 332–333` |
| 4.3 | There are **no skeletons** anywhere. Cloud-only panels (bills, planning, crypto, referral status) render empty and then fill in. | grep `skeleton` = 0 |

### 6. Buttons and touch targets

| # | Finding | Where |
|---|---|---|
| 6.1 | **Home: 28 tap targets under 44px.** For example: Hide balances 22×22, Open wallet 34×34, Change mascot 89×16, period segments 46–60×32, See All 63×36. | `screens/Home.js`, `App.css` |
| 6.2 | **Settings switches are 51×31** and are the only hit area (`Toggle` is a bare `<button role="switch">`). | `components/ui.js:20` |
| 6.3 | Wallet "More" is 52×36. Hide balances on Wallet and Transactions is 20–22px. | — |
| 6.4 | Filter chips are 40px, matching the brief. Header controls are fixed at 45px (`App.css` ≈5665). | — |
| 6.5 | One visible button border remains on Transactions (unnamed element; to identify). Every other screen has 0. | Playwright |

### 7. Performance

| # | Finding | Where |
|---|---|---|
| 7.1 | **Main JS is 1.53MB (436KB gzip); main CSS is 543KB (90KB gzip).** The only `React.lazy` is the owner console. App.js statically imports 47 screens and components, including Settings, Legal, Help Center, Financial Planning, Crypto, NasrinAI chat and the scanner sheet (tesseract.js itself is already loaded on demand in `lib/ocr.js`). | `App.js` imports, `src/index.tsx:9` |
| 7.2 | Transactions "See All" renders **every row** (`limit = Infinity` when expanded); no windowing. | `screens/Transactions.js:79–81` |
| 7.3 | Search filters on every keystroke (no deferral). | `components/SearchOverlay.js` |
| 7.4 | Only 4 `memo()` components; transaction rows and card faces re-render with the whole app state. | grep |

### 8. Financial accuracy and security

| # | Finding | Where |
|---|---|---|
| 8.1 | `money()` always formats 2 decimals. However, **22 call sites pass `digits={0}`** and show whole units: Home, Wallet, Transactions, Budgets, Subscriptions, Financial Planning, MoneyFlow, PlanningCard, `ui.js`. The brief says always two decimals. | grep |
| 8.2 | `totalBalance()` and `netAfter()` add floats, then round once at the end. The repo already has `sumMoney()` (integer cents) in `lib/moneyMath.js`; switching keeps every addend exact. | `lib/totalBalance.js` |
| 8.3 | Entitlements are kept in memory only, never in local storage, so offline storage cannot grant a plan. Keep this. | `lib/usePlanEntitlement.js` |
| 8.4 | Browser env uses `REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_ANON_KEY` and `REACT_APP_GOOGLE_PLAY_CLOUD_PROJECT_NUMBER`. The last is a public identifier, not a secret, but CLAUDE.md lists only the first two. | grep |

## Phased plan

Each phase is its own reviewable PR, with tests, docs and Vercel Sandbox runs. None changes accounting rules or data.

1. **#262 — Confirmations (section 11).** Done; awaiting the owner's merge decision.

2. **Correctness and touch fixes** (small, high value):
   - 1.1 Menu overflow: badge cell sizing; clip the shine layer.
   - 6.1–6.3: enlarge hit areas with an invisible `::before` inset, so the visuals do not change.
   - 6.5: remove the remaining button border.
   - 8.2: sum balances with `sumMoney`, plus regression tests for float drift.
   - Tests: a Playwright overflow/touch-target check at 320/390 in Sandbox, run on every PR.

3. **Motion system:**
   - Define `--dur-press 120ms`, `--dur-modal 200ms`, `--dur-page 240ms`, `--dur-chart 360ms` and one ease-out curve.
   - Map 3.1 onto them; drop the 15 `--spring-bounce` uses (1.4); count-up to ~400ms (2.2).
   - Add a consistent `:active` press scale on buttons. Keep reduced motion.

4. **Visual cleanup:**
   - Remove the decorative gradients (1.2) and keep the functional scrims and swatches, subject to the owner's decision below.
   - Introduce shadow tokens (two levels) and collapse duplicate override blocks in `App.css` screen by screen, with before/after screenshots in light and dark at 320/390/430/768/1280.

5. **Hero:**
   - Mascot scale-on-scroll (2.3).
   - Tighten the summary card spacing.
   - Chart transitions within 250–450ms.

6. **Loading** (after #261 lands):
   - Branded launch mark (static plus a short fade, no fake progress).
   - Skeletons only for cloud-backed panels (4.3).

7. **Performance:**
   - `React.lazy` for the secondary screens and sheets (7.1), with a `source-map-explorer` before/after.
   - Windowed "See All" via `content-visibility: auto`, or a small in-house window (7.2); no new library.
   - `useDeferredValue` for search (7.3); `memo` for transaction rows and card faces (7.4).

8. **Section 5** stays in #261, under its own release blockers.

## Decisions needed from the owner

1. **Two decimals everywhere (8.1)?** Including compact amounts on budgets, charts and the hero? Proposal: two decimals for every money value; chart axis ticks may stay whole.
2. **Which gradients may stay (1.2)?** Proposal: keep content fades, sticker scrims and theme swatches. Replace plan cards, streak tiers, the tutorial video, the mascot glow and the card sheen with solid surfaces.
3. **Merge #262** once you are satisfied (CI, Sandbox and preview checks all passed on `467ef3d`).

## Limits of this audit

- Mobile Safari (WebKit) was not run; Chromium only.
- Native iOS and Android were not built.
- Signed-in screens were not measured in the browser (passwordless sign-in to a real inbox).
- Bundle composition was not broken down per module yet.
