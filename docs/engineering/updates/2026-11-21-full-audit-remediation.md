# Full MOVO audit remediation — 2026-11-21

[Audit, severity, current production findings and fresh evidence](../../audits/2026-11-21-full-movo-audit.md).

Reused #330. Fixed an asynchronous backup restore crossing an account/session-generation boundary, ambiguous/missing named import accounts, inconsistent symmetric cent rounding and unsafe amounts, date rollover/defaulting, invalid/unsafe aggregate omission, compressed large-text font/icon grids, unstable desktop navigation names and the bounded ADB-root restart failure. Financial record shapes, existing account IDs, two-decimal rules, original historical records, API contracts and React/Supabase/Capacitor/UIKit architecture are preserved. CSS changes are appended; no dependency or schema change was made.

The new financial import regressions failed first (7 failures), and the paused-receipt account-switch regression independently reproduced the stale save before the guard. Guest→B, A→B and stale-action rejection now pass. Original-owner writes already committed to owner-bound storage are not moved to another account or destructively undone.

Validation: 258 suites / 1,704 tests, typecheck, 24 Node tests and 23 Python harness tests pass. Strict original-only/iOS packaging and normal web builds pass; final stylesheet reflow is verified in the final iOS-profile build/browser capture. Twenty-seven fresh isolated browser observations cover small/large/landscape layouts, 130% text, dialogs/keyboard, exact-cent expense and guest-sharing gate; real-worker outage scenarios preserve one saved record through 402/503/offline/recovery. Actual metadata/advisor inspection confirms 53 public tables with RLS; no customer rows were read and no production write occurred.

Fresh development audits: #330 29 advisories (16 high, 4 moderate, 9 low); #331 19 (9 high, 1 moderate, 9 low); production dependencies zero. Supabase still reports disabled leaked-password protection, intentional authenticated-definer warnings and informational no-policy/unused-index notices. The schedule-owner composite constraint is absent; #274's migration remains separately approval-held.

At predecessor `f2aa4587`, seven hosted workflows passed, including iOS, Android, SQL and a real non-root/read-only container smoke. Paired R8 failed at `adb root` before instrumentation. The recovery change never bypasses emulator identity, actual UID 0, firewall isolation, request deadlines or exact success markers. Fresh new-head CI must pass; prior compiler/transport/unit results are not device acceptance.

Production remains HTTP 402 DEPLOYMENT_DISABLED. Cloud Run is prepared, not activated. Encryption/erasure integration, signed upgrades, physical accessibility/audio, real sharing/auth/provider flows and store name/rights/metadata evidence remain release gates. No merge, Google resource/IAM/DNS, paid account change, production migration or store action occurred.
