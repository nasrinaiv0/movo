# iOS simulator screenshot timeout recovery — 2026-11-13

## Progress before code
- PR #295 head `b4e7747dbafacd8956e49d1c7a9a57e5a845678d` passed Phase 1/Android native/finance/Vercel, but iOS smoke failed twice.
- First simulator attempt timed out on `simctl openurl`; second succeeded in compiling, installing, launching and opening `movo://log` but timed out twice on `simctl io ... screenshot`, despite app launching.
- The screenshot is a required release artifact. **Do not make it optional or mark the smoke passed without it**. Network/provider, security and real native failures must remain red.
- Proposal: only if both screenshot attempts genuinely time out after the successful launch/deep-link, restart the same disposable CoreSimulator once, re-run app install/launch/deep-link and demand an actual screenshot. Any non-timeout error or second-recovery failure fails CI. Avoid changing any app, auth, billing, signing or production configuration.
- Add host-independent mocked subprocess tests proving the exact recovery sequence, timeout-only behavior, no false success, preserved non-timeout hard failure, and required screenshot existence.
- No merge, production deployment, Play AAB publication or iOS distribution; rerun exact-head Phase 1/iOS/Android/finance/Vercel.

## Implementation evidence
Implemented strict timeout-only, one-time cold simulator restart after two screenshot timeouts; reinstalled/ relaunched app and re-ran the deep link before requiring the final screenshot. Added four mock orchestration tests for recovery, non-timeout, repeated failure and deep-link regression. No native app auth or billing changes. Exact-head CI, iOS macOS runner and Vercel preview remain to verify.