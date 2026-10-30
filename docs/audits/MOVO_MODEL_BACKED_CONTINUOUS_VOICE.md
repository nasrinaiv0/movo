# MOVO model-backed continuous voice — implementation notes

## Scope
This change upgrades MOVO's NasrinAI chat voice mode to use the authenticated NasrinAI service for speech-to-text (STT) and text-to-speech (TTS). It is specific to MOVO and does not alter the standalone NasrinAI UI.

## Implemented in this branch
- Browser records short speech segments with MediaRecorder; an audio analyser detects a pause before submitting each segment.
- Audio is posted to the authenticated MOVO API route as a bounded base64 payload. The route verifies the user's Supabase bearer token, applies the existing consent requirement, validates MIME type and size, and forwards transient audio to NasrinAI's /v1/transcriptions endpoint using the server-only NASRINAI_API_KEY.
- The MOVO API requests NasrinAI's streamed chat mode with a fixed allowlisted voice (openai:cedar) while hands-free mode is enabled.
- The API parses NDJSON, extracts the final reply and bounded model-generated audio parts, then returns the normal MOVO reply plus those audio parts.
- The browser queues generated audio parts for automatic playback. Mic OFF stops recording and playback; sustained louder speech can interrupt TTS playback (barge-in); text chat remains unchanged.
- No audio payloads, transcripts, financial context, or secrets are written to logs by the new path.

## Security and isolation boundaries
- All STT/TTS provider calls are server-to-server; provider keys are never sent to the browser.
- STT requires the authenticated MOVO API path and the same explicit financial-context consent accepted by existing chat.
- Audio is transient and not persisted in MOVO's database by this feature.
- Chat still builds the same bounded, current-user-scoped financial context and uses the enforced context_scope: movo upstream contract.
- Payload size, MIME type, response audio-part count/size, and upstream timeouts are bounded.
- The configured NasrinAI voice endpoint must have an available TTS provider and the fixed voice must exist in its catalog. If TTS parts are absent, browser speech synthesis is used as fallback while voice mode is active.

## Verification status
- Code committed to branch feat/model-backed-continuous-voice.
- Confirmed against NasrinAI source contract: `/v1/transcriptions` accepts raw audio bytes with MIME in `Content-Type` and filename in `name`; streamed `/v1/chat` emits NDJSON `audio` events and a final `done` event. The configured voice catalog includes `openai:cedar` when the OpenAI speech engine is available.
- A source-level syntax defect in the voice request construction was corrected. The upstream response now has content-length and post-read size guards; STT filenames follow the accepted audio MIME type.
- Automated CI, browser permission behavior, mobile Safari/Chrome recording, live provider availability, end-to-end STT/TTS, interruption quality, and production behavior are still not verified.
- Do not merge or deploy until CI passes and the voice path is smoke-tested with a non-sensitive test prompt.
- Known area for QA: browser microphone echo cancellation and VAD thresholds vary by device. Barge-in uses a sustained louder-input threshold while TTS plays to reduce speaker-echo interruptions; tune it only from real-device evidence. Verify natural turn-taking on iOS Safari and Android Chrome.
