# 2026-11-16 — MOVO guide (screenshot tour), Aries the welcoming mascot, AI receipt scan and automation

## Owner requests
- Replace the tutorial video with a walk-through on screenshots: each feature stays sharp while the rest of the screen blurs white (dark theme: dark).
- Use a clear female voice that does not come from ElevenLabs.
- Use sharp, recognisable logos in the sample data (Mang Inasal, Mercury Drug, McDonald's, Jollibee, Atome, SeaBank and others).
- Show the AI receipt scan and automatic logging.
- Improve the "MOVO Aries" mascot (cream ram, grey curled horns, green scarf) so it looks more premium, smooth and cute, and make it the welcoming mascot in the walk-through and the help pages.

## What changed
- `components/FeatureTour.js` replaces `TutorialVideo.js`. It has 20 steps on real screenshots (`public/tutorial/*-{light,dark}.webp`). The highlight positions and clip lengths are in `lib/tourManifest.json`. The panned and scaled screenshot shows a blurred, veiled copy underneath and a sharp copy clipped to the highlight. One `<audio>` element plays the clip per step. With reduced motion, and in tests, nothing plays on its own.
- New steps: **Scan receipts with AI** (the review sheet after a consented AI scan of an invented receipt; the text says it asks first and is part of Pro) and **Automatic logging** (the automation sheet, registered; the text says it is part of Pro+). The old "Sync and automation" step is now **Sync across devices**.
- Narration uses Kokoro `af_heart` (open model, Apache 2.0, generated on the machine): 20 clips, 133 s in total, at −16 LUFS. The narration is in English; captions are translated into all 11 languages.
- **Aries** (`lib/ariesArt.js`, `components/AriesMascot.js`): original vector art with seven poses (hello, home, happy, alert, scan, auto, point). It has spiral horns, a soft wool gradient, a scarf with a tail and blush, and keeps its own colours in both themes. It has no idle animation. It appears:
  - beside every guide caption, in a pose that suits the step;
  - on the first-run welcome card, in place of the MOVO mark;
  - at the top of the Help Center.
  The Home 3D ram is unchanged.
- Help Center: new sections "Where do I start?" (with an Open the MOVO guide button), "How does the AI receipt scan work?" and "How does automatic logging work?". They describe the existing behaviour: consent for each receipt, an on-device basic scan, account choice before logging, Pro and Pro+ gating, a private device key, and MOVO receiving only what the automation sends.
- Logos: merchant favicons are requested at 128 px, and McDonald's, Jollibee, KFC and Meralco use domains that serve sharper icons. Mang Inasal loyalty branding was added. All logos are still the curated Google S2 entries.
- Legal: Terms §17 now describes the guide as screenshots with invented sample records (`legalSupplement.json`, regenerated `public/terms.html`). Main has already moved both documents to 2026-11-17, so the change is published under that date and people accept once. Dates in `legalVersion.js` are main's.
- Pipeline: `scripts/tutorial-guide/` (capture, convert, narrate, manifest; see its README). The capture answers the AI scan and the automation registration with fixed replies, so no AI provider or MOVO server is called.

## Validation
- Jest (full suite), `tsc`, strict build, and the documentation gate.
- Browser check of the built app against the stand-in cloud at 430×932, in light and dark:
  - guide steps 1, 9, 11 and 20 show the correct highlight and caption with Aries;
  - narration plays and steps advance on their own;
  - the welcome card shows Aries;
  - Help Center sections are present;
  - there are no console errors.
- Not done: no listening test on a phone, and no device test on iOS or Android. Every claim in the guide and the Help Center was checked against the code: `ScannerSheet.js`, `aiReceipt.js`, `AutoLogSheet.js`, `planAccess.js` and the `/api/log` registration.

## Rollback
Revert the PR. No schema, API or preference keys changed. `tutorialSeen` is reused.
