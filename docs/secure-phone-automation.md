# MOVO secure phone automation

## What is implemented

- `POST /api/log` registers a device key for a signed-in MOVO user, revokes a key, or records a payment.
- Raw device keys are never stored in the database. The server stores SHA-256 hashes.
- Background logging uses a bearer device key in the HTTP Authorization header and a JSON POST body; transaction details are not put in URL query strings.
- A server-side PostgreSQL function verifies account ownership, rate-limits each device (10 successful requests/minute and 200/day), and records an idempotency event and expense atomically.
- A repeated event with the same source, amount, merchant, account/card hint and transaction minute (or same bank reference) returns the original transaction instead of inserting another.
- **Cross-source deduplication (2026-11-02, `log_automation_transaction_v2`).** One purchase reported by several channels (Apple Pay Shortcut, bank SMS/notification, Google Pay, a Siri/Android voice log, or a hand entry) is stored once. Within one person's records, with the same type, amount and currency, a request is a duplicate when: the external reference is the same (any time); or it is within 15 minutes and the merchant agrees (equal, contained, or a shared word of 4+ letters); or it is within 3 minutes and the earlier record came from a different automation channel (an Apple Pay swipe and its bank alert often name the merchant differently). Different references never merge; income never merges with expenses. A per-user advisory lock serialises concurrent requests from different devices. The in-app link path applies the same idea with `src/lib/duplicates.js` (`findDuplicate`).
- **Source attribution.** `transactions.source` stores the real channel: `applepay`, `googlepay`, `bank`, `notification`, `siri_shortcut`, `android_assistant` (plus the original `manual`, `csv_import`, …). Before migration `20261102010000` the check constraint rejected `applepay`/`googlepay`/`bank`, so every source-aware automation insert failed; this was reproduced locally and against the production constraint definition.
- **Event log.** `movo_automation_events` records each accepted request with its `source` and `outcome` (`created` or `duplicate_cross_source`) and the transaction it points to.
- The API rejects invalid amounts, malformed dates, unregistered/revoked keys, missing accounts, and ambiguous account matches.
- The token and event tables have RLS enabled and no direct privileges for `anon` or `authenticated`. The RPC is executable only by `service_role`.

## Required deployment configuration

The MOVO Vercel Production environment needs:
- `REACT_APP_SUPABASE_URL` (already used by the client) or `SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY` (already used by the client) or `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only secret; never prefix it with `REACT_APP_`)

The current Vercel project has the existing client Supabase variables and a production `SUPABASE_SERVICE_ROLE_KEY`. Do not expose or print the service-role value.

## Registration and use

1. Sign in to MOVO with cloud storage enabled.
2. Open Settings → Automatic logging and keep the sheet open until it says the device is registered.
3. Copy the generated Shortcuts prompt. It uses the device key as an Authorization bearer value, not a URL query parameter.
4. In the Apple Pay Transaction automation, use Run Immediately if offered. The Choose from Menu action still asks the user to select Log or Skip.
5. Under Log, use Get Contents of URL, POST, JSON body, and `Content-Type: application/json`. Under Skip, stop the shortcut without making a request.
6. Test with a small purchase and verify exactly one expense appears in the same MOVO account. Re-run the same transaction payload to verify idempotency.
7. Use Reset key to revoke the old server token before the app registers the replacement.

## Request contract

`POST /api/log` with `Authorization: Bearer <device-key>` and JSON:
- `amount` (required, positive number under 1,000,000,000)
- `merchant` (required, up to 160 characters)
- `card` or `account` (optional account-name/institution hint; must uniquely match unless the user has exactly one active account)
- `source` (`applepay`, `googlepay`, `bank`, `notification`, `siri_shortcut`, or `android_assistant`; anything else is stored as `notification`)
- `type` (optional `expense` (default) or `income`)
- `currency` (optional ISO code; defaults to the matched account's currency)
- `category` (optional; otherwise guessed from the merchant)
- `occurredAt` (optional ISO date)
- `reference` (optional bank/transaction reference)
- `text` (voice paths only, instead of `amount`/`merchant`): one spoken sentence such as “I spent 150 pesos on lunch using my cash”. It is parsed on the server (`api/_lib/voice.js`); unclear speech (no amount, several amounts, no description) returns `422 clarification_required` and logs nothing.

Responses: `200 { success, duplicate, matchedBy: null | "request" | "cross_source", transactionId, type, amount, currency, merchant, source, message }` (`message` is a short sentence for Siri/Android to speak), `400 invalid_transaction`, `401 device_not_registered`, `409 account_match_required | account_required | account_invalid`, `422 clarification_required`, `429 rate_limited`, `500 automation_request_failed` (no internal details).

Registration uses `action: "register"`, a Supabase user access token in the Authorization header, and the device key in the JSON body. Revocation uses `action: "revoke"` with the old device key in the Authorization bearer value; possession of that key can revoke only itself, even if the user has signed out.

## Platform limitations

- A Shortcut's Choose from Menu is interactive; it cannot be both a silent, unattended flow and a user-confirmed Log/Skip decision.
- Get Contents of URL avoids opening Safari, but iOS may still show system UI depending on the action and OS version.
- iOS does not guarantee a general App Notification automation trigger for every banking app. Only configure a bank-notification trigger if the user's iOS version actually offers it.
- Local-only MOVO accounts cannot be written by a server endpoint because their data lives only in that browser. Secure background API logging requires signed-in cloud storage.

## Reliability rules for the iPhone Shortcut (2026-11-02)

- Every `/api/log` reply carries `success` and a plain `message`, for failures too; the Shortcut shows or speaks `message` as-is, so it never reports a payment as logged unless the server stored it (or found it already stored).
- A Wallet payment without a merchant name is kept as “Apple Pay purchase” instead of being rejected.
- A per-device **default account** (Automatic logging → Default account, stored as `movo_automation_tokens.default_account_id` and re-checked for ownership on every write) is used when the Wallet card name does not match exactly one account.
- The copied prompt and the on-screen steps come from one recipe (`shortcutRecipe` in `src/lib/autoLog.js`) naming the exact actions: Format Date (ISO 8601 with time) → Get Contents of URL (POST, Authorization header, JSON body) → Get Dictionary Value `message` → Show Notification (or Speak Text for Siri). “Describe a shortcut” is generated by Apple Intelligence, so always open the generated shortcut and compare it with the steps before relying on it.

## Manual setup per platform (verify on a real device)

Nothing here has been verified on a physical iPhone or Android phone from this repository; test with one small real transaction first.

**Prerequisites:** apply migration `20261102010000_automation_sources_and_cross_source_dedup.sql`, deploy the API, sign in to MOVO with cloud storage, open Settings → Automatic logging and wait for “registered”.

**iPhone — Apple Pay (“Auto MOVO Transactions”).** Shortcuts → Automation → + → Transaction → choose cards → Run Immediately. Use the in-app *Auto log* (silent, then a notification) or *Require validation* (Log / Skip menu) prompt with “Describe a shortcut”, or build it manually: Get Contents of URL → `POST /api/log`, JSON `{ amount, merchant, card, source: "applepay", occurredAt }`, header `Authorization: Bearer <device key>`.

**iPhone — Siri voice (“Log to MOVO”).** Use the in-app *Siri voice* prompt, or manually: Dictate Text → Get Contents of URL (`POST /api/log`, JSON `{ "text": <Dictated Text>, "source": "siri_shortcut" }`) → Get Dictionary Value `message` → Speak Text. Say “Hey Siri, Log to MOVO”, then “I spent 150 pesos on lunch”.

**iPhone — bank notifications.** iOS does not offer a general “notification received” trigger for third-party apps. Where a bank sends SMS, a Message automation (sender + “contains”) can pass the message to Get Contents of URL with `source: "bank"`; otherwise log from the bank alert manually or by voice.

**Android — Google Pay / bank notifications.** Android has no built-in way to run HTTP requests on notifications; use an automation app the person trusts (for example MacroDroid or Tasker). Trigger: *Notification received* from Google Wallet (`source: "googlepay"`) or the bank app/SMS (`source: "bank"`). Extract the amount and merchant from the notification text with the app's text tools, then *HTTP request* → `POST https://<movo>/api/log`, JSON body, header `Authorization: Bearer <device key>`. For a Log / Skip flow add the app's dialog/“Option dialog” action before the request. If a bank alert repeats an Apple Pay/Google Pay purchase, MOVO stores it once.

**Android — voice (Gemini / Google Assistant).** Gemini does not run arbitrary web requests by itself. Use an automation app's assistant/voice trigger (or a home-screen shortcut with speech input) that sends `{ "text": <spoken text>, "source": "android_assistant" }` and reads back `message`. Capabilities vary by device, language and assistant rollout; confirm on the person's phone.

**Fallback (any device, no server).** A link `https://<movo>/#log?src=applepay|googlepay|bank&k=<device key>&amount=…&merchant=…&card=…` opens MOVO, which logs it (key matches and “Log without asking” is on) or shows a Log / Skip prompt. The record keeps its channel as its source and is checked against existing records with `findDuplicate`.
