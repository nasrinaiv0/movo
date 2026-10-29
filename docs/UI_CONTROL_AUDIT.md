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
