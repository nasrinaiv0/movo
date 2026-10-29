# MOVO UI Control Audit Gate

Last updated: 2026-10-30

## Automated guardrail

Run `npm run audit:controls` to scan production JSX source with the TypeScript parser. The production build preflight runs this after `tsc --noEmit` and the full Jest command.

The scanner checks for:
- Native buttons without a click/keyboard action, an associated handled submit form, or an explicit disabled state.
- Anchors without an `href` or click action.
- Forms without an `onSubmit` handler or native `action`.
- Non-native elements with `role="button"` that lack click and keyboard handlers.
- Disabled buttons that do not have an associated description/title or a transient busy state, which are printed for human review.

External submit controls using `form="some-form-id"` are recognized when the referenced form has an `onSubmit` handler or native action.

## Limits

This is a static guardrail, not proof that a control works at runtime. It cannot determine whether a callback does the correct business action, whether a visible disabled explanation is truthful, or whether a custom React component is wired correctly. It does not replace interactive checks of tabs, menus, dialogs, settings, navigation, keyboard/focus behavior, screen readers, responsive layouts, authentication, financial writes, CSV import/export, or production behavior.

Review every disabled-control warning against the actual UI. Do not suppress warnings by adding misleading titles or client-side workarounds. When a control has no supported backend behavior, leave it visibly disabled with an accurate explanation.

## Security boundaries

The audit script is read-only. This PR does not change authentication, ownership checks, financial calculations, Supabase schema/RLS/grants, production data, or server-side secrets. Keep the NasrinAI upstream-conversation mapping server-only.

## Release status

The frontend is not declared complete by this static check. Legal publication still depends on verifying the operator/controller identity and address, retention schedule, provider/data-recipient details, and jurisdiction-specific terms. Manual browser/accessibility testing, Supabase leaked-password protection, dependency remediation, and successful authenticated production NasrinAI verification remain separate release requirements.


## Latest reconciled audit snapshot — 2026-10-30

- Exact reconciled source head: `4e87f9bc2bf23c1779ba313a33616ad97526ce66`.
- GitHub Actions [run 40958277651](https://github.com/nasrinaiv0/movo/actions/runs/40958277651) passed: **17 suites / 93 tests**, `tsc --noEmit`, the static control audit, and production compilation.
- Vercel exact-head deployment [dpl_9dYXuUiNJkMNBUra86W5pLUxzWJJ](https://vercel.com/nasrin-ai/movo/9dYXuUiNJkMNBUra86W5pLUxzWJJ) reached READY.
- Snapshot output: **31 source files; 93 buttons (9 disabled); 9 links; 5 forms**. No obvious unhandled native buttons, anchors, or forms were found.
- Three disabled-control warnings remain at `src/App.js:596`, `src/App.js:608`, and `src/App.js:635` (transaction save, account save, CSV import). These are human-review warnings, not evidence that the controls are dead. PR #43 contains the related busy-state/CSV guidance improvements but is still a draft while finance currency correctness is unresolved.
- The audit remains static; it cannot prove callback correctness, actual accessibility-tree behavior, or end-to-end finance operations. Continue browser, keyboard, screen-reader, mobile, and authenticated finance-flow verification before production sign-off.

