## 2026-11-27 — #347 join #346 history with the later integrated safeguards (before commit)

Contributor: Codex. After local main reconciliation a56ea7da, join existing PR #346 head 111d698f1d976ac0d63a6032ac4cc83687db4260. Its canonical API/writer/import/date files already match #347 and its remaining UI/controller/tests have later integrated safeguards. Resolve overlapping paths to the tested 6393c428 bytes; preserve both parents and every historical register entry, with no duplicate application implementation. Verified #346's entire incoming non-merge history passes the unchanged per-commit documentation gate against current main. Confirm the resulting tree differs from tested 6393c428 only in Markdown, and both incoming heads are ancestors. New exact-head CI is still required; the earlier 12/12 workflows and inspected native artifacts are evidence for the identical source, not new-head acceptance. Owner also authorizes the subsequent safe database update; production SQL, feature flags, paid provisioning and actual store signing remain unexecuted. See engineering/updates/2026-11-27-final-pr-integration-and-database-plan.md.

## 2026-11-27 — #347 reconcile merged #335 without changing tested source (before commit)

Contributor: Codex. Owner requests merging all MOVO PRs, then a safe database update. GitHub shows #335 merged at 7b7eea053f3e167d223c50b6d4ad000fedb2ef8d; #347 remains at 6393c4284ab03e44415ba4ee14102553cb4741c2. All 12 workflows on that head now pass, including both iOS variants and four Wear profiles. Complete native/visual archive hashes, real PNGs, required R8 markers and zero-failure iPhone/iPad XCTest logs were inspected. Resolve only CI/register conflicts with the already tested #347 workflow bytes; retain main's CLAUDE update, #335 engineering note and its unique progress entry. Application, API, SQL, dependency, native and test bytes must equal 6393c428. Fresh exact-head CI remains required after this history reconciliation. No database mutation, rollout activation, signing or paid provisioning performed. See engineering/updates/2026-11-27-final-pr-integration-and-database-plan.md.

## 2026-11-27 — #335 iPad simulator resource isolation (before commit)

Contributor: Codex. Owner reopened #335/#346/#347 for fixes and merge once complete. At source 646d5eb0d96e531f182aa210dd609d792cb79207, iOS run 45398839035 times out launching iPad after successful iPhone assertions. Save the selected iPhone simulator ID and shut down that completed disposable device before iPad acceptance, matching the sequence already passing on #347. Preserve all existing native assertions, selection and timeouts. All 28 simulator-host tests and four toolchain tests passed, together with workflow ordering and whitespace checks; fresh exact-head native CI/artifacts remain required. No application, financial, migration or production setting change. See engineering/updates/2026-11-27-ipad-simulator-resource-isolation.md.

## 2026-11-27 — #347 Friends safety completion (local proposal)

Contributor: Codex. Adds server-owned outgoing request status and cancellation, plus message-specific reporting behind a disabled-by-default server capability. Reuses existing Friends tables, verified-user API, navigation and canonical financial writers. Report storage contains message/connection references, without a second copy of message or financial content. Adds keyboard focus restoration, translations and isolated regression coverage. No dependency change or production activation.

Validation: 279 suites / 1,853 tests, 34 focused component/API tests, typecheck and production build pass. The final eight browser profiles rendered 89 screenshots with current implementation hashes; all 18 original import configurations also passed. All 16 SQL suites, report-budget/card checks and cancellation/acceptance, report/removal and duplicate-report races passed on disposable PostgreSQL. The temporary approval-service usage block recovered through normal approval; final reruns passed. See [completion evidence and remaining gates](engineering/updates/2026-11-27-friends-workspace-safety-completion.md). Publication and exact-head CI remain pending. The existing draft stays unmerged; no remote migration, rollout flag, store signing, paid resource or production change.

## 2026-11-27 — #347 adaptive Friends workspace (before implementation commit)

Contributor: Codex. Existing draft PR #347 gains full-page chats, conversations, friend/own profiles, discovery, QR invitation review and Friends settings. Reuses the existing App navigation, profiles, chat, sharing and recipient-import services. Refines typography, spacing, container-based layouts, accessible focus, inline attachments, grouped messages and reduced-motion transitions. Guards asynchronous results across owner/session changes and clears revoked connection state. Legacy implementation/test filenames are retained, with one canonical workspace.

Validation: 279 suites / 1,845 tests, typecheck, production build and seven portable/offline checks pass locally. Original 18 transaction-import browser configurations pass. The new workspace has 73 rendered screenshots covering four widths, light/dark, large text, RTL, narrow panes, motion and recovery cases. See the [implementation note and approved rendered contact sheet](engineering/updates/2026-11-27-friends-workspace-execution.md). Fresh exact-head CI and device/release acceptance remain pending. Status: draft. Frozen PRs and main are preserved.

## 2026-11-27 — Codex handover and standalone Friends workspace brief (before documentation commit)

Contributor: ChatGPT. Owner requested repository-discoverable handover and standalone Messenger-inspired Friends page with profile and settings pages, premium UI/UX and motion. Verified predecessor 74cf632e30bf2a415665f8ddac049d165a2046c6: 12/12 workflows completed success, 2/2 Vercel statuses; both R8 and iOS candidate/baseline jobs and four Wear jobs successful, store-signed Play job and optional iPhone Duo skipped. Formal PR reviews none; actual latest artifacts not downloaded, no SVG adoption or release approval. Inspected existing CLAUDE.md, FriendsSheet/FriendsDiscovery/FriendMessages/FriendFinanceSummary and friend legal/chat docs; plan reuses existing owner-scoped connections, chat, summary, QR and atomic recipient-import contracts and keeps central AI Chat separate. Add root AGENTS.md pointer and docs/engineering/handovers/MOVO_CODEX_HANDOVER.md containing complete P0–P4 continuation and new feature specification. Documentation only; no app, dependency, SQL, flags or workflow changes. Validate tree/diff and protected refs; new head requires fresh applicable CI, no carry-forward exact-head claim. No new PR, merge, paid provisioning, remote migrations or production changes. Codex task not started; independent review outstanding. Revert only documentation change on staging if needed.

## 2026-11-26 — #347 verified SVG candidate acceptance and R8 renderer qualification (before commit)

Exact predecessor 4319255c7f0619a3434e1d1011d9d3d3ec7a1f1f. Both QEMU processes observed SIGSEGV/core-dump flag with readable cgroup OOM counters zero; controlled lavapipe qualification for both matched AVDs, no gate weakening. Wear small failed Maven Central HTTP 429 despite three retries; no application defect shown. Reproduced exact successful SVG artifact 15079705770; 7/7 local overlay tests plus real exact artifact overlay/final check. Add same-repo PR347-only serial baseline/candidate matrices to six existing workflows; exact hash-pinned overlay only in ephemeral candidate checkout, baseline package files unchanged, separate artifacts/provenance. Stop repeated failed diagnostic experiments. Document webpack middleware strategy and preserve production safeguards. See docs/engineering/updates/2026-11-26-svg-acceptance-and-renderer-qualification.md. No adoption until actual native/browser acceptance and independent review.

## 2026-11-26 — #347 process-scoped R8 diagnostics (before commit)

Exact predecessor c73e6631ca286a6b4d850d60490a8ae148f15819: 10/12 CI, R8 failed both emulators despite all compiler builds, QEMU zombies in shared wallet/OAuth stage, root cgroup counters unavailable; latest iOS active, predecessor iOS passed. Add process cgroup membership/mount resolution, bounded ancestor limits and observed zombie wait status, 19/19 local native tests including real synthetic child. Preserve failure gates. Modernization artifact 15076154440: SVG candidate passed 1833 tests and removes four GHSAs; nth-only and webpack failed actual compatibility. Exact SVG package retained for required candidate-specific visual/native acceptance, no dependency change this commit. See docs/engineering/updates/2026-11-26-process-cgroup-r8-diagnostics.md. No production or frozen branch changes.

## 2026-11-26 — #347 actual R8 telemetry and isolated modernization (before commit)

Parent 763eee52b7b908ace7d8b1b66ce9652bd8e80862 retains exact once artifact. R8 predecessor 6b487026 baseline QEMU became zombie during wallet/OAuth, candidate all five stages pass, four actual app images verified; paired gate remains failed and root cause unknown. Prepare and run three independent diagnostic candidates via existing Phase1 job with bounded time, no adoption. 22/22 local fixture tests and shell syntax passed; actual registry/compatibility pending. Preserve mandatory audits and native assertions. See docs/engineering/updates/2026-11-26-modernization-execution-and-r8-telemetry.md. No production changes or frozen branch updates.

## 2026-11-26 — #347 verified once dependency integration (before commit)

Exact predecessor 6b4870266baa80168b7201bf82d19c109c93eddb. Verified artifact 15076018329 (14 manifest checksums; 2 proxy tests; 1833 regression tests; zero production findings), exact one dev path change, 17 -> 8 affected entries (one unique advisory removed, nine propagated entries). Tightened baseline and lock regression gate; 15/15 local tests, actual candidate accepted, original audit rejected. Retire once-only scratch experiment, retain actual loopback proxy tests in normal CI. Document isolated SVG/nth-check/webpack follow-up, no unverified upgrade. Active R8/Wear evidence must be preserved before advancing. See docs/engineering/updates/2026-11-26-once-integration-and-modernization.md. Frozen PRs and production safeguards maintained.

## 2026-11-26 — #347 portable harness import correction (before commit)

Exact predecessor 4edc79d2cbb95b5133f507be3186bee90a85efd8. Phase1 run 45728975642 failed at integrated harness import (host_diagnostics not found), before dependency install. Reproduced exact error via isolated importlib; use parent namespace r8.host_diagnostics and add subprocess regression. 13/13 available local host/evidence tests passed; full integrated CI pending. No change to native acceptance criteria or package lock. See docs/engineering/updates/2026-11-26-r8-host-import-regression.md. Preserve all production safeguards and frozen PRs.

## 2026-11-26 — #347 requested Android toolchain and isolated continuation (before commit)

Exact predecessor 94d744e6acf9fef0be436c1b30e2ad084f0b34b7: AGP already 9.5.1; Gradle 9.6.0 wrapper -> requested 9.6.1 with official tagged wrapper JAR/launchers and distribution SHA-256. 7/7 local pin tests; native runtime not verified. Integrate tested host telemetry (12/12 local native diagnostic tests), exact once experiment tools (8/8 policy tests and npm config preflight; local registry DNS blocked), bounded existing Phase1 diagnostic only, no package adoption. Predecessor R8 fails shared emulator transport, iPad XCTest still active at preparation. Preserve all hard acceptance criteria and frozen #335/#346. See docs/engineering/updates/2026-11-26-android-toolchain-and-continuation.md. No production change, merge, paid provisioning, flags or migration. Fresh CI required.

## 2026-11-26 — #347 exact dependency integration and native evidence correction (before commit)

Predecessor 2a2ae70bc5e68a07c7f05ac2210c303aeacf38ad 11/12 CI, Vercel 2/2, iOS both devices passed (iPad artifact 15072688548 verified and inspected, XCTest 98.643s), Wear both passed; R8 both emulators failed in shared offline wallet/OAuth stage despite compiler pairs passing. Integrate exact CI-tested loader 5.0.0/PostCSS 8.5.32 package blobs (163 production entries unchanged, 5 GHSA removed, zero production findings, 1833 tests passed), hard advisory regression gate (12 local tests) and preserve failed ADB stdout/stderr (5 local tests), remove redundant scratch experiment. Existing acceptance unchanged. Document staged P1–P4 roadmap and explicit release holds in docs/engineering/updates/2026-11-26-p1-p4-stabilization.md. Fresh CI required; no claim of emulator fix or independent review. No merge, production changes, paid resources, migration or flags. Frozen #335/#346 preserved.

## 2026-11-26 — #347 native runner evidence and isolated PostCSS remediation candidate (before commit)

Exact predecessor 7fafdad6279da469ebdff4ecf18f457a12cfe0a3: 10/12 CI workflows green, Vercel 2/2. Both R8 compilers built both variants, zero byte savings/identical DEX and AAB, baseline emulator disappeared at display capture after two test markers, no accepted screenshot; iPhone twice launch timeout, iPad skipped. 26 actual exact-head browser/Wear PNGs inspected and six artifact hashes verified. Switch both disposable R8 variants to supported swiftshader renderer; independent candidate execution and mandatory paired pass markers/outcomes, no weakened evidence. Add bounded failure diagnostics for iOS, 2 portable mocked tests passed. Full audit confirms 19 dev findings/17 GHSAs and zero production findings. Evaluate only isolated resolve-url-loader 5.0.0 + PostCSS 8.5.32 with exact production lock equality, advisory removal and full scratch regression/build; 7 local Node fixture tests passed; unchanged repo dependencies pending real registry proof. No production or frozen branch changes. See 2026-11-26-r8-native-dependency-recovery.md.

## 2026-11-26 — #347 fail-closed R8 test contract (before commit)

Exact predecessor 63acbe2964c61c9d18bb1ada343ebc081fabfbdd: 11/12 workflows successful, R8 45623074592 / job 139236053012 failed before compiler execution because old test test_stalled_diagnostics_do_not_prevent_remaining_evidence expected capture() to return despite required capture timeouts. Update that test to require EvidenceError while retaining remaining-diagnostic assertions and absence of passed.txt; run emulator safety tests in Phase 1 before expensive native builds. No production code, compiler, keep rule, or evidence policy change. Local reproduced test passed against exact emulator/helper Git blobs 89d63c866e7b4d5755423819b38034d044f30488 and 96fb95d82c6c91060c61a6c070c9189629e5e22f; 13 helper tests passed. New exact-head CI remains required. See detailed engineering update. Preserve frozen #335/#346, no merge, remote migration, paid provisioning, flags or production changes.

## 2026-11-25 — #347 R8 workflow context validation and evidence reconciliation (before commit)

Exact predecessor 3720ed1b finance, Phase1, IAP, container, hybrid and 20 actual browser PNG evidence passed; R8 run 45622092372 failed before any job. GitHub contexts docs show cancelled() unsupported in steps.env. Separate normal hard diff and cancellation-only two-path restore, add host contract tests and run portable native tests in Phase1; no compiler/keep rule changes. Reconciled 19 differing migration fingerprints at statement level (9 normalized, 7 wrapper/session, 3 catalog-reconciled differences); all sampled 12 historical files' CREATE names found; no replay or missing-history repair. Full npm audit artifact identifies 17 advisories across 6 dev-only root families; production omit-dev clean; no forced upgrades. New exact-head CI and actual native artifacts required. No production changes, merge, paid resources, remote migration or flags.

## 2026-11-25 — atomic loan guard candidate (before commit)

Separate staging-only change to unshipped atomic-loan SQL: require verified nonanonymous authoritative auth user and lock owner row before checking account erasure and creating/replaying receipt. Existing ledger, request digest, account locks and grants preserved. Update disposable auth fixture/positive owners and exact-error negative and ordered loan/erasure race tests; no production SQL execution. New checksum requires individual review and authorization. Review lock-order/deadlock and client compatibility; CI pending, not independent external review. No merge, paid provisioning, production mutation or flag activation.

## 2026-11-25 — isolated MOVO recovery integration (before commit)

Reconcile frozen #335 and #346 from pinned heads without changing either branch. Preserve both documentation histories, exact existing flags, native vault and ledger behavior. Prepared native evidence corrections: 24 local mocked/unit tests passed; check blob identities and wire portable tests into CI; isolate completed iPhone before iPad. Full audit JSON evidence in existing PR CI; no dependency upgrade without advisories. Full migration fingerprints compared (11 exact, 4 whitespace, 19 differing, 7 missing stored SQL, 9 unmatched); zero five ledger-preflight violations; no production migration, paid provisioning, merge, deployment or flag change. Loan erasure guard remains a separate staging review/test commit. Fresh CI, actual native/browser artifacts, backup and independent review mandatory.

## 2026-11-24 — #346 CSV regression assertion correction (before commit)

Source inspection confirms parseCsvTransactions returns {transactions, errors}, not rows. Correct the new test accessor and assert an empty error list. No application behavior changed. Fresh CI remains required.

## 2026-11-24 — #346 shared-date export and edit consistency correction (before commit)

Exact predecessor 591dd2f7c645 Phase 1 passed 21 translation tests, 278 suites / 1815 full regression tests and five additional tests. Real browser artifact 14924470593 passed 18 combinations and visually confirmed corrected light/dark and UTF-8, 44px visible save. Source audit reproduces two defects: CSV exported normalized display-only local wall time rather than original UTC timestamp; an unchanged shared date-only edit saved local noon as an instant (e.g. Kiritimati Nov 30 noon becomes Nov 29 22:00 UTC). Preserve raw timestamp in CSV; JSON raw backup was already correct, add explicit regression. For canonical share provenance + UTC-noon rows, keep date-only UTC noon when the edit clock stays at noon, including deliberate calendar date change; explicit clock change follows existing local-instant semantics. Retain original receipt and canonical writer, no schema or accounting change. Add unit coverage and browser fixture checks across Manila/Kiritimati/Los Angeles. Existing generic CSV/JSON restore is a separate additive import, not restoration of private chat consent or receipt; no new import behavior. Fresh exact-head checks required. Limitation: UTC-noon encoding cannot distinguish a later explicit real instant that happens to equal UTC noon; avoid adding schema or feature changes under current freeze. No remote rollout, migrations, merge, paid resources or production changes.

## 2026-11-24 — #346 visual evidence fixture correction (before commit)

Exact head 2792fbee passed all 18 functional Chromium cases (run 45400876232; artifact 14922763881), but actual screenshot review found light styling in both modes and encoding artifacts because the fixture omitted MOVO's theme class and UTF-8 declaration. Correct fixture-only wrapper and HTML/HTTP charset, explicitly verify computed background brightness, full save-button visibility and 44px minimum height, scroll to save before capture, and fail on mojibake. No app CSS, accounting, API or database change. Re-run exact-head visual and translation gates before acceptance. All four actual Wear screenshots on #335 646d5eb0 passed, and a local real SIGTERM/SIGINT synthetic compiler test using exact R8 source blob 63e0a0081e198d871358071903cf636aa73ae5c7 restored both configuration files and stopped the child; full latest R8 and signed iOS still separate gates. No production changes or flag activation.

## 2026-11-24 — #346 isolated recipient browser acceptance and date projection (before commit)

Exact predecessor 7e0834186479 passed Phase 1 (including translation coverage), financial tenant isolation, IAP, hybrid sync, container. Identified deterministic date-only UI defect: persisted 12:00 UTC maps to the next calendar day at UTC+14. Preserve canonical occurred_at, money, sync and receipt, derive a local wall-calendar noon presentation only for rows with matching movo-friend:<id> provenance and exact canonical UTC noon; ordinary timestamps unchanged. Date display/grouping uses normalized date; CSV/raw ledger storage and edited-date behavior need separate release review. Add focused unit tests and isolated real FriendConversation fixture with synthetic server decisions and import receipt, loopback-only HTTP, no remote credentials, mocked mutation backend (not end-to-end database). Test consent, mapping, lost response, reload recovery, owner switch, three timezones including UTC+14, light/dark mobile/desktop; attach actual browser images. No persistent local draft introduced; receipt recovered from server on reopening, unresolved mapping remains server-fenced. Both rollout flags remain disabled. Independent review and exact-head CI required; no merge, remote migration or production change.

## 2026-11-24 — #346 recipient import translation coverage correction

Before commit: exact head 9c58b3e5 Phase 1 run 45399148838 failed only the reported catalogue coverage gate for 13 new strings. Supply all 11 full-language translations in the existing catalogue format (English source plus Filipino, Arabic, Chinese, Spanish, Italian, German, French, Portuguese, Japanese, Korean and Hindi). Preserve translation coverage assertions, consent and accounting behavior. Isolated finance run 45399148402 passed five ordered revocation/erasure scenarios and duplicate import. Fresh exact-head CI required; full 97-language market review remains pending. No rollout flag or production change.

## 2026-11-24 — #346 atomic import UI and revocation race hardening (before commit)

Preserve canonical writer and authenticated expected-owner RPC. Acquire auth.users owner FOR UPDATE (same as clear/finish erasure, conflicts with FK key-share for pending erasure request), require verified nonanonymous owner and recheck pending status after lock. Add ordered two-session decline-first, import-first, remove-first, erasure-first and erase-after-import tests with overlap marker; test existing duplicate and rollback suites unchanged. UI explicitly gates both REACT_APP_MOVO_ATOMIC_FRIEND_IMPORT and MOVO_ATOMIC_FRIEND_IMPORT_ENABLED; neither flag is configured or activated, no preview/production resource changes. Server projects only decision IDs; no service finance write grant. Client incoming-only controls require consent, current owner-owned same-currency account mapping, verified cloud access and no pending local changes. Direct RPC (no local fallback), immutable in-memory retry mapping and validated receipt; refresh canonical records only after confirmed receipt. No durable offline import draft; lost connection recovery after reopening uses server decision state, and after removal fails closed. Date-only label retained; international ledger calendar display review remains. Add API flag and synthetic UI tests. Do not release before exact-head CI, actual browser/native and independent Claude review. No remote migration or merge.

## 2026-11-24 — #346 isolated SQL parser fix

Before commit: exact-head b9eb3bd3 local PostgreSQL run 45397084965 job 138455616695 reported syntax error at end of input on the PL/pgSQL IF comparison with a bare CASE. Parenthesize the expression; no authority, ledger, consent, or test assertion change. Re-run full disposable CI. No remote migration or release.

## 2026-11-24 — #346 atomic recipient import candidate (before commit)

Replace the unshipped decision migration's post-hoc confirmation with a fail-closed atomic recipient RPC. Keep authenticated identity and expected-owner fence, account-erasure guard, private decision/connection/message locks, same canonical sync operation advisory lock and existing writer (no second ledger); exact server card amount/type/currency/date and selected owner accounts, ordered locks, canonical receipt and decision committed together. Replay only from an imported decision with the matching durable sync payload; prior generic operations collide; after friendship deletion recovery fails closed and existing ledger remains. Date-only policy is explicitly noon UTC, pending client display and legal review. Offline draft/client activation remains HOLD; no new service-role finance grants. SQL tests cover denial, rollback, replay, altered mapping, date, owner, ledger count, deletion and grants. Add two independent session duplicate test; decline-vs-import ordering and complete UI/recovery still require acceptance. Do not deploy or apply remotely. Independent Claude/security/accounting review required. Fresh isolated CI required; no claim that these changes have passed yet.

## 2026-11-24 — #346 isolated capability migration rehearsal

Before staging commit: reuse #341's exact decision SQL, tenant test and draft legal note; keep app/API integration on HOLD pending owner/session fencing, accept/decline versus write race, confirmation retry, date semantics, legal and independent review. Dry-run source replay succeeded for all existing client/API files except the newer SQL runner, which is reconciled manually. Existing disposable localhost PostgreSQL service harness now excludes three known pending migrations from the baseline, asserts absence, then applies friend chat, recipient decisions and atomic loans in dependency order after existing PR274 rehearsal. Preserve all financial and security suites and concurrent loan tests. No production data, remote migration or application release. Fresh CI required.

## 2026-11-24 — #335 in-activity Wear failure evidence and centered scrolling

Before commit: previous 200% font Espresso scrollTo failures did not preserve active-screen evidence (post-scenario screenshot is clock/launcher). Replace edge-aligned scrollTo in test with centered actual ScrollView positioning, retain full global visibility, round corner, text fit and 48dp geometry checks, add actual font scale and foreground assertion, retain real Espresso click/handoff assertion. Capture PNG and viewport geometry inside ActivityScenario on failure before teardown, pull diagnostics on both font passes; remove stale test-only files between passes. No production layout change until actual geometry demonstrates a defect. No assertion weakened; fresh isolated CI required. R8 cancellation cleanup is separate. No merge, production mutation or remote migration.

## 2026-11-24 — #335 R8 cancellation restoration correction

Before commit: exact predecessor 845694dc6dc3 run 45395261382 job 138449469548 completed cancelled. Log 12:44:37 shows analyzer interrupted mid-build, then tracked settings.gradle and proguard-rules.pro contained the temporary override and baseline keep rule. Cancellation, not a normal-completion restoration mismatch. Handle SIGTERM as an interruption so Python finally restores bytes, terminate the isolated child process group on interruption, preserve real failures, and add cancellation-only explicit two-file fallback restore with git diff proof. Do not start emulators on a canceled workflow; preserve diagnostic uploads. No compiler or release keep-rule changes. Add unit tests for signal and child cleanup; actual fresh R8 CI required. Separate historical emulator disconnect remains unproven fixed. Small-watch compile passed but 200% font failed; artifact 14922091115 shows system clock after ActivityScenario ended, which is not proof of the in-test window state. Do not weaken wearable geometry checks. No production change or merge.

## 2026-11-24 — #335 Wear CI foreground and Maven rate-limit correction

Before commit: exact head 845694dc6dc3 run 45395261440 reproduced small-watch Maven Central HTTP 429 (job 138449256860), and large-watch 200% font scroll failure with Wear system AllAppsLauncherActivity in focus (job 138449256208). Artifact 14921700538 contains the real default-font MOVO screen and startup overlay, no enlarged-font screenshot. Serialize matrix jobs, reuse Gradle cache, retry only explicit 429 up to three compile attempts; no dependency or compiler substitution. Remove second-pass HOME, explicitly launch MOVO and require foreground within 30 seconds, remove the disposable stale screenshot and require both images nonempty; capture focused window and screenshot on failure. Preserve all geometry, text, handoff and test exit assertions. Workflow-only; signed iOS, ledger, and app files untouched. Fresh exact-head CI required; no merge/remote migration/production change. Existing R8 emulator loss remains separate and must be diagnosed from its current run.

## 2026-11-24 — #335 exact-main reconciliation and signed iPad acceptance

Before staging commit: main 72ae8398, prior head 04a5033f; exact-context patches for App.js, Xcode project, iOS workflow and this log; preserve both histories, existing accounting/vault and all unrelated main blobs. Reuse the main signed XCTest for iPhone and iPad with separate result bundles and screenshot attachments; expand test target device family. Keep unsigned compile/launch diagnostics distinct from actual signed acceptance. Wear and R8 reruns remain pending; no weakened assertions, no production change, no remote SQL. [Engineering handover](engineering/updates/2026-11-24-adaptive-main-reconciliation.md).

## 2026-11-24 — #342 iOS acceptance Keychain signing

After the compile fix the XCTest reached the app, but it showed MOVO's fail-closed "Saved financial records are locked" screen: the acceptance build was unsigned, so the simulator app could not use the Keychain that holds the finance vault key. The XCTest step now builds with an ad hoc local signature for the simulator only. Assertions and vault behaviour are unchanged; workflow-only change.

## 2026-11-24 — #342 iOS acceptance compile fix

`build-ios` failed to compile the new XCTest target: `XCUIApplication.open(_:)` needs iOS 16.4 and the target deploys to iOS 15.0. The deep-link step is now behind an availability guard that fails (never skips) on older simulators. Test-only change; no app, accounting or database change.
## 2026-11-24 — #343 browser evidence and shared native visual gate

Exact 7c4c1bdc Chromium run 45321986274 passed 8/8 real-component checks; artifact 14888800582 contains 8 original screenshots and results.json with zero page errors or horizontal overflow. Receiving selection enables initial proceeds, payment preference remains independent, opt-out clears receiving selection. Integrate #342's shared XCTest-only native guest acceptance and browser gate; preserve all atomic SQL/accounting blobs. Revalidate the new head. No remote migrations or merge.

## 2026-11-24 — #343 Chromium parse failure and migration release gate

Downloaded current-head diagnostic: blank document, browser `Unexpected token ':'` before heading render. Remove webpack eval-based devtool, use structured DefinePlugin env definitions (no remote credentials), and validate generated JS syntax before launching Chromium; record full error stack. This addresses the likely fixture bundling cause without changing application behavior or weakening assertions. Re-run required. Add separate migration approval checklist; production metadata previously confirmed RPC/table absent. No remote migrations or merge authorized.

## 2026-11-24 — #343 integrate #342 and diagnose Chromium fixture

Both prior browser jobs timed out locating Add before any form interaction and published no screenshots. Isolate the real FinancialPlanning component in its own fixture entry, use explicit English and realistic synthetic props, capture sanitized page errors, screenshot and DOM diagnostics on failure; require the actual heading and Add action. Preserve receiving/payment and overflow assertions, plus responsive layout classes used by the existing panel harness. No skipped tests or financial behavior changes. Integrate #342's new head with current main, preserving all original atomic RPC and SQL fixtures. Re-run exact-head CI; release sequencing requires the atomic RPC to exist before new clients use it.
## 2026-11-24 — Persistent encrypted loan recovery (staging)

Reserve one owner-bound canonical RPC request in an atomic IndexedDB transaction, encrypted by the existing finance vault. Verify session before dispatch and acknowledgement; preserve ambiguous requests for explicit retry and prevent another draft from overwriting them. Add key-loss detection, explicit account/data erasure and synthetic store tests. No automatic upload, migration or production change. Exact-head acceptance pending. Known limitation: a permanently rejected or corrupted request requires recovery support; no destructive discard or bypass is offered.

## 2026-11-24 — Atomic loan concurrency entitlement fixture

The two-session RPC attempts correctly denied the synthetic free owner with cloud_read_only_upgrade_required. Seed a short-lived synthetic Pro grant using the existing hybrid-sync fixture pattern; set explicit authenticated claims in both worker sessions. No authorization guard changes. Sequential SQL still passed; concurrent rerun required.

## 2026-11-24 — Concurrent loan fixture authorization repair

The sequential SQL regression passed again. Two-session test failed at synthetic account setup with sign_in_required before either RPC ran. Set the existing disposable fixture service-role JWT claim during seed only, as in the repository's SQL fixtures. Both racing callers still use authenticated role and owner-bound sub. Do not weaken the live guard. Exact-head rerun required.

## 2026-11-24 — Atomic loan parallel replay and rendered fixture acceptance

First isolated SQL workflow passed. Add two simultaneous independent authenticated sessions using the same UUID and assert one liability, event, receipt and cash posting. Add isolated Chromium actual-component rendering for 320/390/768/1280px light/dark with external requests blocked, screenshot artifacts, receiving and repayment selection assertions and overflow checks. No production connection, no paid resource, no release. Exact-head evidence pending.

## 2026-11-24 — Atomic loan disbursement (staging)

One database RPC creates the loan, initial event and accounting posting, with an owner-scoped digest receipt and stable per-draft UUID. Added replay, validation, rollback, historical liability and retry tests. Existing edit and repayment paths unchanged. No remote migrations or production changes. Exact-head acceptance pending.

## 2026-11-24 — #342 actual browser and native visual gate

Prior exact head passed 1,806 tests and all four CI workflows; iOS artifact only showed the OS confirmation. Add the same real-component isolated Chromium loan fixture as #343, with syntax validation and failure screenshots, and an XCTest-only target/scheme that asserts the actual guest Planning UI and native URL entitlement response without signing in, modifying app code or logging any payment. Retain original simulator smoke and native physical compilation. Export XCTest attachments, fail on missing evidence. All exact-head CI/preview/visual checks must pass before merge. No migration or production write.

## 2026-11-24 — #342 integrate latest main before release review

Compared trees against the previous main SHA. Only the append-only progress register overlaps; retain both histories and every existing loan routing/test blob. Inherit mascot integration and all other main files verbatim. Re-run exact-head CI and Vercel preview before any merge. No remote migration or production deployment initiated by this commit.

## 2026-11-24 — Loan/debt receiving-account routing (#342)

Selection automatically enables proceeds; clearing or opting out disables it. Preserve historical liabilities and repayment preferences. Existing accounting RPC posts proceeds; no extra balance write. Added UI and isolated SQL regressions. Initial CI flagged fixture dollar quoting and per-commit documentation; fixed both in a documented consolidated implementation commit. Exact-head acceptance pending; no production change.
## 2026-11-24 — #335 Wear round-screen padding

Once the Wear acceptance test could focus MOVO, it found a real layout bug: the Quick Log button's corners were clipped by the round screen. The round padding was only applied from a window-insets listener, which API 34 legacy windows never call because the decor consumes the insets. The padding is now applied in `onCreate`, rounded up, and still widened for system insets. The failure message now includes the measured geometry; the assertion is unchanged.

With the padding fix, both Wear tests passed on the large round profile. The screenshot pull then failed because the Gradle test task uninstalls the app (and its files) afterwards; the workflow now keeps the APKs installed after the run.

On the small round profile the enlarged-text run was then covered by Wear OS's charging screen (the emulator reports AC power). The workflow now reports an unplugged battery before each run and uses a long screen-off timeout instead.

## 2026-11-24 — #335 Wear acceptance window focus

Both round-watch jobs failed before any layout assertion: Espresso reported `RootViewWithoutFocusException`, and MOVO's window stayed invisible on the fresh Wear emulator. The workflow now finishes the emulator's first-run setup, keeps it awake and returns it to the watch face before the tests. It also logs the focused window and the instrumentation XML on failure. Test assertions are unchanged; workflow-only change.

## 2026-11-24 — Wear emulator window-focus remediation (#335)

Real build and Capacitor sync now complete; both round-device runs reached instrumentation. Small-round report showed Espresso RootViewWithoutFocusException (invisible decor root); the handoff recovery test passed. Keep disposable emulator awake, wake/dismiss keyguard before each font-scale run and hold the test activity screen on. Preserve Espresso interaction, geometry and screenshot assertions; no production app behavior change. Exact-head rerun pending.

## 2026-11-24 — Wear clean checkout full sync (#335)

Latest runner failed during Capacitor copy because ./build is absent. Match the existing Android native-security workflow: build real web assets and run cap sync android before the Wear Gradle task. Retain generated file assertion and all native tests. No fake build folder or reduced acceptance. No production change.

## 2026-11-24 — Wear acceptance clean-checkout repair (#335)

The updated Wear runner reached Capacitor but failed with ENOENT writing capacitor.plugins.json. Create the generated app assets directory before dependency generation, preserving the Cordova Gradle assertion and native acceptance gates. Exact-head checks pending; no production change.

## 2026-11-24 — #335 integration and Wear CI preparation

Preserve current main AGP 9, transfer currency and preference sync safeguards, plus the existing adaptive-device changes. Generate the required Capacitor Android dependency project before Wear Gradle. Native and hosted validation pending; no production change.

## 2026-11-22 — Verify the window bridge in minified Android releases

Expand the mandatory paired R8 contract to call the reflected window bridge before and after activity recreation, validate positive viewport dimensions and reject unexpected non-geometry fields. Native compile and both emulator variants must pass on this head; no application, finance or production behavior changed. [Acceptance handover](engineering/updates/2026-11-22-adaptive-device-compatibility.md).

## 2026-11-22 — Adaptive phone, foldable and wearable interfaces

Implement read-only fold geometry and safe panes without remounting transaction forms, adaptive native iOS navigation with iPad/landscape packaging, and round-screen/scalable-text watch companions. Preserve all finance, account, purchase and storage paths. Local full JavaScript run: 267 suites / 1,786 tests; typecheck and strict original-only build pass. English/default and Arabic/largest-text browser runs pass 56 checks; native CI acceptance is tracked in the [implementation handover](engineering/updates/2026-11-22-adaptive-device-compatibility.md); physical devices, Duo SDK/poses, signed pairing and live hosting remain separate release gates.
## 2026-11-24 — PR #345 CI repair

Original head `bdff6446`: GitHub per-commit documentation gate rejected two code-only commits; Vercel reported 1,804 passing tests and one failing legacy exact Menu tile expectation in App.test.js. Consolidate only this PR's three original commits into one documented commit, retain the direct shortcut and its unit test, update the full-app assertion and verify tab switch/close. No guard changes. No production or data changes. CI and actual visual acceptance pending. [Engineering update](engineering/updates/2026-11-24-menu-plans-limits.md).

## 2026-11-24 — Restore direct Menu access to Plans & limits

Owner request: restore one combined Plans & limits tile in Menu, using the existing `c.openBudgets('plans')` handler and centered Plans & limits sheet (Plans and Limits tabs, including account and merchant limits). Preserve Financial planning, existing data, offline behavior, subscription entitlements, translations and styling. No new routes, accounting logic, migrations or production changes. Acceptance: one tile, correct initial tab, both tabs accessible, close returns to Menu; exact-head CI and visual acceptance remain required.

## 2026-11-24 — #337 integration with current main

Conflict audit found only this progress register overlaps. Retain all original mascot blobs and main changes; exact-head CI and Vercel preview remain required. No production change.

## 2026-11-23 — Animated SVGs for every zodiac mascot (#337)

The thirteen sign-in characters now use animated SVG with the two Aries designs retained. The other eleven signs keep their original pixels and move with character-specific gestures and a separate vector effect. The production build and all 1,772 tests passed. The current lineup and twelve alternate designs are available as twenty-five standalone animated files. [Engineering update](engineering/updates/2026-11-23-all-zodiac-svg-motion.md).

## 2026-11-23 — Sync gold-horned Aries' SVG motion with the original Aries (#337)

The two Aries designs share the 2.65-second hop, blink and wave timing in the sign-in row. The new layered SVG keeps the gold-horned portrait and uses its free hand for the wave. Both SVG and animation preview were decoded and checked. All 1,772 tests and the production build passed locally. [Engineering update](engineering/updates/2026-11-23-guardian-aries-svg-motion.md).

## 2026-11-23 — Keep both Aries mascots in the zodiac lineup (#337)

The sign-in card keeps MOVO's original Aries alongside twelve new reference-based chibi guardians, including a gold-horned Aries. Bundled transparent artwork and short, reduced-motion-aware animations run in the existing decorative row. The animation pack and 13-character contact sheet were verified. Node 26 type checking, all 1,772 tests, production bundling and precaching of the sprite passed locally. [Engineering update](engineering/updates/2026-11-23-zodiac-chibi-guardians.md).

## 2026-11-23 — MOVO zodiac sign-in mascots

Added a monochrome sign-in row with the existing Aries and eleven original zodiac designs. Each character plays one short entrance motion, with reduced-motion support and no new sign-in actions or data changes. Local Node 26 verification covers all 266 Jest suites / 1,772 tests, type checking and the production build. Hosted and physical-device verification remain separate. [Engineering update](engineering/updates/2026-11-23-zodiac-sign-in-mascots.md).

## 2026-11-23 — PR #339 main integration (feature branch only; no merge to main)

- **Before-change rationale:** main advanced by Android AGP 9.5.1 changes and two progress entries from PR #340. PR #339 only conflicts with main in this progress document; its 17 non-document code paths do not overlap main's changes.
- **Proposed resolution:** preserve both sets of progress entries exactly; inherit Android build/tooling files verbatim from latest main, and preserve every existing friend-chat code blob verbatim. Integrate main into the feature branch without merging PR #339 or changing main/production.
- **Verification gates:** rerun all workflows on this new exact head (especially iOS and Android if triggered), check Vercel preview, and keep PR #341 stacked on the updated parent. This integration is not a release approval.

## 2026-11-23 — Friend chats and transaction-card sharing (staging PR)

- **Scope:** Dedicated accepted-friend Chats under Friends; friend profile photos, unread inbox counts, private text, selected expense/income/transfer snapshot cards. No bank transfer, linked-account disclosure or ledger writes.
- **Backend:** Verified bearer-token actor, service-only conversation SQL, friends-only membership on read/send, RLS + revoked public grants, idempotent message nonce, 30/min send rate cap, cascading history deletion when friends remove/block.
- **Inbox efficiency:** The first/foreground request includes friend photos, while ongoing unread checks reuse cached images and fetch only text/counts. Before optimization, the theoretical maximum was 9 MB per 100-friend poll with 90 KB photos.
- **Progress:** Implementation and targeted tests committed on `feat/friend-chat-transaction-cards-20261123`; no migration applied to production and no main/production/store changes.
- **Acceptance gates:** Exact-head Node CI, SQL apply/isolation test in disposable Supabase, Vercel preview, Android/iOS device tests, privacy disclosure/legal review, production API availability. Keep PR unmerged until evidence clears each gate.
- **Detail:** [2026-11-23 friend chat rollout](engineering/updates/2026-11-23-friend-chat-transaction-sharing.md).

## 2026-11-23 — PR #340 Android emulator infrastructure triage

- **Evidence before change:** AGP 9.5.1's native app/Wear builds and other CI passed; the R8 acceptance lost the entire emulator while executing the *baseline* offline WebView smoke (after two PASS markers), as it also did on AGP 8.13 in PR #335. The diagnostic ZIP showed netsim shutdown; host still had ~14.9 GiB free, so no host OOM is established.
- **Narrow mitigation under test:** raise RAM for **both** disposable baseline and candidate AVDs from 2 to 4 GiB; keep isolation, native test cases, exact PASS assertions, and fail-closed behavior. This is a controlled guest-memory hypothesis, not a proven fix.
- **Acceptance:** require the full R8 comparison and fresh exact-head CI green before considering merge; real-device native plugins and store report remain separate gates. No main/production/migration/store changes.
- **Details:** [AGP 9.5 engineering update](engineering/updates/2026-11-23-agp-9-5-upgrade.md).

## 2026-11-23 — Android Gradle Plugin 9.5.1 and Gradle 9.6.0

- **Upgrade.** Play Console asked for AGP 9 ("Upgrade to AGP version 9.0 to get the best performance"). AGP goes 8.13.0 → 9.5.1 and Gradle 8.14.3 → 9.6.0.
- **Build file fixes.** The `clean` task uses `layout.buildDirectory`; `aaptOptions` becomes `androidResources`.
- **Wear.** The Wear release is now minified and resource-shrunk.
- **Compatibility switches.** Capacitor 8.6 modules still use the old DSL and the Kotlin plugin, so `android.newDsl=false` and `android.builtInKotlin=false` are set. `android.r8.strictFullModeForKeepRules=false` keeps Capacitor/Cordova reflective constructors safe in release.
- **Keep rules.** Unchanged, as the paired R8 workflow requires.
- **Score limit.** 100% is not reachable while Capacitor's bridge needs its plugin classes kept by name.
- **Validation.** Android builds run only in GitHub CI; this container cannot reach Google Maven.
- **Details.** [update](engineering/updates/2026-11-23-agp-9-5-upgrade.md).

## 2026-11-23 — Audit fixes: cross-device sync, same-currency transfers, unconvertible totals, net worth

- **Cross-device sync.** Preferences that change balances (recorded card payments, card kind and credit limit, card–bank links) now sync with a three-way merge. Saves are refused when someone else wrote first (`savePreferencesIfUnchanged`), and MOVO pulls the account copy on returning to the foreground. A device with an older copy can no longer erase another device's card payments or flip a card's type.
- **Transfers.** Transfers are limited to accounts in the same currency.
- **Totals.** A record with no exchange rate adds 0 to totals instead of blanking them, and still shows its own currency.
- **Display.** Home net worth wraps instead of being cut off at the Largest text size.
- **Startup.** The store plugin loads on first use.
- **Validation.** 271 suites, 1,789 tests; `tsc` clean; strict build compiled.
- **Owner gates.**
  - Restore Vercel and redeploy.
  - Approve the `account_erasure` and `enforce_archive_and_billing_retention` production migrations (checked against production; the first attempt waited on an unanswered approval prompt), then enable `MOVO_ACCOUNT_ERASURE_ENABLED`.
  - Finish the Play Console subscription setup.
- **Details.** [update](engineering/updates/2026-11-23-audit-fixes-sync-transfers-totals.md).

## 2026-11-22 — Aries motion and Home hero entrance

- Aries settles in when an expression changes. Each mood has calm idle motion: look-around, nod, droop and sigh, or huff with an arm pump. On Home, Aries rises onto the balance card and waves once per session. All of it is off under reduced motion. [Details](engineering/updates/2026-11-22-aries-motion-hero.md).

## 2026-11-22 — Production API disabled (Vercel 402); Plans retry; tabletop foldables; Aries horns

- Friends, Plans and balances that differ between devices share one cause: `movo.nasrinai.com/api` returns 402 `DEPLOYMENT_DISABLED` because the Vercel account is blocked. When the plan check fails, cloud sync falls back to each device's own copy. **Owner action:** restore the Vercel account, then redeploy `main`.
- The Plans panel on phones now explains an empty or failed store query and offers Try again, instead of a grey button. Half-folded foldables keep sheets off the hinge. Aries has new ridged, curled ram horns. [Details](engineering/updates/2026-11-22-outage-diagnosis-plans-foldables-aries.md).

## 2026-11-22 — Approved tester billing migration deployed

#333 is merged as `73524d1f` after all six current-head workflows passed. After explicit owner approval, production migration `verified_store_tester_subscriptions` applied as `20261122064410` (source `20261122055847`). Exact deployed body, service-only execution, tester RLS and no new security advisories verified. No existing financial/purchase rows rewritten; all three #274 migrations remain held. API still returns 402, so live tester acceptance remains blocked by hosting. [Rollout record](engineering/updates/2026-11-22-verified-tester-subscriptions.md#approved-production-migration--2026-11-22).

## 2026-11-22 — Owner-requested verified tester subscriptions

Implement genuine Apple TestFlight/Sandbox and Google Play license-test access for the bound MOVO account, with automatic service-owned admission only after a successful fenced commit. Preserve expiry/refunds, account/environment isolation and zero paid-referral rewards. All 266 frontend suites / 1,771 tests, typecheck, strict bundle and isolated SQL/security/concurrency checks pass. Targeted billing migration and published-head hosted checks remain pending; API hosting is still independently blocked. No financial records or unrelated migrations changed. [Engineering and rollout](engineering/updates/2026-11-22-verified-tester-subscriptions.md).

## 2026-11-22 — All four source PRs merged; live recovery remains open

#330 `c3e37d7c`, #331 `cfb83c51`, #291 `b55429d8` and #274 `ff9edc52` are merged after their applicable current-head checks passed. #274 passes all eight workflows, including both fresh-AVD acceptance steps; its merged tree equals tested `9a0d48d2`. Current JavaScript count is 1,767; 27 host harness tests pass. Historical failed attempts remain failures. Main post-merge iOS status is tracked separately. Public API 402, missing project-level stock key, Google Cloud authentication and balance reproduction remain unresolved. No destructive rollout or store publishing occurred. [Current execution handover](engineering/handovers/2026-11-22-source-merges-android-recovery.md).

## 2026-11-22 — Separate paired emulator state after two failed attempts

At `65f63b83`, all seven non-R8 workflows pass, including 1,767 JavaScript tests. Both R8 attempts lose the candidate emulator after full baseline acceptance and candidate startup/vault checks. Run each compiler output on an identically configured fresh AVD, requiring both full acceptance sequences. All 27 host tests pass; application code, assertions and isolation are unchanged. New-head checks remain mandatory. Build 21 is traced to `cfb83c51`; stock-provider key is missing from project settings. [Current handover](engineering/updates/2026-11-22-android-build21-service-recovery.md).

## 2026-11-22 — Android build 21 service recovery

Confirmed API 402 DEPLOYMENT_DISABLED separately from device connectivity. Correct Planning/plan storage labels and prevent completed HTTP/database denials from becoming offline retries under stale WebView status. Focused 50 tests and typecheck pass; full/new-head validation is pending. Cross-device entitlement, markets and friends need restored API hosting. Await actual Cloud Run project/region and a fictional balance reproduction. Preserve financial records and all activation gates. [Handover](engineering/updates/2026-11-22-android-build21-service-recovery.md).

## 2026-11-22 — Released encryption integration and Android build 21 report

#291 merged as `b55429d8` after all eight exact-head workflows passed at `0db76a9b`, including full paired emulator acceptance. #274 integrates actual released main; fingerprints of 2,404 tracked application/config/test files match the preceding combined candidate. Its paired emulator run at `6a5ad0f0` failed and remains unresolved. New Android build 21 reports cover connectivity labels, cross-device subscriptions, balances, markets, friends and planning. Public API still returns 402 DEPLOYMENT_DISABLED; do not claim runtime recovery from source changes. Destructive flags are absent in Vercel metadata and the three migrations remain unapplied.

## 2026-11-21 — Combined candidate retains pre-failure emulator evidence

Paired acceptance at `16abd407` remains failed after emulator disappearance. Add the same serial-pinned continuous logcat and host/crash diagnostics as #291; all 25 host harness tests pass. No assertions, timeouts or application behavior change. Keep #274 unmerged until paired acceptance and actual #291 main integration pass. [Engineering](engineering/updates/2026-11-21-combined-erasure-owner-encryption.md).

## 2026-11-21 — Final source consolidation for owner-directed draft merges

Hosted checks at `2596b59d` pass web, the five explicit server tests, SQL, security, container and Android compilation; R8 loses its emulator during Wallet acceptance and is failed. The same-source compiler comparisons and encrypted seed/vault checks passed. Apply the same bounded resource/renderer setup as #291 (daemon release, memory/disk/RSS evidence, software OpenGL without Vulkan) and require full current-head paired acceptance; no failed or canceled check is relabeled.

#330 merged as `c3e37d7c`; #331 as `cfb83c51`. #274 now includes #291's owner/encryption/backup/deletion safeguards and final R8 fixture, while keeping erasure and retention disabled until separate production approval/activation. Combined JavaScript: 267 suites / 1,766 tests (including five explicitly run server tests), typecheck, 25 Node / 24 Python checks and strict original-only build/notice audit pass. Fresh published-head hosted/native/SQL checks and #291-first merge order remain required. Production migration history is unchanged at #328; no financial data, server flag, hosting/IAM/DNS or store setting was changed. [Engineering](engineering/updates/2026-11-21-combined-erasure-owner-encryption.md).

## 2026-11-21 — #291 final current-main source validation

The final clean-graph original-only build/notice audit passes. Both R8 compiler variants build the same app source and now require the same mandatory encrypted storage, balance/card identity/style, native bridge, process restart, isolation and hard-failure assertions. Only older source without the finance vault uses the old plaintext fixture-ID check. Twenty-four host harness tests pass; fresh paired emulator/native checks are required for this final source head.

Integrated released #330/#331 main `cfb83c51`, preserving encrypted stores, owner/generation-bound import and confirmation, selective cleanup and partial-deletion reporting. Fresh locked install, 265 suites / 1,746 tests, typecheck and 24 Node checks pass. Synthetic browser migration, encrypted save/reload and non-destructive key-loss gating pass. Final clean-graph bundle and exact-head hosted/native checks are required before the owner-directed source merge; production activation remains separate. [Engineering](engineering/updates/2026-11-21-encryption-owner-integration.md).

## 2026-11-21 — #291 integrates released owner/restore safeguards

The owner requested source merges of all drafts. #330 merged as `c3e37d7c`, and #331 as `cfb83c51`, after their applicable checks passed. #291 retains encryption while integrating owner/generation guards, selective cleanup, partial-deletion failure notices, updated UI/hosting/asset protections and explicit recovery preservation. Initial combined validation: 264 suites / 1,741 tests, an additional stale-confirmation regression, typecheck, 24 Node checks and strict bundle/notice audit pass. Fresh browser migration/write/reload/key-loss acceptance passes with synthetic data. Integrate latest main and revalidate before merge; production migration, host and signed-device/store activation remain separate. [Engineering](engineering/updates/2026-11-21-encryption-owner-integration.md).
## 2026-11-21 — Owner-directed source merges; #331 current-main integration

#330 merged as `c3e37d7c` after all eight exact-head code/native/SQL/container checks passed. The owner now explicitly asks to merge all drafts. #331 integrates that released source while retaining its development-only overrides. Fresh clean-install combined validation: 259 suites / 1,708 tests, typecheck, 24 Node checks and strict iOS-profile build/packaging pass. New-head hosted validation is required before #331 merges. #291/#274 still need combined owner/encryption/cleanup validation. Production migration approval/activation, Vercel account resolution and signed store/device evidence remain separate from these source merges. [Engineering record](engineering/updates/2026-11-21-merge-build-tool-hardening.md).

## 2026-11-21 — Full audit and confirmed-defect remediation (#330)

[Current audit and fresh UI/database/outage evidence](audits/2026-11-21-full-movo-audit.md) · [Engineering update](engineering/updates/2026-11-21-full-audit-remediation.md). Reproduced and fixed account-switch backup restoration, ambiguous import routing, cent/calendar validation, invalid aggregates, adaptive font/icon grids, stable side-nav names and bounded ADB restart recovery. Preserve architecture, financial fields/history, account IDs and API contracts. Local: 258 suites / 1,704 tests, typecheck, 24 Node and 23 Python checks, strict builds and 27 browser observations pass. Seven hosted workflows passed at predecessor `f2aa4587`; paired R8 failed before instrumentation. New-head CI is required. Production remains 402; #274 approval, #291/#274 integration, physical/signed-device and store rights evidence remain open. All four distinct PRs remain drafts; no production action or merge.

## 2026-11-21 — Google Cloud Run preparation (#330)

The owner selected Cloud Run. Added a pinned non-root Node image, restricted build context, explicit staging-manifest renderer with versioned Secret Manager references, container smoke and a build-only CI workflow. Existing database/API/accounting structures are retained; no cloud resource, IAM grant, registry push, DNS, migration or store action. [Engineering and validation](engineering/updates/2026-11-21-cloud-run-preparation.md) · [Deployment packet](CLOUD_RUN_DEPLOYMENT.md). Local image build and two manifest tests pass; runtime smoke is held for hosted CI because local VFS container launch exhausts disk. Fresh source checks, project/account/region and real integration acceptance remain required for activation.

## 2026-11-21 — Vercel outage resilience and portable existing APIs (#330)

Added public-shell recovery on HTTP 402/429/5xx, optional validated build-time API routing, API-aware Shortcut/download links and a bounded Node 26 transport for the existing handlers. Preserve private API cache exclusions, owner isolation, bearer/consent/store gates and the current financial structures. No automatic write replay, schema/dependency change, production write, hosting/DNS change or store upload.

[Implementation and validation](engineering/updates/2026-11-21-hosting-resilience.md) · [Activation/rollback runbook](MOVO_HOSTING_RESILIENCE.md). Local validation: 258 suites / 1,693 tests, typecheck, 14 Node checks and both strict builds pass. [Real-worker browser outage acceptance](audits/2026-11-21-hosting-outage-review.md) saves 12.34 while the host returns 402 and retains 87.91 through reload/offline/recovery without duplication. Full online availability still needs an independent host, configured integrations and live acceptance. Existing `02ef1cee` workflows now all pass, including iOS/Android/R8; those passes do not cover this new source or waive Vercel/rights/device gates.

## 2026-11-21 — App Store copyright and duplication preparation (#330)

Added an enforced original-only iOS profile, generic artwork/labels, quarantined franchise title, bundled license notices and evidence gates before store upload/submission. All 630 saved wallpaper IDs, private uploads, financial structures and the canonical bundle ID remain. No public rebrand, store upload, production write or migration occurred.

Regular web and iOS-profile strict builds pass. Local regression: 258 suites / 1,689 tests; typecheck and nine artifact/offline/source checks pass. Synthetic mobile Wallet/credits evidence is recorded in the [engineering update](engineering/updates/2026-11-21-app-store-rights-preparation.md) and [visual review](audits/2026-11-21-app-store-rights-review.md). [Submission packet](app-store/APP_REVIEW_PACKET.md) keeps real name/rights, one store record, metadata/screenshots and signed-device/backend evidence pending. Apple already lists a Finance app named MOVO; this work does not establish name clearance or Apple approval.

Fresh exact-head CI remains required. The previous R8 retry built both compiler comparisons but lost the emulator during offline instrumentation. Vercel production remains independently blocked by its account restriction.

## 2026-11-20 — Handover review preserves MOVO structures and recovery copies

## 2026-11-20 — iOS system-adaptive controls and panels (#330)

Native UIKit navigation now follows system text/appearance/accessibility settings, uses minimum 44pt actions and flexible dock constraints, preserves disabled state and retains a web fallback if native activation fails. The shared web panels use keyboard viewport/safe-area bounds, semantic surface tokens and growing rows; Wallet actions reflow with text size. iOS system text scale multiplies app preferences without persisting device settings or changing financial structures.

Full local regression: 256 suites / 1,682 tests; focused interface/bridge/font tests: 23. Exact-head native and hosted acceptance remain required. [Review and screenshots](audits/2026-11-20-ios-interface-review.md) · [Engineering record](engineering/updates/2026-11-20-ios-system-interface.md). Vercel's API now confirms the team has an overdue balance; unpause alone did not restore service.


## 2026-11-20 — PR #329 follow-up: device cleanup, navigation and financial submission

Re-audited the #329 source, whose complete changes shipped through #327/main `73e293bf`; keep #329 closed as superseded. Extended #330 with selective owner-bound device cleanup, visible cleanup failure/retry, translated accessible tab names with stable highlight matching, and submission of the amount actually displayed on the keypad. Preserve guest/foreign caches, files, profile photos, chat state and unassigned recovery. No schema, record/API format, navigation or visual redesign.

Final local source: 255 suites / 1,670 tests, type checking and strict build pass on Node 26.13.1; 140 responsive measurements and eight browser interaction assertions pass. [Audit report and inspected synthetic screenshots](audits/2026-11-20-pr329-remediation-review.md). [Separate #331](https://github.com/nasrinaiv0/movo/pull/331) patches compatible build-tool advisories (31→19; production zero).

Release held: Vercel account blocked and public MOVO HTTP 402 DEPLOYMENT_DISABLED; fresh exact-head CI and hosted acceptance required. Prior #330 paired R8 run failed Maven HTTP 429, not a passing emulator result. #274 production erasure/retention approval and native/store/device acceptance remain separate. [Engineering record](engineering/updates/2026-11-20-pr329-followup-remediation.md).


- Reconciled historical Claude handoffs with the November 20 audit and current execution matrix. Corrected shared-cache, password-auth and already deployed finance-rollout guidance; retained all historical evidence and superseded-plan context.
- Reproduced two destructive preference-reset failures with synthetic data. Clearing one scope now retains other guest/account preference copies and unassigned recovery. Delayed clear/deletion results check their captured account before affecting the active device view. Reused #291's confirmed-owner deletion request guard without changing its HTTP payload.
- No schema, accounting model, dependency, native production code, screen or navigation restructure. [Preservation review and validation boundaries](engineering/updates/2026-11-20-handover-preservation-review.md).
- #274 and #291 hosted checks now pass at their published heads; production erasure/retention approval and device/store acceptance remain separate. #330's prior emulator attempt lost its ADB device and was rerun, not counted as a pass. Final follow-up checks are recorded on the updated PR head.

## 2026-11-20 — Preference recovery and current-main validation

- Complete local regression: 253 suites / 1,658 tests pass, plus 20 Android R8 host and 25 iOS orchestration checks. The old main App fails the synthetic cross-account submission regression; the scoped implementation passes it.
- Legal acceptance cannot cross accounts. Preserve artwork beside safe-only legacy settings and keep its persisted original if the next account snapshot is corrupt. Preference write failures have their own visible retry state; finance saves cannot dismiss that failure. Reset invalidates outstanding preference work.
- Exact-head hosted checks, current-source compilation and disposable device acceptance are separate gates recorded on the PR; no store-release or physical-device result is implied.

## 2026-11-20 — Native acceptance fixture with explicit guest provenance

- Updated the disposable R8 fixture to seed the versioned guest preference snapshot before React launches. The compatibility key holds only appearance/setup fields. The card/style data remains a known synthetic guest record; no ownership guard or emulator assertion is bypassed. Fresh native/emulator CI is required.

## 2026-11-20 — Execute the product-audit account-isolation remedy

- Added separate guest and owner preference/artwork snapshots, a safe device-setting allowlist and byte-preserving quarantine for unassigned legacy data. No financial list is inherited merely because someone signs in.
- Bound state setters, delayed cloud responses/uploads, image decoders and imports to their captured owner/session generation. Corrupt snapshots block preference writes rather than becoming empty replacements. Native automation keys require server owner verification before reactivation.
- Initial full regression passes 253 suites / 1,643 tests; the final native credential race case passes separately. Final validation must repeat after integration with released #327. Earlier parallel local builds were killed by the host (SIGKILL); no successful compile is claimed from those attempts.
- #328 is deployed after explicit approval. #327 merged as `73e293bf` after every applicable check passed; its tree matches tested head `305323ed`. #274 production erasure/retention approval and signed store/device acceptance remain separate gates.
- [Execution handoff](engineering/handovers/2026-11-20-audit-gap-execution.md) · [Implementation](engineering/updates/2026-11-20-owner-preference-isolation.md).

## 2026-11-20 — Encryption integration with current privacy controls

- Reconciled #291 with current main while retaining revision-aware consent, owner-bound account deletion, AI withdrawal and the compact security guide. Native mirroring now excludes both chat history and encrypted finance recovery namespaces.
- Documented selected version-dependent finance encryption in canonical privacy disclosures and refreshed acceptance to November 20 revision 1. No complete-device or end-to-end encryption claim is made.
- Encryption regressions, final full-suite/build checks and hosted checks are required before merge. No store release or production schema change is included.

## 2026-11-18 — Safe encryption upgrade and privacy review

- Separate storage for encrypted records, atomic IndexedDB upgrade, protected key-loss recovery, and native migration retries preserve pending data.
- Account deletion works for signed-in customers across plans. iOS privacy and export metadata now reflect the code and the outstanding App Store Connect classification.
- [Evidence and release gates](engineering/updates/2026-11-18-encryption-privacy-audit.md).
## 2026-11-21 — Inert erasure/retention source rollout (#274)

The owner requests merging all draft source. Added default-disabled server-only erasure and retention switches so that a source merge or an existing cron secret cannot delete files/records or freeze accounts before separate production approval. Fourteen focused activation/authorization/retry tests pass; full current-main/encryption integration and hosted checks remain required. No production setting or migration was changed. [Engineering](engineering/updates/2026-11-21-inert-erasure-retention-rollout.md).

## 2026-11-20 — Erasure integration with released accessibility and native gates

- Integrated main `73e293bf`, preserving setup focus/reduced-motion and voice/planning fixes alongside distinct erasure/retention APIs and SQL. Retained both simulator recovery regression sets (27 passing host checks); the earlier twice-timed-out iOS launch remains a failure until fresh native CI succeeds.
- No production migrations applied. #274's separate approval and production-shaped deletion/rollback evidence remain required.

## 2026-11-20 — Preserve released write restrictions in erasure rehearsal

- The old #274 pre-upgrade fixture assumed raw transaction writes were still granted. Updated preflight and snapshot-restore expectations to require the already released #328 restrictions. Both attempted raw UPDATE and DELETE must fail before and after upgrade; no privileges are regranted. Fresh hosted SQL verification is required.

## 2026-11-20 — Erasure PR integration review

- Reconciled #274 with current main and #328. Retained the current consent UI, legal disclosures, brand rendering and controlled transaction reset, alongside the proposed atomic server erasure, upload freeze, schedule-owner constraints and retention enforcement.
- New erasure/retention migrations require separate explicit production approval before this PR can merge. In particular, retention changes can remove old Archive copies and completed processing jobs; #328 approval does not cover that work.
- Local regression, build and hosted disposable-container SQL validation are tracked at the updated PR head. The SQL rehearsal deliberately rejects this local non-container host.

## 2026-11-16 — PR #274 conflict resolution

- Integrated main `77bcacc`. Preserved both finance vault keys and regressions, Friends isolation, current simulator recovery and billing behavior, and the PR’s erasure and retention coverage. Kept both privacy changes and regenerated static policies and locale output.
- [Conflict resolution and validation scope](engineering/updates/2026-11-16-pr-274-main-conflicts.md).

## 2026-11-12 — Blurred previous-page preview during swipe back

Owner request: while swiping back on iPhone, the previous page now shows underneath, blurred, dimmed and parallaxed, clearing as the swipe completes; it is a static copy taken when the page was left. The returned page opens without an entrance animation at its previous scroll position, with no flash (per-frame browser check). Validation: Jest 203 suites / 1,237 tests, tsc, strict build (see `docs/engineering/updates/2026-11-12-swipe-back-preview.md`). Not run: a real iPhone.


## 2026-11-12 — CI-only PR #279: isolate synthetic stage data from existing regression tests

Disposable PostgreSQL CI **fully applied** all baseline migrations, PR274's three security/erasure/retention migrations, post-upgrade legacy-denial tests, and successfully restored a pre-upgrade snapshot into a separate database. The next pre-existing SQL suite failed because it assumed user_preferences contained exactly one row; our earlier synthetic stage fixture deliberately persisted a second unrelated user's row. Fix the **test harness**, not production SQL: take a clean schema snapshot before seeding staging users; after the staging and rollback assertions, recreate ONLY the randomly named disposable test database from its pristine snapshot, apply the same three PR migrations, then run the original seven SQL regressions against uncontaminated data. Keep the separate snapshot rollback database and owner-safe test coverage. Test contracts ensure the reset is bound to a generated database and an explicit GitHub Actions service container. No customer schema/data or real Supabase account changes.

The prior disposable commit b40b18e8 lacks a per-commit dated engineering note, despite the latest commit having one. To pass the **existing** per-commit documentation gate without weakening it, replace only the disposable CI-only branch's history with one two-parent integration merge commit containing the final verified source tree and dated engineering notes. **Never** force-update `main` or canonical PR #274. Fresh exact-commit CI must pass before any release approval.


## 2026-11-12 — CI-only PR279: payment-aware synthetic migration data

The second exact integration CI finance run advanced through all baseline migrations but rejected the unprivileged synthetic account seeds with `sign_in_required` from `enforce_movo_cloud_plan()`. This is expected real authorization behavior, **not** a defect to bypass in production. Seed two synthetic owners as a service-role data fixture with Pro+ manual grant rows, then explicitly switch to the `authenticated` test role and owner JWT for the legacy direct-write compatibility test. Add an isolated test contract checking both grants precede protected rows. The last integration commit also failed documentation gates because it did not include a new dated engineering update; the new dated note and PR progress are included before this commit. No production, main, PR274, cloud entitlement, schema or store configuration changed.


## 2026-11-12 — CI-only PR279: fix stale finance-service-ID assertion

First exact integration CI run (commit fa05f490) ran finance safety contract tests: 8 of 9 passed. Failure was a stale test expectation `MOVO_TEST_PG_CONTAINER=$container` from PR274's old shell wrapper. The newer main's hardened PostgreSQL runner uses `MOVO_TEST_PG_CONTAINER: ${{ job.services.postgres.id }}` directly and avoids scanning Docker images. Replace the assertion with the real exact-service contract, assert the unsafe Docker scan is absent, and keep the rest of the finance harness unchanged. This is a CI **test-only** integration-branch fix. Production, main, PR274, remote staging and personal data remain untouched; full migration SQL regression still needs an exact-head run.

## 2026-11-12 — Disposable PR #274 integration updated for latest main PR #278 (precommit)

**Current latest main:** `2edcabdd2d5788d37c3fbf28028c23a350aab9db` (includes PR #276 and PR #278). **Security PR #274:** `8422adea30aaa64788e1abc2504ae36673141be6`. The disposable branch `ci-only/integrate-pr274-with-pr276-20261112` remains independent; `main`, PR #274 and production were not modified.

**Three-way integration audit:** latest main advanced after the first staged tree, so remerged all newer additions without discarding earlier conflicts. Verified **69/69** prior integration-only files retained, **28/28** new-main-only files retained, and **20/20** newly overlapping files reconciled. PR #278's native back/swipe, setup agreement, narrated guide and Terms §17 remain; PR #274's erasure guards, DPO contact, legal correspondence and payment retention protections remain. Retained true device-mode account deletion with current launch timing.

**Legal consistency:** reconciled native/app URLs and date imports; aligned new `legalVersion.js` Privacy Policy effective date with updated standalone Privacy Policy (November 11, 2026). Re-rendered public Terms page from merged `legalSupplement.json`; static generation is idempotent and the Privacy Policy is canonical. Both Terms §17 setup acceptance and DPO/address remain. 11 merged translation dictionaries contain **2,850** keys each and regenerated locale SHA-1 version `37a945a340d2` (test vectors verified).

**Precommit checks:** 16/16 actual combined source-contract checks passed; 69/69 + 28/28 + 20/20 file provenance checks passed; isolated Python synthetic merge / security tests 4/4 passed. The integrated Jest, native, strict build and PostgreSQL tests are **NOT yet executed**, and a Vercel preview alone will not clear them. Never claim full merge or release readiness until exact commit checks pass.

**Safety:** no paid Supabase staging branch, no production migrations, no customer records, no main commits, and no merge of PR #274. Migration-history drift, old signed app ledger write behavior, and real Auth/Storage plus rollback remain blockers for production release.


## 2026-11-12 — Disposable PR #274 + #276 integration review (precommit)

**Source:** `main` at 43efeee64fa058c214edd5b1cc7f6e208d26fbf6; PR #274 at 8422adea30aaa64788e1abc2504ae36673141be6; merge base `166dbd1271fc21bde29025be93f321c205c7566b`. Branch: `ci-only/integrate-pr274-with-pr276-20261112`. This is **NOT** a production release or merge of PR #274.

**Precommit verification:** 67/67 PR-exclusive blobs copied intact; 39/39 `main`-exclusive blobs retained intact; 21/21 shared files manually/automatically reconciled; 11 translation dictionaries retain keys and order from both branches (2,832 keys each), version SHA-1 regenerated. Native Python isolated runner: 4 precommit synthetic merge/safety checks passed. Actual Jest/Android/iOS/PostgreSQL integration CI **not yet run** on this combined commit; cannot claim release approval.

**Deliberate resolutions:** preserve new main launch sync, back navigation, transaction time and navigation pricing; preserve PR274 deletion/privacy/consent/RLS fixes and tests. Device-mode account deletion test simulates offline to respect new startup wait. MR DIY branding remains known by alias, remote favicon stays blocked without per-provider approval. Finance CI uses main's exact PostgreSQL service ID and PR's `pg_dump`/`pg_restore` rollback and retention tests. Combine both branches' per-locale catalog additions, with no translation collisions.

**Release holds:** Android/iOS release versions not validated; Supabase production migration history does not match repository (40 local vs 35 remote, only 19 timestamp matches); PR274 ledger write revocation can reject old installed clients; user declined paid staging; keep main, PR274, production database and store territories unchanged. Branch CI and conflict checks must pass, and human signed-device/production-shaped validation remains necessary before merging the canonical PR.



## 2026-11-12 — Fail-closed disposable PostgreSQL execution gate

A second-stage CI safety audit found that the synthetic migration harness creates PostgreSQL cluster-global mock auth roles. Merely restricting `PGHOST` to loopback could still modify a developer's persistent local PostgreSQL cluster when copied outside CI. Restrict its entrypoint to **GitHub Actions with the disposable Postgres service container ID**, in addition to the existing loopback and generated-database restrictions. Add subprocess regression cases proving that an ordinary local run, a CI flag without a service, a whitespace-only service ID, and a remote database host all fail before any database command is executed. An isolated Python reproduction verified 5/5 access-gate cases before commit. This change applies only to the disposable test harness; no MOVO app or production database behavior changes.

Canonical PR #274 is open and unmerged. GitHub API-created commits are not producing fresh Actions runs; a CI-only duplicate PR #277 was opened then closed without merge after it also failed to trigger checks. The Vercel preview is READY but cannot substitute for a real PostgreSQL integration run. Staging branch cost is declined; no paid branch should be created.


## 2026-11-12 — PR #274 premerge staging and migration-history safety gate

Live Supabase preflight (read-only) found zero cross-owner schedule links, zero invalid transaction amounts, 3 archive preference rows, zero currently overdue acknowledgement jobs, and existing direct UPDATE/DELETE grants and RLS policies. Repo has 40 migration files while production migration history has 35 entries; only 19 timestamps match. **DO NOT RUN `supabase db push` across the entire repo history against production, or merge on CI-green alone.** The oldest raw PostgREST transaction clients can write before the proposed revocation and fail after it; minimum supported signed mobile versions/rollout remains unverified.

The disposable PostgreSQL CI harness now splits the exact three PR migrations from its baseline, seeds two fake users and finance/schedule/archive/billing rows, confirms old raw UPDATE/DELETE before migration and their denial afterward, tests owner-safe cloud clearing and bounded retention, and creates a private pg_dump/pg_restore snapshot restore in a second disposable database to verify the legacy baseline is recoverable. No credentials, production user records, Supabase API endpoints, or real customer billing traffic are used. This synthetic snapshot exercise does **not** validate production PITR or Storage/Auth rollback.

Critical billing hardening: the 7-day retention job now deletes only *completed* acknowledgement jobs older than 7 days, never pending Google Play acknowledgement work regardless of age. Extended SQL assertions cover overdue pending, overdue completed, and recently completed jobs. Require actual Supabase production-schema staging branch + Auth/Storage/API flows and version-distribution evidence before merging. Supabase quoted staging branch cost $0.01344/hour; creation requires owner cost approval, so no paid branch was started.


## 2026-11-12 — iOS smoke-test path trigger correction

The existing iOS workflow PR/push path filters did not include the smoke driver or its host tests, so a standalone simulator recovery patch would not automatically rerun iOS. Added both script paths to both trigger lists. The actual macOS simulator launch/deep-link/screenshot remains mandatory, with no soft-fail. The host-side selection/recovery tests were run before commit; verify new exact-head CI following push.


## 2026-11-12 — PR #274 iOS simulator launch recovery and runtime matching

The exact-head iOS CI compiled and installed the signed-off debug simulator build, but `simctl launch` hung twice for 180 seconds after a slow (>8-minute) first boot; a subsequent retry was started on the unchanged head to distinguish a runner flake. This patch changes **only macOS CI smoke-test tooling**: select the newest available iOS Simulator runtime (avoid Xcode/older runtime mismatch), and restart only the selected simulator after a genuine launch timeout before the single bounded retry. No erase, no skipping launch/deep-link/screenshot, no soft-failing app crash, no native/app/security/finance code changes. Added selection and fail-closed restart tests; a standalone local Python test harness passed 9 tests before commit. The macOS-host tests and actual launch must still pass after the PR push.


## 2026-11-12 — Repair native finance encrypted vault test fixture

Jest jsdom omits structuredClone needed by fake-indexeddb for JSON-only encrypted envelopes. The new test fixture adds a narrowly scoped structuredClone polyfill without modifying production code or cipher behavior. Exact-head CI must pass; this does not activate the native encrypted vault as the authoritative finance store.


## 2026-11-12 — Country-specific Play compliance worksheet and port-free finance CI

Google Play jurisdiction-specific release matrix added for 25 initial jurisdictions, explicitly BLOCKED pending console territory eligibility, local legal review, merchant verification and consumer/security evidence; this is not 176-country legal clearance. Added structured Play Financial features and Data safety declaration worksheet, using MOVO features and avoiding unsupported claims. Finance test CI uses docker exec into its disposable PostgreSQL service; removed unneeded host port 55432 mapping after a concurrent CI runner job failed binding an already-in-use port. Test logic and database data unchanged.


## 2026-11-12 — Native vault Jest environment compatibility

Initial vault test suite failed to initialize in jsdom because browser TextEncoder was instantiated at module import time. Resolve WebCrypto text codecs lazily on encryption/decryption and inject Node's standard TextEncoder/TextDecoder into the isolated jsdom test environment. No runtime data path or cryptography semantics changed; complete tests must pass on exact head before release.


## 2026-11-12 — Staged native encrypted finance snapshots (not yet primary ledger)

Introduced an additive, native-only, non-destructive finance snapshot store using AES-256-GCM with owner/group authenticated data and device-only Keychain/Keystore key wrapping. No automatic import or deletion of existing browser/Preferences/IndexedDB records. Added cryptographic tamper, key-failure, IV-randomness, web isolation and round-trip migration-stage tests plus native allowlist contracts. This is a migration prerequisite, **NOT** proof that MOVO's production local finance records are encrypted; authoritative localStorage and IndexedDB journals remain plaintext until a subsequent rigorously tested switchover. Full privacy disclosure and NO-GO stay in force.


## 2026-11-12 — PR 274: finance card name fallback and legacy logo test coverage

Exact-head CI exposed six test suites still asserting remote unreviewed favicons and a functional regression: the MOVO-face fallback masked bank names in Wallet filters. Keep the local MOVO artwork while showing the underlying account/institution label in the fallback subtitle, without changing card balances, visibility settings, or color themes. Update UI and logo tests to assert offline icons, no unreviewed network fetch, visible institution labels, and unchanged finance metrics. Re-run the complete CI suite on this new commit before merge.


## 2026-11-12 — PR #274: verified mailing address, Google Play declarations and fail-closed logos

Published developer-supplied privacy correspondence address in web/in-app legal pages and external deletion page; explicitly did not invent the legal controller's business registration. Blocked all unreviewed Google favicon, direct site favicon and payment network external requests with generic local fallback; added tests that default and legacy owner approval do not authorize artwork. Added Google Play financial features, Data Safety and regional merchant/availability review checklists. Complete native finance encryption/migration, legal counsel approvals and Google Play Console submissions remain pending. No production data, store settings, billing or migrations modified.


## 2026-11-11 — PR #274: DPO disclosure and 176-market compliance gate

Designated DPO Nasrin Abubakar, dpo@nasrinai.com, in public and in-app legal pages and the external account-deletion instructions; retain general support email. Legal controller identity, physical address and local representative details remain unverified, and no legal clearance is asserted. Added regression coverage and a global market-specific release evidence register. Apple currently advertises 175 App Store countries or regions, not the requested 176; Google Play market list and individual requirements need separate confirmation. Do not merge, publish, activate billing, or apply production migrations without independent validation. Vercel Sandbox still returns HTTP 402 payment_required.

## 2026-11-11 — PR #274: Security, privacy and billing remediation (review — NO-GO)

- The existing Clear All Data action previously ignored private-file cleanup failures, did not await removal of the native Preferences mirror, and could report both a false success and a misleading 'nothing removed' error. It now awaits QR, receipt, hybrid journal and native mirror cleanup, retains the retry sheet on failure and reports a retry-required failure without falsely claiming no data changed. Native/browser acceptance is still required.

Audited the ledger bypass, cross-owner schedule references, Google cancellation handling, account deletion, archive/acknowledgement retention, native backup rules, age and AI consent, and legal disclosures. PR #274 includes transactional account erasure, private Storage cleanup, tenant-scoped SQL enforcement, and Play subscription expiry protection. This follow-up also prevents deleted-account JWTs from reopening private uploads, makes attachment cleanup independent of IndexedDB availability, and avoids network-dependent apt installation in the isolated finance CI by using the disposable PostgreSQL service client. No production database, billing setting, deployment, or store release was changed.

Validation: original branch source reported 1,190 Jest tests across 194 suites, TypeScript/production build and isolated SQL fixture passing. The initial PR CI had a missing per-commit documentation entry and a runner DNS failure during PostgreSQL client installation. A repaired one-commit PR requires fresh exact-head CI. MOVO Vercel Sandbox creation was attempted and rejected with HTTP 402 payment_required; browser and signed-device verification are still open. Release decision remains NO-GO; details: `docs/engineering/updates/2026-11-11-security-compliance-remediation.md`.

## 2026-11-12 — PR #275: Bank and linked-card transactions; e-wallet cards
- Bank Accounts → Account details now displays a read-only combined transaction history for the bank and all active explicitly linked debit and issuing-bank credit cards, with Bank-only and individual-card filters. A transaction involving both sides of the group appears once; each card's standalone history stays isolated. Transactions tab pages through full history at 50 rows per page.
- Wallet → Cards includes e-wallets in the existing carousel and My Cards pile while keeping their independent E-Wallets filter, type, balances, QR codes, and sync state. No database, accounting, or RLS migrations.
- Added source-isolation, transfer dedupe, per-card history, 65-row pagination, and filter tests. Added seven new UI labels translated in all 11 supported non-English languages.
- Initial GitHub suite: 195/196 suites passed; i18n key coverage was the one failure and has since been fixed; await exact-head verification. Vercel Sandbox returned HTTP 402 payment_required for create/resume: UI test blocked. Release stays unmerged. Details: docs/engineering/updates/2026-11-12-bank-card-activity-ewallet-cards.md.

- **2026-11-12 PR #275 CI infrastructure hardening:** GitHub's two-user PostgreSQL tenant-isolation workflow failed *before executing any SQL* because Ubuntu's apt mirror DNS failed during `postgresql-client` installation. Replaced network-dependent apt installs with short-lived, stdin-safe `psql`, `createdb`, and `dropdb` wrappers that execute the official PostgreSQL 18 client binaries inside the same disposable GitHub Actions service container (no host-mapped database port). The Python tenant-isolation tests remain unchanged and must still complete successfully. Source, shell invocation/STDIN forwarding validated before commit; rerun all required checks on the new exact head, verify preview and preserve NO-MERGE gate until all checks are green.

- UI regression for Clear All Data now awaits its verified asynchronous QR, attachment, hybrid-store and native-storage cleanup before asserting that records disappeared; this preserves the stricter completion contract rather than relying on an unsafe synchronous assumption.

- The privacy cleanup regression exposed an IndexedDB-absent runtime: account QR removal already treats unavailable IndexedDB as an empty store, but receipt attachment removal threw before the local ledger could be cleared. Both now skip only absent IndexedDB, while actual database write/clear errors remain blocking. The local-finance-key removal result is also checked before claiming success.
## 2026-11-20 — Open PR consolidation

## 2026-11-20 — Build-tool security advisory remediation

Pinned patched development-only transitive packages without replacing Create React App or changing application/native code: serialize-javascript 7.1.4, underscore 1.13.8 and SockJS UUID 11.1.1. The clean-install production dependency graph is unchanged. npm audit falls from 31 findings (16 high) to 19 (9 high); production audit remains zero. The remaining development-tool advisories require a separate compatibility-reviewed toolchain upgrade.

Node 26.13.1: clean install, full build (including offline-worker, localization and email checks), type checking and 252 suites / 1,644 tests pass. New compatibility regressions exercise actual serializer, UUID undersized buffers, SockJS and JSONPath contracts. Hosted checks remain pending; Vercel reports the account blocked. See [engineering record](engineering/updates/2026-11-20-build-tool-security.md).


- #328 merged as `45b9e968` after its explicitly approved production migration and green hosted checks. Catalog verification confirms raw transaction writes denied and anonymous reset denied.
- #327 integrates the complete #326 harness, current main accounting fixes and #329 setup/accessibility changes. Both source PR records are preserved. Final integrated CI must pass before merge.
- #290 is superseded by #291; encryption and erasure remain separate reviews, with no permission inferred for additional production migrations.

## 2026-11-20 — PR #327 isolate Pixel Launcher in the disposable AVD

- The native build passed after runner alignment. The emulator reached an enabled Wallet control, but the failure screenshot showed the Android Pixel Launcher ANR dialog covering MOVO Home. Confirmed synthetic account recovery under the dialog.
- Disable only the installed, exact Pixel Launcher package for user 0 after the disposable AVD has been verified and rooted. Force-stop that background package and verify its disabled state. Keep MOVO enabled and preserve every test assertion and timing limit.
- Twenty host R8 tests pass. Exact-head compilation and paired device smoke are required again.

## 2026-11-20 — PR #327 Android dependency runner alignment

- Native Android jobs 44630551757 and 44648057066 both selected Ubuntu 26.04 and failed in Gradle classpath resolution before compilation. Pin the independent native build to Ubuntu 24.04, matching the established paired R8 workflow, and reuse the same Gradle dependency caching option.
- All native build variants, package checks, dependency versions and failures remain intact. Run the native and paired emulator gates on the new head.
- The preceding touch-input change passed 1,636 local tests and a strict build, 30 responsive browser checks, and hit-tested offline Wallet/Cards touch with the saved BPI logo and silver card. Android emulator acceptance remains separately required.

## 2026-11-20 — PR #327 Android Wallet input recovery

- Run 44630552132 restored the synthetic wallet and passed bridge/Activity recreation. A WebView evaluateJavascript callback stalled during the Wallet click. Use Android touchscreen events on the visible Wallet and Cards controls, while keeping rendered route, selected tab, saved card, bundled logo, frame, screenshot, synthetic callback and vault assertions.
- Run 44630551757 stopped before compilation while resolving pinned Gradle dependencies. Requested a retry of the existing failed job, with no dependency or repository edits.
- Local checks passed: 18 R8 and 25 iOS orchestration tests. The changed test APK requires exact-head GitHub compilation and paired emulator acceptance.
- [Failure evidence and rollback](engineering/updates/2026-11-20-android-r8-controlled-experiment.md#pr-327-touch-input-for-offline-wallet-navigation).

## 2026-11-20 — Solid popups, combined plans/limits and voice lifecycle repair

- Consolidated Menu tools into Financial planning > Plans & limits, preserving local access and both editors. Replaced popup glass override with opaque light/dark surfaces; improved Plan & Usage, 44px close controls, focus/scroll behavior and 320px plan-row wrapping.
- Fixed WebKit speech retry cancellation and later-chunk watchdogs. Preserve final recorded audio until encoder stop, with bounded 1.5-second release and immediate privacy/navigation cleanup.
- 251 suites / 1,636 tests, typecheck, safety prebuild checks and strict production build pass; 30 responsive component render checks pass. Independent review corrections applied; Claude unavailable. Physical microphone/speaker acceptance remains required.
- Vercel Sandbox billing and protected-preview temporary-access review block are documented. Local exact-source rendering used; no production secrets or access controls changed. Separate follow-on PR; only #326 has owner merge authorization.
- [Implementation, evidence and device acceptance](engineering/updates/2026-11-20-solid-panels-planning-voice.md).

## 2026-11-20 — PR #326 merge preparation and iOS launch recovery

- Owner now authorizes fixing and merging PR #326 after passing CI and preview. Earlier experiment hold is superseded for this PR only; real-account OAuth and store billing acceptance remain separate release gates.
- Merged current main into the experiment branch, preserving both progress records. Exact prior head f976d385 passed Android native, isolated paired R8/emulator, finance isolation, Phase 1 and Vercel; iOS compiled successfully but both launch calls timed out.
- Corrected the misleading cold-boot retry: after a launch timeout, require shutdown/boot/bootstatus before one final launch. App crashes, recovery errors and repeated timeout remain hard failures; native URL and screenshot stay mandatory.
- Independent native review completed (Claude is unavailable). Python orchestration and R8 tests are rerun before commit. The new exact head must pass hosted native CI and preview before merge; no store upload authorized.

## 2026-11-20 — Match the Android Wallet screenshot to the verified Cards view

- Exact run 44601407555 at 46e5d31cde48f5976172c97d61c6ca104aef2f70 passed both minified builds, the diagnostic analyzer and all ten emulator checks. The controlled rule produced identical 1,366,480-byte DEX files. The newest iOS job is separate.
- Reviewing the emulator images showed that the Wallet assertion could inspect a card in the All view and capture the transition frame. Assert the Cards filter is selected, scope the bank artwork and style assertion to the Cards deck, then wait for the WebView frame before recording the screenshot. The app and optimization rules are unchanged.
- Fifteen Python tests and the Node 26 browser fixture check pass. The selected-Cards assertion and screenshots must pass on both minified build variants.

## 2026-11-20 — Back off on Maven Central throttling in the R8 experiment

- Attempts 1 and 2 of 44599470076 at 42eb503c50f4b9417febeaaea8da616869724519 hit Maven Central HTTP 429 before the Kotlin/Gradle dependencies resolved. The separate Android native security and test-signing jobs passed.
- Cache Gradle dependencies in the isolated workflow. If the official Maven Central endpoint explicitly reports 429, preserve the failed log and wait 60 then 120 seconds before retrying the same build. Java/Kotlin failures propagate immediately. The final failure always fails the experiment.
- Fifteen local Python tests pass, including bounded retries, preserved logs and immediate compiler failures. Browser offline Wallet verification with the synthetic fixture also passed. Re-run the hosted KVM experiment at the new head.

## 2026-11-20 — Verify offline Wallet after a separate process restart

- Run 44590024327 at 4eee1fb3a9880da9541fde89242dde668843d67e passed cold launch, the framework instrumentation test and encrypted bridge storage through Activity recreation. The Wallet test stayed on Home after a click. Its screenshot shows the fixture profile and a -₱125.50 balance on offline Home, confirming that the app read the synthetic wallet.
- The old test could match Home before the asynchronous WebView reload replaced the document. Seed in a dedicated instrumentation invocation, then force-stop and open a fresh process behind the existing emulator-wide firewall. Require the saved account, offline browser state and enabled Wallet/Cards controls before exercising the actual Wallet and callback UI. Print a small, synthetic-only DOM state summary on assertion timeout.
- Upload a separate small emulator evidence archive alongside the full R8 build artifacts. This change is restricted to experiment code and its workflow. Thirteen local Python checks pass; the complete paired emulator run must pass at the new head.

## 2026-11-20 — Run the release smoke checks without AndroidX test dependencies

- Experiment 44586272868 on 742ae42937fdcb6d243ff198dd75a8d58147aaa4 built the two minified releases and ran the official analyzer. R8 8.13.6 output was byte-identical for the paired DEX (1,366,480 bytes) and APK/AAB sizes matched. The R8 9.4.34 pair matched at 92.58% optimization, 93.44% obfuscation and 93.25% shrinking, with 1,351,216 DEX bytes each. These are diagnostic scores from a different compiler, and the removed keep rule produced zero gain.
- The emulator booted and cold launch completed. The crash buffer shows AndroidJUnitRunner preparing the application fell into a missing method in a target-loaded class, followed by missing androidx.tracing.Trace. No bridge assertion had run.
- Use the framework Instrumentation class for the opt-in release test APK and give it a dedicated source directory. Keep ordinary AndroidX test configuration and application keep rules intact. Verify an explicit case-specific result plus the framework success code and print the bounded crash buffer on failure. Preserve bridge, secure-storage, Activity/process, offline wallet and OAuth error checks.
- Thirteen Python tests and whitespace verification pass. The controlled build, analyzer and emulator must rerun at the new head.

## 2026-11-20 — Repair R8 instrumentation-only compiler annotation dependency

- Exact head 79fd7f72c6f086d0e7060a4c7ed6ce61d00eb83a failed native experiment run 44585073902 at minifyReleaseAndroidTestWithR8, after the app release APK/AAB tasks succeeded. The test dependency's Error Prone CLASS-retention annotation references absent JDK compiler enum javax.lang.model.element.Modifier.
- Add only that missing-type diagnostic rule to an opt-in testProguardFiles file. Keep the instrumentation class name stable for explicit am instrument class/method selection. Application proguardFiles and the measured baseline/candidate rules are unchanged.
- Thirteen Python checks pass. Updated engineering record before committing. Re-run native compilation and emulator checks at the new exact head; no score/size result is claimed from the failed run. Main, production and stores unchanged.

## 2026-11-20 — Publish measured R8 evidence in job logs

- Emit each completed baseline/candidate metrics JSON into the workflow's text log, including real analyzer scores/rule impact, hashes and DEX bytes. Artifact evidence remains unchanged. This allows independent review without downloading the binary artifact ZIP.
- Thirteen Python checks and whitespace verification pass. The dated engineering note was updated before commit. Exact-head CI must complete; no gain is claimed while builds run. Main/production/store unchanged.

## 2026-11-20 — R8 review follow-up: pin screenshot evidence target

- Follow-up independent review confirmed both safety fixes and 13 passing Python checks; identified the direct binary screencap subprocess as the only remaining ADB invocation without the verified serial. Pin that command as well, so device evidence cannot drift if another ADB target connects. This affects evidence capture only.
- Updated the dated engineering record before committing. Native CI must rerun on the new exact head; no main, production or store changes.

## 2026-11-20 — Isolated Android R8 measurement and release emulator gate

- Continued the Android optimization handoff from main `a3193b8361e32ea559d8350deaeb6a3e75041759`. No changes to main, production, store uploads or signing secrets.
- Candidate removes only the redundant class-specific MovoNativePlugin keep; the annotation-based full plugin keep remains. No size/score gain is claimed before matched measurements.
- Added a read-only-permission PR workflow: identical bundled UI, temporary synthetic signing, default-compiler baseline/candidate APK+AAB and diagnostic R8 9.4.34 baseline/candidate with Google's pinned analyzer. Restores original settings/rules and uploads source hashes, mappings, DEX bytes, reports, logs and screenshots.
- Opt-in instrumentation targets non-debuggable minified releases. Checks reflected bridge contracts, secure-storage ciphertext/round-trip/removal, activity and separate-process restart, offline bundled bank logo/card style, and a synthetic OAuth provider error callback. Successful live login and Play/Apple billing are separate unverified gates.
- Independent Codex review found and fixed two harness defects: refuse physical/ambiguous ADB devices before any root/network/uninstall operation, and reject skipped/assumption-failed instrumentation as failures. Claude is unavailable in this runtime; no Claude review is claimed.
- Local Python verification: 13 tests passed; diff whitespace check passed. Native SDK/KVM are unavailable in the managed workspace. Vercel Sandbox returned HTTP 402 payment_required and no Vercel CLI is installed; run native measurements on disposable GitHub KVM runner.
- Engineering evidence and acceptance limits: `docs/engineering/updates/2026-11-20-android-r8-controlled-experiment.md`. Documentation recorded before committing/publishing. Do not merge or promote this experiment without complete native and real-account/store acceptance.
## 2026-11-19 — Finance integrity audit fixes

- Restricted direct transaction UPDATE/DELETE privileges; sync and reversal RPCs retain ownership, entitlement, CAS and audit checks. Linked payment edits now protect `is_pending`.
- Goal/plan allocation balances and automatic reconciliation exclude pending income, expenses and transfers, including pending foreign-currency records.
- Cloud reset uses an owner-verified transaction reversal RPC; transaction-phase failures roll back earlier reversals. The remaining reset/storage steps retain their separate-request behavior.
- Added SQL regressions to finance isolation CI and client reset failure tests. All 251 JavaScript suites / 1,629 tests, typecheck and strict production compilation passed after the final owner-parameter change. Local PostgreSQL migration, tenant-isolation and integrity checks passed; old behavior failed each of the three targeted regressions. Production deployment and hosted CI/preview remain separate release steps.
- [Implementation, validation and rollout](engineering/updates/2026-11-19-finance-integrity-audit-fixes.md).
## 2026-11-20 — Full production audit and accessibility remediation

- Recorded the read-only production audit baseline at `44f3ab4d` with the responsive, financial, sharing, privacy, performance and store evidence. Mapped accounting, sheet/voice and storage work to existing PRs.
- Added setup agreement keyboard containment and background isolation, corrected sheet reduced-motion timing, and aligned the PWA install name.
- Local Node 26 strict production build and all 1,627 tests passed. Four Chromium cases verified keyboard, legal navigation and motion at three phone widths.
- [Full audit and remedy matrix](audits/2026-11-20-full-movo-product-audit.md) · [Implementation and acceptance](engineering/updates/2026-11-20-product-audit-accessibility-remediation.md).

## 2026-11-19 — Legal/privacy audit and centered Friends QR

- Confirmed MOVO is a product of NasrinAI. Corrected encryption, cloud stickers, purchase tokens, Archive retention, reset/deletion and AI processor disclosures through shared core policy content and synchronized public pages.
- Added revision-aware acknowledgement and paired preference merging, adult self-declaration, targeted device AI withdrawal with capture/retry shutdown, and Delete Account for signed-in sync-off owners.
- Centered the square Friends camera frame, video crop and profile QR. Kept QR parsing and permission behavior intact.
- Documented remaining encryption, IAP retention, operator/store and territorial release blockers. This is not a certification of legal compliance.
- Independent final review passed after fixing legacy-client revision compatibility and deletion before agreement. Thirteen browser checks and the final251 suites /1,626 tests with strict production build passed. Exact-head CI/preview is tracked in the PR.
- [Audit and required operator actions](audits/2026-11-19-legal-privacy-release-audit.md) · [Engineering and validation](engineering/updates/2026-11-19-legal-privacy-and-friends-qr.md).

## 2026-11-19 — Voice transcription recovery and loading-screen branding

- Preview acceptance follow-up, documented before commit: live metadata confirms MOVO_ALLOWED_ORIGINS contains only the two production origins. Allow this exact Vercel deployment origin only in VERCEL_ENV=preview, retaining production rejection of preview/sibling hosts, and add four boundary regressions. Repeated verification passed all 1,612 tests and the strict production build; independent security review passed. Provider credentials remain unchanged; OpenRouter fallback is currently configured only for production, so real fallback acceptance needs separate preview credentials or an approved staged release.
- Reproduced the source failure behind the screenshot: unsuccessful STT left the microphone, recording controls and Listening placeholder active. Added explicit capture shutdown, request cancellation/deadlines, generation checks, interruption/background cleanup and bounded transient audio queues.
- Added one server-only OpenRouter transcription fallback using the already configured chat provider. Authentication, Pro entitlement and explicit consent remain mandatory; audio is transient, carries no finance context or user identifiers, and deliberate upstream budget limits block fallback.
- Changed the loading screen and page metadata to **MOVO / Money Organizer & Visual Outflow**, with responsive subtitle wrapping and retained dark/reduced-motion styles.
- Initial integrated verification: 249 suites / 1,608 tests passed. Production compile caught an unsupported lint-rule suppression comment; removed it and repeated the strict build. Strict production build and seven browser checks passed; focused final tests passed 64/64. Exact-head CI, hosted preview and physical iPhone/Android voice acceptance are tracked in the engineering record and PR. No production deployment or store release is performed here.
- [Scope, evidence and acceptance checks](engineering/updates/2026-11-19-voice-transcription-recovery.md).

## 2026-11-19 — Offline appearance, visible plan prices, loans and Friends

- Preserved saved logos, card names, verified local plan features and downloaded artwork offline; generated an isolated offline web shell.
- Displayed all four paid plan amounts with fresh/cached/reference labels, guarded annual savings and exact checkout quotes.
- Reduced card/bank elevation, especially dark mode, and preserved explicit Cloud Sync off semantics.
- Added separate receiving and repayment account choices for loans/debts, including cards, plus an owner/currency-validated nullable metadata migration.
- Added Friends QR camera/photo scanning, pasted links and a MOVO profile-style QR card with native/web image sharing.
- Updated privacy disclosures and translation catalogs. Browser, regression and native/SQL CI evidence is linked in the PR. No production or store release is performed here.
- Final visual review separated plan amounts into a readable two-column grid and compacted the loan consent rows. Integrated local verification passes 248 suites / 1,572 tests; QR PNG export-to-scan and offline reload checks pass. The original isolated finance, sync and purchase integrity checks passed. Final exact-head CI is tracked on PR #323.
- [Implementation, validation and rollout details](engineering/updates/2026-11-19-offline-appearance-plans-friends-loans.md).


## 2026-11-18 — Start a fresh MOVO chat after 10 minutes idle

- Added a 10-minute inactivity deadline, a history picker, and device-only encrypted storage for completed local conversations. Existing signed-in history remains available through its account-scoped endpoint.
- Added tests for elapsed time, background resume, account isolation, encrypted local storage, and saving a complete cloud turn. [Implementation and verification](engineering/updates/2026-11-18-chat-idle-history.md).
- Integrated current main `5edd47d` and the pending Security & Privacy guide. Regenerated the shared locale files from both source catalogs. [Integration and validation](engineering/updates/2026-11-18-chat-history-main-integration.md).

## 2026-11-18 — Compact Security & Privacy guide

- The guide linked from Settings has a persistent Back to Home button, quick section links, compact light and dark layouts, and expandable FAQs. It retains the current storage and encryption disclosures.
- Typecheck, strict production build and all 1,543 local tests passed. [Scope and verification](engineering/updates/2026-11-18-compact-security-privacy.md).
- The header can wrap at larger browser text sizes. Chromium verified that anchored sections clear the sticky header at 150% and 200% text sizes from 320 to 1440 px.
- Integrated current main `5edd47d` and retained both release entries. [Integration and validation](engineering/updates/2026-11-18-security-privacy-main-integration.md).

## 2026-11-17 — "Auto" in While you were away

- An **Auto** filter, right after All, gathers everything a phone automation logged: Siri, Apple Pay, bank notifications, Google Pay and the Android assistant.
- Each of those rows carries a small **Auto** pill. Manual and imported records are not tagged.
- The "Auto" label now has proper translations. [Details](engineering/updates/2026-11-17-while-away-auto.md).

## 2026-11-17 — Smoother on budget Android phones and iPhones; camera and voice on every Android device

- Scrolling no longer hitches.
  - Every App render rewrote `<html lang/dir>`, which restyled the whole page.
  - Cards and chips no longer blur the plain page colour. The pixels are identical, and there are 11–15 fewer GPU layers per screen.
  - Date keys are about 15× faster.
- Budget Android profile, worst scroll frame: 283 → 83 ms on Home and 233 → 50 ms on Wallet. iPhone-size profile: all three screens about 60 fps.
- iOS allows 120 Hz on ProMotion iPhones.
- Android now declares camera and microphone (asked only on use; optional hardware), so receipt scanning and voice work there as on iOS.
- Play re-scores DEX optimisation (#308) after a new bundle is uploaded. [Details](engineering/updates/2026-11-17-smoothness-all-devices.md).

## 2026-11-17 — Settings rows show feature names

- The main Settings list and search results display feature names with their existing controls. Search still matches descriptions, and assistive technology can still read them.
- Local Node 26 typecheck, strict build and regression tests passed (244 suites, 1,541 tests). The Vercel sandbox passed 12 focused tests. Open PR scopes #274, #290 and #291 were reviewed. [Implementation and rollback notes](engineering/updates/2026-11-17-settings-feature-names.md).

## 2026-11-17 — PR #291 brought up to date with #309; sync race fixed
- Merges #309's branch, which carries `main` and #294's Security & Data Guide. Terms and Privacy keep #309's referral section and this PR's encryption wording, and are effective November 20, 2026. The guide's encryption claims now match what ships: selected local records, dependent on app version, never "everything".
- Fixes a race on `main`. After a sync saved a clean device copy, an effect from an earlier render could write the old rows back as unsynced. This PR's encrypted storage made it happen more often. [Details](engineering/updates/2026-11-17-pr-291-referral-integration.md).

## 2026-11-17 — PR #291 brought up to date with main

- The encryption wording and #314's friend-sharing wording are both kept. Terms and Privacy are effective November 19, 2026. The legal page generator now takes its dates from `legalVersion.js`. #290 is contained in this PR. [Details](engineering/updates/2026-11-17-pr-291-main-integration.md).

## 2026-11-16 — PR #291 conflict resolution

- Integrated main `77bcacc`. Preserved pre-render encryption and legacy recovery alongside main’s reminder settings cache, install referrals, and Friends routing. Preserved current receipt and Friends privacy disclosures.
- [Conflict resolution and validation scope](engineering/updates/2026-11-16-pr-291-main-conflicts.md).

## 2026-11-13 — PR #291 non-production merge of concurrent PR #292 (precommit)

- An independent collaborator merged [PR #292](https://github.com/nasrinaiv0/movo/pull/292) to main `636eb35` while PR #291's security checks were running. **We did not merge PR #292 or trigger the queued Vercel production deployment.**
- PR #292 changed `src/App.js`, `src/App.css`, `src/App.test.js`, `docs/PR_PROGRESS.md` and added `docs/engineering/updates/2026-11-12-android-bottom-nav.md`; no finance-vault, QR cipher, API authorization, legal generator or database changes.
- **Integration plan**: on the existing *non-production PR branch only*, preserve PR #291's legal consent/finance test changes and add PR #292's new touch-down bottom-nav test; take PR #292's App.js/App.css and progress document, and retain all prior encryption/security audit records. Create a two-parent merge commit on PR #291 (parents `3c15601` and `636eb35`) so the open PR is mergeable again without force-pushing or altering main.
- CI for `3c15601` passed Phase 1: **229/229 suites, 1,379/1,379 tests**, hybrid security, PG tenant isolation and IAP integrity; Android Gradle native compilation was in progress; iOS queued and Vercel preview queued. New integration head **must rerun all checks** because navigation code has changed. No production or database modification.

## 2026-11-13 — PR #291 second CI iteration (precommit record)

- Exact-head `3d6a786` Phase 1 regression: **228/229 suites, 1,378/1,379 tests passed**. Atomic QR upgrade tests, legal generator, user-facing security contracts and earlier offline CSV-sync test PASSED. The one remaining test in `src/App.test.js` asserts old Terms/Privacy UI effective dates (Nov 11 and Nov 6) while current staged legal pages correctly show **Nov 13**.
- Fix only this stale UI fixture to expect Nov 13; do not change legal publication, canonical data, financial sync code, QR encryption, rollback assertions or production. Verify again with exact-head CI and preview, Android and iOS gates.
- Production/main unchanged. Both prerequisite PRs #289/#290 and follow-up PR #291 remain open and unmerged. No database/Auth/billing settings changed.

## 2026-11-13 — PR #291 red first-head CI; documented repairs before commit

- Initial exact-head `0c0f04b` CI: **226/229 suites and 1,376/1,379 tests passed**; red Phase 1, hybrid-accounting, Android web/Jest gate; Vercel preview ERROR. Supabase tenant-isolation and IAP-integrity checks passed. iOS queued.
- **QR regression fixture:** invented `iVBORw0KGgp=` was intentionally rejected by the PNG-signature validator, incorrectly used in the legacy migration success test. Replace fixture with valid PNG signature; keep MIME spoof rejection, whole-transaction rollback and tamper detection tests.
- **Canonical legal generator:** Privacy/Terms pages were updated in staged code, but `src/lib/legalSupplement.json` source-of-truth was not. Amend the canonical legal security paragraph, regenerate canonical Privacy/Terms exact bytes, and bump both `src/lib/legalVersion.js` dates to 13 Nov 2026; require renewed user acceptance for material changes. Update legal/version tests to reject previously accepted 11 Nov version. Do not publish legal changes to production before separate release approval.
- **Offline CSV CI:** one `AppOfflineFirst.test.js` previously green on parent PR #290 timed out waiting for clean cloud-sync projection after mock upload. Neither QR implementation nor trust docs edits the financial writer. Preserve the test and financial accounting code unchanged for a clean rerun; if reproducible, inspect actual sync state rather than masking accounting regression.
- Validate exact-head full Jest, QR migration, legal generator, Android native compile, iOS simulator and Vercel preview. No main, database, production or store changes.

## 2026-11-13 — Security assurance / encrypted QR cache follow-up (DOCUMENTED BEFORE COMMIT)

- Owner requested an evidence-based document explaining why MOVO is designed to protect user data and safe security hardening inside the code. Read live Supabase schema/advisors, open PRs #289/#290, Vercel production commit, legal pages and QR local storage.
- **Verified** 44/44 public tables have RLS; selected finance/AI table policies enforce `auth.uid() = user_id`; security advisor still has 15 callable SECURITY DEFINER warnings, 15 intentional/no-policy informational findings and 1 leaked-password protection warning. No database, billing or auth-console modification made.
- **New code (staged)**: seal offline bank/e-wallet QR PNGs with the finance vault; atomic IndexedDB legacy data migration and fail-closed tamper detection; pre-render migration and regression tests. Adds accessible `/security` trust page and non-exaggerated user data security assurance documentation; fixes outdated Privacy/Terms version-dependent encryption descriptions.
- Existing main production remains at `2b9a1cf7`, and PRs #289/#290 are open. New PR must be stacked on #290 and **not merged or deployed**. All new CI tests, Vercel preview, iOS native and real-device acceptance still pending.
- Detailed log: `docs/engineering/updates/2026-11-13-security-assurance-qr-cache.md`. Security document: `docs/security/MOVO_USER_DATA_SECURITY_ASSURANCE_2026-11-13.md`.

## 2026-11-13 — PR #290 exact-head CI red; non-destructive repair before commit

- Exact initial head `89e159c`, Phase 1, hybrid-sync accounting, and Android CI stopped at Jest; **220/227 suites passed, 7 failed (1,347/1,368 tests passed)**. Disposable PG tenant isolation and IAP integrity both passed; no production deploy.
- Found and corrected **native restore regex with double-escaped literal backslashes**; it prevented reading harmless `movo.preferences.v3`. Use correct regex escaping, still skip sensitive raw finance keys during generic restore.
- Removed a **static financeVault import in Jest global setup** which preloaded native/platform code before per-test mocks, breaking native auth/browser/back-button tests. Test-only finance key now passed as a global byte array read only during financeVault module init in `NODE_ENV=test`. Ensure JSDOM supplies full WebCrypto, not just `getRandomValues`.
- Updated `src/App.test.js` to assert through normal decrypted storage interfaces instead of interpreting encrypted localStorage as plaintext arrays; retain actual UI/accounting expectations.
- IndexedDB interrupted-upgrade test expects a failed abort, and still verifies the entire original raw journal is byte-for-byte unchanged; fake-indexeddb reports a standard AbortError instead of the injected exception.
- Release gates: rerun all exact-head tests + Android/iOS compiles + Vercel preview. Preserve both pending journal and old installation data. **Do not merge or deploy**.

## 2026-11-13 — Separate staged financial ledger encryption PR (precommit)

- Scope: protect synchronous `offlineWorkspaceStore` and `localFinanceStore` and the atomic IndexedDB `hybridLocalStore` pending outbox, without changing accounting transaction IDs, tombstones, approvals or cloud state.
- Design: audited sync XChaCha20-Poly1305 cipher and HKDF domain separation from PR #289's mobile Keychain/Keystore seed; browser non-extractable HMAC-based local key; encrypted, verified pre-render legacy migration and whole-transaction IDB rollback.
- Protect startup against key loss (block UI, never show empty wallet), keep legacy pref conflict in encrypted recovery capsule, and retain async native mirroring of ciphertext.
- Tested: standalone Python AEAD round-trip/tamper-property check. Vercel temporary sandbox **unavailable due 402 payment_required**; no billing action taken. Use GitHub's disposable CI. Native hardware acceptance and rollback/downgrade safety are release blockers.
- This is a **stacked PR based on #289, not a production change**. Do not merge or redeploy. Exact-head tests pending.
- Detailed precommit record: `docs/engineering/updates/2026-11-13-encrypted-finance-ledger-nondestructive.md`.

## 2026-11-17 — PR #309 brought up to date with main

- Production already has this PR's referral migration, so no new database change is needed. Profile keeps `main`'s layout. Terms keep the referral-points section. Terms and Privacy are effective November 19, 2026. [Details](engineering/updates/2026-11-17-pr-309-main-integration.md).

## 2026-11-16 — PR #309 conflict resolution

- Integrated main `77bcacc`. Kept Friends and referral layouts, both legal disclosures, and the referral Terms date. Regenerated the combined translations and public legal pages.
- [Conflict resolution and validation scope](engineering/updates/2026-11-16-pr-309-main-conflicts.md).

## 2026-11-16 — QR referral and plan rewards

- A referred new member receives 20 points after app verification and a further 100 after their first confirmed positive store charge. The reward selector offers one month of Pro for 500 points or Pro+ for 750.
- Supabase preserves existing balances and entitlements through the migration. QR and code entry carry through sign-in and trial activation. The server deduplicates awards and debits, and validates the beneficiary and store evidence.
- Local validation covers the full React suite, strict build, typecheck, disposable PostgreSQL and IAP lease tests. The PR records GitHub and preview results. Signed physical-device and deployment configuration checks remain launch gates.
- Open PR scopes reviewed against main at `d511f268`: #274, #280, #290, #291, #294–#297, #299, #305, #306 and #308. Existing billing branches overlap the verifier, with this branch limited to verified referral payment evidence and rewards. See [implementation and rollout notes](engineering/updates/2026-11-16-qr-referral-plan-rewards.md).
## 2026-11-16 — PR #308 conflict resolution

- Integrated main `77bcacc`. Retained the Android release optimization and the main progress history.
- [Conflict resolution and validation scope](engineering/updates/2026-11-16-pr-308-main-conflicts.md).

## 2026-11-17 — PR #316 brought up to date with main

- Profile keeps this PR's tablet and desktop grid, with #315's tinted rows inside. Appearance keeps this PR's grouped sections and adds the Colour-coded icons switch. [Details](engineering/updates/2026-11-17-pr-316-main-integration.md).

## 2026-11-17 — Tablet and desktop layouts

- Improved the desktop and tablet workspace, dashboard grids, reading widths and centered panels. Node 26 passes 1,491 tests and the strict build. Chromium verified 22 customer routes at two widths and the owner workspace in a fixture session. [Baseline, scope and verification](engineering/updates/2026-11-17-tablet-desktop-layouts.md).
- Compact refinement covers shared spacing, Menu actions, ledger rows and transaction entry on standard tablets.
- Settings follow-up makes the header, preference groups, Appearance controls and Notification Settings more compact. Search also matches group names and can be cleared without leaving the keyboard. [Settings notes and verification](engineering/updates/2026-11-17-compact-settings.md).
- Final Settings review aligns column headers, improves theme icon contrast, and puts Quiet Hours beside the notification channel controls.

## 2026-11-16 — Android release optimization for Google Play bundle 11

- Play Console reports 0% DEX optimization, 93% obfuscation, 92% code shrinking, R8 full mode, and 16 KB page-size support. The release configuration uses the legacy Android rules file with `-dontoptimize`. The screenshot cuts off the total uncompressed DEX size.
- Use the optimized R8 rules, enable resource shrinking and the optimized resource shrinking pipeline, and explicitly enable class repackaging with AGP 8.13.0. Keep the Capacitor and MOVO native bridge rules for reflected classes and methods. Leave native packaging and signing settings in place. AGP 9 is a separate toolchain migration.
- Precommit verification: a Python diff check verified optimization flags, preserved bridge rules, and isolated the app changes to its release build type. Verify the Android native and disposable-key AAB builds in PR CI. After review, generate a signed AAB from `main` with a version code greater than every code already uploaded. In Play Internal testing, compare the DEX size and all three DEX percentages, the R8 configuration flags, and 16 KB support against bundle 11. Run the Play-delivered build on Android and check Google and email sign-in, sign-in after restart, receipt scanning, notifications, and Play license-test purchase and restore before promotion.
- Phase 1 CI on the initial head stopped at the per-commit documentation check. The revised commit includes this entry and the [dated engineering update](engineering/updates/2026-11-16-android-release-r8-optimization.md).
- Open PRs reviewed during preparation: #274, #280, #290, #291, #294, #295, #296, #297, #299, #305, and #306. This change is scoped to optimization and release validation.
## 2026-11-17 — PR #315 brought up to date with main after #314

- #314's Friends and Summary pages replace this PR's own friend page and single-snapshot sharing. All other #315 changes are kept. [Details](engineering/updates/2026-11-17-pr-315-main-integration.md).

## 2026-11-17 — Expanded language selection

- Added the requested 95 language groups to Settings → Language, with separate Punjabi and Kurdish choices for 97 entries. The 85 additions have offline preview labels and an English fallback. The 12 existing language choices retain their current catalog behavior. [Coverage, validation and review](engineering/updates/2026-11-17-expanded-language-selection.md).

## 2026-11-17 — Expand Cebuano and validate language catalogs

- Cebuano coverage increased to 146 of 3,221 catalog messages. The 97 registered options include 12 complete catalogs and 85 limited catalogs.
- The app loads supplemental dictionaries on demand and retains their existing offline preview labels. Build validation checks message keys, placeholders and intentionally unchanged text. [Translation workflow and remaining coverage](engineering/updates/2026-11-17-language-catalog-coverage.md).

## 2026-11-17 — Glowing foil nav icon, colour-coded icons switch, simpler friend header

- The active tab icon in the plan colour (Pro+ platinum, Pro gold) is a blended, slowly drifting foil with a soft glow, not stripes. It is still with Reduce Motion.
- Settings → Appearance → "Colour-coded icons" turns the Menu and Profile icon colours on or off. The friend page drops the sharing-status chips under the name. [Details](engineering/updates/2026-11-17-nav-foil-icon-colours-friend-header.md).

## 2026-11-16 — Glass pop-ups, friend page, offline chat charts, Pro/Pro+ badges, no header by default, Aries shadow

- Pop-ups are frosted Liquid Glass (not see-through), adaptive in light and dark. Tapping a friend opens their own page with everything they shared (totals, savings ring, category donut, note), sharing controls and safety actions.
- NasrinAI draws charts from on-device records for chart, trend, breakdown, income-vs-expenses and budget requests, offline and on any plan. Badges read Pro / Pro+. Home has no header photo until someone turns on a free one. The System swatch is a glowing day/night mix that drifts slowly. Aries casts a ground shadow. [Details](engineering/updates/2026-11-16-glass-friend-page-charts.md).

## 2026-11-16 — PR #280 conflict resolution

- Integrated main `77bcacc`. Kept Wear quick-log and build targets alongside the isolated Android auth build, Friends, and legacy WebView URL parsing. Wear URLs still open only a blank phone form.
- iOS CI exposed a phone-only distribution check. The corrected check verifies phone and Watch bundle identities, rejects mismatched companions, and preserves the existing iPhone release checks.
- [Conflict resolution and validation scope](engineering/updates/2026-11-16-pr-280-main-conflicts.md).

## 2026-11-12 — Wear OS and Apple Watch compatibility companion branch

- Scope: separate Android Wear OS :wear AAB, embedded SwiftUI watchOS companion target, and privacy-first Quick Log handoff to the existing phone form. No raw watch finance API, payment, auth token, account, bank logo/favicons or transaction content.
- Phone-side implementation: strict Android movo://wear-log deep link allowlist, iOS WatchConnectivity fixed-action receiver and one-shot native bridge; requests wait for setup, auth readiness, phone unlock and absence of another sheet. All writes remain manual and phone-side.
- New test gates: watch manifest/security contract, Jest deep-link abuse tests, unsigned Android Wear debug/release bundle compile, unsigned watchOS Simulator compile. Manual paired watches and store packaging/signing remain release blockers.
- Documentation: docs/engineering/updates/2026-11-12-wearable-companions.md and docs/wearable-compatibility-2026-11-12.md.
- No production changes or migration. PR is review-only and must not auto-merge until all native builds and physical device tests pass.

- **2026-11-12 PR #280 CI fix (pre-merge):** Android and hybrid regression checks executed 203 suites / 1,235 tests. 1,234 passed; the only failing check was the prior Android manifest contract asserting exactly two allowable `movo://` hosts. Updated this test to explicitly enumerate exactly `auth-callback`, `log`, and `wear-log`, including VIEW/DEFAULT/BROWSABLE safety requirements. This is a test correction; no production code change. iOS/native and preview still require exact-head verification.

## 2026-11-16 — Profile page: clearer overview and consistent rows

- One Overview card names the month chosen on Home, shows the total balance large, then that month's income and expenses. Trends appear only when meaningful (no "999+%").
- Every row has a tinted icon tile like Menu, Settings rows say what is inside, and the Local Storage note is one line. [Details](engineering/updates/2026-11-16-profile-page.md).

## 2026-11-16 — Theme picker: one clean look in Profile and Settings

- Removed the square grey strip behind the Light / Dark / System / Custom tiles (Profile).
- Each swatch now previews its theme in both modes, and its icon is always visible.
- The selection is an accent ring with the tick inside the swatch, the same on Profile and Settings → Appearance. [Details](engineering/updates/2026-11-16-theme-picker.md).

## 2026-11-17 — Google Play and Android sign-in fix records consolidated (#295, #296, #297, #299)

- The fixes were already in `main`. This PR adds their engineering records and #296's regression test: expired, paused or on-hold Play subscriptions never regain access. #295, #297 and #299 are closed in favour of it. [Details](engineering/updates/2026-11-17-play-oauth-records-consolidated.md).

## 2026-11-16 — NasrinAI: Listen and voice input on iPhone, cleaner chat screen

- Listen now:
  - no longer cancels and speaks in the same moment (WebKit dropped it);
  - asks for a playback audio session so the silent switch does not mute it;
  - falls back to an English voice when the app language has none;
  - retries once, then explains, instead of staying silent.
- Voice input resumes an "interrupted" audio context, and switches to tap-to-finish when the iPhone level meter reads only silence.
- Chat UI: a backdrop behind the composer and tab bar, a fade under the status bar, filled reply cards, no visible "You" label, a lighter Listen chip, and fading shortcut chips. [Details](engineering/updates/2026-11-16-nasrinai-voice-and-chat-ui.md).

## 2026-11-16 — Less space at the top of every page

- On phones in the browser and home-screen web app, every page and Home's header photo start 10 px higher (base 18 px to 8 px). Headers stay aligned across pages. The iPhone app's native top bar and tablet/desktop layouts are unchanged. CSS only. [Details](engineering/updates/2026-11-16-page-top-spacing.md).

## 2026-11-16 — PR #294 conflict resolution

- Integrated main `77bcacc`. Preserved the Security & Data Guide navigation and the current Friends and receipt privacy disclosures.
- [Conflict resolution and validation scope](engineering/updates/2026-11-16-pr-294-main-conflicts.md).

## 2026-11-13 — PR #294 safe conflict integration, precommit record

- Compared PR #294 exact head a05152d, latest main 2922eef, and their common doc baseline before building this integration.
- Keep PR #294's documented guide and CI repairs; retain ALL newer main progress, including referral and iOS release-harness entries.
- Retain main's full legal policy and recent referral disclosures; add only the reviewed Security & Data Guide navigation link. Do not alter legal clauses, policy dates, or data retention.
- The remaining eight PR file objects are reused verbatim. No production, schema, native code, cloud account, or billing changes.
- Post-integration requirements: exact-head CI, Vercel preview and legal review; physical screen reader and phone-device tests remain unverified and are not claimed complete.

## 2026-11-13 — PR #294 CI 2nd regression: Jest resets module mock implementations

- Exact commit `1396197` GitHub Phase 1 and Vercel preview each failed on **one** Settings guide click test, while 224 of 225 test suites and 1,354 of 1,355 tests passed. Read-only finance tenant isolation passed.
- Unlike the previous Capacitor proxy spy failure, `Browser.open` is now a Jest mock function. However, MOVO Jest setup resets mock implementations between tests, causing a bare `Browser.open()` to return undefined; the actual Settings handler expects a Promise and calls `.catch()`.
- Fix in test setup: explicitly `Browser.open.mockReset()` and `Browser.open.mockImplementation(() => Promise.resolve())` immediately before the click. **Do not change the production async Browser.open handler or suppress rejection handling.**
- Precommit documentation recorded before the fix. Exact-head full regression + preview must be rerun. Keep PR open and production untouched.

## 2026-11-13 — PR #294 preview CI repair (documented before commit)

- First exact-head `eecbfbd` Vercel build stopped on one new Jest test, not a runtime compile error: `src/screens/Settings.test.js` attempted `jest.spyOn(Browser, 'open')`, but Capacitor exposes a proxied method and returned a non-Jest method; `.mockResolvedValue` was undefined.
- Result in the Vercel runner: 224/225 suites passed and 1,354/1,355 tests passed, then the build script exited nonzero. Correct the **test double**, not the product plugin or security gate.
- Add a `jest.mock('@capacitor/browser')` module mock with a real `jest.fn()` and assert the Settings row invokes `Browser.open` with the canonical security URL.
- Customer clarity: remove internal PR numbers from the public HTML and say the enhanced offline encryption is in testing and **not part of the current production release**. Retain exact PR references in internal engineering notes and the source docs.
- No production release, merge, database mutation, security control relaxation, or third-party API change. Rerun exact-head GitHub CI and Vercel preview after the fix.

## 2026-11-13 — Customer-readable MOVO security and features guide (PRECOMMIT)

- Reviewed deployed `main` security code/legal disclaimers and read-only Supabase controls. Production local financial browser storage is not yet MOVO-encrypted; PRs #289/#290 remain unmerged. Customer copy must not pretend otherwise.
- Drafted standalone `/security` guide, companion editorial markdown, legal-policy navigation links, and Settings entry point via Capacitor Browser; no existing legal clauses or policy dates changed.
- Added tests for disclosure consistency, links, access, security-copy boundaries and a Settings click. Reused translated keys to respect i18n, and followed accessible, no-JS responsive design.
- Word customer guide rendered to four pages and visually inspected. New PR only; no commits to `main`, merges, production deploys, DB migrations, or paid integrations.
- Full evidence and release gate list: `docs/engineering/updates/2026-11-13-user-facing-trust-security-guide.md`. CI/preview gates pending exact-head verification.

## 2026-11-16 — Home header: less space under Total balance

- The scenery under the Total balance card shrinks from 28 px to 10 px: the card's own bottom margin no longer stacks on the header padding inside the header. CSS only. [Details](engineering/updates/2026-11-16-home-header-bottom-gap.md).

## 2026-11-16 — Menu tool icons: one glyph and colour per tool

- Menu tiles get new original glyphs: subscriptions, savings goal, cashback, calendar with clock, planning pie, exchange arrows, crypto block and stocks trend. Each tool has its own colour, tuned for light and dark, on larger 40 px squircles. Scheduled no longer falls back to a sparkle (missing `calendar-clock` icon), and Crypto and Stocks no longer share an icon. [Details](engineering/updates/2026-11-16-menu-tool-icons.md).

## 2026-11-16 — One pop-up surface with an iOS-style edge (light and dark)

- Every pop-up now uses the transaction-details look: a solid surface (white / `#1c1c1e`), a gradient hairline edge that catches light at the top-left like iOS, and a soft shadow, adapted for light and dark. Budgets & Plans and Limits lose their translucent glass panel with its bright outline.
- On phones, bottom sheets float 8 px from the screen edges with rounded corners all round, and the page behind blurs. CSS only. [Details](engineering/updates/2026-11-16-popup-panel-surface.md).

## 2026-11-16 — Friend money summary sharing: clearer screen, live preview, savings rate

- Friend rows open "Money summary" directly. The received summary is a readable card: month in words, shared date, totals with net, savings rate, colour category bars and the note.
- Sharing uses switches with a live preview of exactly what the friend will see, and one share button that names the friend. Stop sharing asks first. A new savings-rate option (whole percent, validated server-side) shares less than exact totals. No schema change.
- Needs Friends migration `20261116070316` on production to work there. [Details](engineering/updates/2026-11-16-friend-summary-sharing.md).
## 2026-11-17 — Refine the shared Friends Summary

- Refined the mobile overview, tracking note, chart labels, snapshot dates and sharing preview. Moved the preview above app navigation and aligned the cash-flow zero baseline. Chromium passed six fixture scenarios and Jest passed 1,496 tests. [Design and checks](engineering/updates/2026-11-17-friends-summary-pages.md).

## 2026-11-17 — Friends Summary visual refinement

- Grouped approved totals into one overview card, reordered the detail cards, and made sharing a two-step flow with a matching recipient preview. [Design and checks](engineering/updates/2026-11-17-friends-summary-pages.md).

## 2026-11-17 — Dedicated Friends and Summary screens

- [Implementation plan, privacy and verification](engineering/updates/2026-11-17-friends-summary-pages.md).

## 2026-11-16 — MOVO guide on screenshots, Aries the welcoming mascot, AI receipt scan and automation

- The tutorial video is replaced by a 20-step guide on real screenshots. Each feature stays sharp while the rest blurs. The voice is Kokoro (female, not ElevenLabs), with translated captions. It now covers AI receipt scanning (consented, part of Pro) and automatic logging (part of Pro+). The sample data uses sharper merchant, bank and e-wallet logos, including Atome and SeaBank.
- Aries, an original vector mascot drawn from the owner's design, guides every step, greets people on the first-run welcome card and heads the Help Center. The Help Center has new sections on the guide, AI receipt scanning and automatic logging.
- Terms §17 now describes the guide as screenshots. The change is published under main's 2026-11-17 Terms date, so people accept once. [Details, validation and rollback](engineering/updates/2026-11-16-movo-guide-aries.md).

## 2026-11-16 — PR #313: softer Aries across MOVO

- Extended the existing [Aries and MOVO guide PR #313](https://github.com/nasrinaiv0/movo/pull/313) after reviewing all 12 open PRs; no other open branch overlaps this mascot scope. The new shared fluffy vector ram is the default Home mascot, appears in sign-in and plan selection, and responds to real bills and savings progress.
- Added 14 expressions, gentle motion/walking, viewport/background and live reduced-motion handling, and a local expression preview in the Home mascot sheet. Preserved spending thresholds, photo mascots, guide pose APIs, passwordless auth and store purchase checks.
- Validation: Node 26.13.1 full Jest 240 suites / 1,491 tests, typecheck, i18n and strict production build. Chromium passes 32 mobile light/dark/text-size screen checks, all 14 expressions, live reduced motion and consent; Home feet stay fixed. Final CSS fixes also pass the strict build and 3 affected suites / 9 tests. [Evidence and remaining gates](engineering/updates/2026-11-16-aries-expressions.md). Real devices and the exact-head hosted preview are not yet checked; merge remains owner-controlled.

## 2026-11-16 — PR #312 integration with foreign-currency receipt review

- Integrated main `da99f181` on the Friends branch. Combined the two progress entries and regenerated locales from both source catalogs. The receipt privacy disclosure and Friends disclosures remain synchronized.
- Run the strict build, disposable PostgreSQL and the mobile fixture flow against this combined tree.

## 2026-11-16 — Friends discovery, private summaries and profile photos

- Added private username discovery, reciprocal request approval, opt-in monthly snapshots, block/report controls, and shared profile avatars. Fixed native Friends transport and more specific error messages.
- Disposable PostgreSQL migration history and social isolation passed, as did focused API, localization, support and avatar-upload tests. See [the implementation and rollout notes](engineering/updates/2026-11-16-friends-discovery.md).
## 2026-11-16 — PR #311 conflict resolution

- Integrated main `77bcacc`. Regenerated receipt and Friends locales from both source catalogs and retained both progress records.
- [Conflict resolution and validation scope](engineering/updates/2026-11-16-pr-311-main-conflicts.md).

## 2026-11-16 — Foreign-currency receipt review

- Scanned receipts now convert into the selected account's currency using dated reference rates, with an optional statement amount and an audit note retaining the source total. Ambiguous source currency asks for confirmation.
- The first strict Node 26 build and 1,460 tests passed, alongside Vercel Sandbox rate fixtures and two isolated Chromium widths. Verify GitHub checks and the protected preview at the PR head. [Engineering notes and acceptance steps](docs/engineering/updates/2026-11-16-foreign-currency-receipts.md).

## 2026-11-16 — Private friends and compact Profile

- Added Profile → Friends with single-use QR/link invites, native AirDrop and Android Sharesheet, deliberate acceptance, and reciprocal removal.
- Added service-only invite and connection storage with no access to financial data. Private invitation lifecycle and finance isolation passed in disposable PostgreSQL.
- The implementation is based on main at `d511f268`. Open PRs #274, #280, #290, #291, #294–#297, #299, #305, #306, #308 and #309 were reviewed. Referral rewards #309 are independent, with possible Profile, privacy and generated locale conflicts at integration.
- Mobile browser review at 375 px light and 320 px dark exercised Profile, QR generation and explicit acceptance. The Friends sheet now gives the selected tab the filled surface.
- [Implementation, verification and rollback](engineering/updates/2026-11-16-private-friends-profile.md).

## 2026-11-15 — Android Google sign-in: the return link is read on older WebViews

Owner report: on the affected Android phone, Google sign-in ends back on Sign in after the account is chosen. Supabase logs show the pattern exactly: that phone gets `/authorize` 302 and `/callback` 302 (a code is issued) but never calls `/token`, while phones on Chrome 156/157 complete the exchange. The affected phone is a Huawei on Android 12 whose in-app WebView reports Chromium 114.
- **Cause:** `readAppUrl` used `new URL()` on `movo://auth-callback?code=…`. Chromium only parses the host of a custom-scheme URL from version 130. Older WebViews report hostname `""` and pathname `"//auth-callback"`, so the link was judged invalid and dropped without a message. The same applied to `movo://log` payment links.
- **Fix:** the two accepted link shapes are matched by hand (`scheme://route[/][?query][#fragment]`), with no dependence on the WebView. All existing rejections are kept (user info, port, other host, path, duplicate or oversized code, tokens in the link) and control characters are now refused too.
- Independent of PR #306 (Auth Tab). On that build the same phone would show `OA-CALLBACK`, because the Auth Tab result goes through the same parser.

Validation: new tests run the parser against a stand-in for the old WebView URL behaviour (they fail on the previous parser), Jest 233 suites / 1,449 tests, `tsc`, strict build. Not run: the affected phone, or a real Chromium 114 (running a downloaded one was not permitted in this session). Needs a new Android build to reach phones. See `docs/engineering/updates/2026-11-15-android-auth-return-link-old-webview.md`.

## 2026-11-12 — PR #289 review fix: reminder preferences stay available offline

- Review found that the encrypted cache accepted only lists, so reminder preferences (one settings object) silently stopped being kept for offline use. The cache now accepts lists and settings objects; both are still AES-GCM encrypted, owner-bound and network-failure-only.
- Main merged in (PR_PROGRESS conflict only). New test covers the settings object. See `docs/engineering/updates/2026-11-12-offline-cache-settings-object.md`.

## 2026-11-12 — PR #289 native test mock lifecycle repair (documented before commit)

- The second CI rerun reached 224/225 passing Jest suites; Vercel preview build failed only for `financeCacheNative.test.js` (4 checks), while Web AES-GCM tests now passed.
- Cause: React-scripts/Jest resets mock implementations between tests; the native test attached `MovoNative.secureGet`, `secureSet` and Preferences methods in `beforeAll`. Their implementation was gone when called, so test-only wrapped-key verification failed.
- Fix mocks in `beforeEach`; retain sealed test key for the test module to validate persistence. No production, native encryption implementation or accounting data changed. Recheck exact new SHA; keep PR unmerged.

## 2026-11-12 — PR #289 CI repair (documented before commit)

- Initial exact-head Phase 1 CI on `73db23e` **failed**; 220/225 suites passed. Root evidence: new encryption tests could not persist a non-extractable CryptoKey under jsdom's fake IndexedDB; the Jest-only TextEncoder polyfill was read-only and broke existing suites assigning it.
- Fix **test harness only**: writable TextEncoder/TextDecoder and Node's native structuredClone for CryptoKey preservation in jsdom. Do not weaken AES-GCM or tampering tests. Add direct cryptographic assertions so a future failure surfaces its original exception instead of a masked cache miss.
- Additional independent hardening: serialize the browser key's final check-and-put in one IndexedDB read/write transaction to prevent two tabs creating different keys. No signed-in data, backend schema or live systems changed.
- Validate with exact-head CI, native Android/iOS builds and preview; PR remains open and unmerged.

## 2026-11-12 — Offline financial read-cache encryption (PR staging, production unchanged)

- Owner asked to harden financial data stored in plaintext by PR #287's new `offlineReadCache.js`.
- Prepared AES-256-GCM authenticated encryption per owner/list; native random key wrapped by existing Keychain/Keystore plugin; browser non-extractable WebCrypto key stored in IndexedDB; new ciphertext is never mirrored to Capacitor Preferences.
- Legacy list-cache JSON is migrated write-verify-then-delete, retried safely after incomplete migration; finance list retrieval remains cloud-first with offline fallback, owner isolation, and no auth-denial downgrade.
- Expanded tests for encryption, manipulation/cross-account, migration, quota failure, native vault allowlists, Preferences cleanup. New native plugin key allowlist requires separately signed mobile releases.
- **Scope limitation:** other plaintext accounting stores (`offlineWorkspaceStore`, `localFinanceStore`, and IndexedDB `hybridLocalStore` ledger/outbox) are not changed: rewriting their synchronous/atomic persistence without a proven compatibility plan risks destroying unsynced transactions. This remains a high-priority unresolved whole-app storage issue.
- Precommit evidence: exact main SHA `2b9a1cf` and a standalone Python AES-GCM/AAD test. **GitHub full suite, native compiles and physical devices still pending.** No Supabase/production modification, no merge/redeploy.
- Detailed record: `docs/engineering/updates/2026-11-12-financial-offline-cache-encryption.md`.

## 2026-11-12 — PR #293 follow-up: App Store id read like the billing settings

The preview sent iPhone links to the web app, so the stored `APPLE_APP_ID` did not match the strict digits-only format (its value was not inspected). It is now read with the same tolerance as the billing check: surrounding spaces, quotes and an `id` prefix are accepted. Anything that is not a plausible App Store id still falls back to the web app with the code. New test. See `docs/engineering/updates/2026-11-12-referral-store-links.md`.

## 2026-11-12 — Referral QR codes open the App Store and Google Play with each person's own code

Owner request: the referral QR code should link to the App Store and Google Play, with a unique referral id per user. Before this, `/api/download` only sent people to a store when `MOVO_IOS_APP_STORE_URL` / `MOVO_ANDROID_STORE_URL` were set. Neither is set in production, so every QR code opened the web app.
- **Android:** always Google Play (`com.nasrinai.movo`). The person's code travels in Google Play's install referrer (`utm_source=movo_referral&utm_medium=qr&movo_ref=M78038`). On first launch the Android app reads it once (new `MovoNative.installReferrer`, Play Install Referrer library 2.2) and fills in the friend's code in the plans panel and Refer MOVO.
- **iPhone:** the App Store page from the existing `APPLE_APP_ID` server setting (or `MOVO_IOS_APP_STORE_URL`). Apple passes nothing from a link to the installed app, so a link that carries a code first shows a short page with the code and a "Copy code and open the App Store" button. Without a code it goes straight to the store.
- Only exact store addresses are produced, the referral code is the only value carried, and the code counts only after sign-in when the server accepts it.
- Privacy Policy section 18 (referral codes and download links) added; Privacy effective date is now November 12, 2026, so everyone accepts the updated version once.

Validation: Jest 225 suites / 1,357 tests, `tsc`, strict build, and a browser check of the iPhone page under the site CSP in light and dark: the code was copied and the App Store opened, with no console errors. Not run: an Android build (CI compiles it), a real Play install. The Android part needs a new Play release (version code above 7). See `docs/engineering/updates/2026-11-12-referral-store-links.md`.

## 2026-11-12 — Android bottom navigation: instant response, lighter animation

Owner report: bottom nav icon animations in the Android app are not optimized or responsive. Measured on a 4x-throttled mobile Chromium, the bar showed the tapped tab only after the new screen had rendered (90–221 ms after touch-down), under a heavy 24 px saturated blur.
- **Instant response:** the tapped tab and the highlight now change on touch-down (11–23 ms), the screen still appears about as fast, and a cancelled touch puts the bar back.
- **Lighter drawing:** the Android app uses a lighter blur for the bar, with no transform or width transitions on it; the highlight and icons animate on their own layers.

Validation: new App test, Jest 224 suites / 1,350 tests, `tsc`, strict build, browser check in light and dark. Not run: a real Android phone. See `docs/engineering/updates/2026-11-12-android-bottom-nav.md`.

## 2026-11-12 — PR #287 merge-conflict resolution (docs-only overlap)

- **Before commit:** compared the exact branches `3e47d69` (PR #287) and `e7d7126` (main) against merge base `7a65b55`. Only `docs/PR_PROGRESS.md` overlaps; main adds `docs/engineering/updates/2026-11-12-android-auth-release-gate-test-isolation.md` which is absent from PR #287.
- Preserve all PR #287 offline-first sync, subscriber offline records, referral and Android sign-in progress, followed by the whole updated main progress (including PR #286 release-gate notes). Carry forward main's added Android release-gate report. No app, tests, build, database or production environment code is changed as part of the conflict resolution.
- Test gates: require exact-merge-head GitHub checks and mergeability verification. No claims of real Android/iPhone, cloud financial data, or live Vercel preview tests. **Leave PR #287 open and do not merge.**
- Detailed record: `docs/engineering/updates/2026-11-12-pr287-conflict-resolution.md`.

## 2026-11-12 — Subscribers' records offline; referral field loads with the panel

- **Offline records (owner: "all data should be available offline after the customer subscribes"):**
  - Budgets, bills and bill dates now come from the synced device copy offline; budgets previously switched to the device's guest list.
  - Financial planning and the Home planning card work offline; they used to say "Sign in to manage your financial records".
  - A new per-account read cache (`lib/offlineReadCache.js`) keeps the last copy of every cloud list: loans, receivables, goals, allocations, bills and payments, scheduled transactions, payment attempts, reminders, budgets and the ledger. It shows that copy when the cloud can't be reached; it never hides server errors and never mixes accounts.
  - Changes to these records wait until back online, with a clear note.
  - Signed-out people still see no account records (privacy); they reappear after signing in, online or offline.
- **Referral code:** the field shows as soon as the plans panel opens, with no extra step and no waiting for sign-in. A code typed while signed out is kept for after sign-in.
- **Android Google sign-in (v7):** the auth logs show the app's pre-check succeeding and no request reaching Google's step, so the failure is on the phone, either in the secure-storage or the browser step. The exact on-screen message is needed to choose the fix.

Validation: Jest 224 suites / 1,349 tests, `tsc`. See `docs/engineering/updates/2026-11-12-offline-records-and-referral.md`. Not run: real devices.

## 2026-11-12 — Offline/online sync: local first, silent cloud sync, back-online prompt

Owner request: online, input → local → dashboard → silent cloud sync; offline, input → local → dashboard; back online, a setting chooses automatic sync or asking first with a professional pop-up.
- **Online:** a new or edited transaction (form, NasrinAI chat, card purchase or payment) is committed on the device and shown at once, and the cloud upload finishes in the background.
  - A confirmed upload swaps in the server copy.
  - A dropped connection falls back to the existing offline path.
  - A server refusal removes the row and explains why.
  - Form mistakes are still caught first. A subscription payment still waits for the cloud.
- **Offline:** unchanged.
- **Back online:** new setting, Settings → Data & Sync → "Sync automatically when back online" (off by default).
  - Off: a centered pop-up, "You're back online", asks to sync the N changes made offline, with "Not now", "Sync now" and an "Always sync automatically" option. "Not now" keeps a small reminder.
  - On: the changes upload by themselves, one attempt per reconnection, falling back to the pop-up if it can't finish.
  - Uploads always go through the same verified sync (sign-in, plan, conflict checks).

No RLS, policy or server changes. Validation: new writer, pop-up and end-to-end tests; Jest 223 suites / 1,342 tests, `tsc`, strict build; browser check offline → online in light and dark. Not run: real devices. See `docs/engineering/updates/2026-11-12-offline-online-sync.md`.

## 2026-11-12 — #286 brought up to date with main

Main gained the same owner billing-test isolation in #285 (20beb70), in a broader form: it clears every store billing setting and restores the whole environment, so it covers `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` and the other Google Play keys. The merge keeps main's version of `src/owner/ownerApi.test.js`. #286 contributes its documentation and the verified AAB v7 evidence below. No app code changes.

## 2026-11-12 — Android sign-in: "not configured" fixed for every app build

Owner report: Google and email sign-in in the Android app said "not configured".

- **Cause:** that app was built without MOVO's public Supabase connection. Those values lived only in Vercel, the protected GitHub release environment and Codemagic, so Android Studio, local, CI or older builds had none.
- **Fix:** the two public values (project URL and publishable key) are now committed in `.env.production`, so every production build has them, while environment settings still override them.
  - A new test keeps that file to exactly those two public values and rejects anything secret.
  - A new build check fails any Android or iPhone build whose app lacks the connection. It runs in the Android CI build, the Google Play jobs and Codemagic.
- **Verified:** a build with no settings now includes the connection, a build with settings keeps its own, and the live sign-in service accepts the key with Google and email enabled.
- **Owner action:** install a new Android build made from main after this merges (the app on the phone keeps its old code).

Not run: sign-in on a real Android device. See `docs/engineering/updates/2026-11-12-android-signin-config.md`.

## 2026-11-12 — "Save 20%" on the plans when Annual is chosen

Owner follow-up, with a reference paywall whose layout was not copied: the saving belongs on the plans. When Annual is selected, Pro and Pro+ each show a green "Save 20%" pill on the card's top edge. The figure comes from each plan's own store prices when loaded, else the owner's 20%. The current plan keeps its "Current" badge, Monthly shows no saving, and the toggle no longer carries the badge. Restore purchases and Manage subscription drop the "·" separator, which dangled when they wrapped. Validation: `PlanOffer.test.js` updated, full Jest suite, `tsc`, strict build, browser screenshots in light and dark at 430, 375 and 360px including German and Filipino at the Largest text size. Not run: real devices.

## 2026-11-12 — Restore purchases and Manage subscription always shown

Owner request: there should always be buttons to restore purchases and manage subscriptions. Both now appear in the plans panel and in Plan & Usage, for every person, in the apps and on the website, signed in or not, and they are never disabled.
- **In the apps:** Restore uses the App Store or Google Play restore, which the server verifies. Manage opens the store's subscription page.
- **On the website:** Restore re-checks the account's verified plan. Manage offers the App Store and Google Play subscription pages.
- **Signed out:** Restore opens sign-in.

No change to purchase verification or entitlements. Validation: new `SubscriptionLinks.test.js`, updated plans panel and Plan & Usage tests, Jest 221 suites / 1,328 tests, `tsc`, strict build, browser check (see `docs/engineering/updates/2026-11-12-restore-manage-always.md`). Not run: the store dialogs on real devices. Follow-up: 7d20d6f was pushed with one outdated `App.test.js` assertion (the old website note). It is fixed in the next commit, and the full suite passes.

## 2026-11-12 — "Save 20%" on the Annual plan

Owner request: show a 20% saving for the annual plan. The Annual toggle in the plans panel now reads "Save 20%", translated into 11 languages. In the apps the figure comes from the App Store or Google Play prices, so it always matches what the store charges. It reads 20% when the annual plans are priced at 80% of twelve months, which is now in `docs/commercial/STORE_BILLING_SETUP.md`. The website has no store prices and shows the owner's 20%. The toggle grows to fit the badge on one line; checked at 430, 375 and 360px, including German and Filipino at the Largest text size. Validation: new `storeProducts.test.js`, updated `PlanOffer.test.js`, full Jest suite, `tsc`, strict build (see `docs/engineering/updates/2026-11-12-annual-save-20.md`). Owner action: set the annual prices in the store consoles. Not run: real devices.

## 2026-11-12 — Plans panel: centered pop-up

Owner request: the "Upgrade MOVO" plans panel should be centered on the screen. It now opens as a centered pop-up, like the transaction details. It sits in the middle of the screen with equal space above and below, using the larger safe area on both sides. It has no border, only a soft shadow, and no drag handle; the close button stays. The Continue button stays inside the rounded corners. If the panel is taller than the screen it scrolls, with Continue pinned. Checked in the browser at 430×932, 390×844 and 375×667 in light and dark: top gap equals bottom gap, and no scrolling at any of those sizes. No plan, price or purchase logic changed. Validation: Jest 219 suites / 1,320 tests, `tsc`, strict build (see `docs/engineering/updates/2026-11-12-plans-panel-centered.md`). Not run: real devices.

## 2026-11-12 — Production build fix: owner billing test isolated from the build machine

The production deployment of `main` after #284 failed on Vercel: `npm run build` runs the tests first, and the owner billing-readiness test read Vercel's real Google Play settings and saw Google checkout as ready. The test now clears every store billing setting before it runs and restores the environment afterwards. Production kept serving the previous deployment. Reproduced locally with fake Google Play settings, then fixed. The full suite passes with and without Vercel-like settings. Test-only change (see `docs/engineering/updates/2026-11-12-owner-test-env-isolation.md`). Separately, Vercel now refuses new deployments ("Account is blocked"); this needs the owner in the Vercel dashboard.

## 2026-11-12 — Transaction details: middle of the screen, no outline

Owner follow-up: "center meaning center of the screen, and less border especially for dark mode". The details pop-up now sits in the middle of the screen with equal space above and below. On phones with a notch or home indicator the larger safe area is used on both sides, so it stays at the exact middle. It has no border, outline or inner highlight; a soft shadow sets it apart. In dark mode the lines between rows are gone and spacing separates them; in light mode they are fainter. CSS only. Measured in the browser at 430×932, 390×844 and 375×667 in light and dark: top gap equals bottom gap and the border width is 0. Validation: Jest, strict build. Not run: real devices.

### Follow-up: verified post-merge signed AAB v7 and CI evidence (2026-11-12)
- Signed manual Play workflow run #43180913336 succeeded on main `3d96b2e`. Recovered artifact `movo-google-play-aab-28`, inspected packaged JS, Android manifest, versionCode **7**, current MOVO Supabase URL and matching enabled publishable key; independent JAR signature verification succeeded.
- **Installed versionCode / live device OAuth result unknown**. Do not change working web OAuth settings or publish production; check existing Play internal/closed release before uploading another AAB. Main Vercel build failed an env-dependent test; PR #286 isolates it, with both GitHub CI checks green on initial head. Vercel preview remains blocked by account/deployment status, not verified.
- Detailed proof and gates: `docs/engineering/updates/2026-11-12-android-auth-release-gate-test-isolation.md`.

## 2026-11-12 — Android sign-in release gate: isolate Vercel billing test from live secrets

- Earlier PR #282 Android Google/email auth code merged, but prior signed AAB #17 predates it; currently installed Android version unverified.
- Latest main Vercel deployment failed 1/1,320 tests because owner billing readiness test inherited live `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` and expected missing credentials. Add that key to the test's save/restore fixture and explicitly unset it before the negative-case assertion; business logic, auth, credentials, database and production remain unchanged.
- No merge/store publication until exact-head CI, Android release compilation, preview and real-device Google/email sign-in pass. See `docs/engineering/updates/2026-11-12-android-auth-release-gate-test-isolation.md`.

## 2026-11-12 — Transaction details: centered, with spent and logged times

Owner request: place the transaction details at the center and add the time it was logged and the time it was spent. The details now open as a centered pop-up, with the name, the signed amount and the type centered on top. The details card adds two times: **Spent** (Received for income, Transferred for transfers), which is the transaction's date and time, and **Logged**, which is when the record was saved in MOVO (`created_at`). Cloud records already had a logged time; new records saved on the device now get one too. That stamp is display-only: uploads build their own payloads and reconciliation ignores `created_at`. Older local records without a saved time show only Spent. Validation: Jest 219 suites / 1,320 tests, strict build, browser screenshots in light and dark (see `docs/engineering/updates/2026-11-12-transaction-details.md`). Not run: real devices.

## 2026-11-12 — Plans panel: follows light/dark mode; amounts on every plan

Owner request: improve the plans panel's colour adaptability in light and dark mode, and organize it with amounts.
- In light mode the panel now uses MOVO's off-white sheet, with readable gold and platinum accents and light selected-tile tints; dark mode keeps the black panel.
- Each tier tile shows its amount. Free shows ₱0 (home currency). In the apps, Pro and Pro+ show the store's own localized price per month or year for the chosen period, and Annual shows the best saving (for example −17%). On the website, where there is no store, they say "Price in app"; no price is invented, per `docs/commercial/STORE_BILLING_SETUP.md`.
- The repeated "Price shown by the App Store or Google Play" line is gone, and the large price appears only when the store provides one.
- The panel sizes to its content instead of a fixed 800px height.

Validation: Jest 219 suites / 1,320 tests (PlanOffer tests updated: tile amounts, saving badge, no invented web price), strict build, browser screenshots in light and dark. See `docs/engineering/updates/2026-11-12-plans-panel-light-and-prices.md`. Not run: store prices on a real device.

## 2026-11-12 — Account pickers: icon and amount only for the available balance

Owner request: in the transfer sheet, remove the "Available balance" text and show only the wallet icon and the amount. The account pickers in the transaction sheet (From, To and Paid with) now show the wallet icon, or the card icon for credit, followed by the amount. "Available balance" and "Available credit" stay as screen-reader text, so VoiceOver and TalkBack still say them. With the room freed, the full amount shows instead of "₱1…". Below 400px wide, the two side-by-side pickers use a 24px logo and tighter gaps, so amounts such as ₱123,152.00 fit. Checked in the browser at 430, 390, 375 and 360px with no truncation. Validation: Jest (`AccountPicker.test.js` asserts the label is screen-reader-only), strict build. Not run: real devices.

## 2026-11-12 — Transaction details: solid, compact and organized

Owner request: make the transaction details solid (not transparent), more compact and organized. The sheet is now a solid surface with no glass blur in light and dark. The amount leads, large and signed by type (− expense, + income in green), with a Type chip. Account and Category (with subcategory) sit in one grouped card, and Note, references and Receipt note appear only when present. The duplicate "Date & time" row is gone, since the date is the subtitle. View receipt is a full-width row, and Edit and Delete are 48px buttons; Edit is no longer glaring white in dark mode. Validation: Jest, strict build, browser screenshots in light and dark (see `docs/engineering/updates/2026-11-12-transaction-details.md`). Not run: real devices.

## 2026-11-12 — Receipt picker in the transaction sheet

Owner request: improve the receipt upload UI (it showed the browser's "Choose File · no file selected"). It is now a tappable card: a receipt icon, "Add receipt", "Photo or PDF · up to 10 MB" and a plus button. Once chosen, it shows a photo thumbnail (or a document mark for PDFs), the file name, size and where it is kept, with Replace and Remove. Wrong types and files over 10 MB are refused at once (the save still checks). Removing a receipt already saved marks it for deletion when the change is saved. Translated into 11 languages; the old label was untranslated. Validation: Jest (`ReceiptField.test.js`), strict build, browser screenshots in light and dark (see `docs/engineering/updates/2026-11-12-receipt-picker.md`). Not run: real devices.

## 2026-11-12 — Plan & Usage: more room for the text

Owner request: "give more space to the texts". Plan & Usage now has more space between the plan row, the usage tiles and the note, inside the tiles and in the note's line spacing, with a clear gap above the button and no fading shadow over the last line. Tile labels wrap (hyphenated in the reader's language) instead of being cut. The tiles become two rows of two below 400px wide, and the plan's date wraps instead of truncating. Checked in the browser with no truncated text at 375 and 430px, at the Largest text size, in English, German and Filipino. Validation: Jest, strict build. CSS only (see `docs/engineering/updates/2026-11-12-plan-usage-and-ai-fallback.md`).

## 2026-11-12 — Plan & Usage opens on the current plan; OpenRouter as MOVO's fallback AI provider

- **Plan & Usage (owner recording):** the sheet showed "Free · On this device" and "Upgrade MOVO" for about 3 seconds before switching to "Pro+". It now opens on the plan MOVO already verified at launch and re-checks quietly in the background, so the current plan shows in the first frame (12–19ms in the browser check). A plan not yet checked shows "Checking…", never "Free". The layout is now compact: one plan row with a Cloud/Local tag, usage as four small tiles, one billing note, Restore and Manage as text links, and the main button.
- **Fallback AI provider:** when NasrinAI cannot answer (not configured, unreachable, timeout, busy, rejected the request or key, or an unusable reply), the server asks OpenRouter instead (`api/nasrinai/openrouter-fallback.cjs`).
  - Every MOVO version (web, iPhone, Android) uses this one route, so the fallback covers all of them.
  - OpenRouter gets the same question and bounded, sanitized context, with no user id or email. Providers that may store or train on data are excluded (`data_collection: deny`).
  - A reached NasrinAI budget is not bypassed. Voice transcription stays on NasrinAI. Voice replies from the fallback are spoken with the device voice.
  - Needs the server-only `OPENROUTER_API_KEY` in Vercel (optional `OPENROUTER_MODEL`, default `openrouter/auto`).

Validation: Jest 218 suites / 1,316 tests, tsc, strict build, production dependency audit (0), browser screenshots in light and dark. See `docs/engineering/updates/2026-11-12-plan-usage-and-ai-fallback.md`. Not run: real devices; a live OpenRouter call (no key is configured yet).

## 2026-11-12 — The ram stays standing on the Total balance box

Owner request: "keep the mascot stand in the box like before" (confirmed: keep the bigger ram standing on Total balance). The 3D ram's body no longer leaves its feet line in any mood or tap reaction (`FEET_Y` in `lib/ramScene.js`; the rig's origin is at the feet). Happy moods still bounce, stretch and squash in place, and the happy hop now lifts one foot at a time instead of both. Measured over 14 frames in the browser: the lowest point stays at 129.5–131.5px against the card's top edge at 128px (before: up to 5px above it on each hop). Validation: Jest, tsc, strict build, `ramGrounded.test.js` (see `docs/engineering/updates/2026-11-12-ram-stays-grounded.md`). Not run: real devices.

## 2026-11-12 — Settings → Profile route; sign-in and subscription audit (iOS and Android)

- **Settings → Profile** now opens the Profile screen, not the edit form. Profile's back arrow returns to the screen it was opened from (Settings or Menu), using the screen trail.
- **Sign-in audit** (production, read only):
  - Email codes and Google work on the web and in the apps. `movo://auth-callback` is accepted as a return address.
  - **Apple is switched off in Supabase Auth** (`Unsupported provider: provider is not enabled`), so Continue with Apple fails everywhere. Owner action: enable Apple under Supabase → Authentication → Providers with an Apple Services ID and key. App Store guideline 4.8 expects it for an iOS app that offers Google.
  - Fixed: a switched-off provider used to open Supabase's raw error page in the browser. MOVO now checks the public provider list first and shows its own customer message. The Apple and Google messages are rewritten for customers in 11 languages.
- **Subscription audit** (production, read only):
  - Google Play checkout is ready (`/api/purchases/config?platform=google` → enabled).
  - **App Store checkout is blocked** (`enabled:false`): one Apple billing setting fails validation, most likely `APPLE_APP_ID`, which must be the numeric Apple ID from App Store Connect.
  - The billing tables and functions exist. `movo_plan_status` only reports on the caller's own account, and only production purchases count.
  - New: the owner Command Center's Billing view lists store checkout readiness with the names of failing settings, never values (owner and two-factor only).

Validation: Jest 215 suites / 1,306 tests, tsc, strict build. See `docs/engineering/updates/2026-11-12-signin-subscriptions-audit.md`. Not run: real devices, real purchases.

## 2026-11-12 — Rate MOVO reminder (App Store / Google Play)

Owner request: remind people to rate MOVO. The iPhone and Android apps now ask the store's own rating dialog to appear: Apple's StoreKit review request (`AppStore.requestReview` on iOS 16+, `SKStoreReviewController` on 15) and Google Play In-App Review. Both stores require their own dialog (Apple guideline 5.6.1 disallows custom review prompts, and Google asks apps not to pre-ask), so MOVO adds no screen of its own and only chooses the moment.

The request comes about 1.8 s after a new record is saved, never over a sheet, the lock screen or setup. It needs at least 7 days with MOVO, 5 different days of use and 10 records, and then at most once every 120 days and 3 times a year. The stores may still show nothing and never report a rating. The counters stay on the device (`movo.reviewPrompt.v1`, removed by Clear All Data); the website never asks.

No legal text change: MOVO collects and shares nothing new. Validation: Jest 214 suites / 1,301 tests, tsc, strict build. Native compile runs in CI (`build-ios`, `native-android`). See `docs/engineering/updates/2026-11-12-rate-movo-reminder.md`. Not run: real devices or store review dialogs (they appear only in installed TestFlight / Play builds).

## 2026-11-12 — Zodiac Home headers follow the owner's reference video (softer)

Owner request with a reference video: zodiac headers now use the same indigo-purple night for every sign. A thin gold zodiac wheel carries all twelve symbols, with the person's sign at the top and brightest; they are drawn as vector paths because phones may render the Unicode symbols as colour emoji. A flowing purple ribbon of light replaces the hills, and the slow drifting light over zodiac headers is lavender. Opacity is kept lower than the reference, as asked. The element now only tints the ribbon's far end. Validation: Jest 212 suites / 1,294 tests, tsc, strict build, browser screenshots of several signs (see `docs/engineering/updates/2026-11-12-zodiac-reference-video.md`). Not run: real devices.

## 2026-11-12 — PR #282 Android-only sign-in follow-up (before new implementation)
- Verified downloaded signed Google Play AAB run #43149512317 against actual project URL and active MOVO public key, Browser plugin and native auth callback. The broken installed Android version still needs identification; web authentication is not being modified.
- Implemented: Android-only email-link callback to `movo://auth-callback`, safe native Browser/Keystore failure diagnostics, and tests for Android, web and iOS behavioral isolation, plus three new messages translated across 11 languages. Live Android device callback and delivery still not proven; keep website/iOS intact. See `docs/engineering/updates/2026-11-12-google-email-auth-recovery.md`. **No merge or production change.**


## 2026-11-12 — PR #282: Google and email sign-in recovery; Android public project binding
- Investigated MOVO production Auth logs (Google redirects/login and limited email events) and Vercel/GitHub build-env separation; did not assume that Google or email is disabled globally.
- Hardened signed Android AAB configuration: only the verified MOVO Supabase project origin is accepted, and unsafe/non-anon/mismatched legacy keys are rejected at build time. Public `sb_publishable_...` keys still require manual confirmation that they come from MOVO.
- Google, Apple, and email OTP now classify provider-disabled, bad API key, SMTP/template, rate-limit and network errors into safe user-facing messages; no raw server errors or secrets are rendered. Native browser cancellation releases the loading state.
- Added focused guard and UI unit tests plus seven new error messages translated in all 11 supported languages; see `docs/engineering/updates/2026-11-12-google-email-auth-recovery.md` for complete investigation, provider settings and release checklist.
- First exact-head CI found missing new i18n keys (1,277 / 1,278 tests passed), so seven 11-language catalogue rows were added without weakening translation coverage; added signed Android auth validator tests to Phase 1 PR CI. This PR is **no-merge/no-publish** pending all exact-head CI tests, Vercel preview (Sandbox create returned 402 payment_required), live Supabase Google OAuth + SMTP/template configuration, physical Android Google/OTP login and data isolation verification. Production not modified.

## 2026-11-12 — Fix: Portrait card format preview without a plan

Bug (owner screenshot): on Free, the Portrait tile in Wallet → Sort & view drew a landscape card squeezed into the portrait box, because `CardArt` turns every card landscape without `portraitCards`. The tile now passes `formatSample`, so it shows the true portrait layout as a sample, marked Pro. Choosing it still opens plans, and cards in the wallet stay landscape until Pro is active. Validation: Jest 209 suites / 1,257 tests, tsc, strict build, browser check as Free and Pro+ (see `docs/engineering/updates/2026-11-12-portrait-format-sample.md`). Not run: real devices.

## 2026-11-12 — Home header: edge to edge, grounded ram, glowing Pro edge

Owner request:
- The pinned Home header now reaches both screen edges (0px). Total balance keeps the page's 18px side space.
- The ram is bigger (131px; 112px under 390px wide, 100px under 350px). Its top sits 1px under the top inset, and it stands on the Total balance card's top edge instead of floating. Its size and footing stay the same while scrolling. The greeting moves right, from 98px to 141px.
- Pro and Pro+ get a glowing header edge in their badge colour: gold for Pro, platinum for Pro+. It is brightest at the lower centre and fades up the sides. Free gets no edge.

The ram's happy hop in its idle animation is unchanged; it takes off and lands back on the card.

Validation: Jest 209 suites / 1,256 tests, tsc, strict build, browser screenshots (Pro, Pro+, Free, 360px, right-to-left, a header without Total balance, scrolled). See `docs/engineering/updates/2026-11-12-home-header-edges.md`. Not run: real devices.

## 2026-11-12 — Cloud Sync paused: a calm panel instead of the red banner

Owner request: remove the top banner "Cloud Sync requires verified active access. Local records remain on this device." When a cloud write is refused because the plan is not active, MOVO now shows a centred panel (`components/CloudPlanNotice.js`): "Cloud Sync is paused", records are safe on this device, nothing is deleted, sync restarts once Pro is active, with View plans and Not now. It shows at most once a day (`cloudPlanNoticeDay`), never over another sheet, the setup gate or the lock screen. Other sync errors still use the banner. Translated into 11 languages. Validation: Jest 208 suites / 1,253 tests, tsc, strict build, browser check against the mock cloud with an inactive plan in light and dark (panel shown, no banner) (see `docs/engineering/updates/2026-11-12-cloud-sync-paused-panel.md`). Not run: real devices.

## 2026-11-12 — Faster buttons and pop-ups on phones

Owner report: animations delayed and unresponsive on Android and iPhone. The 3D mascot is capped at 30 fps and pauses while touching, scrolling or with a sheet or dialog open. Glow headers no longer repaint every frame. Press states are instant, sheets and dialogs enter within about 200 ms without staggered content, and the nav highlight moves on touch-down. Measured at 4× CPU: sheets settle in 260–340 ms (was 355–645), and Home has no long tasks with a sheet open. Validation: Jest 207 suites / 1,252 tests, tsc, strict build (see `docs/engineering/updates/2026-11-12-tap-and-popup-responsiveness.md`). Not run: real devices.

## 2026-11-12 — Video guide shown in a phone frame

Owner request with a reference image: the tutorial recording now plays on a CSS-drawn modern phone (slim bezel, side buttons, dynamic-island cut-out, status bar, home indicator) on a light stage. Controls sit above and the translated caption and button below. The 9:20 phone shows the whole recording uncropped. Validation: Jest 206 suites / 1,250 tests, tsc, strict build, screenshots at 390/430 px and desktop (see `docs/engineering/updates/2026-11-12-tutorial-phone-frame.md`).

## 2026-11-12 — Zodiac headers in the style of the owner's reference (kept subtle)

The zodiac art now follows the owner's reference, restrained: a night sky with a faint Milky Way, a thin golden zodiac wheel framing the sign's constellation, a few sparkles and gold-rimmed hills above the balance card. There is a new Celestial glow (green and gold) and a soft glow around the balance card on premium headers. Validation: Jest, tsc, strict build, browser screenshots for each element (see `docs/engineering/updates/2026-11-12-celestial-zodiac-art.md`).

## 2026-11-12 — Pinned header down to Total balance, new search icon, equal header spacing

Owner requests: the search icon has a bigger lens and a shorter handle. The pinned Home header now reaches down to the bottom of Total balance, which is drawn inside it. Header buttons start 28 px from the top on Home, Wallet, Transactions and Menu (measured; was 44 on Home). Validation: Jest 206 suites / 1,249 tests, tsc, strict build, browser measurements (see `docs/engineering/updates/2026-11-12-header-block-search-icon.md`).

## 2026-11-12 — Pinned Home header with scenery, zodiac and glow backgrounds

Owner request: the Home header stays pinned at the top with rounded bottom corners over a background. It defaults to a scenery picture for everyone; Pro and Pro+ can pick all 12 zodiac constellations (original generated SVG) or 6 glowing backgrounds in Settings → Appearance → Home header. Free users see them locked; choosing one opens plans. Validation: Jest 206 suites / 1,247 tests, tsc, strict build, light/dark browser screenshots (see `docs/engineering/updates/2026-11-12-home-header-hero.md`). Not run: real phones.

## 2026-11-12 — Plain header buttons and an off-white light background

Owner request: top header icons have no capsule, border or fill and sit closer together (40 px apart, 44 px tall touch areas); only the Plus buttons stay filled, on the web/Android and in the iPhone app's native top bar. Light mode with no scenery uses an off-white `#faf9f6` page. Validation: Jest 204 suites / 1,240 tests, tsc, strict build, light/dark header screenshots (see `docs/engineering/updates/2026-11-12-header-buttons-milk-white.md`). Not run: real phones.

## 2026-11-12 — Back shows the previous page faster

Owner request: going back now shows the previous page at once. Back moves (device Back, swipe, on-screen back arrow) skip the entrance motion, finish nested entrance animations before the first paint, show amounts at their value instead of counting up, and restore the page's scroll position. Measured after Back (production build, mobile emulation): 490–1,090 ms before, 20–120 ms after. Forward navigation is unchanged. Validation: Jest 204 suites / 1,239 tests, tsc, strict build (see `docs/engineering/updates/2026-11-12-faster-back.md`).

## 2026-11-12 — Screenshots work on Android

Owner request: screenshots (and screen recording) now work in the Android app; `FLAG_SECURE` is no longer set while MOVO is in use. The recent-apps preview still hides balances: blank via `setRecentsScreenshotEnabled(false)` on Android 13+, and `FLAG_SECURE` only while the app goes to the background on older versions. iOS already allows screenshots and keeps its app-switcher cover. Validation: security contract test updated, Jest, strict build; Android compile in CI `native-android`. Not run: a real Android phone (see `docs/engineering/updates/2026-11-12-android-screenshots.md`).

## 2026-11-12 — Blurred previous-page preview during swipe back

Owner request: while swiping back on iPhone, the previous page now shows underneath, blurred, dimmed and parallaxed, clearing as the swipe completes; it is a static copy taken when the page was left. The returned page opens without an entrance animation at its previous scroll position, with no flash (per-frame browser check). Validation: Jest 203 suites / 1,237 tests, tsc, strict build (see `docs/engineering/updates/2026-11-12-swipe-back-preview.md`). Not run: a real iPhone.

## 2026-11-12 — Swipe back on iPhone and Android

Owner request: swipe from the edge to go back. The iPhone app gets an edge swipe (left edge → right, or right edge → left) that follows the finger and closes the open sheet or returns to the previous screen. Android's back button and system gesture now call MOVO's Back directly, and at Home the app moves to the background. Browsers keep their own swipe. Validation: Jest 203 suites / 1,234 tests, tsc, strict build, browser touch check (see `docs/engineering/updates/2026-11-12-swipe-back.md`). Not run: real devices.

## 2026-11-11 — Narrated video guide of the real app and setup gate

Owner request: the video guide now shows the real MOVO interface with invented sample records, narrated in the owner's "MOVO" ElevenLabs voice (62 s, 3.8 MB H.264/AAC in `public/tutorial/`), with translated captions, chapter skipping, a sound button and the animated scenes as fallback. It flashes account deletion, the no-bank-connection and logo/favicon disclosures and the Terms. New setup gate: dashboard and navigation stay locked until video, walkthrough, sign-in choice, free-month panel and the new Terms/Privacy agreement are done; accepting opens the dashboard. Terms §17 added (effective November 11, 2026); acceptance syncs (newest wins). Validation: Jest 201 suites, tsc, strict build, local browser flow (see `docs/engineering/updates/2026-11-11-video-guide-setup-gate.md`). Not run: iOS/Android devices.

## 2026-11-11 — PR #273: Repair Android auth build and native navigation

Fix Android's missing top and bottom bars by limiting iOS Liquid Glass native-chrome substitution to iOS; keep Android's five-tab web dock and page headers. Add Android platform regression coverage. Repair Google Play's signed AAB pipeline by injecting the public Supabase project URL and anon/publishable key from the protected GitHub release environment at CRA build time; reject missing/invalid public values and server-secret roles. Add Node release-guard tests to PR signing CI. No billing, accounting, database, iOS layout, or production release changes. Vercel Sandbox testing was attempted but blocked with HTTP 402 payment_required. CI and real Android testing are required before merging or publishing. Details: `docs/engineering/updates/2026-11-11-android-auth-chrome.md`.

## 2026-11-11 — PR #271: Repair sign-in startup and owner-cache hydration

Keep the entitlement refresher stable while the auth listener recovers the owner journal, preserve the full Supabase session after OTP verification, and render a recovered confirmed/dirty owner cache while cloud checks continue. Concurrent entitlement checks share a bounded request per owner/token. New accounts keep the initial-load gate and paid cloud access remains server-verified. Regression coverage includes delayed recovery, token refresh, cross-owner isolation and timeout/retry. Local validation: 194 suites / 1,183 tests, typecheck and production build passed. Vercel Sandbox verification is blocked by HTTP 402 payment_required; no production rollout. Details: `docs/engineering/updates/2026-11-11-signin-startup.md`.

## 2026-11-10 — PR #270: Correct GitHub manual Play versionCode input serialization

GitHub Actions manual runs #4 and #5 failed before signing: the workflow_dispatch number input formatted integer versionCode 1 as `1.0`, which the strict integer validator correctly rejected. Change the workflow input to string to preserve owner-entered integer text without relaxing validation. Keep the signed AAB build restricted to reviewed main and the protected google-play-release environment. The four signing repository secrets are set but the real signed AAB, physical Android-device tests, hybrid financial sync acceptance, and Google Play production authorization are not yet verified. See `docs/engineering/updates/2026-11-10-play-version-code-dispatch.md`.

## 2026-11-10 — Owner audit foreign keys blocking user account deletion

Stage ON DELETE SET NULL and strictly verified internal-FK-only audit anonymization for four owner tables. Prevents the immutable audit trigger from obstructing account erasure while preserving append-only event history. Adds synthetic full deletion/forgery regression to isolated PostgreSQL finance CI. No production migrations or customer data changes. See docs/engineering/updates/2026-11-10-owner-account-deletion-fks.md.

## 2026-11-10 — Non-destructive release database performance indexes (staged)

Addressed five Supabase advisor findings with idempotent FK indexes and local PostgreSQL assertions wired into the financial tenant-isolation CI. No customer database changes, RLS weakening, or billing enablement. Independent CI and Vercel Sandbox verification are required before merge; production migration awaits explicit release verification. See docs/engineering/updates/2026-11-10-release-db-fk-indexes.md.

## 2026-11-10 — Fix false negative after successful CI test signing

The disposable CI-only signing test reached `app:signReleaseBundle` and Gradle reported `BUILD SUCCESSFUL`, but the subsequent `printf | grep -q` verification was vulnerable to SIGPIPE under `pipefail`. Replaced the pipeline with a captured-string assertion that still fails closed on unsigned bundles. The workflow must pass anew on its exact head before merging. Source: `docs/engineering/updates/2026-11-10-google-play-release.md`.

## 2026-11-10 — Require explicit monotonic Google Play Android versionCode

The protected main-only signed AAB workflow now asks for an owner-selected Android `version_code` and rejects invalid/out-of-range values. Android Gradle reads this value only when set; normal CI remains at versionCode 1. On each subsequent Google Play upload, the owner must choose a code greater than all prior uploaded bundles; only Play Console can confirm this. The ephemeral-key PR signature test remains non-publishable. Implementation and release limitations: `docs/engineering/updates/2026-11-10-google-play-release.md`.

## 2026-11-10 — Reconcile Google Play signing PR #264 and add disposable signed-path CI

Rebased the Google Play-only signing workflow over the reviewed Google-only provider readiness fix. Production bundle creation stays manual, main-only and protected by the GitHub `google-play-release` environment. Added an isolated, PR-triggered CI job using a disposable test key to exercise the Android release signing path and `jarsigner` without publishing any artifact or using production secrets. Existing unsigned native CI remains. This is not a signed Play AAB or launch authorization. See `docs/engineering/updates/2026-11-10-google-play-release.md`.

## 2026-11-10 — Google-only provider checkout readiness isolation (draft PR #267)

Addressed Google Play native checkout readiness incorrectly requiring Apple IAP signing credentials. Added strict Google/Apple-specific checks, fail-closed handling of unknown platforms, backwards-compatible legacy all-provider gate, and native purchase regression coverage. Vercel Sandbox based on main f2311f2 passed targeted billing tests (2 suites / 7 tests) and full CI-style production build. No production key, billing activation, or database writes. Exact-PR-head GitHub CI and preview must pass before merge. Release remains blocked on signed AAB, Google Play license/device tests, hybrid sync and console compliance. Engineering notes: docs/engineering/updates/2026-11-10-google-only-billing-gate.md.

## 2026-11-09 — Integration hardening for #258 and #259

Resolved shared-app, plan panel and translation conflicts while retaining verified native referrals and the premium plan UI. Android CI retries only transient Gradle download errors; native compilation failures remain blocking. Evidence, rollback and outstanding gates: `docs/engineering/updates/2026-11-09-pr258-259-integration.md`. Do not enable rewards or apply the production migration without approval.

# MOVO Pull Request Progress Register

## 2026-11-11 — Transactions filter icon and graph by filter, plans panels, sign-in buttons, referral line

The Transactions billing-cycle filter is the filter icon (its label was cut off) and the graph under Total Spent follows it: the days of the chosen cycle, or every cycle for "All". MR DIY shows its logo in the notification detail. The plans panel and Plan & Usage are compact with lighter text, nothing repeated, a fixed bottom action and a tier-coloured glow with calm fade-ins. Apple and Google sign-in buttons share one surface and show "Continue with" plus the company mark. The "n of 10 friends subscribed" line is removed. Scheduled, bill and card payments are logged at the device's current date and time instead of a fixed noon UTC. Pro+ and Pro colour the active bottom-nav icon platinum or gold by default, with a quiet matching highlight (the iOS native dock gets a solid plan tint), with a Navigation accent switch in Appearance. Pro+ platinum is a platinum base with a holographic, iridescent sheen (mark, badge, Pro+ action, iOS app icon) instead of flat lavender. Third pass (owner confirmed): opening MOVO waits for the sync (at most 4s, at once when offline) so the first screen shows the latest records, changing #271's cache-first first paint on purpose; sign-in secondary actions are text links again and the page is more compact. Second pass: the sign-in page is centred and animated with a six-box code entry, solid buttons only and black/white Apple and Google buttons; the filter uses the owner's solid three-bar icon; the device Back button and gesture close sheets and return through the screens visited. An intermittently failing account Money Flow test was made deterministic. The profile photo picker accepts images again (an over-escaped type check rejected every file). Display only; details in `docs/engineering/updates/2026-11-11-transactions-plans-signin-polish.md`.

Validation after merging `main` (main's sync kept): 200 suites / 1,210 tests, typecheck and strict build pass locally. No pull request, preview or CI run yet; WebKit and native builds were not run.

## 2026-11-10 — Section 5 sync work on `claude/movo-ui-motion-refinement-vafrxa` (superseded by #261)

The parallel offline/online sync work on this branch (held changes, conflict review sheet, backoff, status bar) was dropped on 2026-11-11 when the branch was merged with `main`: the owner chose to keep the hybrid sync merged in #261 and the sign-in startup fix from #271. No part of that parallel engine is on the branch any more; its commits remain in the branch history only. What was kept from the branch is listed in the 2026-11-11 entry above.

## 2026-11-09 — Home balance arrow back at the bottom right (fix for a #263 regression)

The round arrow on the Home Total Balance box (opens Wallet) had dropped to the bottom left, over the "vs last month" chip: the 44px tap-area rule from #263 made it `position: relative`, overriding the box's own absolute position. It is back at the bottom right (bottom left in right-to-left languages, where the chip starts from the right) with a centred 44px tap area. While checking every width, text size and direction: the month pill no longer covers the "Total Balance" label or blocks the show/hide eye button at larger text sizes and in Arabic (the label stops short of the pill and text sizes above the default use the short month). CSS, one class and one CSS variable only; no data, sync, auth or API change. Details, checks and limits: `docs/engineering/updates/2026-11-09-home-balance-arrow.md`.

Validation: 184 suites / 1,119 tests, typecheck and strict build pass locally; production build checked in headless Chromium at 320–820px, light/dark, largest text, English/German/Japanese/Arabic. WebKit and native builds were not run.

## 2026-11-09 — Premium UI phases 2–7 (in progress)

Following the merged confirmation dialog (#262) and the audit plan: phase 2 fixes the Menu page's sideways scroll, gives every small control a 44×44 tap area without visual change, removes the ignored `digits` money option (two decimals were already enforced) and sums total balances in whole cents. Phase 3 puts every entrance, sheet and chart animation on one set of durations (120/220/260/380ms, ease-out, no overshoot) and shortens the balance count-up to 400ms. Phase 4 replaces decorative gradients with solid colours and stops the looping badge shine. Phases 5–6 show loading placeholders instead of provisional figures on Financial planning, Bills and the crypto market, and shorten the splash's forced minimum to 0.45s. Phase 7 splits 15 secondary screens out of the main bundle (−17% gzip, preloaded when idle so they also open offline), renders long transaction lists progressively (3,000 rows: 2.56s → 0.12s) and defers search filtering. On phones under 360px the month pill no longer covers the balance's eye button. Details: `docs/engineering/updates/2026-11-09-premium-ui-phases.md`.

## 2026-11-09 — Log out and every delete ask first in one dialog (review)

One compact confirmation dialog (`components/ConfirmDialog.js`) now guards log out and every deletion of a financial or personal record: transactions (including the chat Undo), allocation reversal, account archive, budgets, plans, limits, subscriptions, loans, receivables, cashback, crypto holdings and alerts, membership cards, Archive delete/empty, stickers, profile photo, other-device sign-out, points redemption and the lock-screen reset. Cancel, Escape and a tap outside never confirm; double taps and taps during the closing animation never run twice; failures stay in the dialog with Try again; bulk and reset need typed DELETE. Log out warns when this account has unsynced device changes, saves pending offline changes before ending the session (previously after), still works offline (device session removed) and opens sign-in. Details: `docs/engineering/updates/2026-11-09-logout-delete-confirmations.md`.

Validation on this branch: 181 suites / 1,107 tests, typecheck and strict build pass locally; light/dark screenshots at 430×932 and 375×667 from the built app (Cancel kept the row; Delete removed and archived it). Vercel preview and Sandbox results are reported on the PR.

## 2026-11-09 — PR #260 billing audit follow-up (review; production rollout pending)

Pinned Zod 4.6.7 to clear the production dependency vulnerability, updated bounded Pub/Sub record validation, made checkout fail closed on incomplete server configuration, and removed optional payment-history lookup from Google revocation processing. Added isolated PostgreSQL billing CI. Backend JavaScript IAP tests remain in all Jest/prebuild runs; only the frontend TypeScript 4.9 program excludes those two Node-only files.

Vercel Sandbox: zero production dependency vulnerabilities; 174 suites / 1,068 tests, typecheck, production build, real forged-JWS rejection and database replay/refund/concurrency checks passed. Mobile guest accounting flow retains the correct balance across reload with no cloud writes. Required secrets, coordinated database migration and real store purchase/refund delivery remain release prerequisites. No production changes. Details: `docs/engineering/updates/2026-11-09-mobile-iap-hostile-audit.md`.

## 2026-11-09 — Plans offer on one panel, Gold/Platinum MOVO logos, badge app icons

The plans offer is one compact dark panel (fits 375×667 without scrolling): Monthly/Annual, Free (green MOVO), Pro (gold MOVO), Pro+ (platinum MOVO) — no "Gold/Platinum MOVO" labels on the tiles, store prices only, the free month with the white MOVO mark and no renewal line. Plan badges use the same tier logos. Subscribers can switch the home-screen icon to a badge icon (Settings → Appearance → App icon): Pro unlocks Bronze–Gold right after payment, Pro+ all four; iOS uses alternate app icons. See `docs/engineering/updates/2026-11-09-plans-panel-app-icons.md`.

## 2026-11-09 — Membership and rewards cards follow the owner's merchant card references

Each card also carries its own geometric pattern (hexagons, triangles, diamonds, discs, chevrons or low-poly shards) in three shadowed depth layers, seeded by the card so it is stable everywhere and unique per card, kept to the right third so text stays clear (`docs/engineering/updates/2026-11-09-card-geometric-patterns.md`).

Memberships, loyalty, rewards and tokens now use the layout of the owner's 25 Philippine merchant-card references: mark and name on top, the program title large, member number and date, rewards balance, and one flat MOVO motif (rings, diagonal band, stripes, foil edge or two-tone split) in each merchant's colours. 14 programs from the references were added to the provider list; program titles (Suki Card, Happy Plus, Value Card, Go+ …) show unless the person typed their own. No merchant artwork is reproduced, logos stay on the curated favicon list (no new domains), and card text is tested at WCAG 4.5:1 on both the card and motif colours. See `docs/engineering/updates/2026-11-09-merchant-card-layouts.md`.

## 2026-11-09 — PR #258: short referral codes, iPhone/Android download QR codes, referral points (review; points gated)

**Short codes (owner request):** every person now has one reusable referral code, `M` + five digits (for example `M78038`), replacing the 24-character free-month code and the 64-character single-use invite tokens this PR first proposed. Codes are case- and space-insensitive and are generated server-side from a secure random source; once digit codes run short they continue with five characters from 0-9 and A-Z without I/O. Each account may enter at most 10 codes an hour (attempts are kept even when a code is wrong), so short codes cannot be guessed in bulk. A code can be added only by a verified account created in the last 7 days that has not been referred and has not bought a plan; starting the free month never clears or replaces an existing referral (fixes a latent bug where a later code-less trial claim set `referred_by` to null).

**Download QR codes:** Profile → **Refer MOVO** shows the code with Copy/Share, progress toward the existing 10-subscriber reward (3 months of Pro), and two QR codes — iPhone (App Store) and Android (Google Play). Both point to `/api/download?platform=ios|android&ref=CODE`, which redirects to the store addresses set in the server settings `MOVO_IOS_APP_STORE_URL` / `MOVO_ANDROID_STORE_URL` (exact store URLs only; no open redirect) and, until MOVO is listed, to the web app, which keeps the friend's code on the device and fills it in on the free-month panel and in Refer MOVO.

**Points to Pro:** every 500 referral points convert to 1 month of Pro (Refer MOVO → Use 500 points, confirmation first); the server checks the balance, spends the points in a separate redemptions table and queues the month after any current plan. The download QR codes say **iOS** and **Android**.

**Points (unchanged rules, still off):** +5 after server-verified App Attest / Play Integrity, +100 once after the first verified production Pro/Pro+ purchase, −100 once on refund; isolated ledger, service-role-only RPCs, RLS, review holds. `MOVO_REFERRAL_POINTS_ENABLED=false` keeps the native-proof routes closed and hides points in the app; linking a code works once the migration is applied.

Validation: SQL suite (isolated PostgreSQL) passes, including deliberate-break checks for the attempt limit and the trial referral fix; Jest, typecheck and strict build on the current head. **No production migration or environment change was made.** Before enabling points: apply the migration (rotates the 3 existing production codes, none used yet), set the store URLs, signed-device attestation tests and privacy text for referrals. See `docs/engineering/updates/2026-11-09-short-referral-codes-download-qr.md`.

## 2026-11-09 — Owner Access sign-in email template failure (requires live Supabase action)

Verified MOVO Supabase Auth HTTP 500 on `POST /otp`: live Magic Link template fails Go `html/template` rendering in unclosed CSS double-quote context. Replaced committed OTP email with inline-style, text-only code interpolation and added static validation plus regression tests. **GitHub/Vercel deploy does not publish the Supabase email template**: update the live Magic Link body in the Supabase dashboard and verify a real owner OTP plus MFA before calling the incident resolved. See `docs/engineering/updates/2026-11-09-owner-otp-template-rendering.md`.


## 2026-11-09 — Memberships and rewards cards open Account details (review)

Tapping a membership, loyalty, rewards, tokens or custom card opens the same Account details layout as other cards (card, Account overview / Transactions / Connected items / More, actions) with rewards-only figures, member code, earning account and purchases that earned points. Card face shows Valid thru and no longer truncates the program early. See `docs/engineering/updates/2026-11-09-loyalty-card-details.md`.

## 2026-11-09 — Profile: signed-in people see no Sign in button (review)

The Profile Sign in button and the Cloud Sync row now follow the signed-in session, not cloud mode, so a signed-in person in local/offline mode no longer sees "Sign in". Account rows on Profile add up like Total Balance (linked debit cards once, archived out). See `docs/engineering/updates/2026-11-09-profile-signed-in-state.md`.

## 2026-11-09 — Total balance fixes and complete device-transfer backup (review)

Total balance no longer rises with card payments that moved no money (new "Paid from" records a real transfer), excludes archived and unconvertible accounts, follows the Home month filter, and month-over-month compares like periods. Backup export/restore now carries subscriptions, plans, budgets, limits, card styles/payments, loyalty, archive, settings, receipts, QR, scenery and stickers, re-linked to the restored accounts; CSV keeps transfers, notes and categories. No migration or production change. See `docs/engineering/updates/2026-11-09-total-balance-and-full-backup.md`.

## 2026-11-09 — Owner Command Center consolidated from #253, with live analytics (review)

#253 failed the per-commit docs gate; its net change is carried in one documented commit on PR #255. Fixes the strict-build import order, plans in the user directory (trials/referrals showed "Not verified"), and entitlement-row counts shown as plans. New aggregate-only `movo_owner_kpis` / `movo_owner_user_plans` (service_role only, isolated SQL tests pass). Key figures, 30-day activity, plan mix, capture channels, user plan filter and last sign-in. Production migrations need owner approval. See `docs/engineering/updates/2026-11-09-owner-console-analytics.md`.

## 2026-11-09 — Offline-first saving, automatic upload, imports under Cloud Sync, plan badges (review)

With Cloud Sync on, saves that cannot reach the cloud (offline or >12 s) land on the account's device copy and upload automatically on reconnect, on foreground and every minute; offline transaction edits (CAS), deletions (revision-checked server procedure) and device receipts now sync. CSV/backup "Save locally" works under Cloud Sync and refreshes every page, then uploads. Pro features stay on during an outage with the last verified plan. Fixes main's online-delete drop to local mode. Gold (Pro) / Platinum (Pro+) plan badge. No migration or production change. See `docs/engineering/updates/2026-11-09-offline-first-autosync-plan-badges.md`.

## 2026-11-09 — Confirmed local backup immediately refreshes financial views (review)

Restores same-name accounts by stable source identifiers rather than rejecting multiple BPI/GoTyme accounts or connecting payments to the first matching name. Guest and signed-in offline saves read back persisted accounts/transactions, then refresh Home, Wallet, Transactions and Menu-derived financial state and return to Home. Cloud accounting rows no longer leak into local transactions. Import preview rows use content-height grid tracks to avoid overlapping on small screens. Added malicious/ambiguous ID, idempotency, transfer and end-to-end reload regression coverage. No cloud writes or production migration. See docs/engineering/updates/2026-11-09-identity-safe-local-backup-dashboard-refresh.md. Full CI/preview and signed iPhone verification remain release gates. The follow-up CI localization correction restores the existing 11-language-confirmed confirmation copy; import behavior is unchanged.


## 2026-11-09 — PR #252 documented import verification and manual plan grants

Confirmed local backups are read back from device storage before Home/Wallet/Transactions show success; zero-row imports keep a retryable preview. New administrator-only, expiring and revocable Pro/Pro+ grants integrate into server-side status, with disposable PostgreSQL tests and no purchase fabrication. Vercel Sandbox previously passed 936/936 frontend tests, TypeScript and isolated SQL. The earlier incremental implementation commits omitted per-commit register/dated updates, so this PR is consolidated into one documented implementation commit rather than weakening the guard. Exact rewritten-head CI, real-device tests and deployment-schema rehearsal remain required. No production data or billing configuration changed. Details: `docs/engineering/updates/2026-11-09-confirmed-import-and-owner-plan-grants.md`.


## 2026-11-09 — Vercel Sandbox access restored; PR #247 verification

820 tests / 146 suites, typecheck, optimized build without source maps, isolated plan/RLS SQL including 150 first-time Pro grants, 36 component + 6 app + 30 header cases, and exact-cent Free local save/reload passed. Header 0.5px padding and 34 build/test dependency advisories remain. Production plan RPC/trigger migration and cross-user cloud/offline release blockers remain unresolved; no production changes or signed-device certification. See the dated access/finance/UI audit for scope and failure/retry evidence.

## 2026-11-09 — Access audit and replacement welcome offer

First-100 Pro+ promotion superseded: one calendar month of Pro for every eligible first-time verified account, using the existing uncapped claim flow. Live plan RPCs/triggers are missing; cloud/local races, incomplete balance inputs and precision gaps require resolution. Vercel Sandbox authorization is blocked (403), so interactive validation and release remain pending. No production changes.

See [dated audit](engineering/updates/2026-11-09-access-finance-ui-audit.md).

**Last reconciled:** 2026-11-05  
**Source of truth:** GitHub PR pages, commit SHAs, Actions runs, and Vercel deployment records. This register is a concise operational index, not a substitute for those records.

## Open pull requests

**2026-11-09 — Video guide, plan badges, free month, polish:** first-run video guide then walkthrough then plans; automatic free month for eligible first-time accounts; Pro = Gold badges, Pro+ = Platinum; compact translated plans sheet; Add Card back under Wallet → All; shorter Menu copy. See `docs/engineering/updates/2026-11-09-guide-badges-polish.md`.

**2026-11-09 — PR #241 consolidated:** keeps masked emails and the network-failure-safe entitlement refresh; its separate offline workspace is dropped in favour of #250's. See `docs/engineering/updates/2026-11-09-pr241-consolidated.md`.

**2026-11-09 — PR #246 alignment:** inherits #245's payment-link render-loop fix; App test updated to #246's storage-retry wording. Jest 926/926, TypeScript and strict build pass locally. See `docs/engineering/updates/2026-11-09-pr246-test-alignment.md`.

**2026-11-09 — PR #245 render-loop fix:** the payment-link effect re-opened the plans sheet on every render in local mode (App tests hung). Links are now marked handled and cleared before the Pro+ check. App tests 49/49. See `docs/engineering/updates/2026-11-09-pr245-payment-link-loop-fix.md`.

**2026-11-08 — PR #227 free security hardening:** New disposable-local PostgreSQL 18 runner applied all 28 MOVO migrations, verified all 12 privileged finance RPCs with two synthetic users and successful owner-only controls; no paid Supabase branch or production mutations. Added PR CI job, strict localhost-only runner and native OAuth/deep-link URL validation. See `docs/engineering/updates/2026-11-08-pr227-free-local-security.md`; remain DRAFT pending exact-head CI and signed-device checks.


**2026-11-08 — PR #227 localization CI correction:** Restored translation-catalog completeness for the new Profile remote-session-revocation controls: five strings in all 11 MOVO locales, regenerated locale dictionaries and version. Isolated Vercel Sandbox i18n and scope tests pass; require complete final-head CI before merger. See dated PR227 security implementation note.

**2026-11-08 — PR #227 session controls:** Added user-confirmed sign-out of other sessions via Supabase `scope: 'others'` while preserving the current session. Verified with focused tests; current access JWTs remain valid until expiry. See `docs/engineering/updates/2026-11-08-pr227-security-implementation.md`.

**2026-11-08 — PR #227 native security remediation:** Secure legacy token deletion and logout tombstones are implemented; combined main/security Sandbox 814 tests passed. Preserve DRAFT until iOS/Android signed-device tests, 12 privileged RPC cross-user checks, and branch protection. See `docs/engineering/updates/2026-11-08-pr227-security-implementation.md`.

**2026-11-08 — PR #244 Philippine rewards reference presets (draft):** Reconciled against main after #239 and #240 and restored full engineering registers; compact eight-category collapse/expand, editable OFF-by-default cashback/points suggestions, and accounting-safe calculations. Exact combined tree Vercel Sandbox: 820/820 Jest tests across 146 suites, TypeScript, optimized build PASS. GitHub documentation-gate repair squashes the original implementation and dated engineering update into one reviewable commit, preserving all code; branch remains DRAFT pending provider terms verification, native/signed-device UI checks, and cloud/local override validation. Details: `docs/engineering/updates/2026-11-08-ph-rewards-presets-collapsible-categories.md`.

**2026-11-08 — Transaction running balances (review, accessibility regression correction):** Add optional after-transaction balance/remaining credit history with paired transfer balances, cents accuracy, privacy masking and dedicated Settings toggle. Prepared in isolated Vercel Sandbox; verify exact-head CI and preview UI before merge. Details: docs/engineering/updates/2026-11-08-transaction-running-balances.md.

**2026-11-07 — Plans and Wallet UI follow-up:** Removes cloud-read-only banner, adds swipeable plan cards with visible trial controls, and renders loyalty/rewards as cards with header-only creation. Badge hierarchy becomes Bronze/Silver/Gold/Platinum. Branch `fix/plans-wallet-ui-20261107`; details in `docs/engineering/updates/2026-11-07-plans-wallet-ui.md`.

**2026-11-07 — Pro / Pro+ trials and restrictions:** `feat/pro-plans-trial-restrictions` adds expiring plan gates, native-store product tiers, one-month Pro claim, verified referral rewards, cloud read-only transition and local backup access. Vercel Sandbox: 765 tests / 135 suites, TypeScript, production build and isolated PostgreSQL checks pass. Draft pending staging migration and signed-device store lifecycle checks. Details: `docs/engineering/updates/2026-11-07-pro-plans-trials-referrals.md`.

**2026-11-07 — Membership, tokens, Cashback, and unified Others filter:** Branch feat/movo-others-membership-rewards-20261107 preserves five Wallet filters, puts cash/miscellaneous financial accounts plus membership/rewards into Others, adds secure non-cash provider cards, and introduces reversibly derived reward estimates from matching purchases in Cashback. Vercel Sandbox full build, Jest and Chromium QA; same-commit docs in docs/engineering/updates/2026-11-07-loyalty-membership-rewards-and-others-filter.md. Require exact-head CI before merge.

**2026-11-07 — E-wallet QR upload:** Separate branch feat/ewallet-account-qr-20261107 extends Wallet account QR upload to e-wallet add/edit, preserving bank flow. Sandbox full tests 717/717, TypeScript, production build and Chromium mobile create/upload/reload/remove QA passed. Details: docs/engineering/updates/2026-11-07-ewallet-payment-qr-upload.md. Merge only after exact-head CI checks, no migration.

**2026-11-07 — TTS / receipt scan repair:** Isolated branch, fixes local OCR contrast collapse, WASM CSP, iOS image decode fallback, scanner recovery, bounded SSE/NDJSON voice streaming and chunked TTS. Vercel Sandbox build: 712 tests pass; detailed manual/automated verification recorded in dated engineering update. Unmerged until exact-head CI review.

**2026-11-07 — Follow-up on PR #230:** All shared RootHeader and SubHeader back-arrow buttons are now transparent across light/dark, hover, active and focus states (with accessible focus ring preserved). No changes to 45px hit targets or standalone controls; Vercel Sandbox browser QA (375px light, 320px dark, 1024px desktop) and 692 automated tests passed; GitHub CI to confirm. Details: `docs/engineering/updates/2026-11-07-grouped-header-zero-padding.md`.

**2026-11-07 — Grouped header zero-padding change:** `ui/header-group-zero-padding-20261107` removes utility capsule and grouped-button padding across MOVO, preserves icon geometry, and adds a CSS regression test. Vercel Sandbox validation and GitHub CI to be recorded in PR; no production merge implied. Details: `docs/engineering/updates/2026-11-07-grouped-header-zero-padding.md`.

**2026-11-08 — PR #227 updated security gap audit:** Review of exact security branch and live MOVO DB identified 12 privileged RPCs pending two-user negative tests, unprotected main, 34-commit divergence and three merge conflicts, native legacy secret cleanup caveat, and canceled iOS CI. Sandbox 644/644 tests and build passed. Audit: `docs/security/PR227_GAP_AUDIT_2026-11-08.md`. PR remains DRAFT.

| PR | Scope | Current state | Next action |
|---|---|---|---|
| [#214 — Credit-card ledger and compact card details](https://github.com/nasrinaiv0/movo/pull/214) | Financial Planning credit-card ledger reconciliation, complete payment/credit history, expandable details and responsive card layout. | Open; ready for review. Local tests, typecheck, build, translation coverage and GitHub Actions CI passed; Vercel Sandbox viewport checks passed. Hosted Vercel preview skipped by the configured Ignore Build Step. | Review the implementation and test results; merge after approval. |
| [#177 — FX converter and crypto market](https://github.com/nasrinaiv0/movo/pull/177) | FX converter, tracked pairs and history; crypto market discovery, local watchlist, coin detail and provider-supported history. | Closed; crypto market implementation added; validation pending. | Configure licensed CoinPaprika API Pro key as Vercel `COINPAPRIKA_API_KEY`; complete tests, typecheck, build and preview verification. Price alerts are implemented locally with above/below thresholds, enable/pause/delete controls and permission-aware notifications; portfolio lots remain pending. |
| [#175 — Deep security audit implementation plan](https://github.com/nasrinaiv0/movo/pull/175) | Security remediation documentation and penetration-test plan. | Open draft. | Continue implementation under issue #143. |

2026-11-04 — Crypto market implementation on PR #177: added the responsive market screen, provider-backed searchable ticker list, sorting, local watchlist, coin detail, provider-supported daily history, foreground refresh, and server-side CoinPaprika proxy with validated inputs and cached responses. The latest web CI run is queued; no crypto implementation checks are marked passed until the current head completes. Required deployment action: configure a licensed CoinPaprika plan/key in Vercel as `COINPAPRIKA_API_KEY`. Price alerts now support local above/below thresholds, crossing detection/rearming, enable/pause/delete, and foreground permission-aware notifications. Translation coverage was fixed for both market and alert UI copy. CI now uses `npm install` because this repository does not commit a lockfile; the first CI attempt exposed this workflow assumption and was corrected. Manual portfolio holdings/valuation are implemented; native iOS requests now route through `apiUrl('/api/crypto')` so the bundled app calls the production API. The CoinPaprika key remains a required Vercel server environment variable. CI now runs dependency install (repository has no lockfile), production dependency audit, typecheck, dedicated translation coverage, full tests and production build.\n\nChecked against GitHub on 2026-11-04. This register is reconciled for the currently open work; historical entries below remain a summary of prior changes.

2026-11-05 — PR #214 created from `main` for credit-card ledger reconciliation and the compact expandable Financial Planning card UI. The live ledger balance takes precedence over stale liability snapshots; valid unique payment logs are subtracted without the previous 120-entry cutoff. Full payment and credit-spend histories are available in the expanded panel. Added responsive Wallet and Transactions filters, updated Home/Transactions/all screen-header icon accents, extended accent styling to the custom NasrinAI chat header actions, and replaced transaction-search initials with the MOVO mark plus category badges. Final verification on head `31f2917c2bf831b5373451a6e8b1326bbc9b12f3`: 94 Jest suites / 560 tests, TypeScript, production build, translation catalogue validation, and Vercel Sandbox checks passed. GitHub Actions passed; hosted Vercel preview was skipped by the configured Ignore Build Step.

## Production database (checked 2026-11-02 20:00 UTC)

Supabase `cjsjmorqvuvvwbfyztiz` has **every migration on `main`**, through `20261103010000_automation_transfers`.
`user_preferences` was applied on 2026-11-02 via the Supabase tools; `bills_payments`,
`automation_sources_and_cross_source_dedup`, `automation_inbox` and `automation_transfers` were applied by the owner
in the SQL Editor from one reviewed script. Before that, the script was run on a local Postgres 16 copy built to
match production, and the SQL test suites passed there. A production read-back confirmed:
- the bills tables and the automation inbox exist, with RLS on;
- both automation loggers exist and are server-only;
- `user_preferences` has RLS on.

**Supabase advisors (2026-11-02, after applying):**
- `assert_movo_finance_child_ownership()` (a trigger function) is executable by anon/authenticated. Calling it directly
  only errors, but EXECUTE should be revoked.
- 34 RLS policies call `auth.uid()` per row; they should use `(select auth.uid())` (bills, loans, receivables, goals,
  postings).
- 15 foreign keys have no covering index.
- Also reported:
  - 8 authenticated SECURITY DEFINER RPCs: intended, each checks `auth.uid()`;
  - leaked-password protection off: no passwords since #133;
  - `movo_ai_upstream_conversations` has RLS with no policy: server-only by design;
  - 13 unused indexes on new, nearly empty tables.
- A hardening migration with tests is proposed; applying it needs the owner's approval.

**Security audit (2026-11-03) → `fix/db-hardening`, migration `20261103020000_harden_trigger_execute_rls_initplan_fk_indexes`:**
- Bug found while testing: `assert_movo_finance_child_ownership()` read `new.transaction_id` on `financial_loans` and
  `financial_receivables`, which have no such column. Every loan or receivable insert/update failed (production has 0 of
  each). The migration fixes this; ownership checks are unchanged.
- Revokes EXECUTE on that trigger function from anon/authenticated (service_role keeps it, like
  `assert_movo_bill_ownership`); rewrites the 34 policies to `(select auth.uid())`; indexes the 15 foreign keys.
- `supabase/tests/security_hardening.test.sql` passes on a local Postgres 16 copy matching production (same policies,
  same function source), fails without the migration, and the migration re-runs cleanly. **Not applied to production yet.**

**Bank-app notification logging (`feat/notification-logging`, 2026-11-03):** Automatic logging now opens on **Bank notifications** (iOS 27 Notification trigger, one automation per app) and no longer offers the text-message recipe. `/api/log` replies carry `notice` (left out for duplicates and ignored promos/OTPs) so background shortcuts need one "has any value" check. The parser reads push wording ("You've paid", "card … was used for", "PHPx" without a space) and ignores offers and statements. Prompts were rewritten per mode; they can't be tested on an iPhone from CI.

## Recent merged implementation

| PR | Result | Validation / notes |
|---|---|---|
| [#146 — Account deletion in the app](https://github.com/nasrinaiv0/movo/pull/146) | Merged 2026-11-02 as `a44b22e`. | iOS phase 3 (App Store 5.1.1(v)): Settings → Delete Account → `POST /api/account/delete` (verified token; transactions, then the Auth user via the Admin API; the rest cascades). Local Postgres check: no `user_id` row left in any public table. 366 tests; `verify` + `build-ios` green. |
| [#145 — Siri income and transfers](https://github.com/nasrinaiv0/movo/pull/145) | Squash-merged 2026-11-02 as `21cd33d`. | Voice transfers between own accounts as one transfer row via `log_automation_transfer` (migration `20261103010000`, SQL test + mutation checks); more income phrasing. 373 tests; `verify` + `build-ios` green. |
| [#144 — Bank and e-wallet payment texts](https://github.com/nasrinaiv0/movo/pull/144) | Squash-merged 2026-11-02 as `32fae1c`. | `api/_lib/messageText.js` reads GCash / Maya / bank SMS, email or Android notifications into income, expense or transfer with reference, date and account hint; OTPs and promos ignored and never stored; "Bank texts" Shortcut recipe. 362 tests. |
| [#141 — iOS phase 2](https://github.com/nasrinaiv0/movo/pull/141) | Merged 2026-11-02 as `8187aca`. | Sign-in through the system browser + `movo://auth-callback`, native storage mirror, local notifications, Face ID app lock, `movo://` links, native Liquid Glass top bar and dock (`GlassChrome.swift`), macOS 26 CI compile (`build-ios`). |
| [#139 — iOS phase 1](https://github.com/nasrinaiv0/movo/pull/139) | Merged 2026-11-02 as `51f55c4`. | Capacitor 8 iOS project (SPM, bundled, `com.nasrinai.movo`), `apiUrl()` / `appOrigin()`, CapacitorHttp; the website is unchanged. See `docs/IOS_APP.md`. |
| [#140](https://github.com/nasrinaiv0/movo/pull/140), [#138](https://github.com/nasrinaiv0/movo/pull/138) — Money Flow | Merged 2026-11-02 (`0541847`, `ed39c36`). | The last column is today; compact From/To fields with labels inside; legend colours match the bars. Production deploy of `ed39c36` READY. |
| [#137](https://github.com/nasrinaiv0/movo/pull/137), [#136](https://github.com/nasrinaiv0/movo/pull/136) — Categories | Merged 2026-11-02 (`d6725ab`, `6805489`). | 12 compact categories, 22 groups / 233 subcategories with stable ids; category icon badge on transaction rows. |
| [#133 — While you were away, card layout, badges, passwordless sign-in](https://github.com/nasrinaiv0/movo/pull/133) | Squash-merged 2026-11-02 as `3215631`. | Recent-logs popup and failed-automation inbox (migration `20261102020000`, not applied); automation matches the bank account; card faces per owner spec (landscape and vertical BPI reference); Pro/Max/Ultra streak badges with the MOVO mark; MOVO logo fallback; email-code + Google + Apple sign-in (no passwords). `verify` passed on the final head `ea0124e`; 61 suites / 337 tests locally. |
| [#132](https://github.com/nasrinaiv0/movo/pull/132), [#131](https://github.com/nasrinaiv0/movo/pull/131) — Card layout dimensions | Merged 2026-11-02. | Owner-approved card spec block in `App.css`; logo and name sizes later superseded by #133 at the owner's request. |
| [#130 — Automation, voice, adaptive CSS, card faces](https://github.com/nasrinaiv0/movo/pull/130) | Merged 2026-11-02 as `c99d94a`. | Automation sources and cross-source dedup (migration `20261102010000`, not applied), NasrinAI voice on iPhone, adaptive CSS audit, network marks. |
| [#127 — Bills & Payments](https://github.com/nasrinaiv0/movo/pull/127) | Merged 2026-11-01. | Bills tab and idempotent payments. Migration `20261101120000` **not applied** in production. Bill reminders (`reminderFor`) are computed but not wired. |
| [#126 — First-run welcome + import](https://github.com/nasrinaiv0/movo/pull/126) | Merged 2026-11-01. | Local CSV/JSON import; does not cover loans, receivables or bills. |
| [#80 — Tappable tiles, receipt scanner, rich replies](https://github.com/nasrinaiv0/movo/pull/80) | Merged 2026-10-31. | |
| [#42 — Accessible disabled cloud-auth guidance](https://github.com/nasrinaiv0/movo/pull/42) | Merged 2026-10-29. | The auth panel was later rebuilt as passwordless in #133; the disabled-state guidance is kept. |
| [#41 — NasrinAI financial-context consent](https://github.com/nasrinaiv0/movo/pull/41) | Closed without merge 2026-10-29. | |
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
| [#23 — Earlier frontend completion](https://github.com/nasrinaiv0/movo/pull/23) | Closed without merge; superseded by the reconciled PR #26 and follow-up fixes. |
| [#22 — Earlier legal/help pages](https://github.com/nasrinaiv0/movo/pull/22) | Closed without merge; legal/help functionality was consolidated into the in-app Legal and Help Center screens to avoid duplicate policy sources. |
| [#12 and #13 — Reference UI / notification parity](https://github.com/nasrinaiv0/movo/pull/12) | Closed without merge; superseded by the later merged responsive frontend and notification implementations. |
| [#41 — NasrinAI financial-context consent](https://github.com/nasrinaiv0/movo/pull/41) | Closed without merge on 2026-10-29; the consent disclosure in the chat was reworked in later merged chat changes. |

## Current release blockers

These are not resolved by a green frontend CI run or a READY deployment:

- **Legal:** Terms of Service and Privacy Policy published as final on 2026-11-03 by owner decision (effective 2026-11-03). The operator is identified as the MOVO service team with the support@nasrinai.com contact; no legal name or registered address is shown. The publication warning was removed.
- **Email sign-in codes (2026-11-02):** Supabase Auth logs show every `/otp` request since 16:02 UTC failing with SMTP
  `535 "Authentication credentials invalid"`. The custom SMTP credentials in Authentication → Emails → SMTP Settings
  need correcting by the owner, so codes are not delivered until then. Google sign-in works. Apple fails with
  `provider is not enabled`.
- **iOS app:** phases 1–3 are merged (`docs/IOS_APP.md`). Phase 4 (Codemagic signing, TestFlight) and phase 5
  (device testing, App Store submission) need the owner's Apple Developer Program membership, App Store Connect API
  key and Codemagic account. The look of the native Liquid Glass bars is unverified on a device.
- **Database hardening:** the Supabase advisor findings above are not yet fixed (a proposed migration needs approval).
- **Supabase Auth (sign-in is passwordless since #133):**
  - Paste the MOVO code email (with `{{ .Token }}`) into the Magic Link and Confirm signup templates.
  - Enable the Apple provider (Services ID, Team ID, Key ID, private key).
  - Allow `https://movo.nasrinai.com/**` and `movo://auth-callback` as redirect URLs. Leaked-password protection still matters only for older accounts that had a password; enable it through authorized project settings: [Supabase password-security guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- **Dependencies:** Latest main CI install reports 34 npm audit findings (16 low, 5 moderate, 13 high). Review advisories and use targeted upgrades with regression tests rather than a blind forced upgrade.
- **NasrinAI chat:** Production logs on 2026-10-29 showed upstream HTTP 401 responses (last observed 2026-10-29T05:42:54Z). Not re-checked since; a successful authenticated production chat request is still unconfirmed. Never expose or log credential values.
- **Interactive verification:** Full browser smoke tests on the production custom domain, including mobile, auth, consent, financial writes, CSV flows, and keyboard/focus behavior, remain unverified. Phone automations (Siri Shortcut, Apple Pay, Android voice) and NasrinAI voice chat have not been tested on a real device.
- **Data isolation:** Read-only production catalog checks confirm RLS enabled on profiles, financial accounts, transactions, budgets, and NasrinAI chat tables. Owner-scoped policies are present; the upstream mapping intentionally has no browser policy/grants and remains server-only.

## Required PR lifecycle

1. Review open PRs before starting duplicate work; update an existing branch when scopes overlap.
2. Use a dedicated branch and keep the PR summary, known limitations, and progress evidence current.
3. Run typecheck, the complete test suite, production build, and relevant security/data-isolation checks on the exact head SHA.
4. Verify the preview deployment for that exact SHA. A canceled/ignored Vercel build is not successful verification.
5. Merge only after checks pass and the PR is conflict-free. Verify the merge commit and resulting deployment separately.
6. Never include secrets, credentials, private financial data, or unverifiable legal details in code or documentation.


## Latest current-main snapshot — 2026-10-30 09:35 Asia/Manila

- **Main / production:** `277051e4ec2216a6b598c784a50b32ba37b89dee`; deployment [dpl_FRVNFKYmKHcrhnfvF8uhi7fwELVh](https://vercel.com/nasrin-ai/movo/FRVNFKYmKHcrhnfvF8uhi7fwELVh) READY.
- **Merged:** PR #57 (production dependency audit gate; 0 production dependency vulnerabilities) and PR #59 (generic demo identity, visible fictional sample-data notice, functional Sign in CTA). Production Playwright verified 200, no owner-like demo identity, responsive 390px layout, consent/legal navigation and no browser errors. Preview smoke exercised Home, Wallet, Transactions, NasrinAI, Profile, Settings, Notifications, and Search/Escape.
- **PR #56:** still draft; exact head `36c486424a2f37591edb13d5a43936140515e217`; Actions [40985264768](https://github.com/nasrinaiv0/movo/actions/runs/40985264768) passed 18 suites / 101 tests, typecheck, production audit and build; preview READY. Authenticated scoped request and unrelated-document canary remain unverified. Keep issue #47 open.
- **PR #55:** still draft and currently not mergeable against current main; reconcile with the merged demo disclosure before considering merge. **PR #43 / #52:** still draft; authenticated finance/chart validation remains outstanding. PR #58 is the documentation reconciliation branch.
- **Security:** RLS enabled on the seven checked tables; 22 owner-scoped policies across six user-facing tables; no checked anon/PUBLIC grants; upstream mapping remains server-only. Supabase leaked-password protection remains disabled. Full npm tree still reports 34 findings (16 low, 5 moderate, 13 high), while production-only audit is clean.
- **Legal:** Terms and Privacy pages and consent links were browser-verified, but publication warning remains until operator/controller identity/address, actual retention/deletion periods, providers/data recipients and jurisdiction-specific wording are confirmed.
- **Production chat:** no-token POST returns 401 `sign_in_required`. This is an auth-gate check, not proof of authenticated MOVO context isolation. Protected preview SSO prevented the exact-head scoped POST/canary test.
- Full detailed snapshot: `docs/engineering/updates/2026-10-30-0935-production-demo-disclosure-and-chat-checks.md`.


## Current main and release-gate snapshot — 2026-10-30 10:10 Asia/Manila

- **Main:** `ca1a680c78baf7c87347c960d56c7bc207041bc3`. PR #58 is merged (not open).
- **Production app:** PR #59 merged as `277051e4ec2216a6b598c784a50b32ba37b89dee`; Vercel deployment [dpl_FRVNFKYmKHcrhnfvF8uhi7fwELVh](https://vercel.com/nasrin-ai/movo/FRVNFKYmKHcrhnfvF8uhi7fwELVh) READY. Demo now uses generic identity and a fictional sample-data notice. Production Playwright smoke evidence is recorded in the 09:35 audit delta; not rerun in the 10:10 pass.
- **PR #60:** open/draft, head `d80077b05067282fa76de16e7947aa73557e7550`, 23 ahead / 0 behind. Exact-head run [40989633601](https://github.com/nasrinaiv0/movo/actions/runs/40989633601) passed 20 suites / 111 tests, typecheck, `audit:controls`, build and production-only audit; preview check succeeded. Manual accessibility and authenticated finance tests remain open.
- **PR #56:** open/draft, head `30aaaf0fedb50e7b73bb36f285c5b744247a2c0c`, 19 ahead / 0 behind. Current run [40990086352](https://github.com/nasrinaiv0/movo/actions/runs/40990086352) was in progress at 10:10; Vercel status succeeded. Do not reuse older run #40989833432 as validation for this exact head.
- **Issue #47:** open until authenticated scoped POST and unrelated-project canary prove isolation across retrieval, provider prompt, response, transcript, caches and logs. A no-token 401 is not sufficient.
- **Security/legal:** full dependency tree still has 34 findings (16 low, 5 moderate, 13 high); production-only audit reports zero. Supabase leaked-password protection remains reported disabled. Legal publication warning remains.
- Detailed update: `docs/engineering/updates/2026-10-30-1010-monitoring-delta.md`.



### Exact-head follow-up — 2026-10-30 10:11 Asia/Manila

- PR #56 head `30aaaf0fedb50e7b73bb36f285c5b744247a2c0c`: run [40990086352](https://github.com/nasrinaiv0/movo/actions/runs/40990086352) completed successfully; 18 suites / 103 tests, typecheck, production-only audit (0 vulnerabilities), and production build passed. Vercel check [CaaFALv6sPd7vWa1xRFqUwDRiHh2](https://vercel.com/nasrin-ai/movo/CaaFALv6sPd7vWa1xRFqUwDRiHh2) is successful.
- Full install still reports 34 findings (16 low, 5 moderate, 13 high), plus glob/eslint and Node.js 20 action deprecation warnings.
- Context-isolation release gate remains open: no authenticated scoped POST and unrelated-project canary evidence yet.


## 2026-10-30 10:35 Asia/Manila — branch protection/release-control audit
- Main branch API reports protected=false, required status checks enforcement off, and no configured contexts/checks; repository rulesets endpoint returned []. External organization/user-level policy was not separately verified.
- No new app merge/deployment since the previous checkpoint. Main's latest commit ca1a680c78baf7c87347c960d56c7bc207041bc3 is documentation-only; production app deployment remains READY at 277051e4ec2216a6b598c784a50b32ba37b89dee.
- PR #61 exact-head CI #40990360004 passed and preview dpl_DgProVYtiyPMD7ZQEndJt1b9Zhjh is READY. PR remains draft/unmerged.
- PR #56 exact-head CI #40990086352 passed (18 suites/103 tests), but authenticated context isolation remains unverified. PR #60 exact-head CI #40989633601 passed (20 suites/111 tests), but manual accessibility checks remain open. PR #52 exact-head run #40988481343 passed (18 suites/101 tests), but authorized finance-data chart verification remains open.
- Full dependency tree still reports 34 findings (16 low, 5 moderate, 13 high); production-only audit reports 0. Keep scopes distinct.
- Detail: docs/engineering/updates/2026-10-30-1035-branch-protection-and-release-control.md. No code/settings/deployments changed.

## Monitoring checkpoint — 2026-10-30 11:14 Asia/Manila

- **Current main:** `815ab66919894b271b90a5b1570b2fae949406c9`. PR #61 (documentation-only audit refresh) is merged. Current main's production deployment is READY; no new application code was merged by #61.
- **PR #43 finance:** current head `600c49ab9f1b5cb0e0034afe59d00fdbd4a0d6dc`, 17 ahead / 0 behind main, open/draft/mergeable. The profile currency correction is validated: code/test head `5308948502127be913921522b598693feb21e533` passed Actions #40996734432; the latest docs head passed Actions #40997019508. Both runs passed 20 suites / 118 tests, typecheck, production-only audit (0 vulnerabilities), and production build. Latest preview dpl_FxojvcDKrnLv1rQJC1HfewT6mJwy is READY. Authenticated cloud finance/CSV/currency-isolation checks remain open.
- **PR #52 charts:** current head `64cfa5b9e746b249a07735ae934badcb7d842610`, 7 ahead / 0 behind main, open/draft/mergeable. Exact-head Actions #40996821611 passed 18 suites / 101 tests, typecheck, production-only audit (0 vulnerabilities), and build. Preview dpl_HkwPPhisFzvU6MqLCW5uXvXvKmMF is READY; root returned HTTP 200. Authenticated chart-data verification remains open.
- **PR #56 context isolation/legal copy:** current head `337332bea5cabd533447e0913503b188794bca8e`, 20 ahead / 0 behind main, open/draft/mergeable. Exact-head Actions #40996840860 passed 18 suites / 103 tests, typecheck, production-only audit (0 vulnerabilities), and build. Preview dpl_9t1ykdVhWkhHxLanDZK2xFnh33Wp is READY; root returned HTTP 200. Authenticated live scoped POST and unrelated-project canary remain unverified; issue #47 stays open.
- **PR #60 UI controls/accessibility:** current head `015c35d041972080249e0bc71a6114bbbc4e6e19`, 24 ahead / 0 behind main, open/draft/mergeable. Exact-head Actions #40996861622 passed 20 suites / 111 tests, typecheck, `audit:controls`, production-only audit (0 vulnerabilities), and build. Preview dpl_3zM4sjjSTbQbTkrGuv9sTPZ9pnJp is READY; root returned HTTP 200. Keyboard-only/focus, screen-reader, responsive, and authenticated finance-flow checks remain open.
- **Fresh MOVO Supabase catalog check:** RLS enabled on all 7 checked tables; 22 policies across the six user-facing tables all reference `auth.uid()`; no `anon`/`PUBLIC` grants on the checked set; upstream-conversation mapping has no policies and no `authenticated` grants, with grants restricted to `service_role`.
- **Security carry-forward:** Supabase Security Advisor still reports leaked-password protection disabled. The available Supabase tools expose no Auth configuration write action, so no setting was changed. Full dependency tree still reports 34 findings (16 low, 5 moderate, 13 high); production-only audit reports 0. These are distinct scopes.
- **Legal:** PR #56 carries separate Terms/Privacy effective dates and corrected Privacy Policy wording. It is not merged, so production does not yet contain that revision. Publication warning must remain until formal operator/controller identity/address, verified retention/deletion schedule, provider/data-recipient disclosures, and jurisdiction-specific wording are confirmed.
- **Validation boundary:** all four open application PRs have passing exact-head automated checks and READY previews, but none is fully release-verified. No authenticated finance CRUD/CSV, chart provenance, live upstream scope canary, or manual accessibility session was completed in this checkpoint. The Vercel protected fetch attempt was blocked before reaching the app endpoint and is not application API evidence.
- **Data/security boundary:** no database schema, RLS/grants, production financial records, Auth settings, provider secrets, or separate NasrinAI repository were changed.

## Post-merge checkpoint — NasrinAI disclosure hotfix — 2026-10-30 11:30 Asia/Manila

- **PR #63 merged** as `1df043bcc54d59bee16fce806b601e09d647b06e`. Exact-head Actions #40997576900 passed 17 suites / 95 tests, TypeScript typecheck, production-only audit (0 vulnerabilities), and production build. Preview was READY and the served bundle had the new caveat.
- **Production verified:** deployment dpl_CoSq9dcgCG2qVbCkm1BBSeRU2r1U is READY at the merged commit; root returned HTTP 200. The production JS bundle contains “Important privacy limitation” and the explicit upstream-boundary warning, contains the October 30, 2026 Privacy Policy date, and no longer contains “Your account stays isolated.”
- **Important scope distinction:** this corrects misleading copy; it does not prove the full upstream context boundary. Issue #47 stays open until authenticated scoped POST and unrelated-project canary evidence is recorded.
- **Current application PR heads after reconciliation:** #43 `d6f2fcd40ad9c5438e031400dd5120d77272bec0` (20 suites / 118 tests); #52 `4b645666108174f31d4875d0da063bd8fe1c0170` (18 / 101); #56 `06b5680b069ce17b75b9e2d63e3e0904bdda703e` (18 / 103); #60 `43087d907be095ef42d8fbcd7b8d9b2cc6723662` (20 / 111). All exact-head Actions runs passed, Vercel previews are READY, and preview root requests returned HTTP 200. All remain drafts due the authenticated/manual gates below.
- **Finance gates:** authenticated cloud CRUD, CSV import/export, and owner-scoped currency isolation remain unverified; chart data provenance against authorized records remains unverified.
- **Accessibility gates:** keyboard-only/focus, screen-reader, responsive interaction, and complete live-control behavior remain unverified. Static `audit:controls` does not replace these checks.
- **Fresh Supabase catalog check:** 7 checked tables have RLS enabled; all 22 policies on six user-facing tables reference `auth.uid()`; no checked `anon`/`PUBLIC` grants; upstream mapping has no policies or authenticated grants and remains service-role-only. Security Advisor still reports leaked-password protection disabled; no Auth write action was available.
- **Governance/dependencies/legal:** main still reports unprotected with no repository rulesets (rechecked after PR #63); full dependency tree has 34 findings (16 low, 5 moderate, 13 high), distinct from zero production-only findings. Legal publication warning remains until operator/controller identity/address, retention/deletion schedule, provider/data-recipient disclosures, and jurisdiction review are confirmed.
- No database schema/RLS/grants, production financial records, Auth settings, or secrets changed.


## Post-disclosure monitoring checkpoint — 2026-10-30 12:06 Asia/Manila

- **Main / production:** current main `9438e7c01c916a6b27f62e026fe9b4a4f6952f94`; Vercel production deployment [dpl_3kHKpwFatSAawrVCtU19XNEECR3E](https://vercel.com/nasrin-ai/movo/3kHKpwFatSAawrVCtU19XNEECR3E) is READY at the same SHA.
- **PR #63 merged:** [`1df043bcc54d59bee16fce806b601e09d647b06e`](https://github.com/nasrinaiv0/movo/pull/63). Removed unverified absolute isolation claim, disclosed that upstream boundary is not independently verified, advised against real/highly sensitive financial details, and corrected Terms/Privacy effective dates. Exact-head CI #40997576900 passed 17 suites / 95 tests, typecheck, production-only audit (0), build. Recorded production bundle smoke verified caveat/date and absence of old claim.
- **PR #64 merged:** documentation-only audit reconciliation at `9438e7c...`; paths: progress register, Claude handoff, master ledger, and dated disclosure-hotfix evidence.
- **Current application heads:** #43 `ad532e1df7ca14a0c0aebe0244d7b82d2bb0578e` — CI #41000693424, 20 suites / 125 tests, preview READY; #52 `78b776497c8125f1637b2fb601965c1cc94e9b03` — CI #40999382232, 18 / 101, preview READY; #56 `15e112149bf70b6ee1f141365a4b9ed9ffb9e6e5` — CI #40999433274, 18 / 103, preview READY; #60 `12ba5b3b45065949626e3ecf49a777b9de44387b` — CI #41000977707, 20 / 112, typecheck + `audit:controls`, preview READY. All four remain open/draft.
- **Security:** each latest checked install log reports 34 full-tree dependency findings (16 low, 5 moderate, 13 high), while production-only audit reports 0. Fresh merged ledger evidence: 7/7 checked tables RLS enabled; 22/22 user-facing policies reference `auth.uid()`; no checked anon/PUBLIC grants; upstream mapping remains service-role-only. Leaked-password protection remains disabled; main branch protection/rulesets remain absent.
- **Do not overclaim:** PR #63 is a disclosure correction, not a fix for issue #47. Authenticated scoped POST/canary, finance CRUD/CSV/currency isolation, chart provenance, manual accessibility, legal publication facts, leaked-password protection, branch governance and full-tree dependency remediation remain open.


## 2026-10-30 12:52 Asia/Manila — latest implementation follow-up

- [PR #56](https://github.com/nasrinaiv0/movo/pull/56): added missing/blank upstream-key fail-closed guard and regression test. Exact-head CI [41004999162](https://github.com/nasrinaiv0/movo/actions/runs/41004999162): 18 suites / 104 tests, typecheck, production-only audit (0), build passed; Vercel preview READY/root 200. Authenticated scope canary still unverified; historical upstream 401 requires authorized credential remediation.
- [PR #60](https://github.com/nasrinaiv0/movo/pull/60): added tests for disabled/explained unsupported settings and functional In-App Alerts. Exact-head CI [41005003149](https://github.com/nasrinaiv0/movo/actions/runs/41005003149): 20 suites / 113 tests, typecheck, `audit:controls`, production-only audit (0), build passed; Vercel preview READY/root 200.
- Full dependency tree still has 34 findings (16 low, 5 moderate, 13 high); leaked-password protection, branch governance, legal publication facts, authenticated finance/chart checks, and manual accessibility remain open.
- Detailed trace: `docs/engineering/updates/2026-10-30-1252-frontend-hardening.md`.


## Fresh Supabase read-only security recheck — 2026-10-30 12:54 Asia/Manila

- Catalog query: RLS is enabled on **7/7 checked public tables**: profiles, financial_accounts, transactions, budgets, movo_ai_conversations, movo_ai_messages, and movo_ai_upstream_conversations.
- The six user-facing tables have **22 policies**; each checked policy expression references `auth.uid()`. The upstream mapping has no client policy.
- `information_schema.role_table_grants` returned **73 grants** for `authenticated` and `service_role` across the checked tables, with **no `anon` or `PUBLIC` grants** in the checked set. The upstream mapping grants are limited to `service_role`; do not add a client policy/grant.
- Fresh Security Advisor findings: `auth_leaked_password_protection` remains WARN (disabled); `rls_enabled_no_policy` for the server-only upstream mapping remains INFO and intentional. Performance Advisor reports seven unused indexes; no index was dropped without query evidence.
- This was a read-only metadata/advisor check. No schema, RLS policy, grant, Auth setting, financial row, or secret was changed.

## PR #60 notification-settings accessibility regression — 2026-10-30 13:02 Asia/Manila

- Current PR #60 head: `8005fbc695c5a8f30f2817e99b3fb8226ea1a429`, reconciled with current `main`.
- Added regression coverage for unsupported Push/Email delivery and demo-only Account & Security, NasrinAI Updates, Promotions, and Reports. Each disabled switch must expose a visible explanation through `aria-describedby`. In-App Alerts and the Transactions category remain interactive and must call the preference handler.
- Updated the disabled-category descriptions to explicitly say that live delivery is not connected and sample/demo alerts only.
- The first attempt at `776b9af8d955f220406f48dbc7f573950ae89380` failed (1 failed / 113 passed) because the visible explanation did not match the test's sample/demo expectation. The source-only follow-up `02155f4501f56d8b7fa2fb79143af33730dc28a1` still failed against the stale assertion. The test was corrected at `9c38028cbf3a11675f16db09d0fb41190fd5f71d`; latest branch reconciliation is `8005fbc695c5a8f30f2817e99b3fb8226ea1a429`.
- Exact-head GitHub Actions run [41006039735](https://github.com/nasrinaiv0/movo/actions/runs/41006039735) passed: **20 suites / 114 tests**, TypeScript typecheck, production-only npm audit (**0 production vulnerabilities**), `audit:controls`, and production build.
- Exact-head Vercel preview [dpl_EYB99rVuHay4i4MA3QfH9WKueW7X](https://vercel.com/nasrin-ai/movo/EYB99rVuHay4i4MA3QfH9WKueW7X) is READY; preview root and JavaScript bundle returned HTTP 200, and the four explicit demo-only descriptions were present in the deployed bundle.
- The full dependency tree still reports **34 findings (16 low, 5 moderate, 13 high)**. No dependency changes were made. The previous production-only audit passed on this exact head.
- **Not release-complete:** interactive keyboard/focus, screen-reader, responsive, and authenticated finance/CSV/currency flows remain unverified. PR #60 remains draft.
- No database schema, RLS/grants, Auth setting, financial record, provider secret, or separate repository was changed.

## PR #52 current-main reconciliation — 2026-10-30 13:10 Asia/Manila

- Code/test head before reconciliation: `78b776497c8125f1637b2fb601965c1cc94e9b03`.
- Exact-head Actions run [40999382232](https://github.com/nasrinaiv0/movo/actions/runs/40999382232) passed **18 suites / 101 tests**, TypeScript typecheck, production-only npm audit (**0 production vulnerabilities**), and production build.
- Exact-head preview [dpl_76bUJdnfATaWSKRof8z33HKyZXzu](https://vercel.com/nasrin-ai/movo/76bUJdnfATaWSKRof8z33HKyZXzu) is READY; root returned HTTP 200.
- Chart formatting and data validation preserve currency-specific labels and summaries, validate values before rendering, and avoid combining unlike currencies without an exchange rate.
- This main reconciliation is documentation-only. Chart values/provenance still require verification against authenticated, authorized financial records; keep draft until that end-to-end check passes.
- No database schema, RLS/grants, Auth setting, financial record, provider secret, or other repository was changed.

## Phone automation sources and cross-source dedup — 2026-11-02 Asia/Manila
- **Found:** production `transactions_source_check` (verified read-only) rejects `applepay`/`googlepay`/`bank`, so every source-aware automation insert from PR #123's function failed; production holds 0 automation transactions. Request dedup was per device key and per source only, so Apple Pay + bank alert (or two devices) logged the same purchase twice. The in-app link path saved everything as `notification`.
- **Changed:** migration `20261102010000_automation_sources_and_cross_source_dedup.sql` (wider source allowlist incl. `siri_shortcut`/`android_assistant`, event `source`/`outcome`, `log_automation_transaction_v2` with cross-source matching and per-user lock); `api/log.js` (v2, income, currency, category, Siri/Android `text` parsing via `api/_lib/voice.js`, safe error mapping, rollout fallback); client keeps real sources (`src/lib/transactionSources.js`, `financeRepository.js`, `App.js`); Siri voice prompt; 83 more institutions with curated favicon domains.
- **Verified:** Jest 318/318; `tsc`; strict build; `supabase/tests/automation_dedup.test.sql` plus the existing SQL tests on a local Postgres 16 copy of all migrations (bug reproduced before the migration; mutation of the dedup rule makes the test fail).
- **Not done:** migration not applied to production (needs owner confirmation); no physical iPhone/Android test; Android relies on third-party automation apps (no native app/App Actions).


## Unified MOVO automation prompts — 2026-11-03

- Branch: `feat/unified-automation-shortcut-prompts`.
- Added interactive and hands-free bank notification recipe variants; interactive Siri confirmation variant; retained Apple Pay automatic/interactive recipes.
- Added prompt safety requirements for server-confirmed success, non-financial notification filtering, no fabricated transaction details, and no POST on Skip.
- Added regression tests for the new recipe variants and updated Siri progress documentation.
- Pending: exact-head CI/typecheck/build, review of the shared-preference wiring, actual iPhone trigger-variable validation and While You Were Away end-to-end test. No Supabase migration, production data change, deployment or merge performed.


## Crypto portfolio implementation — 2026-11-04 Asia/Manila

- Branch: `feat/live-fx-crypto-markets` (existing PR #177).
- Added manual holding records with asset, quantity, quote currency, acquisition date and optional average acquisition price. Supports separate position records, edit and remove.
- Added responsive portfolio view matching MOVO's existing card surfaces, accent tokens, rounded controls, muted labels, tab switcher and compact position rows. Portfolio summary shows total value, cost basis and unrealized P/L only when inputs and provider prices support a valid same-quote calculation.
- Holdings are persisted under `cryptoHoldings` in MOVO preferences and merged by stable ID across local/signed-in preference copies. They are not written to cash accounts, transactions, income or expenses. No Supabase migration/RLS change is required for this preference-backed implementation.
- Added validation/valuation helper and unit tests for invalid quantities/costs, quote mismatch, missing market prices, unknown cost basis and ID upsert.
- No implicit FX conversion is performed. Portfolio values are reference estimates, not exchange execution quotes. Exchange/wallet integrations, fees, realized P/L and custody/trading remain out of scope.
- Validation on the new head is pending GitHub Actions; live Vercel preview and device smoke testing are still required.


## Crypto portfolio implementation — 2026-11-04

- Added manual crypto holding records with validated asset IDs, positive quantities, optional non-negative average acquisition price, quote currency, and stable IDs. Added edit/remove and portfolio valuation/unrealized P/L helpers with regression tests.
- Added a Market / Portfolio switch, premium responsive overview and holdings cards, add/edit form, empty state, and explicit data/cash-separation disclosures. Portfolio values use only matching quote-currency market prices; missing or incompatible prices and unknown cost basis are shown as unavailable rather than estimated.
- Added `cryptoHoldings` to preference defaults and ID-based preference merging so holdings persist across signed-in preference sync and local-only use. No Supabase migration or new financial-account/transaction rows are used; crypto remains outside cash, income, expense and net-worth accounting totals.
- Exact-head CI [41745638862](https://github.com/nasrinaiv0/movo/actions/runs/41745638862) failed at translation catalogue coverage because the new accessible tab label “Crypto sections” was not in the English-first exclusion set. Production audit (0), typecheck passed; test/build stages were skipped by fail-fast. Added the missing label to `scripts/i18n-extract.js` in commit 8de5520. Re-run exact-head CI is pending.
- Vercel preview remains unverified: the prior Vercel commit status was canceled by an ignored build step; do not treat this as a successful deployment. Keep PR #177 open and do not merge until exact-head CI and a real preview smoke test pass.


2026-11-04 — Crypto API routing fix: `src/lib/crypto.js` now uses the shared `apiUrl()` helper. This is important for the Capacitor iOS app, where a relative `/api/crypto` URL would resolve against the bundled `capacitor://localhost` origin rather than MOVO production. Commit `5583368`. The market still requires `COINPAPRIKA_API_KEY` configured in Vercel; verify the production endpoint and preview after that server-side setting is present.


## Crypto market provider outage follow-up — 2026-11-04
- Confirmed PR #179 is merged; native iOS market requests now route through the production MOVO API.
- The production proxy intentionally returns HTTP 503 when `COINPAPRIKA_API_KEY` is absent. It uses CoinPaprika's paid REST host and does not silently fall back to the keyless personal-use endpoint.
- Follow-up adds actionable, non-secret configuration guidance and regression coverage for missing credentials, paid-host selection, server-only Authorization handling, provider rate limits, and invalid actions.
- **External release gate:** configure the licensed CoinPaprika credential as Vercel's server-only `COINPAPRIKA_API_KEY` for the MOVO production project and redeploy. Do not use the free personal-use endpoint for MOVO's commercial/customer-facing market display. No credential was added to source control.
- Live production response and physical iOS verification remain pending; automated CI alone is not proof that the market feed is live.

## 2026-11-06 — Sandbox recovery, financial accuracy and adaptive UI

- Recovered unpushed sandbox commit `7ab3ad7` onto current main `a1c6fd9`; preserved commercial-readiness changes.
- Fixed shared bank/debit ledgers, posted transaction filtering, credit payment duplication, separate estimated interest, cross-currency plan allocation totals and cent-safe sums. Monetary labels always display two decimal places, including summaries and Cryptocurrency.
- Added Pay/Edit/Delete loan actions; deletion archives the obligation and preserves recorded payments/account balances.
- Compacted reminder, Financial Planning and Cryptocurrency layouts; removed duplicate watchlist; made header buttons 45px circles and action/filter labels monochrome with theme-aware contrast.
- Validation in Vercel Sandbox: actual React component fixtures with synthetic data, 36 screen/width/theme combinations (320/390/430px, light/dark, green/orange); no page/dialog overflow; header dimensions checked; screenshots reviewed. Store-table SQL privilege assertions passed in isolated PostgreSQL 18. Full production build and exact head test results are recorded in the PR.
- Store checkout remains disabled until credentials, database migration and signed-device purchase/refund/restore tests are complete. Native store tests use mocked SDK responses; no customer payment was made. New release copy currently has English fallbacks pending native-language review.
- PR175 was rechecked: closed without merging on 5 November; its historical audit follow-up remains documented. No other open PR was returned at publication time. No production database data was modified.


## 2026-11-06 — Production accounting and commercial blocker remediation
- Branch fix/release-accounting-security-20261106, base main 703f31f. Release NOT CLEARED.
- Fixed truncated account ledger/posting/activity fetches, pending versus posted balance treatment, missing exchange-rate behavior, and non-finite currency formatting.
- Added public Terms and Privacy standalone HTML and Vercel routes; existing account deletion page retained. Legal review required before store publication.
- Applied additive store entitlement persistence migration to live Supabase with RLS and minimal grants; store billing remains disabled pending official test purchases and server credentials.
- Required change documentation per code-containing commit: update this file plus docs/engineering/updates/ dated record. GitHub CI enforces this, template updated.
- Vercel Sandbox 619/619 initial full tests, 110 suites, typecheck, build, production-only dependency audit successful; final PR head to be reverified.
- Remaining blockers: actual Apple/Google billing sandbox verification and native signed builds, permission/tenancy security testing, snapshot-consistent finance projections, booked FX policy, legal approval.
- Detailed evidence/rollback: docs/engineering/updates/2026-11-06-financial-commercial-remediation.md

- Policy expansion: canonical English Terms/Privacy supplements shared with static pages and in-app view, November 6 effective date, sync regression tests; reviewed legal translation/operator disclosure remains a release gate.

- Legal navigation regression expectation updated for November 6 policy date; tested as part of the same code/documentation commit.

- CI dependency follow-up (PR #226): the lockfile generated under npm 11 was rejected by the GitHub runner npm 10 because of an npm-version-specific optional yaml peer dependency. Pinned npm 11.19.1 for the CI install to match the validated lockfile; no dependency/lockfile change or financial-data write.

- PR #226 exact-head CI caught a missing in-app Legal screen change in the initial Git tree; restored src/screens/Legal.js (November 6 effective date and canonical supplements) in the same commit as this update and the dated engineering note. Retest before merging.


## PR #225 — Wallet/Transactions adaptive icons, compact summary and billing-cycle dues (2026-11-06)
- Base: refreshed to main 9c423c71. Scope: Wallet edit and Transactions quick-action SVGs use adaptive accent ink; compact Total Spent card aligns comparison with month axis.
- Bills/Financial Planning: overdue unpaid obligations plus one current billing cycle per bill; future periods are not counted as currently due; duplicate occurrences do not inflate totals. No ledger data is changed.
- Regressions: cycle/deduplication/cents and icon rendering tests, plus all 11 locale outputs. Source documentation: docs/engineering/2026-11-06-wallet-transactions-compact-summary.md.
- Validation: initial Vercel Sandbox 108 suites / 618 tests, typecheck, production build passed; deployment/preview requires separate verification. PR remains open.


## PR #225 — Mascot bubble text-link border follow-up (2026-11-06)
- In the Home header, exempt only `Change mascot` (`.ram-bubble-link`) from MOVO's global 0.25px button hairline; preserve accent color, callback, keyboard focus and card panels.
- Added `RamMascot.test.js` regression and updated the detailed engineering documentation alongside this code change.
- Vercel Sandbox: 108 suites / 619 tests, typecheck and build passed before rebasing. Live PR CI/preview must verify the rebased revision.


## PR #225 — Empty-only record surfaces across MOVO (2026-11-06)
- Removed decorative horizontal background/border/shadow on **empty-only** record lists: Scheduled payments/transfers, overdue obligations, reminders, Cashback lists and other empty-single-paragraph cards.
- CSS limits selection to direct empty children or empty categories; populated cards, buttons, charts and onboarding CTAs retain their styling. Truly empty list cards render no blank capsule. No changes to financial calculations or storage.
- Regression test: `EmptyRecordSurfaces.test.js`; full Vercel Sandbox 109 suites / 622 tests plus TypeScript check and production build passed. Rebased exact-head CI and preview validation remain the merge gates.


## PR #225 — Consistent headers, legal spacing and Vercel-configured social profiles (2026-11-06)
- Root and back-navigation headers use 10px upper/lower internal padding with 10px bottom separation. Home mascot/header row is more compact while retaining 45px actions and safe-area spacing.
- Terms, Privacy and Help Center share 14px section gaps, including canonical supplemental policy sections; adjusted sticky fade and bottom scroll clearance for fixed navigation.
- Added a compact social logo row after each of those pages, shown only for valid links from Vercel server environment variables through `/api/social-links`. No fake profiles or client-side embedded links.
- Changed files, new security/API and rendering tests, translations and documentation are committed together with a dated engineering update, as required by MOVO CI. No finance/ledger or policy wording changes.
- Sandbox tests and GitHub exact-head CI required before merging. Vercel preview can be canceled by ignored-build setting and must not be assumed verified.

- Social-env deployment clarification: setting or editing MOVO social profile URLs in Vercel Project Settings requires a new deployment, because previously deployed functions retain their old environment. Links remain hidden until a valid URL is present in the running deployment. Cached public profile output may take up to five minutes to refresh.


## PR #225 — Equal header button insets and responsive action groups (2026-11-06)
- Home Search/Bell/Settings capsule and the shared root-screen utility capsule now use symmetric 5px interior padding, 4px inter-button gaps and 45px circles with centered 22px icons. This preserves theme-specific icon colors, notifications dots and selection backgrounds.
- Separately grouped Plus controls stay outside their utility capsule with 8px header spacing. On screens narrower than 360px, the Home action pill moves to its own right-aligned grid row rather than clipping the greeting or shrinking 45px hit targets.
- Additional regression coverage in src/components/HeaderButtonSpacing.test.js checks equal geometry, responsive grid and real button callbacks. No financial, legal or social-link runtime calculations change.
- Previous Vercel env redeployment documentation correction and this change are documented in dated notes and verified against the exact PR head.


## PR #225 — Chat status, solid More icon, and edge-to-edge Google favicons (2026-11-06)
- Removed chat status pill and green badge background, leaving only the animated NasrinAI dot mark in adaptive accent and accessible progress text.
- Replaced outlined More dots with three solid currentColor dots.
- Eliminated CSS padding/percentage insets from Google S2 fetched favicons, scoped to true images and matching catalog wrapper; restored full logo area in account, transaction, subscriptions, crypto and stocks lists while leaving other images intact.
- New ChatMoreFavicons.test.js regression coverage. Engineering update: docs/engineering/updates/2026-11-06-pr225-chat-more-favicons.md. Require full GitHub CI and sandbox build at this commit before merging.


## PR #228 — Borderless controls across all MOVO screens (2026-11-07)
- Eliminated visual borders and faux inset-shadow outlines on buttons, tabs, calendar days, clickable rows, action links, header controls and bottom navigation in light and dark appearances.
- Corrected the global `border-width: var(--hair) !important` selector to exclude controls and their pseudo-elements. The final control policy outranks legacy high-specificity button border declarations; structural card/panel/field boundaries and keyboard focus-visible outlines are preserved.
- Vercel Sandbox verification: 117 suites / 656 tests passing, TypeScript check and production React build successful; headless Chromium computed-style audits found zero button-border violations on Home (both themes), Wallet, Transactions, Menu, Subscriptions and its tabs, Cashback and Add form, Financial Planning, Limits and transaction search. Focus indicator remains 2px. No browser page errors on main navigation.
- Implementation, automated regression checks, this PR progress entry, and `docs/engineering/updates/2026-11-07-borderless-controls.md` are included in the same commit to satisfy per-commit documentation gates.
- Keep independent security PR #227 unchanged. Merge only after exact-head GitHub CI and deployment checks succeed.


## Header 0.5px padding and back navigation — 2026-11-07
- On latest merged main, use 0.5px internal padding for header buttons without changing the established 45px touch targets, 22px icons, utility group spacing, colors or states.
- Cashback and Scheduled (entered from Menu) gain an optional Back button returning to Menu, while retaining original large titles and all actions, including Scheduled Plus. At narrow widths (<360px), only these pages' header utilities wrap to a second row.
- Broad MOVO button border removal is already in main. Preserve CSS icon pseudo-element borders needed to draw indicators while removing decorative shadows.
- Added navigation, responsive CSS, exact padding and icon safety tests; a dated engineering update accompanies this single code commit.


## PR #229 — Unified Settings icon across MOVO (2026-11-07)
- Profile header, Profile Financial Settings row and sidebar now use the same solid Settings gear already shown on Home and shared headers.
- Per-context SVG sizes stay unchanged (Home 24px, shared header 23px, Profile header 19px, menu 20px, sidebar 22px). Theme-adaptive currentColor, 45px touch targets, 0.5px header padding and borderless controls are preserved.
- The legacy gear icon name aliases to canonical gearSolid in the shared Icon component to prevent a second design recurring. Other icons such as shield and sliders remain distinct.
- New SettingsIconConsistency.test.js covers matching SVG artwork, click routing and existing size contracts. Dated engineering documentation accompanies this commit.


## PR #229 — Adaptive Financial Planning filters, 10px headers and scrolling mascot (2026-11-07)
- Shared filter buttons now show the application's main foreground color when unselected; selected chips use contrast-safe white text on the light-mode dark sliding pill, or dark text on the dark-mode white pill. Preserve button sizes and tap behavior.
- Standardized all direct root/sub/Home/Wallet/Transactions/Menu headers at exactly 10px top/bottom internal padding and 10px lower separation. Preserve the iPhone safe-area inset on screen, existing icon sizes and 0.5px button interior padding.
- Home ram avatar slot compacted from 80px to 68px (60px on narrow phones). Animated artwork scales to 88% on scroll, photo mascot to 90%, while retaining the existing interaction target; reduced-motion disables transitions.
- Added AdaptiveFilterHeaderMascot.test.js with CSS cascade, real tab-click, scroll integration, responsive and accessibility checks. Dated engineering documentation included. No financial/data logic changes.


## PR #229 — Transactions filters spacing (2026-11-07)
- Standardized Transactions type filters and billing selector onto one aligned row, with consistent gaps, no negative inherited margins, and clear 16px separation beneath the row.
- Date / Amount / From-To / Account sort chips use equal-width 3- or 4-column layout, 8px gaps (6px narrow), and 16px of clear separation above transaction cards/date headings. No more active chip touching the card.
- Narrow <=390px spacing retains click targets, accessible labels and no overlaps. Preserved existing theme, colors, selection indicator, filter/sort logic and all other pages.
- Added TransactionFilterSpacing.test.js plus a dated engineering record in this same code commit. Gate on Vercel Sandbox full CI/build and exact-head GitHub CI before merging.


## PR #229 — Compact Wallet card actions and enlarged icons (2026-11-07)
- For View Details / Add amount / Limits / More beneath the selected card, decrease vertical bar padding from 14px to 8px, enlarge each icon from 20px to 26px and reduce icon/label gap from 7px to 5px. Keep the 4-column arrangement, horizontal padding, 11px labels and 44px minimum touch target.
- No changes to click actions, labels, card boundaries, outline-free button styling, themes or financial functionality. Added WalletCardActionSpacing.test.js and dated engineering record. Require Vercel Sandbox test/build and GitHub CI before merging.


## PR #229 — Financial Planning: Collect, Edit and Delete in Owed to you (2026-11-07)
- Each receivable now uses the Loans & Debts three-action card, preserving compact layout and icons. Collect reuses the existing record_receivable_event SQL RPC (account- and owner-validated) and is disabled on settled or fully collected records.
- Edit updates metadata only, leaving principal, currency, outstanding balances, account links and event history intact. Delete presents a confirmation and soft-archives the receivable without erasing collections or changing cash balances.
- Owner-scoping, date validation, archive filtering and real UI callbacks have targeted regression tests. Internationalized UI copy is available in all 11 languages.
- Detailed same-commit documentation: docs/engineering/updates/2026-11-07-pr229-receivable-actions.md. Existing Wallet four-action compact strip was committed already in a4a7a3e and is preserved here.
- Require full Vercel Sandbox tests/build, GitHub exact-head CI and live mobile visual review before merge.

## Transactions sort filter side-fade correction (2026-11-07)
- Screenshot defect: the Date/Amount/Account sort buttons fade at the left and right edges due to the global `.chip-row` scroller mask.
- Transactions sorting uses a fixed non-scrollable grid, so override only its mask to `none` (including WebKit); remove only the sort indicator's box shadow.
- Preserve active pill appearance, gaps, 44px targets, arrow-free labels, sorting callbacks and the horizontal fades of genuinely scrolling rows. No change to financial records, auth or calculations.
- Includes a focused regression test and the engineering record `docs/engineering/updates/2026-11-07-transactions-sort-edge-shadows.md`. Require Vercel Sandbox checks and exact-head GitHub CI before merging.
- Verification: focused Sandbox tests 18/18, full test suites 124/124 and 694/694 tests, TypeScript and optimized build passing. Chromium mobile-width computed-style checks confirmed both masks and indicator shadow are `none` in light and dark appearance; three options and 44px target intact.

## Transactions and Wallet — exactly 40px filter heights (2026-11-07, PR #232 follow-up)
- Align Transactions type/date-sort/account-sort filters and billing-cycle select to 40px, Wallet category filters and Wallet sort/layout selectors to 40px. Preserve all current horizontal spacing, responsive widths, selected-pill animation, semantic button labels, and existing side-shadow removal in PR #232.
- Only filter controls are targeted; header actions and unrelated cards/navigation remain unchanged.
- Added `TransactionWalletFilterHeight.test.js`, updated existing Transactions filter spacing / shadow regression expectations and extended dated engineering docs in the same commit. Vercel Sandbox and exact-head GitHub CI required before merge.
- Follow-up final verification: isolated Vercel Sandbox 704/704 tests in 125 suites, TypeScript and build passed. Browser verified 36 40px controls per mobile width across light/dark at 320/390/430px; exact-head GitHub CI remains a separate merge gate.

## Adaptive summary-card accent contrast (2026-11-07)
- Correct five screenshot-referenced surfaces: Home Total Balance, Transactions Total Spent / billing cycle graph, Financial Planning Net worth, Cashback tracked, and Monthly subscriptions.
- Reuse the existing WCAG black/white `--on-accent` algorithm for all summary-card text and SVG/bar graph colors; use subtle matching translucent chart backgrounds instead of fixed white. Accent fill and existing component layouts are preserved.
- Scope: stylesheet + dedicated regression tests + dated engineering record. No financial data, API, account, layout, theme preference or user interaction changes.
- Merge gate: full Vercel Sandbox install, test/typecheck/build, followed by same-commit PR CI and visual review. See docs/engineering/updates/2026-11-07-adaptive-financial-summary-contrast.md.
- Verification: Vercel Sandbox targeted 20/20; full prebuild 701/701 tests / 124 suites; TypeScript and optimized build passed; 28/28 computed-style browser assertions on real built app for pastel pink and dark charcoal passed. PR checks and authenticated human visual review remain merge gates.

### 2026-11-08 — Import & Export preview/save PR
- Compact Upload file, no-file status, JSON backup preview and explicit Save records. CSV selection routes to existing CSV importer. Restore add-only and tested; not a complete restoration of all backup tables.
- See docs/engineering/updates/2026-11-08-import-export-preview-commit.md.

- 2026-11-08 — PR #240 additional import accounting safeguards: fail closed for duplicate account labels, incompatible account type/currency, dangling account/transfer references, and incomplete transaction rows; regression tests and Vercel Sandbox evidence in dated engineering update.

- 2026-11-08 — PR #240 CSV hardening: duplicate matching wallet account labels now require user correction; no accidental first-result posting. Added 11-language error message, focused tests, audit notes.

### 2026-11-08 — Cloud/offline and profile email privacy PR
- Implemented account-scoped local browser workspace, complete-snapshot-gated cloud toggle, offline transaction support after verified Pro expiry, and masked email in Profile.
- Production release blocked pending full offline record coverage, signed device and two-account security tests; see docs/security/2026-11-08-offline-cloud-handoff-and-email-masking.md.


### 2026-11-08 — Offline storage mode pauses plan-access features
- Proposed policy: Cloud Sync off -> local features only; Pro/Pro+ effective access paused while existing verified subscription/billing remain unaffected.
- Cloud Sync on -> verified, active, unexpired entitlements only; UI premium content and cloud sync writes are mode-gated.
- UI explains offline mode and provides Cloud Sync settings action without encouraging duplicate plan purchases.
- No cloud finance snapshot migration, backend plan change or production database mutation; blocked high-risk migration remains PR #241.
- Evidence: docs/engineering/updates/2026-11-08-local-mode-plan-access-policy.md; Vercel Sandbox + GitHub exact-head CI required.

### 2026-11-08 — Local CSV/JSON import: Discard or Save with confirmations
- Uploaded files are preview-only until an explicit, separate confirmation. Discard removes preview only; Save commits validated local accounts and transactions.
- No imported file is written to Supabase; active cloud mode blocks committing and prompts local-mode switch.
- Wallet, Home and Transactions refresh from successfully saved device records. Invalid, duplicate, unsupported or stale records do not silently overwrite financial data.
- Cloud plan access is paused in local mode without affecting store subscription. PR #241 full offline migration remains blocked.
- Reference: docs/engineering/updates/2026-11-08-local-import-discard-save-confirmation.md.

### 2026-11-08 — Translation-catalog coverage fix for PR #245
- Added 67 missing English interface keys to the 11-language catalog, including local/cloud mode, save/discard confirmations and sync safeguards. Translations are machine-assisted and should be professionally reviewed before localization sign-off.
- Verified `src/lib/i18n.test.js` in isolated Vercel Sandbox: 2/2 tests passing, 2,540 catalog strings and complete placeholder coverage; existing English source keys unchanged.
- No finance code or subscription records changed in this CI-only patch. Full GitHub Phase 1 CI and signed-device audit are still release gates.

### 2026-11-08 — Draft offline/online reconciliation foundation (NOT commercial release-ready)
- Owner-scoped v2 device journal with last-confirmed snapshot; local offline writes marked pending, cloud download mirrored into device before switch.
- Three-way baseline/local/cloud reconciliation, no clock-based last-write-wins, no silent deletion/resurrection or guest-to-account import.
- Safe subset: account create/CAS-update and new simple transaction upload with owner/RLS checks, UUID/cents validation and cloud refetch; rollback preserves local unsynced queue.
- Settings sync status and online-event reconnect retries; Pro/Pro+ still paused in offline local mode without cancelling store subscription.
- JSON/CSV and onboarding uploads require Save/Discard confirmation and local-only import; unsupported backed-up groups remain preview-only.
- Not complete: linked transaction revisions/reversals, loans, obligations, allocations, schedules, attachments, owner-pref isolation, encrypted device storage, multi-device concurrency and real signed-device QA. Do not merge as full offline support.
- Engineering evidence: docs/engineering/updates/2026-11-08-offline-online-reconciliation-design.md; GitHub exact-head CI and Vercel Sandbox QA required.

### 2026-11-08 — Interrupted-upload reconciliation idempotency
- Hardened three-way sync to recognize an already committed offline row after the network response was lost, comparing stable financial fields rather than remote-created timestamps/default values.
- Same-ID rows with different amount, account, transfer, merchant or meaningful transaction data remain unresolved conflicts. No duplicate second upload and no silent last-write-wins.
- Updated transport verification to use the same audited financial-field comparison as the pure planner; CI regression adds 3 retry/corruption cases.
- Exact candidate Vercel Sandbox tree tests: 55/55 in 8 suites plus TypeScript passed; production merge remains blocked by broader accounting/multi-device/signed-device privacy requirements.
- Engineering evidence: docs/engineering/updates/2026-11-08-offline-online-reconciliation-design.md.


### 2026-11-09 — PR #246 cloud/offline guard (still draft)
Required financial cloud reads now fail closed rather than silently returning empty records, and Cloud Sync off requires a last-confirmed matching device workspace. See `docs/engineering/updates/2026-11-09-offline-snapshot-read-and-handoff-guard.md`. Incomplete domain coverage, non-atomic cloud snapshots and signed-device verification remain blockers; no production release authorized.


### 2026-11-09 — PR #246 translation catalog release gate
Regenerated 11 language catalogs (2,543 keys each) and catalog version with exact byte-for-byte SHA parity to Vercel Sandbox. Restores release-gate coverage for the three sync reconnect strings and the 67 inherited local-mode/import strings. See the 2026-11-09 sync guard evidence; full new-head CI and device QA remain mandatory.


### 2026-11-09 — PR #245 localization CI repair
Regenerated all 11 locale catalogs + version from branch source (2,540 strings). Focused i18n (2) and import/plan/walkthrough (15) tests pass in Vercel Sandbox. Exact new-head CI and device verification still required; PR #246 remains separate draft synchronization work. See `docs/engineering/updates/2026-11-09-pr245-localization-gate.md`.

### 2026-11-09 — PR #246 network-loss guard
A second network-offline transition now checks the last confirmed owner-scoped baseline rather than overwriting it with UI rows. Dirty local journals restore device mode; stale views show the last confirmed local copy; missing/unsafe caches block local editing and pause paid UI. Focused regression and exact-head verification required; release remains blocked.

**2026-11-09 — PR #248 Apple SDK & native simulator validation:** Consolidated Siri App Intents expense-review flow, native Keychain bridge, authenticated cloud-load guard, verified StoreKit/Google Play environment names, and simulator-install/deep-link test workflow. Native Xcode Simulator compile succeeded on run #119; additional simulator smoke test pending exact-head result. The simulator stage was time-bounded to fail diagnostically instead of hang. The PR remains draft until true native smoke, full CI, and real-device verification are green. Details: `docs/engineering/updates/2026-11-09-apple-sdk-native-build-ci.md` and `docs/APPLE_SDK_INTEGRATION.md`.


**2026-11-09 simulator CI correction:** Exact-head iOS run #122 failed in the macOS runner's first-boot CoreSimulator migration (`com.apple.locationd.migrator`), with `simctl bootstatus` exceeding 180 seconds; all Xcode compilation had passed. The workflow allows a bounded 600-second boot initialization for cold runners, retaining installation/launch timeouts and a mandatory smoke-test pass. See the engineering update; exact-head rerun remains required.

## 2026-11-06 — Native session vault and mobile safety PR
- Branch security/native-auth-backup-privacy-20261106, base main 9c423c7. Open UI PR #225 preserved. Release NOT CERTIFIED.
- Native Supabase sessions migrated to iOS Keychain/AndroidKeyStore vaults; legacy session and PKCE verifier copies purged only after successful secure storage.
- Android backup and device transfer disabled, privacy screenshots restricted, iOS switcher snapshot cover; Android R8 and native CI added. Public security.txt.
- Source and tests: 17 focused tests passed initially. Require full suite, production build and Apple/Android simulator compile before merging. Signed physical device tests remain mandatory for app stores.
- Not addressed: web cookie sessions, passwordless MFA/passkeys, verified deep links, app attestation, 12 privileged-RPC cross-user tests, login alerts, active device controls and comprehensive rate limiting.
- Detailed dated update: docs/engineering/updates/2026-11-06-native-session-hardening.md. Full 22-control matrix: docs/security/SECURITY_HARDENING_22_POINT_2026-11-06.md.

- PR #227 Android CI first attempt stopped before compilation in android-actions/setup-android@v3 because sdkmanager rejected obsolete package 'tools'. Removed the action and used the preinstalled ubuntu-latest SDK command-line tools with explicit API 36 packages. Native compilation still needs a passing rerun; this follow-up modifies the workflow and same-commit docs only.

- PR #227 second Android CI attempt found sdkmanager present under the hosted Android SDK but absent from PATH. The workflow now discovers its absolute executable location under ANDROID_HOME/cmdline-tools, rather than assuming PATH. Compiling the app remains a separate verification step.

- PR #227 follow-up: automation device secret had remained embedded in native general preferences; now stored only in the platform vault after write-first migration, scrubbed from mirrored preferences, and safely rotated before old-token revocation. Native/browser behavior covered by additional unit and source contract tests. Native CI and physical-device validation still required.

### 2026-11-09 — PR #255 iOS simulator smoke reliability (strict)
- Run #42546337168: native simulator Xcode build passed, while CoreSimulator first-boot migrations took 7+ minutes and `simctl launch` timed out after 90 s; the smoke test, not the compilation, failed.
- iOS CI now exercises a separately unit-tested launch script: deterministic iPhone choice, bounded 600 s cold boot, 180 s install/launch, exactly one retry **only** for launch timeouts after cold boot, and mandatory deep-link plus screenshot success. Nonzero launch errors and repeat timeouts remain hard failures.
- Local/Vercel Sandbox Python unit tests are NOT evidence of native simulator success. Await exact-head GitHub macOS runner smoke and full regression gate before merging. See `docs/engineering/updates/2026-11-09-pr255-ios-simulator-launch.md`.

## 2026-11-09 — Mobile subscription integrity

Implemented production-only Apple/Google verification, pinned Apple trust root, strict OIDC/schema validation, fenced atomic state transitions, revocation tombstones, event deduplication, predecessor cleanup and encrypted server-acknowledgment retries. Includes a source-level hostile audit, deployable SQL, setup changes and regression tests. Vercel Sandbox: integrated build/typecheck and 170 suites/1,036 tests passed; final focused 33 tests passed; PostgreSQL behavioral and separate-connection concurrency tests passed; mobile browser render smoke passed. Migration and three new server settings are required before deployment; no production migration performed. See `docs/engineering/updates/2026-11-09-mobile-iap-hostile-audit.md`.

- PR #260 integration with PR #258: 173 suites / 1,063 tests, typecheck and build passed in Vercel Sandbox. Atomic referral awards/refund reversals and points-to-Pro plan access passed PostgreSQL regressions. The GitHub source tree matches the tested Sandbox tree. No production changes.


## 2026-11-10 — Google Play Android OAuth release audit (PR #266)
- Registered restricted browser-resolvable Android `movo://auth-callback` and `movo://log` native intent filters to match existing Supabase PKCE and log handlers; no extra permissions or broad catch-all schemes.
- Added Android manifest deep-link and backup regression tests.
- Aligned historical store setup documentation with live Pro/Pro+ four-product catalogue, without changing checkout or subscriptions.
- Vercel Sandbox on unchanged production base SHA plus these files: 185 Jest suites / 1,123 tests passed, typecheck/optimized build passed; XML parser passed; production dependency advisory count zero. Browser smoke at phone and desktop widths: HTTP 200, no JS exceptions or horizontal overflow. This does not certify native Android device behavior.
- Full evidence and pending *NO-GO* gates: `docs/audits/2026-11-10-google-play-release-audit.md` and `docs/engineering/updates/2026-11-10-google-play-native-oauth-release-audit.md`.
- PR #264 signed AAB pipeline remains separately reviewed; cannot publish without signing secrets/real device testing. PR #261 hybrid sync remains draft. Production unchanged.


## 2026-11-11 — PR #272 iOS release pipeline hardening (not yet App Store certified)
- Keep the existing React/Capacitor/Swift architecture, product screens, financial calculations, sync/RLS and StoreKit production entitlement verification unchanged.
- Expand GitHub macOS iOS CI trigger coverage to all app/auth/billing/backend changes; compile the unsigned Release iPhone target alongside simulator Debug and deep-link smoke.
- Add source packaging assertions with five negative-regression tests for the canonical bundle ID, strict local bundled web assets, positive build versions, native privacy permissions, secure post-verification StoreKit finishing, actual opaque 1024px RGB App Store icon, and deterministic signed TestFlight CI configuration.
- Codemagic TestFlight uses npm lockfile verification and Xcode 26+ preflight, with existing App Store signing integration unchanged.
- No owner Apple credentials or signed distribution IPA are verified here; production DB still rejects sandbox entitlements, Vercel Sandbox access returns 402, and real-device TestFlight purchase/login/privacy acceptance is a NO-GO gate.
- Detailed source and release evidence: `docs/engineering/updates/2026-11-11-ios-release-safety-gates.md`.

- PR #272 macOS CI first attempt caught a release-contract matcher that recognized unpinned `npm ci` but not the explicitly pinned `npx npm@11.19.1 ci`; corrected the check and its negative test without weakening the lockfile requirement. Codemagic avoids re-running the same tests in the web build stage. Exact-head native and full CI rerun required.

- Follow-up iOS guard source check: ensured the pinned `npm@11.19.1 ci` regular expression uses actual JavaScript regex word boundaries rather than escaped literals. Verify via the next exact-head macOS build; no release approved before successful CI.

## 2026-11-12 — PR #275: Bank and linked-card transactions; e-wallet cards
- Bank Accounts → Account details now displays a read-only combined transaction history for the bank and all active explicitly linked debit and issuing-bank credit cards, with Bank-only and individual-card filters. A transaction involving both sides of the group appears once; each card's standalone history stays isolated. Transactions tab pages through full history at 50 rows per page.
- Wallet → Cards includes e-wallets in the existing carousel and My Cards pile while keeping their independent E-Wallets filter, type, balances, QR codes, and sync state. No database, accounting, or RLS migrations.
- Added source-isolation, transfer dedupe, per-card history, 65-row pagination, and filter tests. Added seven new UI labels translated in all 11 supported non-English languages.
- Initial GitHub suite: 195/196 suites passed; i18n key coverage was the one failure and has since been fixed; await exact-head verification. Vercel Sandbox returned HTTP 402 payment_required for create/resume: UI test blocked. Release stays unmerged. Details: docs/engineering/updates/2026-11-12-bank-card-activity-ewallet-cards.md.

- **2026-11-12 PR #275 CI infrastructure hardening:** GitHub's two-user PostgreSQL tenant-isolation workflow failed *before executing any SQL* because Ubuntu's apt mirror DNS failed during `postgresql-client` installation. Replaced network-dependent apt installs with short-lived, stdin-safe `psql`, `createdb`, and `dropdb` wrappers that execute the official PostgreSQL 18 client binaries inside the same disposable GitHub Actions service container (no host-mapped database port). The Python tenant-isolation tests remain unchanged and must still complete successfully. Source, shell invocation/STDIN forwarding validated before commit; rerun all required checks on the new exact head, verify preview and preserve NO-MERGE gate until all checks are green.

## 2026-11-12 — Node.js 26 LTS runtime alignment (new PR)
- Baseline `2b9a1cf7720043c48c20d37d6f64e45e9f5e272a` (main and live production); Vercel already uses Node 26.x, while six Node-based GitHub workflows had seven Node 22 setup steps.
- Feature branch: `chore/node26-lts-ci-20261112`. Root `.nvmrc` and package engine pin Node 26, and every Node setup step now sources `.nvmrc`; Phase 1 validates the major. Dependencies, DB, mobile signing and production remain unchanged.
- Exact-head Phase 1, Android native/R8, disposable Play AAB, iOS simulator, IAP and hybrid-sync security, PostgreSQL finance isolation, and Vercel preview are required before merge. No release or merge authorized.
- Dated plan/evidence: `docs/engineering/updates/2026-11-12-node26-runtime-ci.md`. Vercel Sandbox returned HTTP 402; test through available CI and preview.

## 2026-11-13 — iOS simulator timeout mitigation for Node 26 PR #288
- Both iOS runner attempts at `7af5cb32641c096d00fe6240b779b983821df7dd` passed compilation, install, app launch and deep-link delivery but timed out capturing a CoreSimulator screenshot; the CoreSimulator diagnostic command also timed out.
- Improve the CI harness by choosing the newest available iOS runtime and adding a bounded, timeout-only screenshot retry. Persistent and non-timeout failures still fail CI.
- Five new host-independent test cases; detailed evidence, scope, and NO-MERGE gates in `docs/engineering/updates/2026-11-13-ios-runner-smoke-hardening.md`.
- No changes to production, main, application logic, database, billing or signing. All new-head CI and Vercel preview checks required.

## 2026-11-14 — PR #300 receipt scanning structured review (precommit record)

- Isolated branch `feat/receipt-itemized-scan-20261114`, exact base `5b616ce88e640ee867418db66b4da90ac438f5a0`; no production/main, database, billing or release modification.
- User's McDonald's receipt manually verified: purchase ₱159.00, cash tendered ₱500.00, change ₱341.00, VATable ₱141.96, VAT included ₱17.04, date 2026-11-14 02:41:33. Full image is not committed.
- Added deterministic parsed amount/item components/discount/VAT/payment details with editable scanner review, automatic note prefill and safe missing-total fail-closed behavior; preserve local OCR and existing transaction validation.
- Early CI on initial multi-commit prototype: financial tenant isolation PASSED; Phase 1 FAILED **only** on the preexisting per-commit documentation guard because individual implementation commits omitted these two progress files. Conserve the initial documented planning commit and consolidate prototype into one code commit that touches both required documents.
- Required next checks: rerun GitHub Phase 1, finance isolation, iOS, Vercel preview, compare exact head and test real iPhone/Android receipt capture before merge. Leave PR open.

## 2026-11-14 — PR #300 localization verification repair (documented before commit)

- Exact head `7904a6bb773a` passed the per-commit documentation guard and financial isolation. Phase 1 failed on `src/lib/i18n.test.js`: ten new labels were missing from the 11-language catalogue (source review uncovered additional dynamic warning strings).
- Add translations for all ten static labels plus three dynamic warning messages. No scanner amounts, accounting logic, data contracts, native permissions or production behavior changes beyond localized copy.
- Pending: rerun Phase 1, typecheck/build, iOS, Vercel preview and hardware acceptance; keep this PR open.

## 2026-11-14 — AI receipt vision backend PR (documented before commit)

- Baseline main `c8bd8191475c280c9316fefb1ace9dc363c77eb1`. Add signed-in, Pro-gated AI receipt image/text parser using existing server-only OpenRouter production key with strict input size, origin and consent gates. No receipt contents/images retained at MOVO server; provider retention remains subject to its policy. New client and UI follow separately. PR not merged, no production change.

## 2026-11-14 — AI receipt capture transport (before commit)

- AI client converts permitted 15MB-or-smaller receipt photos to bounded JPEG, or reads PDF text locally. Sends only the selected receipt after explicit consent from scanner UI; bearer session required. API key remains server-only. No production configuration changes. Full UI/direct save still in progress.

## 2026-11-14 — Direct receipt log UI (documented before commit)

- Added AI consent and review UX, category and item summaries, account picker for registered bank/card/e-wallet/cash/other and direct Log/Discard. Reuses the existing validated financial writer (without opening the calculator). Added explicit response status and duplicate refusal handling; no auto persistence of AI scan photo/text. Preview and device acceptance pending.

## 2026-11-14 — Receipt AI review UI and test coverage (before commit)

- Responsive, no-gradient review and account picker UI, item-category editing, privacy-capped AI extraction security tests. No production/main/deployment modification.

## 2026-11-14 — Privacy disclosure update for consented remote receipt analysis (documented before commit)

- Added an AI receipt privacy section to the in-app and public canonical English disclosures: explicit opt-in, OpenRouter/model-provider processing, cross-border/privacy caveats, no raw photo logs at MOVO proxy, logged-record retention rules, review responsibilities. Bumped Privacy effective date to Nov 14 and legal acceptance version. Kept Terms date unchanged. No production deploy or provider configuration changes.

## 2026-11-14 — PR #301 Phase 1 locale gate repair (documented before commit)

- Initial exact-head CI reached localization and failed on 11 new receipt UI labels. Added full 11-language dictionary plus localized consent/review controls. This change does not alter ledger, API request or auth behavior. Financial tenant-isolation already passed; rerun required.

## 2026-11-14 — PR #301 full Jest verification repair (documented before commit)

- Exact `306c4b1d190c` passed 227/229 suites (1,377/1,380 tests). Failures: a stale Privacy Policy date assertion (Nov 12 versus correctly updated Nov 14), and two mocked AI API tests returning HTTP 503 because the jsdom AbortSignal shim omits `AbortSignal.timeout`.
- Fix assertion and use the native timeout when available (Node 26 production), with a test-runtime-compatible signal fallback; no server key, user data, or ledger logic changed. Rerun full CI, native and preview before merge.

## 2026-11-14 — Scanner direct Log/Discard integration tests (documented before commit)

- Added focused DOM tests: consented analyze, choose a registered e-wallet, Log once directly with VAT/change retained as details; Discard never writes; failed write keeps review open. Requires exact-head CI. No production or store change.

## 2026-11-13 — P0 Google Play license-test isolation
- Documented design first on isolated `fix/google-play-test-purchase-isolation-20261113` from `5b616ce` in `docs/engineering/updates/2026-11-13-google-play-test-purchase-p0.md`.
- Google-verified `testPurchase` classification; server allowlist gates sandbox RPC and plan access, with no production paid referral credit. Unknown-owner test RTDN never mints an entitlement.
- Includes synthetic Jest and disposable PostgreSQL billing tests. No production migration, deployment, main edit, store upload or merge.
- Exact-head CI, Vercel preview, Android signed internal build, and purchase/acknowledgement/restore/cancellation/revocation on Play license-test accounts remain gates.

## 2026-11-13 — Fix first disposable IAP assertion without weakening entitlement isolation
- First PR #297 IAP CI run #43355492063 failed a test that mistakenly assumed no store source after sandbox allowlist removal; a distinct legitimate synthetic production receipt still existed.
- Correct only the synthetic sandbox tier assertion: pro_plus while test allowlisted, production pro after allowlist removal. Security migration and runtime guards unchanged.
- Progress and failure diagnosis were documented before this code commit in docs/engineering/updates/2026-11-13-google-play-sandbox-ci-diagnosis.md.

## 2026-11-13 — Cross-PR integration test for MOVO P0 login and Play lifecycle
- Planning document committed BEFORE code: `docs/engineering/updates/2026-11-13-movo-p0-integrated-gates.md`.
- Integrated PR #295 Android Google PKCE callback and native-storage diagnostics, PR #296 cancellation-through-expiry and PR #297 allowlisted, server-verified Google Play sandbox test receipts into isolated branch `integration/movo-p0-android-play-20261113` on main `5b616ce`.
- Shared Google verifier and tests reconciled to cover *both* testPurchase and CANCELED with future/past expiry. No provider, keys, production settings or migrations applied. Signed device and Google Play purchase evidence remains manual.
- Exact-head Phase 1, Android, iOS, finance, IAP, referral, and Vercel preview all required. No merge, deploy or Play release.

## 2026-11-13 — Combined MOVO P0 cross-PR follow-up: precise Play offer + iOS simulator recovery
- Prior progress plan: `docs/engineering/updates/2026-11-13-movo-p0-followup-ios-offer.md` committed **before** this code change.
- Integrated reviewed PR #299 exact displayed Google Play offer token selection and strict base-plan match, plus PR #295 screenshot-stall cold recovery without bypassing a real screenshot or native restart.
- Preserve original P0 OAuth + cancellation + license-test sandbox scopes, tenant isolation, strict Google verification and encrypted acknowledgement.
- Exact-head Phase 1, Android, iOS, finance, IAP, referral and Vercel preview must rerun. Do not merge, publish signed AAB, alter live env or apply migrations.

## 2026-11-13 — PR #298 iOS CoreSimulator openurl timeout (exact-head failure)
- At `4c7bb464`, iOS run #43359864159 compiled Debug/Release, installed and launched iPhone Simulator, but `simctl openurl movo://log` and subsequent simulator diagnostics timed out. The native smoke gate remained RED.
- Isolated fix planned and committed first in `docs/engineering/updates/2026-11-13-p0-ios-openurl-timeout.md`; exact-head one-job rerun requested before remediation.
- Add **timeout-only, one-time** disposable CoreSimulator cold restart, reinstall, re-launch and deep-link replay; any second timeout, non-timeout error or reboot/install failure remains RED. Screenshot remains mandatory. Unit tests verify all success/failure branches.
- Vercel exact-head preview READY and served root HTTP 200; its billing config `enabled:false` is an intentionally fail-closed preview environment state, with sensitive provider secrets production-scoped. Do not expose secrets to preview.
- No deployment, production mutation, merge, signed AAB, store upload or live Supabase migration.

## 2026-11-14 — Android sign-in physical acceptance bridge (PR #298)
- Report: Google and email sign-in still fail in the Android Play app. Previous OAuth repair is unmerged/unreleased; existing automated success does not prove installed-device success. MOVO active public key matches the build-time file; 24h Auth logs show PKCE callbacks but not email OTP requests. Full diagnosis documented **before code** in `docs/engineering/updates/2026-11-14-android-auth-device-test-bridge.md`.
- Add a separate, debug-signed `com.nasrinai.movo.authcheck` artifact on PR Android CI so a tester can exercise the current OAuth/OTP code without overwriting the Play app or accessing protected signing secrets. No merge, Play upload, migration or production change. Device acceptance is outstanding.


## 2026-11-14 — Reconcile latest main into isolated PR #298 (pre-commit review)
- Main `86873236e62c` introduced receipt-scanning code and appended its progress log since base `5b616ce88e64`. Compared the complete path sets before integration: **only** `docs/PR_PROGRESS.md` overlaps; both sides append to the same common baseline without editing earlier lines.
- Create a two-parent reconciliation commit on PR branch; use the exact **main tree** as base, replay only the 26 non-overlapping changed files from isolated PR #298 as their original Git blob hashes, and concatenate the branch progress suffix to the latest main progress. No application code from main is overwritten; no changes to main itself, production, store uploads or Supabase.
- This unlocks the branch's PR CI and test-only Android APK artifact. Re-run all exact-head gates; remaining live device and Play license tests must not be waived.


## 2026-11-14 — Android native login secure-store cleanup hardening
- Owner received the generic Android `Secure sign-in storage is unavailable` error. Documented the reproducible redundant legacy-delete code path and remaining unknown root-cause possibilities in `docs/engineering/updates/2026-11-14-android-auth-storage-cleanup-p0.md` **before changing app code**.
- Native auth adapter now avoids unnecessary `Preferences.remove` if a key is confirmed absent, while still deleting and verifying actual legacy plaintext, failing closed on unreadable/undeletable older copies, and keeping the encrypted Keystore session intact. Supabase PKCE, financial data and native plugin ownership unchanged.
- Android user errors gain static `ST-*` reason codes without ever printing raw exceptions, keys, tokens or provider state. Added cleanup and diagnosis regressions.
- New exact-head CI, Android test APK, iOS simulator, Vercel preview and physical Android acceptance are required. No merge, production deploy, store upload or migration.

- Security hardening follow-up before acceptance: require Capacitor Preferences `{ value: null }` as explicit proof of absence and reject malformed/undefined read responses; never silently treat bridge failure as an empty legacy store. Two fail-closed tests added. The diagnostic and sign-in tests remain device-gated.


## 2026-11-14 — Android ST-KEY Supabase PKCE per-flow vault compatibility (isolated PR)
- **Pre-commit audit:** `@supabase/auth-js@2.119.0` adds pending-flow index and per-flow verifier keys beyond MOVO's older JavaScript secure-auth allowlist; existing native iOS/Android vaults already accept these under 128 characters. Old adapter rejects the newer names and raises `ST-KEY` before native encryption, a reproducible source-level defect; physical device cause not yet proven.
- Narrow JavaScript allowlist and unit regressions only; no token/key logging, plaintext fallback, keystore reset, account-data deletion, native signing edits, or server configuration changes.
- Local Python contract verification: 11 formats passed. Require exact-head CI, Android/iOS native builds, Vercel preview and physical Android Google/email login/session acceptance. **NO MERGE / NO STORE RELEASE until human device evidence.**
- Full engineering record: `docs/engineering/updates/2026-11-14-supabase-pkce-st-key-allowlist.md`.


## 2026-11-14 — PR #302 ST-KEY recurrence: safe diagnostic split (pre-commit)
- Owner continues to see `ST-KEY` on Android despite the first PR #302 APK. Inspected bundled `@supabase/auth-js@2.119.0` flow storage key factories; all five expected key formats match current adapter including 64-character flow ids. Widening the native allowlist is not justified.
- Split **only** existing fixed storage diagnostic labels into `ST-KEY-NAME`, `ST-KEY-VALUE`, `ST-KEY-CONTEXT` and test no raw native messages or secrets reach the UI. No auth/session/storage changes; still fails closed. See `docs/engineering/updates/2026-11-14-android-st-key-recurrence.md`.
- Prior exact head: Android, Phase 1 and tenant isolation passed, Vercel preview READY; iOS simulator smoke failed due to CoreSimulator screenshot/shutdown timeout after successful native builds. New exact-head CI and physical Android acceptance required. NO MERGE or store upload.


## 2026-11-14 — Android Google OAuth return: same-owner navigation and safe callback diagnostics (isolated PR)
- Owner reports OTP working but Google account selection not completing visible login in `com.nasrinai.movo.authcheck`. PR #302 was already merged into main at the read-only audit; new work isolated from main at `775b69378e4941a51a7bf134a491d45652c2565a`.
- Live Supabase Android-browser authorization and callback redirects (HTTP 302), and one token HTTP 200 were observed, without proof of which installed package received the callback. The same-owner `applySession` early return reproducibly bypasses Sign In → Home navigation after successful session state. Repair navigation before identity fast path without changing owner finance reloads; add fixed `OA-*` callback error labels and tests.
- The Play and test APKs still share the `movo://auth-callback` deep link, a separate real-device acceptance risk; no Supabase redirect or production changes authorized. Record: `docs/engineering/updates/2026-11-14-android-google-oauth-return-same-owner.md`.
- Require exact-head mobile/CI/preview and physical Android Google callback, OTP/session and tenant isolation evidence. **NO MERGE, NO STORE UPLOAD, NO PRODUCTION CHANGE.**


## 2026-11-15 — Android OAuth debug/Play callback collision (documented before implementation)
- Read-only Supabase logs at 2026-11-14 22:50 UTC show Android authorization and provider callback 302, with no same-bucket token exchange; sanitized authorize redirect `movo://auth-callback`. The identity of the Android recipient cannot be determined from server logs.
- Proven source ambiguity: Play `com.nasrinai.movo` and debug Auth Test `com.nasrinai.movo.authcheck` previously both handled `movo://auth-callback` despite separate Android Keystore PKCE verifiers.
- Isolated PR branch `fix/android-google-auth-callback-app-isolation-20261115` from main `c9165b51ad41c11b167e10d4d566852baa509d45`: preserve production and iOS `movo://auth-callback`; assign Auth Test `movo-authcheck://auth-callback` via Android manifest placeholder and exact Capacitor package-ID dispatch. Add OTP/OAuth and parser regression tests, Android artifact manifest checks, and fixed safe package-identity errors.
- Live settings are NOT modified. One manual prerequisite for testing: add exact `movo-authcheck://auth-callback` to Supabase Auth Redirect URLs (no wildcards, do not remove `movo://auth-callback`). See `docs/engineering/updates/2026-11-15-android-google-auth-callback-isolation.md`.
- Full CI, preview and physical Android acceptance required. This is NOT yet evidence of successful end-to-end Google sign-in; `main`, store uploads, user finances and production unchanged. **NO MERGE.**

### 2026-11-15 — PR #304 CI translation fix (documented before commit)
- Exact head `ad1bfcc16c4ff47e6e759419b183d895dc9208e9`: Phase 1 rejected a newly introduced untranslated Android-package identity error string. Preserve all 11 localization catalogues by using the already-translated existing Android Google return-link message; no auth/security logic changes.
- New exact-head Phase 1, Android, iOS, hybrid, finance and Vercel gates remain required. `main`/production unchanged.

### 2026-11-15 — PR #304 manifest regression test update (documented before commit)
- Old `androidManifestRelease.test.js` assumed `android:scheme="movo"` was hardcoded twice in source, but new secure build contract uses a placeholder for the auth callback. Retain strict security assertions: placeholder is present, production and authTest build types use **distinct exact values**, quick-log scheme remains `movo`, no wildcard/catchall/secret payload, and backups disabled.
- Native build's `aapt` manifest verification remains mandatory; this is not a test bypass. Require exact-head full CI rerun and Android real-device acceptance. No production changes.


## 2026-11-20 — PR #326 stalled emulator continuation (pre-implementation)
- Run 44620678294 completed compiler comparisons, but its emulator step remained active for over 30 minutes; the precise command is unconfirmed because live logs are unavailable.
- Preserve the explicit WebView frame/screenshot assertions, remove the newly added unbounded post-frame idle wait, bound ADB/instrumentation and the workflow step, and retain partial timeout output plus independent diagnostics.
- Every timeout remains a hard failure. New Python regressions and exact-head native CI are required; no store upload or broader release approval. See the Android R8 engineering update.
- Local validation after implementation: all 18 R8 Python tests and whitespace checks pass. Native exact-head evidence is pending; no timeout is converted into success.


## 2026-11-20 — R8 synthetic fixture startup race (pre-implementation)
- Completed run 44627570656 shows a first-run tour instead of restored synthetic settings/account after an in-app fixture write.
- Seed the fresh disposable installation's native Preferences synchronously before its first activity, refuse nonempty preferences, verify restore through the real bridge, and preserve every later acceptance assertion. Application/production storage code is unchanged.
- After implementation: 18 R8 Python tests and whitespace checks pass; native fixture compilation and paired emulator acceptance remain pending.
- PR #326 at 56b36b10 passed both emulator variants. This additional fixture repair is for PR #327 only and does not move the verified #326 head.
