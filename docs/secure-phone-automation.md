# MOVO secure phone automation

## What is implemented

- `POST /api/log` registers a device key for a signed-in MOVO user, revokes a key, or records a payment.
- Raw device keys are never stored in the database. The server stores SHA-256 hashes.
- Background logging uses a bearer device key in the HTTP Authorization header and a JSON POST body; transaction details are not put in URL query strings.
- A server-side PostgreSQL function verifies account ownership, rate-limits each device (10 successful requests/minute and 200/day), and records an idempotency event and expense atomically.
- A repeated event with the same source, amount, merchant, account/card hint and transaction minute (or same bank reference) returns the original transaction instead of inserting another.
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
- `source` (`applepay`, `googlepay`, `bank`, or `notification`)
- `occurredAt` (optional ISO date)
- `reference` (optional bank/transaction reference)

The registration and revocation actions use `action: "register"` or `action: "revoke"`, a Supabase user access token in the Authorization header, and the device key in the JSON body.

## Platform limitations

- A Shortcut's Choose from Menu is interactive; it cannot be both a silent, unattended flow and a user-confirmed Log/Skip decision.
- Get Contents of URL avoids opening Safari, but iOS may still show system UI depending on the action and OS version.
- iOS does not guarantee a general App Notification automation trigger for every banking app. Only configure a bank-notification trigger if the user's iOS version actually offers it.
- Local-only MOVO accounts cannot be written by a server endpoint because their data lives only in that browser. Secure background API logging requires signed-in cloud storage.
