# 2026-11-09 — Apple SDK integration, iOS simulator verification and CI repair

PR #248 (`feat/apple-sdk-foundations-20261109`) consolidates the native Apple SDK foundations into a single reviewable implementation commit accompanied by this dated engineering update and `docs/PR_PROGRESS.md`, satisfying the per-commit documentation gate without weakening CI checks.

**Scope:** Siri expense review through App Intents; iPhone deep-link review regression tests; narrow device-only Keychain bridge; Apple/Google store API environment documentation; session-driven cloud reload deduplication; updated simulator CI (unsigned Xcode build, iPhone boot/install/launch, Siri-style deep-link smoke test and screenshot). No financial record is silently written and no runtime integration credentials were committed. Store billing remains OFF.

**Verified:** Vercel Sandbox JS unit tests, TypeScript, web build passed on prior PR head; GitHub macOS Xcode 26.6 Simulator compile run #119 passed. CI #2690 documentation gate failed because earlier implementation commits lacked the required same-commit docs; the PR branch history is consolidated to comply. GitHub macOS run #120 simulator boot step remains unverified/hung at the time of assessment; timeout added to prevent indefinite hang and expose actionable failure. Revalidate the new exact-head CI before merge.

**Still blocked:** physical-device Face ID/Keychain and iPhone Siri phrase tests, production OAuth, StoreKit payment validation, account cloud synchronization after login, real WidgetKit/PassKit/BackgroundTasks targets. No production merge or deployment. For details see `docs/APPLE_SDK_INTEGRATION.md`.

**Release rule:** Never mark simulator smoke tests or App Store readiness passed without completed run evidence; never treat an unsigned simulator compile as a signed device test.


## 2026-11-09 — simulator runner boot migration failure

Run [#122](https://github.com/nasrinaiv0/movo/actions/runs/42507263975) compiled the app but failed at `xcrun simctl bootstatus` because CoreSimulator spent over 180 seconds in `com.apple.locationd.migrator` data migration. This is macOS runner initialization, not a demonstrated MOVO compile failure. Increased bootstatus timeout to 600 seconds (finite), with existing 90-second install and launch limits intact; rerun required. No app code, authentication, user records or secrets changed.
