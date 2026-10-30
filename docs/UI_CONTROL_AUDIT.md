# MOVO UI Control Audit Gate

Last updated: 2026-10-30

## Automated guardrail

Run `npm run audit:controls` to scan production JSX source with the TypeScript parser. The production build preflight runs this after `tsc --noEmit` and the full Jest command.

The scanner checks for:
- Native buttons without a click/keyboard action, an associated handled submit form, or an explicit disabled state.
- Anchors without an `href` or click action, and literal placeholder links (`href="#"` or `javascript:`) without a click handler.
- Forms without an `onSubmit` handler or native `action`.
- Enabled controls with obviously empty inline event handlers (for example, `onClick={() => {}}`, `onClick={() => undefined}`, or `onClick={() => null}`); named or non-empty callbacks still require functional review.
- Non-native interactive ARIA roles (button, link, tab, menuitem, switch, checkbox, radio, option, menuitemcheckbox, menuitemradio, and treeitem) without both click and keyboard handlers, unless disabled.
- Tabs without explicit `aria-selected` state.
- Switch/checkbox/radio roles without explicit checked state, and options without selected state.
- Dialog/alertdialog roles without an accessible name via `aria-label` or `aria-labelledby`.
- Disabled buttons and ARIA-disabled controls without an associated description/title or transient busy state, which are printed for human review.
- Dialogs without an explicit `aria-modal` attribute, which are printed for human review because modal versus non-modal behavior and focus management must be confirmed.

External submit controls using `form="some-form-id"` are recognized when the referenced form has an `onSubmit` handler or native action.

The scanner's source-analysis helper is covered by `src/lib/uiControlAudit.test.js`, including placeholder links, custom tab keyboard/state behavior, checked state, dialog naming, and valid named controls.

## Limits

This is a static guardrail, not proof that a control works at runtime. It cannot determine whether a callback does the correct business action, whether a visible disabled explanation is truthful, or whether a custom React component is wired correctly. It does not replace interactive checks of tabs, menus, dialogs, settings, navigation, keyboard/focus behavior, screen readers, responsive layouts, authentication, financial writes, CSV import/export, or production behavior.

Review every disabled-control and dialog warning against the actual UI. Do not suppress warnings by adding misleading titles or client-side workarounds. When a control has no supported backend behavior, leave it visibly disabled with an accurate explanation.

## Security boundaries

The audit script is read-only. This PR does not change authentication, ownership checks, financial calculations, Supabase schema/RLS/grants, production data, or server-side secrets. Keep the NasrinAI upstream-conversation mapping server-only.

## Release status

The frontend is not declared complete by this static check. Legal publication still depends on verifying the operator/controller identity and address, retention schedule, provider/data-recipient details, and jurisdiction-specific terms. Manual browser/accessibility testing, Supabase leaked-password protection, dependency remediation, and successful authenticated production NasrinAI verification remain separate release requirements.

## Previous reconciled audit snapshot — 2026-10-30

- Prior reconciled source head: `4e87f9bc2bf23c1779ba313a33616ad97526ce66`.
- GitHub Actions [run 40958277651](https://github.com/nasrinaiv0/movo/actions/runs/40958277651) passed: **17 suites / 93 tests**, `tsc --noEmit`, the previous static control audit, and production compilation.
- Vercel deployment [dpl_9dYXuUiNJkMNBUra86W5pLUxzWJJ](https://vercel.com/nasrin-ai/movo/9dYXuUiNJkMNBUra86W5pLUxzWJJ) reached READY for that earlier head.
- Previous snapshot output: **31 source files; 93 buttons (9 disabled); 9 links; 5 forms**. No obvious unhandled native buttons, anchors, or forms were found.
- Three disabled-control warnings were recorded at `src/App.js:596`, `src/App.js:608`, and `src/App.js:635` (transaction save, account save, CSV import). These are human-review warnings, not proof that the controls are dead. PR #43 contains related busy-state/CSV guidance improvements but remains a draft while finance currency correctness is unresolved.
- The current expanded audit and its new regression tests are awaiting exact-head CI and preview validation. Do not reuse the previous counts or checks as evidence for the expanded scanner.


## Latest implementation and validation — 2026-10-30

- Added roving tab focus and Arrow/Home/End navigation to the accent-color and theme radio groups. The appearance segment containing the “Custom” dialog opener now uses a normal button group with `aria-pressed`, rather than incorrectly presenting a dialog-opening action as a radio option.
- Added regression tests for arrow navigation, focus movement, Home/End selection, and accessible explanations for disabled controls.
- Transaction/account save buttons now expose `aria-busy` while saving. CSV import explains the precondition for enabling Import and associates the explanation with the button.
- Exact code/test head before this documentation-only update: `f610a8c44a024f6e674d1bf2a848f1f716f8cd52`.
- GitHub Actions run [40972518116](https://github.com/nasrinaiv0/movo/actions/runs/40972518116) passed **18 suites / 102 tests**, TypeScript typecheck, the control audit, and production compilation. The audit output reported no obvious unhandled controls and no disabled-control explanation warnings.
- Vercel status for that exact code/test head is success: [deployment details](https://vercel.com/nasrin-ai/movo/GAP7WjRzb2AbgYTXD2EKAa6tewXA).
- This confirms static analysis and automated tests only. Manual browser, keyboard, screen-reader, mobile, and authenticated finance-flow verification remain required. The legal publication and production NasrinAI isolation gates remain separate.


## No-op handler detection — 2026-10-30

- Extended the TypeScript-AST scanner to flag obviously empty inline handlers on enabled native controls and interactive ARIA widgets: empty function bodies, and expression bodies that return `undefined`, `null`, or `void 0`.
- This closes a gap in the previous check, which accepted a present `onClick` even if it did nothing. The scanner still cannot prove that a non-empty or named callback performs the correct business action; those controls require functional tests and human review.
- Added a regression test for an empty enabled button handler and changed positive fixtures to use meaningful callback expressions.
- Source commit: `d3aa9e67fcbce78b9241458c9643b993fa74cb17`; test commit: `1a5e5db14cccc14b22a339255bfd9f8cf937ce2c`.
- The documentation correction is the current change in this section. Fresh CI, audit output, and preview validation for the resulting branch head are required before treating this enhancement as validated.


## Exact-head validation after no-op detection — 2026-10-30

- Validated code/documentation head: `ba980cd71e155593b3dce74fe43dab62b218d493`.
- GitHub Actions run [40988344475](https://github.com/nasrinaiv0/movo/actions/runs/40988344475) passed **20 suites / 110 tests**, TypeScript typecheck, `npm run audit:controls`, the production-only dependency audit, and the production build.
- `npm audit --omit=dev` reported **0 production dependency vulnerabilities**. The full dependency tree still reports 34 findings (16 low, 5 moderate, 13 high); these are not resolved by the production-only audit.
- Vercel deployment [dpl_CUfiimh4pXnJaywYxUR19hXVN4RV](https://vercel.com/nasrin-ai/movo/CUfiimh4pXnJaywYxUR19hXVN4RV) reached **READY** for the same head.
- Audit output: 31 source files, 94 buttons (9 disabled), 9 links, 5 forms, 3 interactive ARIA widgets, and 2 dialogs. The scanner reported “No obvious unhandled controls found” and emitted no disabled-control/dialog review warnings.
- The scanner now catches obviously empty inline callbacks but cannot prove that named/non-empty callbacks perform the correct business action. Interactive keyboard/focus, screen-reader, responsive, and authenticated financial-flow checks remain open.
- This entry is documentation-only; rerun CI and verify the preview for the resulting branch head before merge.


## Latest control audit validation — 2026-10-30

- Validated implementation/documentation head: `58c658a340c5758baa0456d4b4d3db43bcc24ee7`.
- GitHub Actions run [40989112005](https://github.com/nasrinaiv0/movo/actions/runs/40989112005) passed **20 suites / 110 tests**, TypeScript typecheck, `audit:controls`, production-only dependency audit, and production build.
- The production-only dependency audit reported **0 vulnerabilities**; the full dependency tree still has 34 reported findings (16 low, 5 moderate, 13 high) and needs separate targeted triage.
- Vercel deployment [7Q5r4LiArsJ2scn5AWUjjdx62EdX](https://vercel.com/nasrin-ai/movo/7Q5r4LiArsJ2scn5AWUjjdx62EdX) reached **READY** for the same head.
- Audit output: 31 source files, 94 buttons (9 disabled), 9 links, 5 forms, 3 interactive ARIA widgets, and 2 dialogs. No obvious unhandled controls were found, and no disabled-control/dialog review warnings were emitted.
- This does not replace manual keyboard-only/focus, screen-reader, responsive, or authenticated financial-flow testing. The documentation-only commit containing this entry must be revalidated before merge.
