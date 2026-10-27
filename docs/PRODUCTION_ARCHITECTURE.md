# MOVO Production Architecture

**Status:** Production build plan and database foundation  
**Product:** MOVO — personal finance tracker  
**Web deployment:** Vercel  
**Primary database/auth target:** A dedicated MOVO Supabase project (must not reuse the NasrinAI project by accident)

## Product contract

MOVO is a real product, not a disposable MVP. The current Home screen is a UI foundation only: its local browser data is not authoritative financial data. Until the authenticated database integration is deployed and verified, sample balances must be visibly treated as sample data and must never be described as bank-verified balances.

## Target architecture

1. **Presentation**
   - React web application deployed on Vercel, responsive from compact iPhone widths through desktop.
   - Keep the approved five-item bottom navigation: Home, Wallet, central NasrinAI Chat, Transactions, Profile.
   - Contextual top navigation adapts by tab and provides search, notifications, and settings where relevant.
   - Design tokens support system/light/dark appearance and selectable accent themes. Respect safe areas and reduced motion.
2. **Identity and authorization**
   - Supabase Auth for email/password and supported OAuth providers.
   - Authenticated user identity comes from the validated Supabase session, never a client-provided user ID.
   - RLS on every user-owned table; no service-role key in browser code.
   - Account deletion and data export must be implemented as explicit, auditable flows.
3. **Financial data**
   - Postgres is the source of truth for authenticated records.
   - financial_accounts stores account metadata and opening balance, never full card number, CVV, PIN, password, or bank credentials.
   - transactions stores positive decimal amounts with an explicit type, currency, account, merchant, category, occurrence timestamp, source, and optional deduplication reference.
   - budgets stores user-owned category limits. Balances and aggregates are computed from opening balance plus ledger events; they are not accepted as arbitrary client-supplied totals.
   - Transfers reference two accounts owned by the same user and are distinguished from income/expenses to avoid counting a transfer as spending or income.
4. **Integration adapters**
   - Provider-independent import interface for manual entry, CSV import, and future supported bank/Open Banking APIs.
   - Ingestion must be idempotent; provider event identifiers are deduplicated and imports are validated before committing.
   - Notification parsing, where platform policy and user consent permit it, only extracts the minimum needed fields and asks the user to confirm ambiguous matches.
   - Do not claim direct access to Apple Pay's private transaction history. Apple Pay/Wallet availability depends on supported Apple APIs and provider data; use user-authorized exports or supported financial-provider APIs when available.
   - iOS does not offer a general-purpose API for silently reading arbitrary other apps' notifications. Android notification-listener functionality, if added later, requires explicit opt-in, a clear privacy explanation, and platform-compliant implementation.
5. **AI**
   - NasrinAI is an optional assistant layer. It receives only the minimum relevant transaction aggregates or user-selected records, subject to consent and retention controls.
   - AI suggestions never silently create, edit, transfer, or delete money records. The user confirms proposed changes.
   - Treat transaction descriptions and imported notification text as untrusted input; never follow instructions embedded in them.
6. **Operations**
   - GitHub Actions runs tests, security checks, and a production build for pull requests.
   - Vercel preview is checked before merge; production deployment and migrations are separate controlled steps.
   - Structured logs must avoid amounts, merchant descriptions, access tokens, and personal identifiers unless explicitly needed and safely redacted.
   - Backups, restore tests, dependency review, incident response, data retention, and privacy documentation are release gates.

## Canonical transaction semantics

- income: money received; amount is positive.
- expense: money spent; amount is positive.
- transfer: movement from one owned account to another; excluded from income/expense totals.
- occurred_at: timezone-aware event time; store in Postgres timestamptz, display in the user's selected timezone.
- currency: ISO 4217 code. Do not aggregate unlike currencies without an explicit exchange-rate policy.
- source: manual, CSV import, bank sync, notification-derived, Apple Pay/Wallet export, or other.
- Imported transactions should preserve a stable external reference when the source provides one; use a unique index to prevent duplicates.

## Required environment variables

Configure these separately in local development, Vercel Preview, and Vercel Production:

- REACT_APP_SUPABASE_URL: URL of the dedicated MOVO Supabase project.
- REACT_APP_SUPABASE_ANON_KEY: publishable/anon key for that project only. RLS remains mandatory.
- Never set a Supabase service-role key in browser-exposed REACT_APP_* variables.
- Optional provider secrets belong only in server-side functions and must never be returned to the browser.

An .env.example contains placeholders only. Never commit actual secrets.

## Delivery sequence

### Foundation (this change)
- Document the production architecture and financial data rules.
- Add the initial Postgres schema with ownership constraints, RLS policies, and useful indexes.
- Add environment-variable guidance without credentials.

### Next implementation increment
- Configure a dedicated MOVO Supabase project and apply the migration.
- Add Supabase client initialization and auth screens/session restoration.
- Replace browser-local persistence for signed-in users with RLS-protected Postgres operations.
- Keep demo mode clearly separated from real financial records; never silently migrate sample data as genuine transactions.
- Add tests for unauthenticated access, per-user isolation, duplicate imports, transfer totals, and session expiry.

### Before real users
- Complete end-to-end tests and independent RLS checks.
- Verify no secrets or raw sensitive notifications are logged.
- Implement export/delete, retention, consent, and recovery procedures.
- Complete dependency audit and accessibility/mobile browser checks.
- Verify the Vercel preview and production configuration independently.
