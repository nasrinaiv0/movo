# MOVO guide (the screenshot tour)

The first-run guide (`src/components/FeatureTour.js`, replay from Settings → MOVO guide or Help Center) walks through
every part of MOVO on screenshots of the real app. Each step keeps one feature sharp inside a ring, blurs the rest of
the screen white (dark theme: dark), shows a caption beside **Aries**, MOVO's welcoming mascot, and plays a short
spoken line.

- **Sample data only.** Screenshots come from the real build running against `mockcloud.cjs`, a test-only stand-in
  for the cloud, with invented records for a fictional person ("Ana", `rec-lib.cjs`). No customer data is used.
  The AI receipt scan and the automation registration are answered with fixed replies in `capture.cjs`; no AI
  provider or MOVO server is called. The receipt photo is the invented `sample-receipt.png`.
- **Voice.** One clip per step in Kokoro's `af_heart` voice (open model, Apache 2.0, runs on the machine; not
  ElevenLabs). English narration; captions are translated (`src/i18n/catalog/ui-2026-11-16-movo-guide-*.js`).
- **Logos.** Bank, e-wallet and merchant logos are the curated Google S2 favicons the app already shows
  (`institutionFavicons.js`, `merchantFavicons.js`). The "About logos" step says they only identify records and imply
  no partnership.
- **Aries** is original vector art (`src/lib/ariesArt.js`, `src/components/AriesMascot.js`); its pose per step is
  `TOUR_POSES` in `FeatureTour.js`. It is not in the screenshots, so changing it needs no re-capture.

## Files

| File | What it does |
|---|---|
| `steps.cjs` | The steps in order: screenshot, what to highlight, caption. The caption is also what the narrator says (with product names respelled for the voice). Must match `TOUR_STEPS` in `FeatureTour.js` (a test checks). |
| `rec-lib.cjs` | Sample records and preferences; opens the app in Playwright. |
| `capture.cjs <outDir> [image…]` | Takes every screenshot in light and dark and records each highlight (`rects.json`). Exits 1 on any problem. |
| `convert.py <outDir> public/tutorial` | PNG → WebP (quality 74). |
| `narrate.py <onnx> <voices.bin> <outDir> <durations.json>` | Speaks every step, trims, normalises to −16 LUFS, mono 64 kb/s MP3, and records each clip's length. |
| `manifest.cjs <rects.json> <durations.json>` | Writes `src/lib/tourManifest.json` (highlight as fractions, clip length). |

## Re-making the guide

1. Build against the stand-in cloud:
   `REACT_APP_SUPABASE_URL=http://localhost:3312 REACT_APP_SUPABASE_ANON_KEY=mock-anon-key CI=true BUILD_PATH=/tmp/build-e2e npx react-scripts build`
2. `node scripts/tutorial-guide/mockcloud.cjs /tmp/build-e2e 3312`
3. `node scripts/tutorial-guide/capture.cjs /tmp/tour-out` and check the PNGs by eye (no error banners, nothing cut off).
4. `python convert.py /tmp/tour-out public/tutorial`
5. Voice: `pip install kokoro-onnx soundfile` and ffmpeg; model files `kokoro-v1.0.onnx` and `voices-v1.0.bin` from the
   kokoro-onnx GitHub releases (`model-files-v1.0`). `python narrate.py kokoro-v1.0.onnx voices-v1.0.bin public/tutorial /tmp/durations.json`
6. `node manifest.cjs /tmp/tour-out/rects.json /tmp/durations.json`
7. `npx react-scripts test src/components/FeatureTour` checks that every step has its pictures, highlight and clip.

When a caption changes, update `steps.cjs` and `TOUR_STEPS` together, add the translation, and re-run steps 5–6.
