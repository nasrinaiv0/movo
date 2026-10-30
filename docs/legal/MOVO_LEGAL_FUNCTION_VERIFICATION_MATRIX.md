# MOVO Legal, Privacy, Store-Publication & Function Verification Handoff

**Audience:** Claude implementation/audit agent  
**Repository:** `nasrinaiv0/movo`  
**Related PR:** #77 — `legal: strengthen Philippine privacy and consumer disclosures`  
**Status:** Working checklist. Legal copy is improved, but neither legal compliance nor production behavior is certified.  
**Rule:** Do not mark a control PASS based only on source-code inspection, static text, green CI, or a successful preview. Capture reproducible evidence. Do not merge or change production settings without explicit authorization.

## 1. Objective and decision rule

Turn the legal assessments into a testable implementation plan. For every item, Claude must:
1. inspect the current branch and relevant production configuration without exposing secrets;
2. trace the user-facing control through UI, client logic, API/server, database/storage, providers, logs, and deletion/retention paths as applicable;
3. write tests that prove both expected success and expected failure/denial cases;
4. implement missing behavior in a scoped branch, with migration/rollback notes when needed;
5. run targeted tests, full test suite, lint/type checks and production build where available;
6. record commit SHA, commands, result counts, test artifacts, environment (local/preview/production), and any limitations;
7. leave production-impacting changes unmerged until explicitly approved.

Status labels:
- **IMPLEMENTED + VERIFIED** — direct runtime evidence and automated regression tests exist.
- **IMPLEMENTED, NOT VERIFIED** — code exists but required runtime evidence is absent.
- **PARTIAL** — some path works but edge cases, enforcement, or disclosure are missing.
- **MISSING** — no implementation found, or test demonstrates absent behavior.
- **BLOCKED** — cannot safely verify without owner access, credentials, store-console access, legal decision, or external provider confirmation.
- **NOT APPLICABLE** — justified with evidence and a reason; do not use to avoid checking.

Every row in the audit ledger must include: ID, status, code paths, test(s), evidence link or artifact, risk, owner/action, and next step.

## 2. Baseline known from the legal-content assessment

These are starting observations, not a substitute for re-checking the current branch:
- PR #77 adds Terms/Privacy copy for MOVO — Money Organizer & Visual Outflow; country/region selection is described as localization, not compliance clearance.
- Legal copy states unlisted markets require local-law and Apple/Google policy assessment and that availability/features may be restricted if requirements cannot reasonably be met.
- Copy warns that incoming transaction links/notifications and automation output are not proof of a real, authorized, cleared, or institution-verified payment.
- Copy discusses international providers/transfers, automated feature limitations, and in-app/external account-deletion expectations.
- Automated assertions were added in `src/App.test.js`; they prove expected text renders, not the real implementation behind the text.
- Region configuration was previously observed to include 47 entries. Re-count the current branch; do not hard-code this number into assumptions.
- `src/lib/autoLog.js` was previously observed to support transaction-link handling and a device-generated key; verify current code and actual runtime path.
- `src/lib/ocr.js` describes local/self-hosted OCR behavior; verify that no unlisted cloud upload occurs at runtime.
- The account deletion page, full deletion propagation, provider inventory, retention schedule, actual consent enforcement, native permissions, store-console declarations, market-by-market clearance, and formal operator details have not been proven by this assessment.
- The legal branch intentionally changed legal copy/tests, not financial processing, authentication, Supabase schema/RLS, production settings, or secrets. Preserve that boundary unless a separate implementation task is approved.

## 3. Priority P0 — must be resolved before public launch or real financial data

### P0.1 Operator identity, privacy contact and DPO designation
**Risk:** The policy may identify a controller/operator or DPO inaccurately.

**Verify**
- Ask owner to confirm the legal person/entity that operates MOVO, jurisdiction, business/contact address required for publication, and whether the named individual is formally appointed as DPO or is only a privacy contact.
- Confirm email, phone, postal address and public-facing response process; do not infer these from a Git profile or domain.
- Confirm whether registration, NPC registration, or other formalities apply to this operator and actual processing activities; obtain qualified Philippine counsel/NPC guidance as appropriate.
- Search all legal pages, app metadata, support screens and store listings for inconsistent identities/contact details.

**Tests/evidence**
- UI test verifies the approved, consistent legal contact appears in Terms/Privacy/support.
- Owner sign-off stored in restricted project records; avoid putting personal verification documents in the public repository.
- Evidence must say whether the contact is “DPO” or “privacy contact”; never silently upgrade the title.

**Implementation if missing:** Update legal UI and support route only after owner-confirmed facts. Do not invent legal entity names or registration numbers.

### P0.2 Data inventory, purpose, lawful basis, recipients and disclosures
**Risk:** Policy text may not match actual production data flows.

**Verify each data class:** account identifiers/authentication, profile/preferences, income/expenses/transactions, receipts/images/PDFs, OCR output, merchant names, categories, transaction URLs/notifications, app logs/diagnostics, analytics/crash reports, support messages, AI prompts/context/outputs, billing/subscription records, exports, backups and device-local data.

For every class record:
- source; purpose; fields; optional/required; storage location; access roles; recipient/processor; region/country; retention; deletion path; lawful basis/consent where applicable; encryption and access controls; whether used for model training; user-facing disclosure.

**Tests/evidence**
- Trace UI → network request → server function → DB/storage → provider calls and logs.
- Use synthetic data only. Capture sanitized network traces and DB/storage evidence; never commit tokens or real financial records.
- Search code and configuration for outbound endpoints, analytics SDKs, crash tools, AI/provider calls and telemetry. Reconcile findings with policy.
- Add contract tests or mocked integration tests to assert prohibited fields are not sent to providers.
- Verify provider inventory against live deployment settings and contracts/DPAs; source code alone is insufficient.

**Implementation if missing:** Minimize fields sent, disable undocumented collection, add consent where required, update policy only after the data map is accurate.

### P0.3 Authentication, authorization, tenant isolation and sensitive data
**Verify**
- User A cannot read, update, delete, export, or infer User B's finance records, receipts, profile, chat/context, logs or storage objects.
- Guest/session transitions cannot attach records to the wrong user or bypass access controls.
- Test direct API calls, altered IDs, guessed object paths, stale sessions, expired tokens, sign-out, account switch, refresh, and concurrent requests.
- Check Supabase RLS on every user-owned table, Storage bucket/object policy, RPC/function permissions, service-role key usage and server-side authorization.
- Confirm service-role/admin secrets never ship to the client or appear in logs/source maps.

**Tests/evidence**
- Automated negative tests for cross-user reads/writes/deletes and storage access.
- Production schema/policies compared with migrations; report drift. Do not apply production migrations without approval.
- Sanitized permission query results and CI logs attached.

**Implementation if missing:** Least privilege, explicit owner-scoped predicates/RLS, fail-closed server authorization, regression tests. Never rely only on hidden UI controls.

### P0.4 Account deletion and external deletion request
**Risk:** Store requirements and policy statements can be unmet even if a “clear data” button exists.

**Verify separately**
1. Is account creation supported in the actual submitted app?
2. Can a signed-in user initiate permanent account deletion inside the app, without contacting support as the only route where platform rules require in-app initiation?
3. Does the flow re-authenticate safely where appropriate, explain consequences/retention exceptions, prevent accidental deletion, and give a clear confirmation?
4. Does deletion remove or de-identify user-owned rows, related child rows, receipts/storage objects, tokens/sessions, exports where controlled, and user-linked logs/analytics where technically and legally required?
5. Does deletion propagate to processors and AI context stores, with documented provider-specific timing?
6. Are backups handled by a documented expiry/restore-and-redelete policy?
7. Is there a direct, publicly accessible external deletion-request webpage where Google Play requires one, and is the exact URL entered in Play Console?
8. Does the page identify the app/operator, describe the request steps, and not require installing the app or logging into the app as the only way to submit the request?
9. Is there an abuse-resistant, privacy-minimizing identity check and a way to report completion/retention exceptions?

**Tests/evidence**
- End-to-end test on disposable account with unique synthetic marker in every supported data store.
- Verify marker is inaccessible/deleted after deletion; query all stores and provider deletion/status APIs where available.
- Test unauthenticated, wrong-user, repeated, partial-failure, timeout/retry, and already-deleted paths.
- Save request ID/timestamps/status without storing excess personal data.
- Public URL check plus screenshot and Play Console evidence (restricted, sanitized).
- Verify Apple in-app deletion requirements against current official guidelines and actual app behavior.

**Implementation if missing:** Build the in-app flow and external page as separate scoped work; idempotent backend deletion orchestration, audit state machine, retryable provider cleanup, and a truthful completion response. Do not say “all data deleted” while any store is unverified.

### P0.5 Retention, deletion, logs and backups
**Verify**
- Establish a retention matrix for every data class listed in P0.2, including purpose, period/trigger, legal exceptions, owner and deletion mechanism.
- Identify DB backups, object-store versioning, logs, observability, crash reporting, provider logs, exports and device-local caches.
- Check if deletion or account closure leaves orphaned records and whether backups expire on a documented schedule.
- Confirm retention settings directly in provider dashboards/contracts and production configuration.

**Tests/evidence**
- Fake-clock/unit tests for expiry logic; integration tests for deletion; scheduled-job/cron execution evidence; test retry and failed deletion alerts.
- Query synthetic marker across all systems after expiry/deletion.
- Document any data that cannot be immediately deleted and the reason/timeline.

**Implementation if missing:** Add scheduled cleanup and deletion workflow with observability, retries and idempotency. Policy retention language must match actual settings.

### P0.6 NasrinAI/AI context consent and isolation
**Risk:** Financial data may be sent to an AI provider or another project without specific authorization.

**Verify**
- Is AI financial context opt-in, clear, specific, informed, revocable and separate from general Terms acceptance?
- Is consent state persisted with timestamp/version and enforced server-side on every AI context request?
- Does revocation stop future transfers and clear stored context according to the retention/deletion policy?
- Is only the minimum user-authorized MOVO context sent? No other app/project, unrelated chats, documents or accounts may enter the context.
- Verify provider, model, retention/training terms and location before transmitting financial data.
- Confirm prompt logs/telemetry do not accidentally retain full financial records or secrets.

**Tests/evidence**
- Consent-off test: no financial context reaches AI endpoint/provider (inspect mocked request body/network boundary).
- Consent-on test: only allowlisted, user-owned fields are sent.
- Revocation test: next request contains no finance context; stored context cleanup is verified.
- Cross-user and cross-project canary tests with unique synthetic strings that must never appear in request, response or logs.
- Production verification only with owner authorization and synthetic data; capture sanitized evidence.

**Implementation if missing:** Default deny, explicit consent state, server-side gate, minimal allowlist serializer, revocation/cleanup, tests and clear provider disclosure. Do not send finance data merely because user signed in.

### P0.7 Security controls and secrets
**Verify**
- Supabase leaked-password protection status; password/reset/session policy; rate limits and abuse controls.
- Secret scanning and dependency audit; no provider credentials in browser bundle, public env vars, logs, test snapshots or docs.
- HTTPS, secure cookie/session settings, CSRF protections where relevant, input validation, XSS protections, content security headers and safe error messages.
- Encryption claims must match actual at-rest/in-transit architecture; do not claim end-to-end encryption or developer-inaccessible data unless proven.
- Validate upload limits/content type, malicious files, oversized files, OCR/PDF processing limits and resource exhaustion.
- Verify RLS/grants in deployed environment rather than assuming migrations equal production.

**Tests/evidence**
- CI secret scan/dependency audit results; sanitized config screenshots/query results.
- Negative auth/rate-limit/upload tests and relevant security-header scan.
- Evidence for production controls must be time-stamped and must not reveal secret values.

**Implementation if missing:** Fix least-privilege and fail-closed behavior; rotate exposed secrets immediately if discovered; do not copy secret values into audit docs.

## 4. P1 — store publication and regional availability

### P1.1 Apple App Store review
**Verify against current official Apple guidelines and the exact build submitted**
- Correct app privacy details/data collection and linked privacy policy.
- In-app account deletion if app supports account creation.
- Permissions and purpose strings match actual access; request only when needed.
- Data collection/sharing by all third-party SDKs and AI/OCR services disclosed accurately.
- Terms/EULA, support/contact, screenshots and product claims are consistent.
- Confirm whether Apple classifies the exact functionality as a money-management/financial service requiring an entity submission or other requirements. Do not assume a finance tracker is exempt or regulated; request clarification where unclear.
- Test on the actual iOS release build, not only a web preview.

**Evidence:** policy checklist with guideline/version/date, screenshots, privacy-label mapping, actual build number, permission prompts and review response if submitted.

### P1.2 Google Play Console
**Verify against current Play requirements and actual Android package**
- Complete Financial features declaration accurately based on actual behavior. A finance-related app may need declaration even if it is only a tracker; answer every category based on facts, never guess.
- Data safety form matches data map, SDK/provider behavior, deletion, security and sharing claims.
- Privacy policy is public, direct, accessible, consistent and not geo-blocked behind login.
- Account deletion flow and external deletion-request URL are live and work end-to-end when required.
- App content, target audience/age rating, ads declaration, permissions, SDK/data use and subscription/billing disclosures are accurate.
- Native app package/version/build tested; web preview alone does not verify Android behavior.

**Evidence:** dated declaration export/screenshots, policy URL checks, package/version and deletion-page proof. Never store console credentials in repo.

### P1.3 Unlisted countries / international compliance matrix
**Important:** A generic clause cannot make MOVO compliant with every country. Build a decision record for every launch market and for each feature that handles personal/financial data.

**Matrix fields**
- Country/territory; target or incidental access; intended audience; app stores/distribution; operator legal entity; privacy/data law; controller/processor duties; lawful basis/consent; data-subject rights; DPO/representative/registration needs; cross-border transfer mechanism; breach notification; children/age rules; consumer protection; subscriptions/tax; financial-service classification/registration; data localization; local language/terms; deletion; AI/OCR disclosure; source/reviewer; last-reviewed date; decision (allow/restrict/block); re-review trigger.

**Minimum workflow**
1. Start with Philippines as home market, then explicitly identify target markets (including the United States and EU/EEA if intended).
2. Separate privacy, consumer, tax, app-store, AI, and financial-regulatory questions; “not a bank” does not automatically exempt a service from every rule.
3. Have qualified counsel or authoritative regulator guidance review material markets.
4. Implement a server-enforced market/feature allowlist only after owner/legal decision; do not trust client-side country picker or IP geolocation alone.
5. Fail closed for markets/features marked blocked or pending; show a clear availability message and preserve access to lawful export/deletion/support.
6. Reassess when features, providers, pricing, audience, or laws change.

**Tests/evidence**
- Unit tests for allow/restrict/block decisions, unknown country, missing/invalid region, VPN/location mismatch, country setting changed, and server-side bypass attempt.
- Test that localization changes currency/date/language only and does not silently imply compliance clearance.
- Audit current 47-entry observation by recounting the current region config and comparing against store availability. Do not treat list membership as legal approval.

### P1.4 Financial-tracker and transaction automation
**Verify**
- Clearly distinguish manually entered, imported, OCR-extracted, auto-logged and institution-verified (if any) data in UI.
- Incoming URL/notification is treated as untrusted input; no claim it proves payment authorization, settlement or account balance.
- Parse links safely: allowed schemes/hosts where possible, URL normalization, reject javascript/data/unsafe redirects, no credential leakage, SSRF defense on server-side URL fetches, safe decoding and size limits.
- Device-generated key is cryptographically appropriate, scoped, revocable/rotatable, not logged or sent to analytics, and cannot authorize unrelated actions.
- Duplicate detection/idempotency handles retries, replay, malformed links and simultaneous submissions.
- Auto-log is off until explicitly enabled; settings are understandable, revocable, and reflected server-side.
- User can inspect/edit/delete generated records and see source/provenance and confidence where applicable.

**Tests/evidence**
- Unit/fuzz tests for malformed, encoded, oversized and hostile URLs; replay, duplicates, time zones, currencies, missing values and invalid amounts.
- E2E tests for automation disabled/enabled/revoked, network failure/retry and duplicate prevention.
- Confirm no real payment/money movement is initiated by tracker.
- Compare copy against actual behavior; update copy if behavior differs.

### P1.5 OCR, file uploads and local processing
**Verify**
- Determine exact execution location for OCR/PDF parsing and whether images/PDFs ever leave device/browser.
- Inspect network traffic while OCR runs; use synthetic receipts only.
- Test permission scope, file type validation by content not just extension, size/page limits, malicious PDFs, parser failure, cleanup of temp files/caches and output accuracy.
- Ensure OCR results are marked extracted/unverified and user can correct them.
- Verify files are not included in AI requests unless separately authorized.

**Evidence:** sanitized network capture, tests for supported/unsupported files, data flow diagram and storage checks.

### P1.6 Logos, trademarks and claims
**Verify**
- Enumerate every third-party bank, wallet, card network, merchant and corporate mark in assets, source and runtime UI.
- For each asset, record source, rights/license/brand-guideline permission or counsel-approved legal basis, permitted use and date checked.
- A non-affiliation disclaimer is not a license and does not automatically cure trademark/copyright/trade-dress issues.
- Check “verified”, “secure”, “encrypted”, “AI-powered”, “automatic”, “bank connected”, savings/financial benefit and compliance claims against evidence.
- Confirm takedown/report contact and a documented review/disable process.

**Tests/evidence:** asset inventory, license/permission evidence, broken/missing asset test and owner approval.

## 5. P2 — quality, accessibility and user rights

### P2.1 Consent and preference UX
- All optional data sharing/AI/automation controls default to off unless a documented, lawful reason supports otherwise.
- Controls are not preselected or bundled with accepting Terms.
- State is accessible, persists correctly, can be withdrawn, and immediately affects the relevant server/provider path.
- Keyboard/screen-reader accessible labels and status; no color-only indication.
- Test fresh install, signed-out, signed-in, cross-device/session, locale change, revocation and deletion.

### P2.2 User rights and support handling
- Document processes for access, correction, portability/export, objection/withdrawal, deletion and complaints, as applicable to each market.
- Set realistic response SLAs based on law and operational capacity; don't promise unverified deadlines.
- Verify identity carefully and avoid asking for unnecessary financial information.
- Test request intake, tracking, escalation, partial refusal/retention exception explanation and closure.

### P2.3 Accessibility and localization
- Legal pages readable on mobile, zoom/reflow, keyboard navigation, screen-reader headings and focus management.
- All supported translations match legal meaning; if only English is authoritative, clearly state how conflicts are handled where lawful.
- Currency/date/time formatting must not change stored numeric meaning or create inaccurate totals.
- Test long country/language names, right-to-left locales if supported, offline/error states and small screens.

## 6. Required test execution protocol

Claude should run in this order, adapting commands to package scripts actually present:
1. Read `package.json`, CI workflows, test setup and current PR diff; do not assume script names.
2. Run focused legal UI tests.
3. Run all unit/integration tests.
4. Run lint/type checks if configured.
5. Run production build.
6. Run dependency and secret scans using existing repository tooling.
7. Run isolated local integration tests against disposable accounts/test projects.
8. Run preview E2E tests using synthetic data.
9. Only after owner authorization, run a narrowly scoped production smoke test that reads no real finance data and changes no production data; use read-only checks wherever possible.
10. Verify store console settings separately; code tests cannot prove console declarations.
11. Attach command output, exit codes, test counts, commit SHA, environment and known limitations to the audit record.

Never use real bank credentials, real customer records, live payment actions or destructive production tests. Never include tokens, cookies, personal finance data or private customer details in logs or commits.

## 7. Required deliverables from Claude

Create or update these files on a dedicated implementation branch:
- `docs/legal/MOVO_LEGAL_FUNCTION_VERIFICATION_MATRIX.md` — this checklist plus per-control status/evidence ledger.
- `docs/legal/MOVO_DATA_INVENTORY_AND_RETENTION.md` — verified data map and retention matrix; mark unknowns explicitly.
- `docs/legal/MOVO_MARKET_COMPLIANCE_MATRIX.md` — country-by-country decisions, sources, reviewer, date and allow/restrict/block status.
- `docs/legal/MOVO_STORE_PUBLICATION_CHECKLIST.md` — Apple and Google Console/build-specific checklist.
- `docs/legal/MOVO_ACCOUNT_DELETION_RUNBOOK.md` — workflow, stores, retries, backup behavior and evidence.
- Automated regression tests for every implemented enforcement control.
- A final handover summary listing **implemented, partial, missing, blocked, not verified**, commits, test evidence, risks and next actions.

Do not fabricate provider locations, retention periods, registrations, legal approvals, store-console values, production test results or external URLs. If access is unavailable, mark BLOCKED and specify the exact evidence/permission needed.

## 8. Exit criteria — not just “CI green”

Do not mark launch-ready until all applicable P0 items are verified, P1 store submissions are accurate, target markets have documented allow/restrict/block decisions, account deletion is proven end-to-end, data disclosures match actual production behavior, and required counsel/owner approvals are recorded. A green CI run is necessary but not sufficient. Keep PR #77 in draft until implementation evidence and review gates are complete.

## 9. Official reference links to re-check on the audit date

- Apple App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Apple account deletion: https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion/
- Google Play developer policy / financial features / account deletion: https://support.google.com/googleplay/android-developer/answer/18258653
- Google Play User Data policy: https://support.google.com/googleplay/android-developer/answer/10144311
- Philippine Data Privacy Act: https://privacy.gov.ph/data-privacy-act/
- Philippine Data Privacy Act IRR: https://privacy.gov.ph/implementing-rules-regulations-data-privacy-act-2012/
- European Commission GDPR principles: https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/principles-gdpr_en

Policies change. Re-open official sources and record the date/version during each store submission and market review. This checklist is engineering/audit guidance, not legal advice or a legal-compliance guarantee.
