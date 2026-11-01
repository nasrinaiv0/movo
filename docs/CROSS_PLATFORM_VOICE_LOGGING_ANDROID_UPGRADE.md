# MOVO Cross-Platform Voice Logging — Android / Google Assistant Upgrade

**Status date:** 2026-11-02  
**Repository:** `nasrinaiv0/movo`  
**Related implementation plan:** `docs/SIRI_SHORTCUT_VOICE_LOGGING_PROGRESS.md`  
**Status:** Design and integration requirements documented; Android voice logging is not yet implemented or device-tested.

## Objective

Let MOVO users log expenses and income hands-free on both iOS and Android using the voice assistant available on their device.

Examples:

- iPhone: “Siri, log to MOVO: I bought 3 pesos of banana.”
- Android: “Hey Google, log 3 pesos for banana in MOVO.”
- Alternative Android invocation: “Hey Google, open MOVO” followed by the app's voice-entry action, where supported.

**Platform terminology:** Build for the Android assistant ecosystem, including Gemini as the current mobile assistant experience and Google Assistant where it remains available. Do not assume the classic Google Assistant is available on every Android phone; Google is transitioning mobile users to Gemini, and voice features vary by device, account, language, and rollout. Official Google guidance: https://support.google.com/gemini/answer/14579631 and Android App Actions documentation: https://developer.android.com/develop/devices/assistant/overview.

## Product architecture

```text
iOS: Siri → Apple Shortcut ─────────────┐
                                        │
Android: Hey Google / Gemini →          │
supported app shortcut or app action ───┤
                                        ▼
                         Shared MOVO voice transaction API
                                        │
                          authenticate linked user/device
                                        │
                          parse natural-language request
                                        │
                         validate account + transaction
                                        │
                          idempotent Supabase RPC/write
                                        │
                         return persisted transaction result
                                        │
                    platform-specific success/failure response
```

Both platforms must use MOVO's existing transaction ledger, financial accounts, category logic, and secure server-side automation infrastructure. Do not create separate iOS and Android ledgers or put the Supabase service-role key on either device.

## Android integration strategy

### Phase A — Broadest dependable MVP

1. Provide a documented MOVO Android voice-entry action that accepts dictated text and hands it to the shared MOVO API.
2. Support launching MOVO's voice-entry flow through an Android app shortcut/deep link where appropriate.
3. Where the user's current Gemini/Google Assistant setup can invoke the action directly, enable and test that path.
4. If the assistant cannot reliably pass the utterance to the app on a particular device, gracefully open MOVO's voice-entry screen rather than claiming background logging succeeded.
5. Speak or display success only after the API confirms the transaction was persisted.

### Phase B — Native Android integration

- Inspect the current MOVO app stack before choosing the implementation: native Android, React Native, or web/PWA.
- If there is a native Android app, evaluate Android App Shortcuts and the currently supported App Actions/assistant integration for the chosen app type.
- If MOVO is currently a web app/PWA only, use Android-compatible app/deep-link or shortcut entry points supported by the deployed app; do not assume iOS Shortcuts or native Android APIs are available to a browser-only frontend.
- Verify current Google developer requirements and supported built-in intents before implementing any `shortcuts.xml` or App Actions integration. App Actions availability and supported intents are not universal, and assistant fulfillment can be dependent on relevance and platform rollout.
- Do not promise that Gemini will execute an arbitrary custom command or multi-step routine on every Android device. Treat direct natural-language invocation as a capability to validate on real devices, not as guaranteed behavior.

## Shared transaction request contract

The platform adapter should send a structured request to the MOVO backend, including:

- `utterance`: the spoken instruction (only if needed; minimize retention and avoid logging raw text).
- `request_id`: unique idempotency key for this logical operation.
- `source`: `siri_shortcut` for Siri or a dedicated `android_assistant` / `google_assistant` source for Android, after the database allowlist and UI labels are migrated.
- Optional user-selected account hint and explicit date/currency where supplied.

The trusted backend must derive the user identity from a registered, revocable device credential or an authenticated MOVO session. Never trust a client-supplied user ID. Account IDs must be resolved and ownership-checked on the server.

Suggested response states:

- `saved`: persisted and includes the transaction ID.
- `duplicate`: an idempotent retry returned the prior transaction result.
- `needs_confirmation`: amount, account, direction, date, or item is ambiguous.
- `error`: safe, actionable failure without secrets or sensitive database details.

## Voice parsing requirements

Examples that both platforms should support:

- “I bought 3 pesos of banana.” → expense, PHP 3.00, item banana.
- “I spent 150 pesos on lunch.” → expense, PHP 150.00, lunch.
- “I received 2,000 pesos from work.” → income, PHP 2,000.00, work.
- “I paid 500 pesos for electricity yesterday.” → expense with the correct Manila-local date.
- “I spent 80 pesos on a tricycle using my cash account.” → expense with account matched against the user's own active accounts.
- Filipino / Taglish phrasing should be added through explicit parser tests.
- Multiple purchases in one utterance may be supported only when each amount and item can be reliably separated; otherwise ask for clarification.

Use deterministic parsing for clear, simple requests. AI may assist with complex phrasing, but validate its structured output and never let it bypass account ownership, amount validation, source rules, or idempotency.

## Security, privacy, and correctness

- Do not embed Supabase service-role credentials in iOS Shortcuts, Android app bundles, deep links, URLs, logs, or documentation.
- Use high-entropy per-device credentials where device registration is required; store only hashes server-side and support revocation/rotation.
- Use HTTPS and least-privilege endpoint access.
- Validate positive finite amounts, supported currency, transaction type, date, and category.
- Require a valid active account owned by the authenticated user.
- Make retries idempotent so network timeouts cannot create duplicate expenses.
- Do not save guessed or ambiguous transactions without clarification.
- Never speak “saved” unless the backend confirms a persisted transaction ID.
- Avoid storing raw utterances longer than needed; redact credentials and minimize financial detail in logs.
- Maintain source separation among manual, Apple Pay, bank notifications, Siri, and Android assistant entries.

## Testing matrix

| Test area | iOS / Siri | Android / Gemini or Assistant |
|---|---|---|
| Voice captures spoken text | Required | Required |
| Launches MOVO entry action | Required | Required |
| Shared API authenticates device/user | Required | Required |
| ₱3 banana expense persists once | Required | Required |
| Income vs expense is distinguished | Required | Required |
| Account ownership is enforced | Required | Required |
| Missing/ambiguous amount asks for clarification | Required | Required |
| Retry after timeout does not duplicate | Required | Required |
| Correct platform source is stored | Required | Required |
| Spoken confirmation only after save | Required | Required |
| App unavailable / offline / expired token | Safe failure | Safe failure |
| Manila-local date and explicit past date | Required | Required |
| Existing manual, Apple Pay, and bank flows regressions | Required | Required |

Test Android on at least one current Pixel/Gemini configuration and one non-Pixel Android device if available. Record Android version, assistant provider, Google app/Gemini version, language, account type, and whether MOVO was installed. Check limitations for supervised/work accounts and language availability.

## Progress checklist

- [x] Confirm existing MOVO transaction table and secure automation infrastructure.
- [x] Document Siri Shortcut implementation plan.
- [x] Add this Android/Gemini cross-platform upgrade plan.
- [ ] Inspect the deployed MOVO app architecture and select the supported Android entry mechanism.
- [ ] Define one shared request/response contract for iOS and Android.
- [ ] Implement natural-language parsing and strict server-side validation.
- [ ] Add platform-specific transaction source values to database constraints and UI labels.
- [ ] Add parser, API, security, isolation, idempotency, and regression tests.
- [ ] Implement the iOS Shortcut against the shared contract.
- [ ] Implement the supported Android assistant/shortcut entry flow.
- [ ] Run CI, typecheck, build, preview deployment, and migration verification.
- [ ] Perform real-device end-to-end tests on iOS and Android.
- [ ] Update this document with PR/commit/check/deployment/migration/device-test evidence.

## Acceptance criteria

A user can invoke a supported voice flow on iOS or Android and say “I bought 3 pesos of banana.” MOVO creates exactly one PHP 3.00 expense in that user's existing ledger, on the correct account, with the correct platform source and Manila-local timestamp. The regular MOVO transaction history and totals reflect it. The assistant confirms only after successful persistence. If the device's assistant cannot invoke the action directly, MOVO offers a clear fallback entry flow and does not falsely claim success.

## Current limitations

This file is a design and progress artifact, not proof that Android integration is implemented. Android assistant capabilities change and vary across devices; verify the current official Google documentation and real-device behavior before choosing or claiming a particular direct invocation path. Neither Android nor iOS live end-to-end voice logging has been verified yet.
