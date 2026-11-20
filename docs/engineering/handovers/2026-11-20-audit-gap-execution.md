# MOVO audit-gap execution handoff — 2026-11-20

Execute against live repository and deployment state. The screenshot and original November 20 audit are historical evidence, not current PR or schema status. Preserve the original audit at `docs/audits/2026-11-20-full-movo-product-audit.md`.

| Audit remedy | Execution state | Remaining acceptance |
| --- | --- | --- |
| Accounting mutation / pending allocation | #328 merged as `45b9e968`; its explicitly approved migration was applied and catalog-verified; production serves HTTP 200 | Signed store/client acceptance is separate from SQL and unit checks |
| Preference isolation | Implemented on `fix/owner-preference-isolation`: separate guest/account scopes, retained unassigned copies, owner/generation guards, artwork and native-key boundaries | Final current-main integration, exact-head CI and disposable two-account device acceptance |
| Setup accessibility / reduced motion / panels / voice | #329 and #326 code consolidated into #327; #327 merged as `73e293bf`; source tree matches green `305323ed` | Physical VoiceOver/TalkBack, microphone and audible playback remain device gates |
| Offline encryption | #290 closed in favor of #291; #291 reconciled with current privacy and consent, then integrated with released #327 | Fresh head validation, in-place native upgrade, key loss/quota and rollback evidence; never infer ownership from encryption |
| Resumable erasure and retention | #274 conflicts reconciled; SQL upgrade/snapshot rehearsal now preserves #328's deployed write restrictions | Separate explicit approval for its three production migrations, fresh checks and disposable populated-account deletion |
| Apple checkout and signed purchase/auth lifecycles | Hold paid expansion; do not enable checkout to satisfy a flag | Correct store configuration and signed, store-delivered purchase/restore/refund and auth evidence |
| Privileges, branch rules, startup and locale acceptance | Existing audit evidence retained; no broad privileged configuration changes inferred | Administrator review where needed, measured low-end startup and human multilingual/device acceptance |

Production approval is scoped: the user approved #328's finance migration only. Approval for #274's owner constraints, erasure/upload freeze and age-based retention is pending separately; do not apply them based on a request to execute this handoff. No store publishing or paid expansion is implied.

After each merge, re-read open PRs and deployment state, preserve distinct fixes, and close only a source PR whose useful code is included in the retained integration. Test the actual resulting tree; canceled, failed and skipped checks are not passes. Record the exact commit and observed result. Do not replace real-device evidence with mocks or bypass a protected preview's authentication.
