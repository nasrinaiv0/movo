# MOVO audit-gap execution handoff — 2026-11-20

Execute against live repository and deployment state. The screenshot and original November 20 audit are historical evidence, not current PR or schema status. Preserve the original audit at `docs/audits/2026-11-20-full-movo-product-audit.md`.

This is the current continuation point for the historical [implementation handoff](../../claude/MOVO_IMPLEMENTATION_STATUS_AND_CLAUDE_HANDOFF.md), [Financial Planning handoff](../../claude/FINANCIAL_PLANNING_HANDOFF.md) and [November 9 engineering handover](2026-11-09-claude-post-commit-handover.md). Their older task lists, PR numbers and commercial proposals are not current requirements. A handover in another ChatGPT chat must be identified by its actual file or link before treating any additional instructions as reviewed.

## Preserve MOVO's structure

- Keep React 18 / Create React App, Supabase, Capacitor and the existing repository layout. No framework migration or replacement backend is part of this fix.
- Keep financial record fields, account IDs, transaction routing, cent arithmetic, database schema, RLS and API request/response formats. The account-deletion client adds a confirmed-owner check before sending the existing request; it does not change that request's payload.
- Keep the existing screens, navigation and visual components. The recovery notice uses the existing alert surface. No screen or financial feature is removed.
- Preserve preference field names within the owner snapshot. The separate storage envelope establishes ownership; it is not a new financial model. Copy ambiguous legacy bytes to verified recovery storage before changing the compatibility key. A reset must retain other guest/account preference copies and unassigned recovery data.
- Reuse #330 for preference ownership, #291 for encryption/deletion client hardening, and #274 for resumable server erasure/retention. Preserve distinct fixes and existing regression assertions. Do not combine unrelated destructive migrations or revive old pricing/authentication proposals.

## Current PR #329 follow-up

[Fresh audit, screenshots and acceptance matrix](../../audits/2026-11-20-pr329-remediation-review.md). #330 now also removes only the confirmed owner’s referenced files/cache, reports cleanup failure, localizes accessible tab names and submits the visible keypad amount. 255 suites / 1,670 tests, strict build, type checking, 140 responsive measurements and eight interaction assertions pass locally. #331 isolates compatible development-tool fixes: audit 31→19; production zero.

Public production currently returns **HTTP 402 DEPLOYMENT_DISABLED** and Vercel reports **Account is blocked**. This supersedes earlier HTTP 200 observations. Resolve through the account owner/provider and retest the hosted commit; do not bypass protection or create a replacement deployment. Fresh #330 exact-head CI is required. Its prior paired R8 check failed dependency downloads with Maven HTTP 429 after bounded retries. No emulator pass is inferred.

## Audit execution

| Audit remedy | Execution state | Remaining acceptance |
| --- | --- | --- |
| Accounting mutation / pending allocation | #328 merged as `45b9e968`; its explicitly approved migration was applied and catalog-verified; prior HTTP 200 observation is historical; currently HTTP 402 DEPLOYMENT_DISABLED | Signed store/client acceptance is separate from SQL and unit checks |
| Preference isolation | #330: separate guest/account scopes, retained unassigned copies, owner/generation guards, artwork and native-key boundaries; reset/erasure guards now preserve other preference copies and reject a changed account | Earlier code head `54536d95` passed 253 suites / 1,658 tests, hosted web/security/SQL and iOS/Android builds. Its emulator disconnected after seed/vault checks; rerun and fresh checks after the follow-up are required. Disposable two-account device acceptance remains |
| Setup accessibility / reduced motion / panels / voice | #329 and #326 code consolidated into #327; #327 merged as `73e293bf`; source tree matches green `305323ed` | Physical VoiceOver/TalkBack, microphone and audible playback remain device gates |
| Offline encryption | #290 closed in favor of #291; `eb90b4d8` integrates released #327 and passes its hosted checks after an iOS simulator retry | Integrate the validated ownership fix, prove in-place native upgrade, key loss/quota and rollback; never infer ownership from encryption |
| Resumable erasure and retention | #274 at `7b6cb1b4` passes hosted web/security/SQL, iOS, Android and paired emulator checks; synthetic SQL upgrade/snapshot rehearsal preserves #328's deployed write restrictions | Separate explicit approval for its three production migrations and disposable populated-account deletion. Carry the selective file cleanup from #330 into the resumable deletion client; preserve #291 encryption and failure recovery contracts |
| Apple checkout and signed purchase/auth lifecycles | Hold paid expansion; do not enable checkout to satisfy a flag | Correct store configuration and signed, store-delivered purchase/restore/refund and auth evidence |
| Privileges, branch rules, startup and locale acceptance | Existing audit evidence retained; no broad privileged configuration changes inferred | Administrator review where needed, measured low-end startup and human multilingual/device acceptance |

Production approval is scoped: the user approved #328's finance migration only. Approval for #274's owner constraints, erasure/upload freeze and age-based retention is pending separately; do not apply them based on a request to execute this handoff. No store publishing or paid expansion is implied.

The original handoff's NasrinAI `context_scope: "movo"`, explicit consent and refusal of unconfirmed scope are present in the current source. Preserve these boundaries and the existing local-only tracking paths. Their presence and automated tests do not prove a live authenticated upstream canary or signed-device voice/auth/billing acceptance.

Protected-preview UI testing is separate from a READY build. Automatic approval review rejected creation of a 23-hour share link because anyone holding it could access that protected preview. Approval for that access request is still pending; do not disable protection or try another tool that creates the same link.

After each merge, re-read open PRs and deployment state, preserve distinct fixes, and close only a source PR whose useful code is included in the retained integration. Test the actual resulting tree; canceled, failed and skipped checks are not passes. Record the exact commit and observed result. Do not replace real-device evidence with mocks or bypass a protected preview's authentication.
