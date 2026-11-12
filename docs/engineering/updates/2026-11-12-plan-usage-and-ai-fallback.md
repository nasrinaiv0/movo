# 2026-11-12 — Plan & Usage opens on the current plan; OpenRouter as MOVO's fallback AI provider

## 1. Plan & Usage
**Request** (with a screen recording): opening Plan & Usage should show the current plan directly, without loading, and the sheet should be improved and made more compact.

**Cause:** `UsageSheet` started with no plan and fetched entitlements on open, so a Pro+ account saw "Free · On this device" and "Upgrade MOVO" for about 3 s. The app had already verified the plan at launch (`usePlanEntitlement` → `c.entitlement`).

**Change:**
- `src/screens/Settings.js`:
  - The sheet shows `c.entitlement` immediately. The background re-check (`syncStorePurchases` in the apps, `getStoreEntitlements` on the web) updates it quietly.
  - If the plan has not been checked yet (signed in, no verified answer), the row shows "Checking…", never "Free" or "Upgrade MOVO". If that check fails with nothing known, it shows "—" plus the existing error message.
  - Compact layout:
    - one plan row: badge, plan name, "Active until …" or "On this device", and a Cloud/Local tag;
    - usage as four tiles: Transactions, Accounts, Subscriptions, Storage;
    - one billing note;
    - Restore and Manage as text links in the apps;
    - the main button.
- `src/App.js`: passes `entitlementReady` into the screen context.
- `src/App.css`: one appended block, "Plan & Usage, compact".
- `src/i18n/catalog/ui-2026-11-12-plan-usage.js`: "Storage" in 11 languages. Other labels reuse existing translations.

**Tests:**
- `src/screens/PlanUsageSheet.test.js`:
  - Pro+ shows immediately while the re-check is still pending;
  - an unchecked plan is never "Free";
  - signed out shows Free with Upgrade.
- `App.test.js` now expects the test account's real plan (Pro+) instead of the old "Free".

## 2. OpenRouter as the fallback AI provider
**Request:** make MOVO's fallback AI provider OpenRouter, for all versions.

**Change:**
- `api/nasrinai/openrouter-fallback.cjs` (new):
  - `askOpenRouter()` calls `https://openrouter.ai/api/v1/chat/completions` with a fixed MOVO-only instruction (records are treated as data), the same bounded context NasrinAI gets (`buildContextPayload`) and the question.
  - The request sets `provider.data_collection: "deny"`, `temperature 0.3` and `max_tokens 900`. It sends no user identifier.
  - The model is `OPENROUTER_MODEL` if valid, else `openrouter/auto`. The key must look like `sk-or-…`.
  - Logs carry only a category and latency.
- `api/nasrinai/chat.js`: the NasrinAI call is now `askNasrinAI()`, which returns `{ reply }` or `{ fail }`.
  - On any failure except `budget_reached`, OpenRouter is asked. Its reply is saved and returned like a NasrinAI reply.
  - If both fail, the original NasrinAI error is returned (with `Retry-After` when given), a new empty conversation is removed and nothing is saved.
  - Chat works with only OpenRouter configured. Transcription still requires NasrinAI (it returns `transcription_unavailable` without a key).
  - The fallback has no audio, so voice mode reads the reply aloud with the device voice (`NasrinAIChat.say`).
- `.env.example`, `CLAUDE.md`: `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` added as server-only settings.

**Coverage:** web, iPhone and Android all call `/api/nasrinai/chat`. No app build is needed for the fallback; the server change covers every installed version.

**Privacy:** OpenRouter receives only what NasrinAI receives, and only after the person's existing AI consent. The Privacy Policy already covers this ("processed by NasrinAI and the AI or voice providers used to deliver that feature"), so the legal pages are unchanged.

**Tests:** `src/lib/aiFallback.test.js` runs the real route with a mocked database and providers:
- OpenRouter answers when NasrinAI fails, with no user id or email sent, `data_collection: deny`, and the turn saved;
- a good NasrinAI reply never calls OpenRouter;
- chat works with only OpenRouter;
- `budget_reached` is not bypassed;
- when both fail, the original error is returned, the conversation removed and nothing saved;
- an invalid key means no extra call.

## Follow-up: more room for the text
The owner asked to "give more space to the texts". Changes in `src/App.css` (end of file):
- More space between the plan row, the tiles and the note, inside the tiles (13px vertical), and in the note (line-height 1.6, 16px above, 18px below).
- The button bar no longer casts a fading shadow over the note.
- Tile labels wrap with `hyphens: auto` instead of an ellipsis. Below 400px wide the tiles use 2 columns.
- The plan's "Active until …" may wrap.

Checked in the browser: no truncated text at 375px and 430px, default and Largest text size, in English, German and Filipino. Labels wrap to two lines where a translation is long.

## Owner action
Add `OPENROUTER_API_KEY` (Sensitive, Production) in Vercel → movo → Settings → Environment Variables, then redeploy. Optionally set `OPENROUTER_MODEL`, for example `anthropic/claude-sonnet-4.5`; leave it empty for `openrouter/auto`. Until the key is added, MOVO behaves as before.

## Validation
- Jest: 218 suites / 1,316 tests pass. tsc is clean. The strict build compiled. The production dependency audit found 0 issues.
- Browser (Playwright, production build against the local mock cloud): Plan & Usage first paint showed Pro+ after 12–19 ms in light and dark. Screenshots were reviewed.
- Not run: real devices; a live OpenRouter request (no key configured).

## Rollback
Revert the commit. Removing `OPENROUTER_API_KEY` also turns the fallback off.
