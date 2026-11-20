# Voice transcription recovery and loading-screen branding — 19 November 2026

## Scope and observed failure

The owner reported an error saying voice transcription was unavailable while the composer still displayed Listening and an active red Stop control. In main `0e00fd6c9a8d3a03ce11cf8f6337e7a6d3bd4839`, transcription exceptions and MediaRecorder errors only set an error message. The microphone remained open. Fetch had no client deadline and old permission callbacks could be accepted after restarting capture. These source findings do not identify the private upstream cause of the owner's specific failed request.

The existing NasrinAI service route `/v1/transcriptions` accepts raw audio and a filename query. Unlike text chat, MOVO voice previously had no OpenRouter fallback. Read-only Vercel metadata confirms NASRINAI_API_KEY is configured in production/preview/development and OPENROUTER_API_KEY in production; values were not read or changed. Presence is not proof of valid credentials, available credits or a successful live transcription.

## Implementation

- Active transcription failure, recorder failure, interrupted tracks, backgrounding and pagehide stop recording and tracks, cancel restarts and release the audio context. Error shutdown discards the unfinished final segment instead of making another failing upload.
- Intentional Stop still transcribes captured and queued speech, including quiet iPhone clips. Typed and recognized words stay in the composer for review. Voice never auto-sends a chat or financial transaction.
- Capture generations reject old permission, recorder and transcription callbacks. A late permission result stops its own stream. Requests are abortable, have a 40-second client deadline covering authentication, blob reading and response parsing, and hold at most three pending clips in memory.
- NasrinAI remains first (20-second upstream deadline). One OpenRouter STT fallback (15 seconds) uses the existing server-only key, dedicated speech endpoint, explicit `data_collection: deny`, auto language detection and default `openai/whisper-large-v3-turbo`. An optional server-only OPENROUTER_TRANSCRIPTION_MODEL can override it. No new credentials or production settings are installed.
- The fallback sends only the selected audio clip and format, with no account, email, conversation, transaction or other finance context. No audio/transcripts/provider bodies are logged or persisted by the proxy. Provider terms and retention still apply. The existing Privacy Policy already discloses optional audio processing by transcription/voice providers and cross-border processing; no stronger retention guarantee is claimed.
- Explicit `budget_reached` responses never fall back, preserving the existing text-chat spending guard. Authentication, verified active paid entitlement, origin checks, consent, format, canonical base64 and 2.4 MB limits remain enforced before forwarding audio.
- The loading screen now displays exactly MOVO and Money Organizer & Visual Outflow. Its subtitle wraps within a 320px viewport; the animated mark, reduced-motion setting and light/dark rules remain in place. Page title and description match the brand wording.

## Sources checked

- Existing NasrinAI implementation: https://github.com/nasrinaiv0/nasrinAI/blob/main/src/routes.js and src/ai/transcription.js (read only).
- Official OpenRouter STT API: https://openrouter.ai/docs/guides/overview/multimodal/stt
- Official model and format support: https://openrouter.ai/openai/whisper-large-v3-turbo

## Verification record

- Initial Node.js 26 integrated regression run: 249 suites, 1,608 tests passed; typecheck and offline-worker/email safety prebuild checks passed.
- Initial production compile rejected a suppression for an unavailable lint rule; removed that comment. Strict CI=true production compile then passed and the offline shell bundled 229 resources.
- Independent code review found the deliberate budget-limit fallback guard and paid-plan error mapping; both were corrected before committing, with budget regression tests.
- Local Chromium browser integration passed: loading screen in light/dark at 320/390/430px without overflow, plus active STT failure releasing capture and preserving typed text, successful retry appending the recognized words, no automatic submission and zero page errors. Microphone and API responses were synthetic. Final focused tests passed 3 suites / 64 tests. Exact-head CI and hosted preview remain pending.
- All regression data and microphone/API mocks are synthetic. No customer account, audio or financial record was used or changed. Real provider transcription, real iPhone Safari/Android audio and OS interruptions remain device acceptance checks.

## Remaining device acceptance

Follow-up before committing preview acceptance: the hosted build reached READY and returns the exact new brand and offline worker (HTTP 200). Read-only MOVO_ALLOWED_ORIGINS metadata showed only the production domains, so same-origin chat POST from the unique preview URL would be rejected. Add only the server-provided exact VERCEL_URL HTTPS hostname when VERCEL_ENV is preview; production, sibling preview hosts and malformed host values stay rejected. Four boundary regressions cover this. The repeated full run passed 249 suites / 1,612 tests, typecheck, the strict production build and 229-resource offline shell; independent review found no security regression in this exact-origin addition. No origin or credential configuration is changed. OPENROUTER_API_KEY exists only in production, so live fallback acceptance still requires an operator-provided separate preview key or an approved staged deployment; synthetic tests do not claim that provider acceptance.

1. On the preview with a verified Pro session and voice consent, record a short English and Filipino/Bisaya phrase, pause and verify the words appear in the composer. Tap Send separately.
2. On iPhone, speak quietly and tap Stop; confirm the final words are retained. Repeat with silent mode and tap-to-finish.
3. Interrupt connectivity during capture; after failure verify the red Stop/Listening UI resets and the OS microphone indicator clears. Retry once connectivity returns, preserving typed words.
4. Background/return to MOVO, interrupt the microphone and navigate Home; confirm no active capture or stale words from the previous session.
5. Check the loading brand in light/dark at 320, 390 and 430px. Native OS launch assets are separate; the shared web loading screen applies after the native splash.

Keep main, production and store uploads unchanged until the established CI/preview and physical-device acceptance gates are complete. A fallback improves resilience but depends on the existing provider key, credits, compatible model and provider availability. Stopping capture on an error requires the user to tap the microphone to start again; unfinished audio is intentionally not stored or retried automatically.
