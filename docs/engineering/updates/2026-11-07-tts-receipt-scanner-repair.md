# MOVO TTS and receipt scanner repair — November 7, 2026

## Verified failure mechanisms

1. Strict production Content Security Policy allowed same-origin JavaScript and workers but omitted the narrow WebAssembly compilation permission needed by the locally bundled Tesseract engine. Adding wasm-unsafe-eval is more restrictive than arbitrary unsafe-eval and leaves other CSP directives unchanged.
2. The receipt image enhancement took the fifth and 95th percentiles of grayscale luminance. A mostly white receipt with sparse black ink yields two identical white percentiles; dividing by the almost-zero range made the entire image black and OCR returned an empty string. If percentile spread is insufficient, preserve grayscale directly.
3. createImageBitmap is not universally available for file inputs on iOS Safari. Use a revocable object URL and HTMLImageElement fallback, validate dimensions, and report failures clearly. Camera canvas-toBlob null failures now return to upload options.
4. Browser voice replies previously used one long utterance, which can stop silently in Safari. The voice HTTP proxy parsed one newline JSON format, potentially rejecting valid SSE framing.

## Changes and safety

- vercel.json: add script-src wasm-unsafe-eval, preserving no arbitrary JavaScript eval, object-src none, worker-src self/blob and all other existing security headers.
- src/lib/ocr.js and src/components/ScannerSheet.js: local-only OCR, white-receipt contrast correction, image decode fallback, recoverable camera failure. No receipt or image uploaded.
- src/lib/deviceSpeech.js and src/components/NasrinAIChat.js: segmented device speech, cancellation, device language matching, pause/resume, clear errors for manual Listen and automatic speech fallback.
- api/nasrinai/voice-stream.cjs and api/nasrinai/chat.js: accept JSON, NDJSON and SSE, with 5,000-event upper bound, 40-part/8MB base64 audio bound and media allowlist. The existing hasConfirmedMovoScope financial privacy gate remains required and fails closed. No provider keys reach the browser.
- Translated new UI error messages into all 11 supported locales.

## Validation

- Focused Jest tests cover language translation parity, sparse-ink image contrast, the voice stream parser, speech playback, and CSP.
- Vercel Sandbox: npm ci; full npm run build (prebuild Jest and typecheck, optimized CRA bundle) passed at 712 tests in 127 suites.
- Browser: Chromium 390 x 844px loading the optimized bundle with the actual production CSP, synthetic image receipt upload and scanner review/transaction prefill. Actual findings recorded in PR discussion.
- This test does not establish audio speaker hardware, true iOS Safari/native camera permissions, or upstream external speech-provider availability. Validate those separately before declaring native-device production readiness.

## Rollback and blast radius

Revert this PR; no database migration or user financial data changes. Local scan history and saved transactions are not altered. Security PR #227 and filter PR #232 remain independent.
