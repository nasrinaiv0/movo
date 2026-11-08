# MOVO — i18n coverage for local import, offline/online sync UI
Date: 2026-11-08
PR: #245, targeted CI remediation.

- Restored all 67 missing English source keys in the full 11-language static UI translation catalog. Covers local-mode subscription access, explicit Save/Discard confirmation, data persistence warnings, and sync status text.
- Translation strings are machine-assisted preliminary UI wording, **not professional localization certification**. Native-language proofreading and mobile overflow QA remain required before full multilingual commercial release.
- Vercel Sandbox: catalog contains 2,540 keys; i18n tests passed (2/2) with exact placeholders and no duplicate or missing keys. UI and financial code unchanged in this patch.
- This same-commit engineering update and docs/PR_PROGRESS.md satisfy the per-commit mandatory documentation gate, without weakening the CI script.
- Do not use this as evidence of complete offline accounting, privacy or user tenant isolation; PR #241 and #246 remain drafts with release blockers.
