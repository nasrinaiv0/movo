# MOVO — Claude Engineering Handover After Follow-on Commits

**Snapshot taken:** 2026-11-09 (Philippine time)
**Repository:** https://github.com/nasrinaiv0/movo
**Main HEAD observed:** b3c21b75d4a388a2b20611ebff1a991c829d85ad
**Purpose:** Give Claude enough verified context to pick up MOVO after subsequent changes without duplicating work, overwriting financial data, or treating draft code as released.
**Status:** HANDOVER / NOT A RELEASE CERTIFICATION. This file is intentionally on a documentation-only PR. Review live GitHub PR status and CI again before making changes.

## 0. Instructions to Claude: read in this order

1. Read root CLAUDE.md, docs/PR_WORKFLOW.md, docs/PR_PROGRESS.md, and docs/engineering/MASTER_CHANGE_LEDGER.md.
2. Read this dated handover. Treat the commit SHA and check states below as a point-in-time snapshot, not live guarantees.
3. Inspect the current heads and changed-file lists of PRs #245, #246, #241, #227, #247 and #248, and all reviews/checks before writing code.
4. Compare the actual Git merge bases. The specific SHA of Claude's last authored commit has not been independently established; **do not attribute every commit to an agent or assume a particular Claude boundary**.
5. Never silently overwrite pending local financial changes, grant Pro access without server verification, auto-migrate incomplete ledgers, bypass RLS, or merge a draft solely because the git mergeable flag is true.
6. Keep each code PR's docs, test evidence, rollback notes, and engineering registers updated; verify the exact final HEAD in **Vercel Sandbox**, plus device-specific checks where necessary.

## 1. Branch and pull-request snapshot

All six PRs below were **OPEN + DRAFT + NOT MERGED** at the time of checking. A green CI result is not release approval.

| PR | Head SHA | Base | Observed checks | Release position |
| --- | --- | --- | --- | --- |
| [#245 Local mode + JSON/CSV imports](https://github.com/nasrinaiv0/movo/pull/245) | 2f147be150b3604792ab57ccc61ecc6cdf434ede | main | Phase 1 CI **in progress** after rerun; Vercel **failure** (deployment/account blocker reported previously) | Draft, parent of #246 |
| [#246 Cloud/offline reconciliation](https://github.com/nasrinaiv0/movo/pull/246) | 54aa983c10142053abf79e0a1742dff93e74f159 | fix/local-storage-pauses-plan-access-20261108 (#245) | Vercel **pending**; no completed exact-head GitHub workflow listed | Draft, **not complete bidirectional finance sync** |
| [#241 Expiry fallback + owner-scoped cache](https://github.com/nasrinaiv0/movo/pull/241) | 484be1447f39ac7ca48aba0d66663cb2f90982e3 | main | Phase 1 CI success, Vercel success | Draft; overlaps #245/#246 |
| [#227 Security hardening](https://github.com/nasrinaiv0/movo/pull/227) | 057413328262627a5548b117a3d9cae7e3062fa6 | main | Phase 1, tenant isolation, iOS and Android native security CI success; Vercel success | Draft; **merge conflict** against current main |
| [#247 Plan/access audit](https://github.com/nasrinaiv0/movo/pull/247) | e1ecace7673b97dba25e01eca3144c15fcfe5343 | main | Phase 1 CI success; Vercel success | Draft; verifies but does not deliver live plan RPCs |
| [#248 iOS Siri + Keychain](https://github.com/nasrinaiv0/movo/pull/248) | a05cae4a704d28033cd954cd5e45afa903eaa6e5 | main | Phase 1 and iOS build CI success; Vercel success | Draft; **real-device Siri / native release not verified** |

The main commit recorded above documents environment variables and OAuth setup. Do not confuse that docs change with confirmed Google OAuth connectivity. This snapshot does not authorize any production migration, checkout activation, subscription grant, or PR merge.

## 2. Changes made in follow-on work after the earlier development baseline

### A. #245 — user-controlled local-only behavior and safe import confirmation

- Cloud Sync OFF pauses UI entitlement to Pro / Pro+ cloud-backed features; it does **not** revoke a person's Apple/Google subscription or modify purchase records.
- CSV/JSON upload stages a **preview**, with separate **Save records** and **Discard records** decisions, each requiring confirmation. Discard must not delete existing entries.
- Confirmed Save adds validated, deduplicated **supported accounts and transactions to this device only**. Save to cloud is intentionally disabled; other imported finance groups are not automatically applied.
- Stale asynchronous cloud responses cannot silently reverse an explicit switch to local mode.
- Quota and malformed-input problems preserve data/preview and fail closed. Client localStorage is **not encrypted**; do not call it a secure full financial backup.
- Post-commit localization repair populated the supported 11-language catalogs; do not add user-visible strings without regenerating and checking all languages.
- Earlier sandbox checks: 39/39 focused tests and 390px import/discard/save browser flows with local-only writes, plus typecheck/build. Later localization-specific tests passed. **Full current-head CI remained pending at snapshot time.**

### B. #246 — three-way reconciliation foundation, then two safety fixes

This branch is **stacked on #245** and must not be merged to main before correctly resolving the parent dependency.

- Stores verified-owner workspace state with a last-confirmed baseline and **dirty local journal**. Guests are kept separate. A reconnect planner compares **baseline vs local vs cloud**.
- The enabled transport is intentionally restricted: safe **account create/update** (including server compare-and-swap for updates) and **transaction create**, with UUID / exact-cent verification and post-write re-fetch. This does **not** provide general safe updates, deletions, or every finance domain.
- Conflict, unexpected deletion, bad ownership, missing baseline, quota failure, unavailable server, unauthorized state or unsupported financial references must **block / preserve the journal**, not silently choose last-write-wins.
- Follow-on safety change committed as **dc78856169256362b7fe154e59f1ba5c7144700c** introduced **src/lib/cloudFinancialReadGate.js** and **src/lib/offlineHandoffSafety.js** (with tests). Financial cloud read failures must not be converted to false empty arrays, and a manual cloud-to-local handoff requires a verified matching owner snapshot.
- After merging the parent updates, **f8ee0003005c8044a1561d03ca38812b63950810** included i18n reconciliation and inherited conflict resolution. Do not cherry-pick older versions of the merged branch.
- Follow-on HEAD **54aa983c10142053abf79e0a1742dff93e74f159** fixes the **browser automatic offline event**: it must no longer designate potentially stale rendered rows as a newly confirmed cloud baseline. **planOfflineNetworkTransition** chooses blocked, restore_pending, reuse_confirmed, or restore_stale. Stale/dirty data restores the owner-scoped cache; an untrustworthy handoff blocks paid cloud access instead of blessing data.
- Current-head targeted verification in Vercel Sandbox: **86 tests in 10 suites passed, TypeScript passed, optimized build passed**. Chromium 320px/390px smoke tests with no JS errors/overflow were performed on an **earlier intermediate head**, not independently certified on 54aa983c. No real signed-in iPhone or two-account testing is complete.
- A previously defective intermediate object/commit, **67cd4df** (file transfer truncated), was reverted in favor of SHA-verified complete transfers. **Do not cherry-pick 67cd4df**.

**Critical unsupported sync surface:** financial transaction editing/deletion and reversals; full loans, debts, receivables, credit, budgets/allocations, bills/occurrences, schedules, memberships, subscriptions, cashback/loyalty, attachments (receipts/QR), prefs, and other catalogued groups. Cloud multi-table reads are not an atomic ledger snapshot. No claim of full offline/online parity is allowed.

Source notes: **docs/engineering/updates/2026-11-08-offline-online-reconciliation-design.md** and **docs/engineering/updates/2026-11-09-offline-snapshot-read-and-handoff-guard.md** (check PR #246's branch; these are not necessarily on main).

### C. #241 — another offline fallback layer that overlaps #245/#246

- Adds owner-scoped cloud snapshots, expiry fallback, and masked email display; snapshot covers more categories than #246's currently enabled **sync transport**, but that does not prove complete reconciliation or parity.
- A partial snapshot or failed device storage must **not** cause mode switch; dirty local changes must **not** be overwritten.
- Sandbox baseline reported 793/793 Jest tests, TS and build passing on the PR's older base.
- **Review and consolidate** the workspace/snapshot/expiry event paths with #245 and #246. Do not merge two independent cache/handoff implementations without proving the combined invariant and migration from existing device keys.

### D. #227 — security hardening, currently conflict-blocked

- Scope includes device-bound native auth vaults, privacy shields, backup controls and native CI. Individual CI statuses were green.
- A noncommitted sandbox merge test against main observed **one unresolved conflict: docs/PR_PROGRESS.md**. Resolve this *by preserving both sides of the engineering register*, and then rerun exact merged-tree checks. GitHub currently reports mergeable=false.
- Passing security CI does not mean all runtime security controls, RLS, iOS/Android store readiness, or vulnerable dependency trees are fully approved.

### E. #247 — Free/Pro auditing and first-use trial policy

- Desired policy: **every eligible verified first-time user can claim one calendar month of Pro**; **no first-100-user cap**. The earlier first-100 Pro+ concept (PR #242) was superseded.
- This PR primarily adds test/audit coverage for the trial flow already present on main: 150 first-time claims, replay resistance, RLS, Free access, navigation, accounting, and header layout.
- Sandbox report: 820/820 tests, TypeScript and optimized build; disposable PostgreSQL checks. This is **not proof live Supabase has the necessary trial/status RPCs or triggers**.
- **Blocking:** production schema and privileged-RPC verification, purchase grants/restore, user-isolation tests, cloud/local races, exact-cent input-edge cases, signed-device QA and dependency-advisory triage. Do not enable paid checkout or promise the live trial is available.

### F. #248 — Apple native foundations and authentication environment

- Implements a Siri/App Intents **expense review shortcut**, not background ledger writes; adds a Keychain bridge but **does not migrate production auth tokens** into it.
- Inherits a separate cloud/auth session-refresh deduplication change; inspect exact diff before merging with #245/#246.
- Native build CI passed, but **native Xcode/App Intents phrase extraction, real iPhone Siri, real store purchase validation and signed-in cloud OAuth journeys have not been fully validated**. The branch's docs/APPLE_SDK_INTEGRATION.md is the detailed implementation guide.
- StoreKit server-side verification, purchase restore/grants, required store credentials and production billing remain release-blocked. No Wallet/PassKit, live activities or background task scheduling should be inferred from SDK references.

### G. Mainline environment/OAuth documentation change

- Main at observed HEAD b3c21b75 contains an expanded **.env.example inventory of 25 Vercel variable names**, with sensitive placeholders unfilled and instructions for Supabase Google/Apple Auth provider setup.
- MOVO currently uses **React 18 + Create React App/react-scripts**, not Next.js. **REACT_APP_SUPABASE_URL** and **REACT_APP_SUPABASE_ANON_KEY** are browser-facing public counterparts to the normal URL/publishable/anon key; they are **not safe locations for a service-role key**.
- Google OAuth client ID/secret belong in the Supabase Google provider configuration, and redirect URLs must match. A reported Google sign-in loop and cloud files failing to load are **user-reported unresolved failures**, not proven fixed by an env-name inventory.
- Never output secret values, add fictitious credentials, or enable billing because placeholder names exist.

## 3. Non-negotiable accounting, security, and UX invariants

**Financial correctness:** show cents to two digits, preserve exact internal amounts, idempotent transaction creation, never duplicate ledger postings, and reverse/delete via audited reversible operations. Credit outstanding must account for all credits, payments and interest. A visually successful import is not enough; verify Home, Wallet, Transactions and Planning totals across reload.

**Offline/online ownership:** authenticated owner IDs must isolate local journals, snapshots, preferences and cloud data. Do not display another account's cached records after sign-out/account switch. Preserve dirty offline edits through reconnect, auth expiry, quota errors, network transitions and canceled operations. Cloud and local comparisons must not silently discard a financial row.

**Supabase safety:** maintain RLS, grants and tenant tests, never trust arbitrary owner IDs, and test SECURITY DEFINER RPC constraints. Do not run schema changes against production just to satisfy a sandbox test. No paid Supabase branch was authorized.

**Plans:** local-only mode pauses cloud-plan feature access but never cancels a store entitlement. Free base accounting must continue offline. Never turn trial/paid grants on before audited server-side entitlement validation and restore.

**Owner-approved UI:** compact iPhone-first layouts, responsive 320px/390px, accessible reduced motion and light/dark contrast, ordinary action buttons without conspicuous borders or side shadows (intentional structural header/card boundaries excepted), aligned header controls, correct theme-adaptive text. Keep inputs and tap targets usable; never regress actual functionality for appearance.

**Product semantics:** MOVO tracks finances; it does not move money or verify bank balances. Never market Apple/Google native integrations as working before platform/device testing.

## 4. What Claude should do next — ordered tasks

1. **Reconcile real GitHub status**: verify main HEAD, PR heads, draft/mergeable state, target branches, reviews, exact-head Actions and Vercel checks. This file is dated, not a live dashboard.
2. **Fix #245 checks** first (especially localization and Vercel blocked-deployment account issues), then run exact-head full Jest, typecheck, optimized build, import UI tests and security tests **in Vercel Sandbox**. Do not call an infrastructure-blocked preview a passing deploy.
3. **Rebase/retarget #246 only after #245 integration readiness**, preserving account ownership, snapshot-read failure handling and browser offline-event safety. Test 86 focused cases plus full suite, race and storage failure scenarios. Do not merge as full sync before all material finance domains have safe audited migration/reversal behavior.
4. **Compare #241's fallback logic with #245/#246** in an isolated merged tree. Choose one coherent handoff state machine; preserve both groups of tests. Check logout/switch-user + two owners on a shared browser.
5. **Resolve #227's progress-register conflict** and rerun native/security/RLS verification against the actual combined head; do not discard either side of docs/PR_PROGRESS.md.
6. **Finish #247's live-schema readiness** using *disposable local PostgreSQL*, then plan owner-approved, migration-reviewed production deployment later. Verify first-claim eligibility and server entitlement before advertising the free month.
7. **Finish #248's native and Google OAuth tests** with Xcode/real iOS signed device, correct Supabase Google/Apple provider settings, token lifecycle, sign-in and cloud load/reload. Linux Vercel Sandbox does not replace Xcode or actual mobile OAuth.
8. Only after each independent verification passes, get explicit merge authorization, merge in dependency-safe order, recheck main/production and document any rollback path. No implicit green-light from this document.

Suggested comparison and local/isolated verification commands (run on the *correct branch* and do not expose env files):

~~~sh
git fetch origin main
gh pr list --repo nasrinaiv0/movo --state open
gh pr view 245 --repo nasrinaiv0/movo --json headRefOid,baseRefName,isDraft,mergeable,statusCheckRollup
gh pr view 246 --repo nasrinaiv0/movo --json headRefOid,baseRefName,isDraft,mergeable,statusCheckRollup
git log --graph --oneline --decorate --all -n 35
git diff --check
npm ci
CI=true npm test -- --watchAll=false --runInBand
npm run typecheck
CI=true GENERATE_SOURCEMAP=false npm --ignore-scripts run build
~~~

For browser verification, use Vercel Sandbox, serve the production build, exercise import Save/Discard, 320px/390px layout, offline event, reconnect, switching Cloud Sync, and authenticated cross-user access. Do not run live destructive writes. Separately track physical iPhone Safari/Capacitor and native Xcode/App Intents/store validation.

## 5. Evidence vs remaining unknowns

**Observed pass:** #246 current-head 86 focused tests + TypeScript + optimized build in Vercel Sandbox; previous-head 320/390 Chromium smoke; #245 earlier import UI and localization checks; #241, #247, #248 and #227 respective reported CI checks. **Not observed:** end-to-end simultaneous cloud/local reconciliations across all 23 financial groups; live Google OAuth success; real multi-user signed-device privacy test; real StoreKit validation; safe production DB rollout; every PR merged into main; exact current-head all-branch integration tests.

When writing release notes, use precise verbs: **implemented**, **tested in isolated Sandbox**, **CI currently successful**, **unverified on device**, **blocked**, or **merged**. Never substitute one for another.

## 6. Documentation and ownership rules

- Any new code PR must include its test evidence and dated engineering update, plus appropriate additions to docs/engineering/MASTER_CHANGE_LEDGER.md and docs/PR_PROGRESS.md. Preserve existing history in merge conflicts.
- If cloud/local semantics, new trial entitlements, or data sharing materially changes, update Terms and Privacy to match *verified actual behavior*, not intended future behavior.
- Document rollback as **non-destructive**: revert client code without purging locally owned dirty records or undoing genuine store subscriptions.
- This handover is a starting point for Claude, not an instruction to auto-merge, waive review, migrate production, or rewrite another agent's branch.

**Owner's priorities:** correctness, safety/security, complete accounting, release compliance, compact premium UI, clear documentation, and Vercel Sandbox verification before merge.
