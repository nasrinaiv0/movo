# MOVO UI Control Audit Gate

Last updated: 2026-10-30

## Automated guardrail

Run `npm run audit:controls` to scan production JSX source with the TypeScript parser. The production build preflight runs this after `tsc --noEmit` and the full Jest command.

The scanner checks for:
- Native buttons without a click/keyboard action, an associated handled submit form, or an explicit disabled state.
- Anchors without an `href` or click action, and literal placeholder links (`href="#"` or `javascript:`) without a click handler.
- Forms without an `onSubmit` handler or native `action`.
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
