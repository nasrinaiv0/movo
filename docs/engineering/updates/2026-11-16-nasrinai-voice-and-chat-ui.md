# 2026-11-16 — NasrinAI: Listen and voice input on iPhone, and a cleaner chat screen

## Owner request
"Improve the UI here and fix the TTS/STT, it is not working during testing." The owner's iPhone screenshot showed:
- replies running under the status bar and showing through the gap between the composer and the tab bar;
- outlined reply cards;
- Listen buttons.

## Findings
- **Production:** the server is configured (`NASRINAI_API_KEY`, `NASRINAI_BASE_URL` present; names only). No NasrinAI errors appear in the runtime logs, so the failures are on the device.
- **Listen (`lib/deviceSpeech.js`)** used only the device voice, and on iPhone it could stay silent with no message:
  1. It cancelled and spoke in the same moment; WebKit drops an utterance spoken right after a cancel.
  2. Nothing asked for a playback audio session, so the silent switch muted it.
  3. When the app language has no device voice (often Filipino), iOS may say nothing.
- **Voice input** only transcribes a clip when the level meter hears speech. On iPhone the meter can read pure silence after the mic starts: the audio context ends up "interrupted", not "suspended", and only "suspended" was resumed. Clips were then discarded every 8 s, and nothing was transcribed until Stop.

## Changes
- **`lib/deviceSpeech.js`:**
  - Cancels only when something is playing, then speaks 80 ms later.
  - `pickVoice` chooses the app-language voice, then the device language, then English.
  - A watchdog retries once if speech has not started after 3.5 s, then reports it.
  - `setAudioSessionType` uses WebKit's Audio Session API (Safari and iOS 16.4+): `playback` while Listen speaks, `play-and-record` while voice mode is on, `auto` afterwards.
- **`components/NasrinAIChat.js`:**
  - Resumes any audio context that is not running after the mic starts.
  - After about 1.5 s of a perfectly flat meter, voice switches to tap-to-finish. The placeholder reads "Listening — tap the mic when you’re done"; the clip keeps recording (sent every 55 s for long dictation) and is transcribed when the mic is tapped.
  - Clearer error: "Couldn’t play the reply. Turn off silent mode or raise the volume, then try again."
- **Chat UI** (`App.css`, last block):
  - A solid backdrop behind the composer and tab bar, fading in over 24 px.
  - A short fade under the status bar (web only; the iPhone app has its own top bar).
  - Assistant replies on a soft filled card without the outline.
  - The "You" label is visually hidden (screen readers still hear it).
  - Listen is a light chip that turns accent-coloured with Stop while speaking.
  - Shortcut chips fade at the right edge.
- **Translations:** both new messages in all 11 languages.

## Validation
- Jest: new speech tests (voice choice, no cancel when idle, delayed speak after cancel, retry then report, audio session) and a chat test for the flat-meter tap-to-finish path. Full suite, `tsc`, strict build.
- Built app (sample chat history, light and dark, 430 px):
  - the last reply ends above the composer;
  - nothing shows behind the composer or tab bar;
  - no console errors.
- **Not done:** on-device testing. Speech output and microphone capture need an iPhone (browser and app).

## Remaining
- The iPhone **app** still uses WebKit's default audio session. If Listen is still silent there with the silent switch on, the next step is an `AVAudioSession` `.playback` category in `AppDelegate.swift`, which needs an iOS build and a device test.

## Rollback
Revert the commit.
