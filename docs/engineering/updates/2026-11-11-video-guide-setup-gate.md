# 2026-11-11 — Narrated video guide of the real app and setup gate

## Purpose
Owner request: improve the video tutorial with the real MOVO interface, custom sample data and the MOVO voice from
ElevenLabs; flash account deletion, disclosures, favicon use and legal terms; route to the dashboard after acceptance;
keep the bottom navigation and dashboard closed until the tutorial, walkthrough, sign-in and Terms/Privacy acceptance
are finished.

## What changed
- `public/tutorial/movo-guide.mp4` (+ `.jpg` poster): 62.2 s, 720×1560, H.264 CRF 27 + AAC 96 kb/s mono, 3.8 MB,
  −16.7 LUFS. Recorded from the production build against a local stand-in cloud with invented records for a fictional
  person (`ana@example.com`); no real data. Narration: eight clips in the owner's cloned "MOVO" voice (ElevenLabs
  eleven_v4). How to re-record: `scripts/tutorial-video/README.md`.
- `src/components/TutorialVideo.js`: full-bleed story-style player with chapters (`CHAPTERS`) for progress, translated
  captions and tap/arrow skipping; hold to pause; Play/Pause, sound and Skip. Autoplay tries sound, then falls back to
  muted with a sound button. Reduced motion: no autoplay. If the video fails to load, the previous animated scenes play.
- `src/components/SetupAgreement.js`: last setup step. It lists the points (no bank connection, logos are site icons for
  identification only, export/clear/delete any time, store billing) and links both documents. Accept needs the checkbox.
- `src/App.js`: setup gate (`setupDone`). `go()` only reaches Home, Sign in and the legal pages until setup is finished;
  bottom/side nav disabled and dimmed (`is-locked`); the iOS native dock hides while locked (`lib/nativeChrome.js`).
  Order: video → walkthrough/sign-in choice → free-month panel (needed to start the trial) → agreement → dashboard.
  The free-month panel, recent-logs popup and daily briefing wait for setup. The old post-tour logo popup is replaced
  by the agreement.
- `src/lib/legalVersion.js`: effective dates (Terms now 2026-11-11) and `LEGAL_VERSION`. Prefs `legalAccepted`
  (version) and `legalAcceptedAt` (time) sync through `user_preferences`; `prefsMerge` keeps the newest.
- Terms §17 "Accepting these terms during setup" (in-app supplement and `public/terms.html`), effective date bumped.
- i18n: 19 new strings in 11 languages (`ui-2026-11-11-setup.js`), machine-assisted.

## Tests
- `npx tsc --noEmit`: clean. Jest: 201 suites / 1,222 tests passed (new: setup gate ×5 in `App.test.js`,
  `TutorialVideo.test.js` ×9, `legalVersion.test.js`, prefs merge, native dock). Strict build: compiled successfully.
- Local browser (headless Chromium, production build, 390×844):
  - Fresh person: the video autoplayed muted; chapter skipping works with a range-capable server.
  - The nav stayed locked on the welcome, tour, free-month panel, agreement and Privacy pages.
  - Accept saved `legalAccepted: 2026-11-11`, opened Home and unlocked the nav; Wallet then opened.
  - Sign-in path: the nav stayed locked on Sign in.
  - Playwright's Chromium has no H.264 decoder, so the visual check used a VP9 copy of the same recording.
- Not run: Safari/WebKit, iOS and Android devices, and listening to the narration on a device. The video relies on range
  requests (served by Vercel and the Capacitor apps). Autoplay with sound depends on the platform; the fallback is
  muted autoplay with a sound button.

## Data, security and privacy
- No schema, RLS, grant, migration or API change. The acceptance is a preference value, synced like other preferences.
  It is not a server-side legal record.
- The recording uses invented records only. Logos in it are the curated favicons the app already shows, and both the
  video and the agreement state that they identify records only.
- The environment allowlist gained `elevenlabsusercontent.com`, `www.google.com` and `t0`–`t3.gstatic.com` for
  producing the video. No change to the app's CSP: `media-src 'self'` already covers the bundled video.

## Rollback
Revert the squash commit. Existing users will see the agreement once (their acceptance is empty or older than
2026-11-11); reverting removes the gate.

## Remaining
- Narration is English; captions follow the app language.
- People who sign in also tick the sign-in Terms checkbox, then accept the setup agreement. That is deliberate, because the
  agreement carries the disclosures, but the two could be merged if the owner prefers.
