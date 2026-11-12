# 2026-11-12 — Cloud Sync paused panel

## Request
The owner asked to remove the red banner at the top ("Cloud Sync requires verified active access. Local records remain on this device.") and show a premium pop-up panel instead.

## Change
- `src/App.js`: the two cloud-write plan checks throw errors flagged `planRequired`. The sync `catch` opens the panel for these instead of setting the banner. Every other sync error still sets the banner as before.
- `src/components/CloudPlanNotice.js` (new): a centred sheet with the MOVO mark, a cloud badge and a soft accent glow. It reads "Cloud Sync is paused" and explains that records are safe on this device, that nothing is deleted and that sync starts again once Pro is active. **View plans** opens the existing plan offer (`cloudWrite`). **Not now** closes it.
- New pref `cloudPlanNoticeDay` (in `DEFAULTS`, synced like other prefs): the panel shows at most once a day. It never covers another sheet, the setup gate or the lock screen.
- `src/App.css`: one appended block for the panel. It uses theme tokens, so light, dark and tinted themes work.
- `src/i18n/catalog/ui-2026-11-12-cloud-plan.js`: 5 strings × 11 languages (machine-assisted, review before a commercial multilingual release).

The server-side plan enforcement is unchanged. Records still stay on the device and are not uploaded without an active plan.

## Validation
- `CloudPlanNotice.test.js`: content, no banner wording, both buttons.
- Jest: 208 suites / 1,253 tests pass. `npx tsc --noEmit` is clean. The strict CI build compiled.
- Browser check (Playwright, 430×932) against the local mock cloud with `{tier:'free', active:false}`: the panel appears and `.app-alert` is absent, in light and dark.
- Not run: real iPhone or Android devices.
