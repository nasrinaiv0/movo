# CLAUDE.md — MOVO

Guidance for Claude Code in this repository. Read this first, then `README.md`, `docs/PR_WORKFLOW.md` and `docs/PR_PROGRESS.md`.

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
- `supabase/migrations/` — schema, RLS, grants; `supabase/tests/` — isolation tests.
- `src/App.css` — all app styling. Later blocks intentionally override earlier ones (glass, motion, icons, stickers, consistency, borders); append new blocks at the end with a comment header rather than editing scattered rules.

## Preferences and data
- UI preferences live in `localStorage` key `movo.preferences.v3` (`DEFAULTS` in `App.js`; v2 is migrated). Add new keys to `DEFAULTS`.
- Custom sticker uploads: `movo.customStickers.v1` (device only).
- MOVO ships no demo mode or sample data: a new person starts empty. Legacy `source: 'Sample'` rows are dropped on load. Tests seed `src/testFixtures.js` as the person's own records.
- First-run tour (`components/Walkthrough.js`) shows once, only when no preferences are saved (`onboarded`); it is disabled in tests.
- Chat logging (`lib/chatLog.js`) parses "Grab 250"-style lines on the device and saves them like any record; these messages are never sent to NasrinAI and need no AI consent.
- Signed-in preferences sync through `public.user_preferences` (debounced upsert; device-only fallback). Add new preference keys to `DEFAULTS`; they sync automatically. On sign-in the account copy is merged with this device's cache (`lib/prefsMerge.js`), never replacing it; add new map/list keys there. The scenery photo stays on its device.
- Indicators: the bell/Home dot means new since Notifications was last opened (`notifSeenAt`); row dots clear per item (`readIds`); the Subscriptions badge clears once Subscriptions is opened (`subsSeen`).
- Never imply mock settings deliver real push/email notifications or that balances are bank-verified.

## UI conventions (owner-approved)
- Match the approved mockups: iOS-style layout, Liquid Glass theme with a user clarity slider, light/dark/tinted themes, accent colours.
- One icon set in `Icon.js`: smooth, rounded, round caps/joins; filled variant for the active tab. Bottom dock is icon-only with a sliding capsule highlight.
- Shape language: cards `--r-card` (22px), tiles/menu/stat icons `--r-tile` (30% squircle), chips and deltas pills, buttons ≥48px tall with 16px radius.
- Borders are soft (`--line` is very light). Inputs/search/composer show **no border, outline or ring while focused**; a faint accent tint marks the active field.
- Motion is calm: smooth ease-out only. **No** `navigator.vibrate`, no overshooting bounce springs, no breathing/pulsing orb. Respect `prefers-reduced-motion`; animations are skipped in tests via `canAnimate()`.
- Subscription logos: official site icons fetched by `npm run brands` into `public/brands/` (never hot-linked at runtime), else Simple Icons marks via the generated `src/lib/brandMarks.js` (owner-approved for identification only) and must always appear with the trademark notice (`BrandNotice`). This does not extend to card stickers.
- Card stickers are original, procedurally generated vector art (`stickers.js`). Do not add third-party characters, franchise art or logos; users may upload their own images.

## Security (non-negotiable)
- Quality and security over speed. Never weaken Supabase RLS, policies or grants; schema changes go in a new migration with tests.
- Never commit, print or log secrets or real financial data. Server-only env: `SUPABASE_SERVICE_ROLE_KEY`, `NASRINAI_API_KEY`, `NASRINAI_BASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `MOVO_ALLOWED_ORIGINS`. Browser env: `REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_ANON_KEY` only.
- NasrinAI chat sends only the user's message plus a limited user-scoped snapshot, after explicit consent.
- Do not invent legal details (operator identity, retention, providers); the legal pages flag them as incomplete.

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
