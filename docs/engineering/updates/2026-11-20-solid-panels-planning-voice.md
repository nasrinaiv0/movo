# Solid popup surfaces, consolidated planning and voice lifecycle fixes

Date: November 20, 2026 (Philippines)

## Behavior

- Menu has one Financial planning entry instead of separate Plans and Limits tiles. Financial Planning exposes one Plans & limits control before the cloud-only sections, including local/offline use and loading. It opens the existing savings-plan and spending-limit editor; Plans and Limits tabs preserve category/account/merchant limits and saved plans.
- Every shared sheet stays opaque white or dark system gray when page glass is enabled. Removed the conflicting later glass override and decorative gradient rim. Confirmation, search, tour and voice-consent panels also use solid surfaces. Dimmed backdrop blur remains separate from the panel itself.
- Plan & Usage uses readable two-column statistics, grouped price tiles, quieter elevation and an opaque sticky View plans action. Both store-management links, exact/reference price labeling and purchase authentication remain intact. Close controls are 44px; existing focus trapping, Escape, system Back, safe areas and reduced-motion behavior remain.
- TTS detaches a canceled utterance before WebKit can synchronously report interruption, waits briefly before retrying and watches later chunks as well. Pending playback is cleared on cancellation.
- STT lets MediaRecorder deliver its final asynchronous audio before releasing capture. A 1.5-second deadline releases a stalled recorder; consent withdrawal, unmount and discard release immediately and invalidate late events. Optional MIME support probing no longer prevents recording.
- Added 11 translations for all three new navigation labels and regenerated the tracked catalogs. No new processor, data retention, entitlement or purchase policy; no legal disclosure change is required by this scoped change.

## Verification

- Node.js 26.13.1: complete 251 suites / 1,636 tests passed, including accounting, sync, security, purchase and voice regressions. Typecheck, offline-worker checks and email-template safety checks passed. Strict CI production build and 229-resource offline shell passed; final CSS-only polish is compiled again before commit.
- Independent reviews found and corrected old 30px important sizing, missing catalog entries and 320px plan-row overflow. Reviewer found no remaining JS/security blocker. Claude is unavailable; no Claude review is claimed.
- Real components and synthetic data: 30 Chromium rendered checks across 320/390/430/768/1280px, light/dark, page glass enabled. Asserted opaque background, no panel gradient/blur, no page/dialog horizontal overflow, 44px close control, Menu consolidation and both editor tabs. External requests blocked; entitlements mocked. Screenshots are synthetic UI previews, not native iOS screenshots.
- Voice tests cover final audio flush, synchronous cancel interruption, later dropped chunks, pending retry cancellation, immediate cleanup on consent withdrawal/unmount, ignored late callbacks, and exact 1.5-second cleanup for a stalled encoder.
- PR #326 is a separate prerequisite. Its source at ba6d59faf96b0bbc666b2f8dfe43065e9e406f70 compiled and rendered six production views locally without page errors or horizontal overflow. Its Android/R8/iOS hosted checks must pass before merging it.
- Vercel Sandbox returned 402 payment_required. No Vercel CLI is installed. Automatic approval review rejected creating/reusing a temporary share link for the authenticated preview, so hosted interaction remains unverified. Vercel metadata shows READY at the verified SHA. Isolated source rendering was used without changing access controls.

## Device acceptance and rollout

This follow-on change is prepared for review in its own non-draft PR; it is not authorized for merge by the instruction to merge #326. No store upload or release approval.

1. In a verified Pro/Pro+ session with voice consent, tap mic, say a short English then Filipino/Bisaya phrase, pause, and verify text in the composer. Tap Send separately.
2. Speak quietly and tap Stop. Confirm the final words appear and the OS microphone indicator clears. Repeat with rapid start/stop.
3. Tap Listen for short and long responses on iPhone and Android, with silent mode on/off. Confirm all chunks play; Stop must cancel promptly.
4. Navigate away, withdraw voice consent, background or interrupt connectivity during recording. Confirm capture stops and old audio/text never appears in a later session.
5. Check solid sheets in light/dark with page glass enabled. Open Financial planning > Plans & limits; edit a synthetic plan/limit and verify it survives a local reload. Check account/merchant limits, Restore purchases and Manage subscription remain reachable.

Recommendation: validate native microphone/speaker behavior before merging this follow-on PR. Advantage: proves OS permissions, codecs and audible output that mocks cannot establish. Disadvantage: requires physical iPhone/Android testing and a verified paid test session. Provider transcription also depends on a working staged provider configuration; no production credentials were copied.
