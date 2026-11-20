# Android R8 controlled experiment — 20 November 2026 (PH)

## Scope and hypothesis

MOVO's signed version-code 20 handoff reports R8 optimization 84.76%, obfuscation 86.96%, shrinking 86.73%, and 1,366,480 uncompressed DEX bytes at source a3193b8361e32ea559d8350deaeb6a3e75041759. Those are historical signed-bundle values, not candidate measurements.

Only remove `-keep class com.nasrinai.movo.MovoNativePlugin { *; }`. It is subsumed by `-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }`. Retain the bridge annotation and all plugin members. Expected gain may be zero; safe functioning is more important than a perfect score.

## Controlled evidence

The workflow checks out the exact PR head, installs locked dependencies, builds one web asset set, and uses a disposable signing key. Every baseline/candidate pair uses the same source tree, dependency set, signing key, app/test configuration and compiler. Only the active keep rule differs. Baseline rules are read from the historical Git commit. SHA-256 values identify artifacts and rule content.

Default mode uses the existing AGP/R8 configuration and collects release APK+AAB, test APK, mapping/configuration reports, DEX class/reference counts and byte totals. Diagnostic mode temporarily pins R8 9.4.34 as required by the official Configuration Analyzer for AGP <9.3. It generates real keep-radius protobuf, converts/analyzes it with android/skills at c72942584fff970dac86ced78b367fce0c441e52, verifies compiler identity, then restores settings/rules in finally. Never attribute a cross-compiler delta to the keep-rule change. ZIP/signing overhead can change container bytes; report DEX separately.

## Runtime gate

Use only a disposable Google APIs AVD. The Python runner requires explicit opt-in, exactly one online emulator-* target, ro.kernel.qemu=1 and pins that serial before root, network isolation or package deletion. It never runs on a phone. The AVD is isolated from external networking via connectivity controls and IPv4/IPv6 OUTPUT rules before the application launches. No provider/store credentials, existing customer app data or production signing keys are used.

Both DEFAULT-compiler minified releases must pass cold launch, all required reflected plugin names/methods, native secure storage encrypted persistence and removal, activity recreation, a true process-stop/relaunch pair, saved offline BPI logo/card styling, and ACTION_VIEW synthetic provider-error callback reaching the real JS handler. Skips, assumption failures, crashes, absent results and timed-out assertions fail the gate. Record instrumentation logs, screenshot evidence, logcat and activity state.

The callback test proves error delivery only. It does not prove Google PKCE, email OTP, successful session restoration or any purchase/entitlement lifecycle. Those require real-device and Play-delivered license-test acceptance separately. No main merge, production deployment, database/config change or store upload is authorized by this experiment.

## Review and local checks

Independent Codex review found two defects before publication: the initial Python runner lacked a physical-device refusal and missed AndroidJUnitRunner assumption status -4. Both were fixed, with regressions covering physical/multiple/offline/unknown devices, explicit consent, serial pinning and skipped tests. Thirteen Python tests and whitespace verification pass. Claude is not available in the runtime.

Vercel Sandbox creation returned 402 payment_required; no local Vercel CLI, Android SDK or KVM is available. Native compilation/emulator/score evidence is pending GitHub execution. This document makes no statement of improved score or release readiness before those results exist.

## Promotion and rollback

Keep the experiment open and unmerged. Compare default DEX sizes and runtime evidence first; review diagnostic rule-impact scores separately. If no measurable benefit, keep the evidence and decide whether this small cleanup warrants promotion. Any failure blocks promotion. Reverting the candidate restores the one keep rule; instrumentation/workflow are opt-in test infrastructure and do not introduce application hooks or web debugging.

Follow-up review confirmed both initial fixes; binary screencap now also explicitly pins the verified emulator serial. Thirteen local Python checks still pass. Re-run all native CI on this exact update.

Each completed build also emits its metrics JSON into the job log, so measured scores, rule impact and DEX evidence remain reviewable without downloading an artifact ZIP. This does not change the compiler or runtime checks.

## First native compiler finding

Run 44585073902 at 79fd7f72 compiled the baseline release APK/AAB, then failed while minifying the separate test APK. Error Prone's compile-time IncompatibleModifiers/RequiredModifiers annotation references javax.lang.model.element.Modifier, a JDK compiler API absent from Android. Add an opt-in testProguardFiles rule for exactly that type, plus stable names for the explicitly selected test class. These are test-APK rules only; the app rule set, measurements and runtime remain unchanged. Thirteen Python checks pass; the complete controlled experiment must rerun.

## First emulator result and instrumentation fix

Run 44586272868 at 742ae42937fd built both variants and booted an API 35 emulator. The default R8 8.13.6 APK/AAB each contained 1,366,480 DEX bytes, and both DEX hashes matched. Diagnostic R8 9.4.34 produced 1,351,216 DEX bytes per variant and matching scores of 92.58% optimization, 93.44% obfuscation and 93.25% shrinking. The removed keep rule had no measurable effect. Compiler versions are evaluated separately.

The first baseline instrumentation process crashed before any MOVO test ran. AndroidJUnitRunner's AppComponentFactoryRegistry hit NoSuchMethodError in a class loaded from the minified target APK, then NoClassDefFoundError for androidx.tracing.Trace while reporting the failure. The opt-in release harness now uses Android framework Instrumentation with no AndroidX test dependencies. It requires a completed, case-specific marker and RESULT_OK for each check. Crash log excerpts are printed with failures. This does not add application keep rules or change the app under test. Re-run the paired emulator gate and confirm that each baseline and candidate assertion executes.

## Offline Wallet navigation after the harness fix

Run 44590024327 at 4eee1fb3a988 passed encrypted-storage persistence through Activity recreation. The saved synthetic profile and balance rendered on offline Home, but Wallet navigation did not complete. The old readiness predicate could accept the old Home document while WebView reload was pending. The harness now seeds the wallet in its own invocation and force-stops the app before verification, leaving the emulator offline throughout. The verifier requires the restored local account and enabled UI before clicking, and captures a minimal DOM state on timeouts. A small artifact now publishes only the emulator screenshots and diagnostics for quick failure analysis. The same rule comparison and application checks remain required.

## Maven Central rate limits

Two 44599470076 attempts at 42eb503c50f4 failed resolving pinned Gradle dependencies from Maven Central with HTTP 429. Neither reached Android compilation. This isolated workflow caches Gradle dependencies and waits 60 and 120 seconds for a confirmed Maven Central throttle, preserving both failure logs. Compiler failures and final attempts remain hard failures. Node 26 browser verification of the same offline wallet fixture passed, including the bundled BPI logo and saved silver card finish.

## Verify the Cards frame before screenshot capture

At 46e5d31cde48, both minified variants passed the emulator gate including offline Wallet and native OAuth error delivery. The two Wallet screenshots showed the Cards transition at different points. Require the selected Cards filter, check the BPI asset and saved style inside the Cards deck, and wait for the corresponding Android WebView frame before capture. The application, keep rule and measured compiler configuration are untouched.

## Bounded Android frame acceptance and failure diagnostics

Continuation on November 20: exact-head run 44620678294 finished both compiler pairs by 05:45 PH, then remained in its emulator step for over 30 minutes. In-progress logs are unavailable through the connector, so the precise blocking command is unconfirmed. The previous successful harness predates a new unbounded `waitForIdleSync` after the explicit WebView visual-state callback and next-frame latch. Remove that redundant global-idle wait while retaining the hard 10-second frame callback, selected Cards predicate, image decode/style assertions and mandatory screenshot. This addresses a plausible animation-related stall without treating an unrendered screen as success.

Before implementation: bound every ADB process (90 seconds normally, 240 seconds per instrumentation invocation), persist partial timeout output, and collect each diagnostic independently with shorter limits. Add a 25-minute ceiling to the emulator step so GitHub can still upload diagnostics after a stalled emulator. Timeouts remain failures; do not retry, skip tests or change application/R8 behavior. Add regression tests proving a timeout cannot count as success and failed diagnostics do not prevent remaining capture. Re-run native CI at the new exact head before the authorized PR #326 merge. No store upload or real OAuth/purchase claim.

Local verification after this change: 18 Python R8 tests pass, including hard ADB deadlines, partial-success output followed by timeout, and continued diagnostic capture after two independent failures. `git diff --check` passes. The application, compiler configuration, keep rules and required functional assertions are unchanged. Native compilation and emulator execution remain required at the published head; no success is inferred from these host tests. Rollback: revert this harness/deadline commit.

## Deterministic fixture before the first application mount

Run 44627570656 completed and uploaded diagnostics. Bridge vault and the old seed invocation passed, but the next process timed out waiting for its saved account; the screenshot shows the first-run tour and disabled navigation. The previous fixture wrote localStorage/Preferences after React had mounted; active application preference mirroring and asynchronous Android Preferences.apply can race that out-of-band seed. This is evidence of an unreliable synthetic setup, not proof of production record loss.

Before implementation: on the verified freshly installed disposable test app, seed only the three synthetic keys into the actual CapacitorStorage SharedPreferences with synchronous commit and round-trip assertions before starting MainActivity. Refuse nonempty preferences or a different package. Run that fixture invocation before all other app launches, then retain the independent cold launch, bridge/recreation, offline Wallet/frame/artwork/callback and separate-process vault tests. Assert the fixture is restored into localStorage by the real startup bridge. Do not change onboarding, user storage code, application hooks or accept a missing wallet as success. Exact-head compiler/emulator CI must execute again.

Host verification after the fixture change: all 18 R8 Python regressions and whitespace checks pass. The new Android fixture assertions verify a fresh preference namespace, durable commit/round trip and real startup restore; native compilation and both release variants remain pending CI. Rollback is a revert of this test-fixture commit, with no production data-format change.

Scope correction after completed evidence: PR #326 at 56b36b10 passed every baseline/candidate emulator assertion in run 44627447539. Keep that verified head unchanged. Publish this deterministic fixture repair only in follow-on PR #327, where run 44627570656 exposed the race; its application sources remain unchanged.

## PR #327 touch input for offline Wallet navigation

The original #327 head `1f242e302e87` restored the synthetic account and passed the minified bridge and Activity-recreation check in [run 44630552132](https://github.com/nasrinaiv0/movo/actions/runs/44630552132). The JavaScript callback stalled during the Wallet action. The separately failing [Android build](https://github.com/nasrinaiv0/movo/actions/runs/44630551757) was still resolving unrelated pinned Maven artifacts at the failure point. Started a GitHub retry of that failing job to check infrastructure recovery.

The test JavaScript now checks that the target is enabled and hit-testable, then reads its center. Framework instrumentation translates the point through the WebView bounds and dispatches Android touchscreen down/up events. Navigation and Cards selection are still verified separately. Missing controls, rejected input, callback/route/frame timeouts and lost offline styling continue to fail. Timeout messages identify the operation. The disposable offline emulator, synthetic fixture, both compiler variants, complete restarts and screenshots remain required.

Validation before commit: 18 Python R8 and 25 iOS orchestration tests pass. GitHub compiles and executes the Android instrumentation for the new head. The isolated workspace has no Android SDK or KVM. The change is in the opt-in test APK and introduces no production app logic, data format, dependency, provider or R8 rule change. Rollback is a revert of this test-input change. Real microphone/playback and signed store acceptance remain separate.

## PR #327 native build runner alignment

The [native build on the touch-input head](https://github.com/nasrinaiv0/movo/actions/runs/44648057066) reproduced the independent classpath resolution failure before any app compilation. Both failed native runs report Ubuntu 26.04 selected by the moving `ubuntu-latest` label. They could not resolve multiple already-pinned Maven artifacts, including Kotlin stdlib and ASM. Pin the native Android check to Ubuntu 24.04 and enable the Gradle cache as in the existing paired R8 workflow, which has passed on that image. Runner correlation supports stabilizing the workflow. The precise upstream repository or runner fault was not established.

Retain the same debug, auth-test, release and Wear build targets, transport-only retry bounds and APK/redirect checks. Dependency versions, resolution sources and artifact verification are unchanged. Verify the runner and targets in exact-head logs. Roll back by reverting the runner/config change.

The preceding touch-input commit passed Node 26.13.1 typecheck, 251 suites / 1,636 tests, strict build and 229 offline shell resources. Thirty isolated responsive cases passed. A separate touchscreen-mode Chromium test located the Wallet and Cards hit targets and verified the selected offline BPI card and silver finish after taps. These checks establish the bundled UI behavior and leave the native input dispatch to the paired emulator.

## PR #327 isolate the unrelated launcher window

The [first paired run after moving to Android input](https://github.com/nasrinaiv0/movo/actions/runs/44648685206) passed both compiler comparisons, restored the synthetic account and passed native-bridge/Activity recreation. The Wallet route remained on Home after input. The [baseline failure screenshot](https://github.com/nasrinaiv0/movo/actions/runs/44648685206/artifacts/14590990951) shows the Android dialog “Pixel Launcher isn't responding” above the known offline account and enabled Wallet control. The native build on this head passed all build variants.

After proving the single ADB target is a disposable emulator and reconnecting as root, disable and force-stop the exact Pixel Launcher package if installed for user 0. Verify the package is disabled before MOVO runs. Other packages and Android's ANR reporting remain active. The injected touch, navigation, selected Cards view, saved assets, bridge, encryption, callback, screenshot and timeout checks remain required. Host regressions verify emulator-only execution, exact-package targeting, and failure when disablement cannot be confirmed. Twenty host tests passed. Rollback is a revert of this test-runner change.
