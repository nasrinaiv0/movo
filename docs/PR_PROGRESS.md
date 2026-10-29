# MOVO Pull Request Progress Register

**Last reconciled:** 2026-10-30 (UTC)  
**Source of truth:** GitHub PR pages, commit SHAs, Actions runs, and Vercel deployment records. This register is a concise operational index, not a substitute for those records.

## Open pull requests

| PR | Scope | Current state | Next action |
|---|---|---|---|
| [#46 — Repeatable UI control audit](https://github.com/nasrinaiv0/movo/pull/46) | Add a TypeScript-AST static guardrail for native buttons, links, forms, and non-native `role="button"`; run it in the production build preflight. | Open, draft; exact head `a814423aabdeb3804d950f17fa2f5aafa9bd0d52` has Vercel READY/success. The scan catches obvious dead controls but still emits six disabled-control explanation warnings on base main; those UI fixes remain in #42, #43, and #45. | Keep static warnings visible and complete manual control, keyboard, screen-reader, mobile, and production verification. |
| [#43 — Finance ledger calculations and currency-scoped summaries](https://github.com/nasrinaiv0/movo/pull/43) | Shared cent-safe ledger calculations, currency-scoped summaries, Money Flow, and accessible finance controls. | Open, draft; conflict-resolution commit based on current main is being prepared. Reconciled-head CI and preview verification are pending. | Complete exact-head validation, then interactive finance and production smoke tests. |

PR #41 is closed and superseded by #45. Do not create a duplicate consent implementation. PR #43 owns the current finance branch changes; PR #42 owns unavailable-auth guidance, PR #45 owns NasrinAI consent, and PR #46 owns the separate static audit gate. Avoid recreating these scopes in another PR.

## Recent merged implementation

| PR | Result | Validation / notes |
|---|---|---|
| [#45 — NasrinAI financial-context consent](https://github.com/nasrinaiv0/movo/pull/45) | Merged as `16436080ff0020bb5c6070cb89b18598c45991d3`. | Explicit opt-in before sending financial context, accessible disclosure and disabled-send explanations. Automated CI for this exact merge commit has not yet been confirmed. |
| [#44 — Cloud Sync Settings behavior](https://github.com/nasrinaiv0/movo/pull/44) | Merged as `5387230b9aa93b40fdd1d10d0c077896115faf5c`. | Replaced misleading sync toggle with a sign-in action in local-only mode and active status in cloud mode; prior PR-head CI passed. |
| [#42 — Accessible unavailable-auth guidance](https://github.com/nasrinaiv0/movo/pull/42) | Merged as `3ad9ef3d2f73065d270d1d5c3cbe8edf7f3ea20b`. | Added visible and programmatically associated reasons for unavailable cloud-auth actions; prior PR-head CI passed. |

| [#34 — Wallet validation and security status](https://github.com/nasrinaiv0/movo/pull/34) | Merged as `e43670bb56295e2fcf881b0c897d8d808b81bedc`. | Documentation refresh. Main CI [run 40852563341](https://github.com/nasrinaiv0/movo/actions/runs/40852563341) passed 13 suites / 76 tests, typecheck, and production build. Vercel production deployment `dpl_61HwBdJZwg1hpQZshMH8SB4uZr2p` is READY with `movo.nasrinai.com` attached. |
| [#33 — Wallet quick-action correction](https://github.com/nasrinaiv0/movo/pull/33) | Merged as `8fed594d571602c8d7f0cdca55afb286d47dabab`. | Replaced the duplicate Transfer action with Add Transaction. CI [run 40851881401](https://github.com/nasrinaiv0/movo/actions/runs/40851881401) passed 13 suites / 76 tests, typecheck, and production build; preview reached READY. |
| [#32 — Validated profile form](https://github.com/nasrinaiv0/movo/pull/32) | Merged as `782ac74568570ef27cc942f7e7a1bc5147ddd7a6`. | Profile editing now validates and saves browser-local fields; CI [run 40845667667](https://github.com/nasrinaiv0/movo/actions/runs/40845667667) passed 13 suites / 74 tests and build. |
| [#31 — Accessibility verification notes](https://github.com/nasrinaiv0/movo/pull/31) | Merged. | Documented disabled-setting accessibility and release limitations. |
| [#30 — Disabled-setting explanations](https://github.com/nasrinaiv0/movo/pull/30) | Merged. | Associated disabled settings with visible explanatory text for assistive technology; regression tests added. |
| [#29 — Inactive unsupported controls](https://github.com/nasrinaiv0/movo/pull/29) | Merged. | Unsupported card/issuer controls are disabled and explained. |
| [#28 — Frontend audit refresh](https://github.com/nasrinaiv0/movo/pull/28) | Merged. | Updated validation evidence and release blockers. |
| [#27 — Storage disclosure](https://github.com/nasrinaiv0/movo/pull/27) | Merged. | Corrected browser-local storage wording and related documentation/tests. |
| [#26 — Reconciled frontend/legal/finance implementation](https://github.com/nasrinaiv0/movo/pull/26) | Merged. | Combined frontend controls, legal/help flows, finance actions, accessibility, CSV hardening, and server-only NasrinAI mapping restrictions. |
| [#21 — NasrinAI upstream diagnostics](https://github.com/nasrinaiv0/movo/pull/21) | Merged. | Added safe upstream diagnostics. Production authentication still needs successful end-to-end verification. |
| [#20 — Authenticated NasrinAI integration](https://github.com/nasrinaiv0/movo/pull/20) | Merged. | Server-side chat proxy, user-scoped context/history, consent enforcement, and server-only upstream mapping. A production upstream HTTP 401 remains unresolved. |

## Closed without merge / superseded

| PR | Disposition |
|---|---|
| [#19 — Functional finance core](https://github.com/nasrinaiv0/movo/pull/19) | Closed without merge after reconciliation; useful local finance persistence, editing, transfer validation, CSV import/export, and regression coverage were carried forward into the reconciled frontend work. |
| [#41 — Earlier NasrinAI financial-context consent](https://github.com/nasrinaiv0/movo/pull/41) | Closed without merge; superseded by the rebased, current consent implementation in PR #45. |
| [#23 — Earlier frontend completion](https://github.com/nasrinaiv0/movo/pull/23) | Closed without merge; superseded by the reconciled PR #26 and follow-up fixes. |
| [#22 — Earlier legal/help pages](https://github.com/nasrinaiv0/movo/pull/22) | Closed without merge; legal/help functionality was consolidated into the in-app Legal and Help Center screens to avoid duplicate policy sources. |
| [#12 and #13 — Reference UI / notification parity](https://github.com/nasrinaiv0/movo/pull/12) | Closed without merge; superseded by the later merged responsive frontend and notification implementations. |

## Current release blockers

These are not resolved by a green frontend CI run or a READY deployment:

- **Legal readiness:** Formal operator/data-controller identity and address, actual retention periods, provider details, and jurisdiction-specific disclosures still need verification and legal review. The in-app pages explicitly warn users about the missing details; do not invent them.
- **Supabase Auth:** Security Advisor still reports leaked-password protection disabled. Enable it through authorized project settings: [Supabase password-security guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- **Dependencies:** Latest main CI install reports 34 npm audit findings (16 low, 5 moderate, 13 high). Review advisories and use targeted upgrades with regression tests rather than a blind forced upgrade.
- **NasrinAI chat:** Production logs show 7 upstream HTTP 401 responses in the last 24-hour window, last observed at 2026-10-29T05:42:54Z. No successful authenticated production chat request has been confirmed in this run; never expose or log credential values.
- **Interactive verification:** Full browser smoke tests on the production custom domain, including mobile, auth, consent, financial writes, CSV flows, and keyboard/focus behavior, remain unverified.
- **Data isolation:** Read-only production catalog checks confirm RLS enabled on profiles, financial accounts, transactions, budgets, and NasrinAI chat tables. Owner-scoped policies are present; the upstream mapping intentionally has no browser policy/grants and remains server-only.

## Required PR lifecycle

1. Review open PRs before starting duplicate work; update an existing branch when scopes overlap.
2. Use a dedicated branch and keep the PR summary, known limitations, and progress evidence current.
3. Run typecheck, the complete test suite, production build, and relevant security/data-isolation checks on the exact head SHA.
4. Verify the preview deployment for that exact SHA. A canceled/ignored Vercel build is not successful verification.
5. Merge only after checks pass and the PR is conflict-free. Verify the merge commit and resulting deployment separately.
6. Never include secrets, credentials, private financial data, or unverifiable legal details in code or documentation.
