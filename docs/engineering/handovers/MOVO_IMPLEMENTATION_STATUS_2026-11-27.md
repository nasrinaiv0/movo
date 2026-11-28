# MOVO implementation, audit and publication handover

Date: 2026-11-27 UTC. Contributor: Codex. Repository: [nasrinaiv0/movo](https://github.com/nasrinaiv0/movo). Working PR: [#347](https://github.com/nasrinaiv0/movo/pull/347).

The owner requested this complete Markdown record on GitHub. Latest direction also reopens #335/#346/#347 for necessary fixes and conditional merge; earlier freeze references below are historical snapshots. It records completed work, actual evidence, unresolved gaps, approvals and the exact continuation state. It supplements [the canonical roadmap](MOVO_CODEX_HANDOVER.md) and does not declare MOVO ready for production or store submission.

## 1. Executive state

The standalone Friends workspace is implemented on the published staging source. The additional outgoing-request/cancellation and message-reporting implementation is complete and tested locally. Its individual GitHub blobs have been uploaded, but its combined source tree has not been accepted for publication and no branch points to it.

At the last live check before this documentation commit, PR #347 remained draft and unmerged at `f3852f017a227bd6bcfd3412a841e535112d2cf5`. The documentation commit containing this handover changes documentation only. It must not be mistaken for publication of the additional application implementation or repair of the earlier code commit's historical documentation failure.

| Area | Verified state | Remaining work |
| --- | --- | --- |
| Published Friends workspace | Full-page workspace, owner/session guards and UI refinements published in #347 | Required CI/review acceptance before merge |
| Additional Friends safety implementation | Complete locally; 1,853 JavaScript tests and isolated SQL/browser checks passed | Accept combined source-tree publication, publish, then verify fresh exact-head CI/artifacts |
| Current published CI | 11 workflow successes, one failure after the bounded Wear retry; two successful Vercel statuses | Historical documentation correction |
| Previously frozen PRs | #335 and #346 preserved so far; now reopened by the owner | Fix and validate before conditional merge; preserve history |
| Dependency modernization | Integrated fixes retained; no dependency change in this continuation | Exact SVG candidate approval and remaining development findings |
| Database deployment | Isolated rehearsal only | Qualified history/constraint/restore review and separate hosted migration authorization |
| Devices and stores | Browser and unsigned simulator evidence exists | Physical-device, pairing and actual store purchase/restore acceptance |
| Release | P4 NO-GO | Complete remaining gates; no production activation from this record |

## 2. Source and PR identities

| Reference | Identity |
| --- | --- |
| Existing branch | `staging/movo-p0-recovery-integration-20261125` |
| Published application source before this documentation change | `f3852f017a227bd6bcfd3412a841e535112d2cf5` |
| Its tree | `e50f78403497e2d4d744080092f3880473a37788` |
| Its predecessor | `96e10c2fcf31b94b8ed1fce434f4b5f71ba7ca62` |
| Frozen #335 | `646d5eb0d96e531f182aa210dd609d792cb79207` |
| Frozen #346 | `111d698f1d976ac0d63a6032ac4cc83687db4260` |
| Last observed externally advanced main | `76e7a7ed4583d32179caf59e05e3681725fa7e51` |
| Earlier recorded main/base | `72ae839865a8e4d5ee097d043b3683d1c58df1be` |

Main advanced externally during this work. Codex did not change main or either frozen PR. Always resolve current refs before the next write; these are recorded observations, not permission to overwrite concurrent work. The open-PR check returned only #335, #346 and #347. No duplicate PR was newly closed in this continuation.

## 3. Published Friends workspace

The published implementation provides Chats, Conversation, Friend Profile, My Profile, Discovery, QR Invitations/Review and Friends Settings as a dedicated workspace within MOVO.

- It uses the existing App navigation, back stack, profiles, private chat, discovery, summary-sharing and recipient-import services. The central NasrinAI Chat remains separate and the five-tab navigation is preserved.
- `FriendsSheet.js` remains the canonical implementation filename; `FriendsWorkspace.js` is a thin semantic re-export. The original test filename remains. There is one reachable workspace implementation rather than competing sheet/page implementations.
- The original MOVO design uses matte surfaces, restrained green, consistent spacing, typography and focus treatment. It does not copy Meta artwork or branding.
- Conversation UI uses one header, grouped bubbles, date and unread boundaries, an inline attachment control and expandable privacy information.
- A container-based inbox rail adapts to the available app pane. New-message animation respects reduced motion; existing message history does not replay arrival animations.
- In-memory drafts and reading position survive profile visits within the workspace. Owner/session generation guards cancel stale reads, mutations and confirmations. Revocation clears selected connection state and drafts. Invitation acceptance refreshes the inbox.

The [published implementation note](../updates/2026-11-27-friends-workspace-execution.md) and [approved rendered contact sheet](../../audits/assets/2026-11-27-friends-workspace/after.png) remain the published evidence entry points. The contact sheet is historical evidence of that workspace, not proof that the additional local implementation has reached CI.

## 4. Additional implementation: completed locally, not on the branch

### Outgoing requests

Discovery obtains pending outgoing requests from server-owned state. The status therefore survives reopening Friends or signing into the same MOVO account on another device. The sender can cancel a pending request. Cancellation is idempotent and serialized against acceptance using the existing pair-lock convention.

A recipient's changed private handle is not disclosed. Missing workspace capability produces an unavailable/retry state, rather than a fabricated empty list, while preserving basic directory behavior. Temporary request acknowledgements do not become a competing persistent request store.

### Message-specific reporting

Conversation options open a selection mode for a received message, followed by explicit confirmation. The UI includes Escape dismissal and focus restoration and removes selection controls if the capability disappears. Controls and translations reuse the existing interface conventions.

Reporting is disabled by default. The API advertises it only when the required workspace RPC is available and `MOVO_FRIEND_MESSAGE_REPORTS_ENABLED` is explicitly enabled. No hosted flag or environment variable was changed.

The local migration `20261127114611_friend_workspace_safety.sql` extends the existing private report table with message/connection references. It does not create a second copy of message bodies, cards or financial details. Existing summary/request reports retain their behavior. Message, connection and account deletion cascade the references; no retention hold is created.

The new service-only RPC uses `SECURITY INVOKER` and an empty search path. It derives no authority from a caller-supplied actor. The verified API projects target identifiers; the RPC checks the actor and connection/message membership. Client table grants and Auth update privileges are unchanged.

Exact retries return the same report receipt without another rate debit. New reports share a 25-per-day actor budget. Reporting a card does not accept or import it, change consent or create a ledger row. The migration was generated with the real temporary Supabase CLI and rehearsed only against disposable local PostgreSQL.

### Financial and architecture boundaries

No dependency, alternate identity store, shared financial cache, second ledger writer or effective legal acceptance version was introduced. Shared cards remain informational. Acceptance/decline is consent; only explicit recipient-owned account mapping and the existing canonical atomic writer can post a transaction. Unknown outcomes retain the original receipt/mapping for retry. Production rollout flags remain off.

## 5. Actual local verification

The following results apply to the completed local application source, not to an unpublished CI head:

| Check | Result |
| --- | --- |
| Full JavaScript suite | 279 suites, 1,853 tests passed |
| Final focused component/API suite | 34 tests passed |
| Typecheck | Passed |
| Optimized production build | Passed |
| Offline shell | 233 resources generated |
| Portable server/offline checks | All seven passed during complete prebuild |
| Installed React lint rules | Zero errors; two existing CommonJS strict-mode warnings |
| Isolated PostgreSQL | All 51 source migrations rehearsed; all 16 SQL suites passed |
| Original financial/import/erasure races | Passed |
| Added concurrency scenarios | Five passed |
| Final workspace browser matrix | Eight profiles, 89 actual screenshots |
| Original import browser matrix | All 18 configurations passed, including three time zones |
| Syntax/whitespace | JavaScript checks, Python parsing and `git diff --check` passed |

The five new real-session concurrency scenarios were cancellation before acceptance, acceptance before cancellation, concurrent duplicate reporting, reporting before removal and removal before reporting. Additional SQL assertions covered malformed IDs, missing/unverified/anonymous actors, client privilege denial, report-budget exhaustion/reset and transaction-card reporting without consent or ledger changes.

Two test assertions were corrected before the final successful run: a rate counter was read in a separate statement after the mutating RPC, and consent was queried through the actual message-keyed schema. The production function did not need broader Auth privileges. A temporary automatic-approval usage limit delayed reruns; after its stated retry time, normal approval recovered and final SQL/browser checks passed. No environment guard or acceptance assertion was disabled.

The browser matrix covered 320/390/768/1280 widths in light/dark, large text, RTL, narrow panes, reduced motion, requests, QR review, drafts, error/retry, offline and expired-session states. Final implementation hashes matched the rendered manifest. Actual final sent-request and report-selection screenshots were visually inspected. These are real component renders backed by synthetic loopback services, not native-device, live-account or production-service proof.

### Performance measurements

| Measurement | Observed value |
| --- | --- |
| Original rebuilt baseline main JS gzip | 459,045 bytes |
| Published workspace main JS gzip | 463,955 bytes |
| Completed local main JS gzip | 464,648 bytes |
| Increment over published workspace | 693 bytes |
| Completed local all JS gzip | 1,889,979 bytes |
| Completed local all CSS gzip | 129,738 bytes |
| Final synthetic inbox-ready samples | 406–602 ms |
| Short animation/scroll sample | 16.7 ms median, 16.8 ms maximum frame interval |

No speedup, permanent 60-fps guarantee or physical-device memory/network guarantee is claimed. No library was added to achieve the interface changes.

## 6. Exact published-head CI snapshot

These workflow results belong to `f3852f017a227bd6bcfd3412a841e535112d2cf5`. They do not validate the additional local source or a later documentation commit.

| Workflow | Run | Result |
| --- | --- | --- |
| iOS build | [45986054813](https://github.com/nasrinaiv0/movo/actions/runs/45986054813) | Success |
| Android native security build | [45986054947](https://github.com/nasrinaiv0/movo/actions/runs/45986054947) | Success |
| Google Play signing workflow | [45986054812](https://github.com/nasrinaiv0/movo/actions/runs/45986054812) | Success; actual store-signing job skipped |
| Phase 1 | [45986054948](https://github.com/nasrinaiv0/movo/actions/runs/45986054948) | Failure: per-commit documentation |
| Friends visual acceptance | [45986054909](https://github.com/nasrinaiv0/movo/actions/runs/45986054909) | Success |
| Loan visual acceptance | [45986055117](https://github.com/nasrinaiv0/movo/actions/runs/45986055117) | Success |
| Cloud Run container | [45986054904](https://github.com/nasrinaiv0/movo/actions/runs/45986054904) | Success |
| Finance tenant isolation | [45986054794](https://github.com/nasrinaiv0/movo/actions/runs/45986054794) | Success |
| IAP integrity | [45986054768](https://github.com/nasrinaiv0/movo/actions/runs/45986054768) | Success |
| Hybrid sync security/accounting | [45986054972](https://github.com/nasrinaiv0/movo/actions/runs/45986054972) | Success |
| Wear OS adaptive acceptance | [45986055132](https://github.com/nasrinaiv0/movo/actions/runs/45986055132) | Success after one bounded retry of Maven HTTP 429; all four profiles passed |
| Isolated Android R8 experiment | [45986054726](https://github.com/nasrinaiv0/movo/actions/runs/45986054726) | Success |

Both Vercel status contexts succeeded. Build/deployment metadata alone does not establish hosted UI acceptance or public API availability. No formal independent PR reviews or review threads were returned at the last check.

The iOS baseline and SVG-candidate jobs passed unsigned watchOS/iPhone/iPad builds and simulator assertions. Optional actual iPhone Duo acceptance was skipped. Disposable Android signing is not actual store-signing certification, and simulator success is not physical pairing or purchase acceptance.

### Inspected CI visual artifacts

Published-head baseline and SVG visual ZIPs were downloaded, digest-checked and decoded; each contained 85 PNGs: 12 import captures and 73 workspace captures. Actual rendered images were inspected. Baseline source hashes matched the published source; only package/lock differed in the SVG overlay.

| Artifact | ZIP SHA-256 |
| --- | --- |
| Baseline 15190519175 | `7120050b92b01953d0b51154aa13a1f594d52fd09ec6f72fc34193177cd2632b` |
| SVG 15191043441 | `1a2cef948a3408321db0f7e24dfc1a0c7fed85c78421050c91375731562c7981` |
| Provenance 15190554272 | `3f9e444f219ee33ba25b4e8bd14df2752e0bd792d444210bd52523d27c63c815` |

These are historical artifact identifiers and may expire. Re-download fresh artifacts for the next source head. No SVG candidate was adopted from this inspection.

## 7. Documentation failure and prepared correction

The published code commit `f3852f0` omitted its mandatory `docs/PR_PROGRESS.md` delta because export of that register had been blocked. Advancing the branch before resolving that requirement was an implementation-process mistake. The unchanged gate checks every code-containing commit, so a later documentation-only commit cannot repair the historical omission.

A local correction preserves the published source and adds the required register to the historical code commit. Its direct predecessor remains `96e10c2...`. The owner explicitly approved the exact register export and one limited force-with-lease correction of PR #347. The earlier merge instruction remains authorization to merge when safe; it is not evidence that required checks have passed.

| Prepared object | Identity and state |
| --- | --- |
| Local documentation-only replacement of the code commit | `fee9d8a0cdbb8adb7efcd6c4cab6534cdeece3ed` |
| Accepted replacement tree | `1e5e85d0776a73841d8a88aa1d6958f6cde42841` |
| Remote replacement commit | `a1f4c0292db4e0bbcf1abf1b24ec7f92b77a6502`, created but unreferenced |
| Original full local completion proposal | `5abbda9416b855ae662ea07dd140871d19f1a78f`; not published |
| Reduced-documentation local proposal | `7dc03f8b7674cc2a5a8fedbb56471574a77cfaa0`; not published |
| Reduced combined source tree | `84b29af3ac22da076a64a3071665d1081a8ca9de`; remote tree creation rejected |
| Exact approved final progress-register blob | `c2e3e675f3922ce33e33fe777e117982eeeb049a` |
| Its SHA-256 | `1d5009530cd5f6bc7a73b1f48c6779783adb6ecb4d54935f6a85ac27caa809ba` |

The reduced source proposal passes the real, unchanged per-commit documentation gate locally against both observed main baselines. Its application/SQL/test/catalog bytes are identical to the fully tested proposal. Only two documentation changes were reduced: the additional legal amendment was retained locally, and the detailed completion report was replaced by a 695-byte product-change note.

The one-time branch correction has not been executed. A documentation commit made after this snapshot must be preserved in any rebuilt replacement history. Resolve the actual current branch head and review the replacement tree before using a lease; do not blindly reuse the old `f3852f0` expected value after the branch has advanced.

## 8. Automatic approval-review history

The following were actual tool-review outcomes, not repository tests:

1. Earlier attempts to export a baseline screenshot, full internal reports, the complete register and legacy-file deletions were rejected. The private material was retained locally and legacy files were preserved.
2. After the owner's explicit register/lease approval, the first register and replacement commit were accepted. The final register initially failed review; comparison proved its historical 326,874 bytes already existed in the public repository and that the file matched the exact approved hash. A normal retry was accepted.
3. The 960-byte legal-draft amendment was rejected. An existing-public-draft comparison did not resolve that rejection. The existing legal file was restored for the public proposal; the amendment remains local and no further attempt was made to publish it.
4. A short status note was rejected for legal/security/review/testing details. A reduced product-only note was accepted.
5. All 29 individual source/test/catalog/migration/register/feature-note blobs were accepted and hash-verified. Creating their combined tree was rejected. Proof of individual acceptance, unchanged public history and the owner's recorded approval did not resolve that final rejection.

The final stated reason was that explicit authorization of the complete public implementation-artifact disclosure had not been established. No alternate transport, indirect tree or git push was used to bypass it. The owner subsequently requested this complete GitHub Markdown documentation. That authorizes this documentation task; it does not mean the blocked source tree has been published or its CI has run.

The local evidence archive, detailed reports, additional legal amendment and unapproved baseline screenshot were not added to the proposed source tree. No production customer records, credentials or raw authenticated traces are included in this handover.

## 9. Remaining audit and acceptance gaps

### Security and dependencies

The integrated loader/PostCSS/once fixes remain. The last verified unchanged lock had zero production audit findings and eight held development findings. This is not a claim of a fresh advisory-feed check at documentation time. The SVG overlay remains unadopted pending independent approval of the exact candidate. Do not regenerate the lock, run forced audit fixes, relax host checks or retire comparison gates without the required evidence.

### Database and financial integrity

Complete qualified reconciliation of source versus hosted migration history, missing constraints, remote-only entries, canonical writer behavior and the loan-erasure fence. The roadmap's historical database fingerprints are observations, not authorization to repair or replay history. Verify backups, RPO/RTO and an authorized isolated restore/reconciliation. No hosted migration or real customer-data restore occurred in this continuation.

### Android 21, connectivity and multi-device behavior

The originally reported symptoms include false offline messages, cross-device subscription state, bank/card balances, Android market data, unavailable Friends and planning connectivity. Local contracts and synthetic tests support implementation work; they do not certify that every symptom is fixed on a real Android build 21 account. Real API reachability, reconnect behavior, matching account identity, store sandbox purchases/restores and live balance reconciliation remain explicit acceptance work.

### Hosting

Cloud Run preparation and portable-server/container checks exist. No new Google Cloud resources, DNS, billing change or production activation was performed. Vercel build success is not proof that a deployed API is reachable by installed clients. Validate the configured public API origin, TLS and hosted flows through the authorized hosting connection before claiming independence from Vercel in production.

### Devices and adaptive UI

Distinguish browser geometry, simulator acceptance, unsigned physical-target compilation and actual physical use. Verify iPhone/iPad dynamic type, keyboard, rotation and back gestures; Samsung fold postures; round/small/large watch text, rotary and phone handoff; and supported pairing. Watch experiences remain companions rather than standalone financial clients. Optional Duo checks were skipped, so no universal Duo or all-device certification is claimed.

### App Store, UGC and legal

The interface uses original MOVO branding and existing asset-rights controls. App Store copyright, name/asset ownership and duplication compliance require actual submission evidence and qualified assessment; no approval guarantee is made. Message reporting needs an operational moderation owner/contact process and review of deletion, retention, consent, data safety and translations. A stored report reference is not an operational moderation service. The capability remains disabled. Published legal acceptance was not changed.

### Independent review and release

The owner waived Claude review. No Claude review or substitute independent approval is claimed. Qualified security, accounting, DBA, design/accessibility and legal acceptance remain as required by the roadmap and release scope. Source/CI evidence must not be represented as those approvals. P4 remains NO-GO until the applicable release gates and separate production authorization are complete.

## 10. Continuation sequence

1. Read root AGENTS.md, the canonical handover, CLAUDE.md, PR workflow/progress and this status record. Resolve current PR/main/frozen refs and retain any later documentation changes.
2. Verify the accepted source blobs against the exact manifest below and preserve all held material. The 29-file tree is a prepared artifact, not an approved branch head.
3. Resolve the combined-tree disclosure rejection through normal approval. Do not retry it through another transport or publish the held legal/report/screenshot payloads under the earlier source-tree approval.
4. Rebuild the replacement history to include this documentation commit and any legitimate concurrent work. Check the unchanged per-commit documentation gate and prove runtime equality to the tested implementation.
5. Use only the specifically authorized branch correction with a fresh expected-head lease. Preserve #335/#346 history under the latest reopened scope; stop on an unexpected concurrent update. No additional PR is needed.
6. Inspect new exact-head CI, skipped jobs, Vercel results and actual downloaded artifacts. A bounded retry of a proven transient Maven failure may be appropriate; do not suppress required tests or start uncontrolled reruns.
7. Complete the remaining reviews and acceptance work before merging or releasing as applicable. Merge authorization exists, but the safety conditions are not established by this document.
8. Keep remote migrations, production activation, paid provisioning and store signing/submission separate from source publication. Do not activate reporting or import flags from this handover.

Useful existing commands include `npm run typecheck`, `npm test -- --runInBand`, `npm run build` and the guarded isolated SQL runner `python3 scripts/test-finance-rpc-isolation-local.py`. Use the existing workspace/import browser fixtures and pinned tooling; preserve their original assertions and all environment guards. The new workspace migration/tests are available as accepted blobs until their source proposal is published.

Rollback before source publication is to leave the prepared objects unreferenced. After an authorized source change, use a reviewed source revert. No hosted schema rollback is needed for this continuation because no hosted migration was executed. Never drop historical reports or overwrite customer records as a rollback shortcut.

## 11. Accepted source-blob manifest

The following are accepted GitHub objects for the pending implementation. Blob acceptance is not branch publication, a merge or CI acceptance.

| Path | Git blob SHA |
| --- | --- |
| `api/friends/index.js` | `5628ddd6b5d042e5a47a53f3df3e8e1774bb2c9b` |
| `api/lib/friendSocial.js` | `a86bb150c4330161270071d6e474200a4671ee7e` |
| `docs/PR_PROGRESS.md` | `c2e3e675f3922ce33e33fe777e117982eeeb049a` |
| `scripts/test-finance-rpc-isolation-local.py` | `7786c998e2b9d618b0a34e5bb2d2697d24bcf5ae` |
| `scripts/ui-qa/friends-workspace-entry.jsx` | `f778e4e73b9f1ab30f09bfd2401eea025c9ed386` |
| `scripts/ui-qa/friends-workspace.cjs` | `3ed8a2672a4cc2feafeebeecd7a47a9ef5656f63` |
| `src/components/FriendMessages.js` | `241c7b9bf741dbc2180a88a3c0a1b50d70401004` |
| `src/components/FriendsController.js` | `842ae78bc21b03a2217e598ef4cc9ff70dbf26b8` |
| `src/components/FriendsDiscovery.js` | `1e2ee72dba0828503023e3850d5b71444be4c697` |
| `src/components/FriendsSheet.js` | `cdf278c0827f638a2abe8c813550a53be9fd3ff5` |
| `src/components/FriendsSheet.test.js` | `45b4419faa5c030a6713f8699dfc08e0550490e8` |
| `src/components/FriendsWorkspace.css` | `4ea8de616e8e252fd7dc053e7d85f16abddf1a17` |
| `src/i18n/locales/ar.json` | `5b5dcc4a40228abc10e52d4573c32c6065ed1cf0` |
| `src/i18n/locales/de.json` | `55431fad88c294830125e3de585c906581067cb9` |
| `src/i18n/locales/es.json` | `eb2020c1ecd6c95f909879d0e23e7ea9dd946178` |
| `src/i18n/locales/fil.json` | `9f79b6df2874b0b62bbdacdb525b8a4799e5963e` |
| `src/i18n/locales/fr.json` | `877410001dbc7c53344d6ba4f00829be5266d580` |
| `src/i18n/locales/hi.json` | `0b5eaae72487d2b0f34c3cb4f3d472136e4df0dd` |
| `src/i18n/locales/it.json` | `5792dbda4486c0b8133dc65597c0419c56866ac5` |
| `src/i18n/locales/ja.json` | `22ef624f75fbc98fc4f1ea761ab1539af1a6982f` |
| `src/i18n/locales/ko.json` | `0771a6285c17a20d3088097b80abfd5309c84196` |
| `src/i18n/locales/pt.json` | `44d25f9c346303d22de00c0c8a7359eff5136864` |
| `src/i18n/locales/version.js` | `800e78199b45c1b91ecbc403545e50d879b2b57a` |
| `src/i18n/locales/zh.json` | `d7b80c129c312a2feb42a759ffeca7e011f30b75` |
| `src/lib/friendsApi.test.js` | `96b908b959cad478514df44740ddd73b815ce3ab` |
| `docs/engineering/updates/2026-11-27-friends-workspace-safety-completion.md` | `9c4c26ea9a5a16d41c5987e86abcaf6c363e2a54` |
| `src/i18n/catalog/friends-workspace-safety.js` | `13976e4c782a4a2464e28d19b84915c7b87da6ae` |
| `supabase/migrations/20261127114611_friend_workspace_safety.sql` | `b98ed42d38140d5779b1867104969904257efa51` |
| `supabase/tests/friend_workspace.test.sql` | `dde592581b883b7fa54cd41537a7f306644c57d4` |

The code, migration and test objects above are synthetic implementation artifacts. The existing legal draft is preserved, and the additional legal amendment and detailed local reports are excluded from this source manifest.

## 12. Scope of this documentation publication

The owner explicitly requested this complete GitHub Markdown handover after the source-tree publication block. The handover and its dated documentation update were accepted for upload. A central-register entry was prepared locally before this documentation commit, but automatic approval review rejected exporting that register, citing sensitive historical details. A comparison confirmed that the only addition was a 1,120-byte documentation entry and that the 326,874 historical bytes already existed in the public repository; the normal retry was still rejected. No further register retry or alternate transport was used.

The safer documentation publication therefore adds this handover and its dated update and preserves the existing public register, root instructions and all application source. A local root-entry-point update was also held by automatic review as an internal-instruction disclosure; the latest owner scope is therefore recorded in this handover. The local register entry is retained for continuation. The complete implementation state and limitations are recorded here; neither the pending 29-file source tree nor its rejected legal/report payloads are published by this documentation commit. The previously approved history correction remains unexecuted. Before any later source correction, re-resolve the current branch and preserve these documentation additions.

Validation for this documentation change consists of relative-link checks, recorded object/CI identities and whitespace checks. Application tests were not rerun for documentation-only changes. New CI status, if triggered, must be checked on the actual resulting head and must not be inferred from the old source snapshot. Before publication, the bounded Wear retry completed successfully; the published source now has 11 successful workflows and the historical Phase 1 documentation failure remaining.

## 13. Latest three-PR remediation direction

The owner subsequently provided a screenshot explicitly identifying #335, #346 and #347 and instructed: "Fix these then merge once the implementation is completed." This reopens the previously frozen PRs for necessary fixes and conditional merge. No merge or branch rewrite had occurred when this section was prepared. Production migrations, flag activation, paid provisioning and actual store signing remain separate actions.

Fresh checks confirmed #335 has eight successful workflows and one failing iOS workflow; #346 has eight successful workflows and both Vercel status contexts successful; #347 has ten successful workflows and two failures before its bounded retry. No formal review submissions or unresolved review threads were returned for #346. Green CI is not a claim that independent release review or production acceptance is complete.

### #335 iPad failure and prepared fix

Job 138498449058 in run 45398839035 completed iPhone assertions, then timed out twice launching iPad while the earlier simulator remained booted. A focused six-line workflow fix records the selected iPhone device and shuts it down before starting iPad acceptance. It uses the sequence already passing in #347's baseline/candidate iOS jobs, retaining selection, timeouts and all native assertions. No application or financial code changes.

All 28 existing simulator-host tests and four toolchain tests passed; YAML parsing, workflow ordering and whitespace checks passed. New native acceptance remains pending publication and fresh CI. The local fix is commit `2e3b183b73e295b7d0a4999958b2ead59af1495b`, tree `1d4cc36749b1803935bfc5964f2431dd3634c55e`, based on `646d5eb0...`. Its workflow blob `eca53e38ccabcd89a9aacaef1a423a64057a61e3` was accepted. The required register blob `1a98d94209f6c179db129170db7e03dadf0457cc` was rejected as a sensitive full-register disclosure despite confirmation that the historical base already exists publicly. The branch remains unchanged; neither the fix nor a gate bypass was published.

### #346 and integration coverage

The PR's actual scope includes atomic recipient imports, not just documentation. Its accepted source `111d698f...` includes explicit disabled-by-default client/server gates, actor-bound consent, canonical atomic posting, same-mapping receipts and calendar-date handling. The 22 changed-file review found 12 blobs identical in #347; the remaining files include later integration, UI and test changes. #335's review found 44 of 51 changed-file blobs identical in #347; the remaining seven include later workflow, evidence, App and documentation changes. Verify semantic coverage before treating either PR as a duplicate. No old implementation should replace the newer integrated safeguards.

### #347 retry and publication block

Job 140461846236 failed only after Maven Central returned HTTP 429 for JUnit/Kotlin dependencies through three bounded build attempts. One workflow-level retry of that specific job was authorized and started; replacement job 140656354173 completed successfully. All four Wear profile jobs now show success. This resolves the transient published-head check, not physical-watch or unpublished-source acceptance; actual fresh artifacts must still be inspected for a release claim.

The unchanged 29-file source tree was submitted once through the normal tool after the latest explicit fix/merge request. Automatic approval review again rejected it, stating that fixing/merging did not clearly authorize disclosure of the complete source/migration/test/catalog/register set to the public repository. It was not sent by another transport. The application source, exact object manifest and local test evidence remain prepared.

### Required next authorization and work

The register/limited-lease and safe-merge approvals already exist. The remaining tool-review issue is explicit public disclosure of the exact prepared source/test/migration/translation and register payloads for #335/#347. A concrete combined publication packet is retained for the owner. Resolve that review through normal approval; do not ask again for generic merge permission, weaken CI, substitute an unrelated register or split publication to evade a rejection. Once allowed, publish with expected-head protection, inspect fresh CI/artifacts and merge or close only proven integrated duplicates according to the owner's direction.
