# iOS smoke workflow trigger correction

## 2026-11-12 — iOS smoke-test path trigger correction

The existing iOS workflow PR/push path filters did not include the smoke driver or its host tests, so a standalone simulator recovery patch would not automatically rerun iOS. Added both script paths to both trigger lists. The actual macOS simulator launch/deep-link/screenshot remains mandatory, with no soft-fail. The host-side selection/recovery tests were run before commit; verify new exact-head CI following push.
