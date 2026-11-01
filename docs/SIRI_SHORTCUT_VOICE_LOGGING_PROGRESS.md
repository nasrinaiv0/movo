# MOVO Siri / iOS Shortcuts Voice Logging — Progress & Upgrade Plan

**Status date:** 2026-11-02  
**Feature:** Natural-language voice logging from Siri into MOVO  
**Related work:** PR #123, `fix/automation-source-persistence-20261101`  
**Production status:** Infrastructure exists; end-to-end Siri voice logging is **not yet verified**.

## Goal

Allow a user to say something like:

> “Siri, I bought 3 pesos of banana. Log it to MOVO.”

MOVO should parse the spoken instruction, save a transaction to the signed-in user's existing ledger, update the existing dashboard through the normal data flow, and only report success after the backend confirms the write.

## Architecture

```text
Siri → Apple Shortcut / Dictate Text → authenticated MOVO automation endpoint
    → validate request + identify linked user
    → parse/validate transaction fields
    → idempotent database write
    → return saved transaction result
    → Shortcut speaks success/failure
```

Use the existing MOVO transaction model and automation-token infrastructure. Do not create a parallel transaction ledger.

## Existing infrastructure verified

- MOVO Supabase project has `public.transactions`, `public.financial_accounts`, `public.movo_automation_tokens`, and `public.movo_automation_events`.
- Automation tokens store a SHA-256 hash, user association, active flag, label, and last-used timestamp. Raw shortcut credentials must never be stored in the database.
- Automation events have a per-token request ID uniqueness constraint to support retry safety.
- The database RPC `public.log_automation_transaction` checks that the requested account belongs to the linked user and is active, and enforces rate limits.
- The RPC is restricted to `service_role`; never expose the service-role key in an iOS Shortcut or browser bundle.
- The database transaction model currently supports `income`, `expense`, and `transfer`; `transactions.source` has a constrained allowlist.
- PR #123 addresses preserving the actual automation source and returning idempotent duplicates before rate-limit checks.

## Required implementation upgrades

### 1. Natural-language intent parsing

Support, at minimum:
- “I bought 3 pesos of banana.”
- “I spent 150 pesos on lunch.”
- “I received 2,000 pesos from work.”
- “I paid 500 pesos for electricity yesterday.”
- “I spent 80 pesos on a tricycle using my cash account.”
- Multiple transactions in one utterance, only if each item can be parsed unambiguously.

Return a structured draft with:
- `transaction_type`
- `amount`
- `currency` (default PHP only when context makes that safe)
- `merchant` / item description
- `category`
- `occurred_at`
- `account_id` (resolved only against accounts belonging to the linked user)
- `source` (for example, `siri_shortcut` once allowed by the database constraint)
- `needs_confirmation` and a human-readable clarification reason when required.

Use deterministic parsing for simple, clear statements. Use an AI parser only for complex or ambiguous language, with strict structured output validation. Do not let an AI-generated account ID or user ID bypass ownership checks.

### 2. Secure shortcut authentication

- Pair the Shortcut to one MOVO user through an authenticated setup flow.
- Generate a high-entropy device token once; store only its SHA-256 hash server-side.
- Send the raw token only over HTTPS in the documented authentication header.
- Allow revocation and rotation; inactive tokens must fail closed.
- Never put Supabase service-role credentials in Shortcuts, URLs, query strings, app source, logs, or documentation.
- Keep response and failure logs free of tokens, full utterances, and unnecessary financial details.

### 3. Validation and transaction integrity

- Reject missing, non-finite, zero, negative, or unreasonable amounts.
- Normalize Philippine peso amounts and preserve explicit currency.
- Require a valid owned account before creating a transaction.
- Ask for clarification when amount, transaction direction, account, or date is unclear.
- Use an idempotency/request ID generated for each logical operation; retries must return the original result rather than insert again.
- Keep the existing duplicate warning behavior for likely human-entered duplicates; do not silently merge two genuinely separate purchases.
- Only speak “saved” after the server confirms the persisted transaction ID.

### 4. Shortcut experience

Recommended first version:
1. User invokes the “Log to MOVO” shortcut with Siri.
2. Shortcut captures dictated text.
3. Shortcut posts text plus a unique request ID to the authenticated endpoint.
4. MOVO returns `saved`, `duplicate`, `needs_confirmation`, or a safe error.
5. Shortcut speaks an appropriate result.

The Shortcut should never claim success on a timeout or non-2xx response. On a retry, reuse the same request ID for the same pending operation.

### 5. Source tracking

Use a dedicated `siri_shortcut` source for Siri-originated transactions, distinct from `applepay`, `googlepay`, `bank`, and generic `notification` sources. Update the database source constraint and any shared source labels/tests in a migration before sending this value. Do not silently hardcode every automation transaction to `notification`.

### 6. Test plan

- Parser unit tests: simple expense, income, date phrase, Filipino phrasing, amount formats, missing amount, ambiguous direction, multiple purchases.
- API tests: missing/invalid token, revoked token, invalid payload, invalid account, unsupported currency, rate limit, safe errors.
- Database tests: user isolation, inactive account rejection, source allowlist, token hash only, request idempotency, retry after successful write, rollback on failure.
- Regression tests: existing manual/chat/receipt/Apple Pay/bank-notification transaction logging still behaves as before.
- Live device test: one low-value expense through Siri; confirm one ledger row, correct source, correct account, one automation event, and a spoken confirmation.
- Verify current PR head CI, typecheck, strict build, Vercel preview, and production migration state before declaring complete.

## Progress checklist

- [x] Identify MOVO's existing transaction schema and automation token/event tables.
- [x] Confirm the server-side database logging RPC and its service-role-only execution grant.
- [x] Identify existing PR #123 for automation source persistence/retry safety; reuse it rather than create a competing overlapping PR.
- [ ] Merge PR #123 only after all required checks pass and the owner approves.
- [ ] Inspect the current Shortcut endpoint/registration flow and align this upgrade with its actual request contract.
- [ ] Implement natural-language parsing on the trusted server side with strict schema validation.
- [ ] Add `siri_shortcut` to the source allowlist in a migration and update source labels/tests.
- [ ] Add or update tests for parser, API, database isolation, idempotency, and retry behavior.
- [ ] Configure the iOS Shortcut to call the documented endpoint and speak only confirmed outcomes.
- [ ] Apply/verify production migrations and test with the user's actual iPhone.
- [ ] Update this document with PR, commit, CI, deployment, migration, and live-test results.

## Current blockers / honesty notes

The database tables and logging RPC demonstrate that the secure automation foundation exists, but that alone does not prove Siri can create a transaction end to end. The production project previously had registered automation tokens but zero automation events at the time of PR #123's description. A live Shortcut request is still required. Do not describe the feature as fully implemented or production-verified until that test succeeds.

## Acceptance criteria

A spoken request such as “I bought 3 pesos for banana” creates exactly one `expense` record for ₱3, on the correct user's selected/default account, categorized appropriately, with the Siri source and correct Manila-local occurrence time. The normal MOVO transaction list and totals reflect it, and Siri confirms only after successful persistence. Invalid or ambiguous requests do not silently create incorrect records.
