# MOVO ↔ NasrinAI Server Integration

## Required credential

MOVO calls NasrinAI from the server-side route at **/api/nasrinai/chat**. The Vercel environment variable **NASRINAI_API_KEY** must contain an active **server-to-server secret key** with the **chat** scope. The expected shape is:

**nss_<12 lowercase hexadecimal characters>_<48 lowercase hexadecimal characters>**

A publishable key beginning with **nsp_** is for origin-locked browser widgets and is not valid for this server-to-server route. Never place the secret in browser code, public documentation, issue comments, screenshots, or chat messages.

## Production configuration checklist

1. In the NasrinAI database, issue a new secret key for the intended active tenant with only the **chat** scope.
2. Store the returned one-time secret in the MOVO Vercel project's **Production** environment as **NASRINAI_API_KEY** using an encrypted/sensitive variable type.
3. Trigger a new production deployment so the serverless function receives the updated value.
4. Confirm that the next real MOVO chat request no longer returns upstream HTTP 401 and that the reply is rendered in the UI.
5. Once the new key is confirmed working, revoke the old MOVO-only key. Do not revoke a key before the replacement is deployed and verified.

## Safe diagnostics

MOVO logs only the upstream status, latency, and a credential-format classification (**missing**, **publishable_format**, **secret_format**, or **invalid_format**). It must never log the key, its identifier, its hash, prompts, or financial context.

- **missing**: the production environment variable was empty at runtime.
- **publishable_format**: the wrong key class was configured.
- **invalid_format**: the value does not match NasrinAI's server-secret format.
- **secret_format** with continued HTTP 401: the value may be stale, revoked, or not match the stored hash. Rotate the key and update the environment; do not paste the secret into support chat.

## Current verification

Production runtime logs on 2026-10-29 showed repeated upstream HTTP 401 responses. The environment variable exists, but its value has not been decrypted or exposed for inspection. The integration is not considered live-verified until a successful authenticated chat request is observed.

## Verification update — 2026-10-30 08:50 Asia/Manila

- Production source remains deployed at SHA `82172294f80e360af9e7043de425a454c211078c`; current `main` has advanced to `bbd3183553fde00206d65639ecbf042b20d28a67` through a documentation-only merge. The context-isolation candidate in MOVO PR #56 is still preview-only.
- Read-only Vercel environment metadata confirms a sensitive `NASRINAI_API_KEY` variable exists for Production. The value was not decrypted, copied, or logged. Presence alone does not prove validity.
- Runtime telemetry for the latest 24-hour window showed 8 upstream HTTP 401 events tagged `key_format_secret_format`, 7 additional upstream HTTP 401 events, one timeout, and one network error on `/api/nasrinai/chat`. Latest recorded 401: 2026-10-29 15:37 UTC. These are observed failures in the window; they do not establish whether a later request succeeds.
- Safe public probes against the currently deployed route: unauthenticated GET and POST return 401 `sign_in_required`; a request with foreign origin `https://evil.example` returns 403 `origin_not_allowed`. The 401 response is marked `Cache-Control: no-store, private` and `X-Robots-Tag: noindex, nofollow, noarchive`. These probes verify only basic request gating, not authenticated chat behavior.
- **Release status remains NOT LIVE-VERIFIED.** The next valid check is an authenticated chat request after an authorized rotation to a fresh active server-to-server secret with chat scope, followed by confirmation that the reply is rendered and the upstream explicitly confirms `context_scope: "movo"`. Never print or paste the secret into logs, issues, or chat.
