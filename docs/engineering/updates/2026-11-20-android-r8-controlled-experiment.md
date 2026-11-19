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
