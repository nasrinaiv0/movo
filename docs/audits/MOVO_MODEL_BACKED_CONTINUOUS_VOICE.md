# MOVO model-backed continuous voice — implementation notes

## Scope
This change upgrades MOVO's NasrinAI chat voice mode to use the authenticated NasrinAI service for speech-to-text (STT) and text-to-speech (TTS). It is specific to MOVO and does not alter the standalone NasrinAI UI.

## Implemented in this branch
- Browser records short speech segments with MediaRecorder; an audio analyser detects a pause before submitting each segment.
- Audio is posted to the authenticated MOVO API route as a bounded base64 payload. The route verifies the user's Supabase bearer token, applies the existing consent requirement, validates MIME type and size, and forwards transient audio to NasrinAI's /v1/transcriptions endpoint using the server-only NASRINAI_API_KEY.
- The MOVO API requests NasrinAI's streamed chat mode with a fixed allowlisted voice (openai:cedar) while hands-free mode is enabled.
- The API parses NDJSON, extracts the final reply and bounded model-generated audio parts, then returns the normal MOVO reply plus those audio parts.
- The browser queues generated audio parts for automatic playback. Mic OFF stops recording and playback; text chat remains unchanged.
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
- Automated CI, browser permission behavior, mobile Safari/Chrome recording, provider availability, end-to-end STT/TTS, interruption quality, and production behavior are not yet verified at the time this document was written.
- Do not merge or deploy until CI passes and the voice path is smoke-tested with a non-sensitive test prompt.
- Known area for QA: browser microphone echo cancellation and VAD thresholds vary by device; verify that assistant playback does not trigger repeated STT and that user interruption works acceptably.
