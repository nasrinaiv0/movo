# MOVO — Product, UX, and Technical Architecture Blueprint

**Document status:** Product architecture baseline for MVP planning  
**Repository:** `nasrinaiv0/movo`  
**Document owner:** Product team  
**Audience:** Product design, mobile engineering, backend engineering, security, QA, and implementation agents  
**Primary market assumption:** Philippines-first, with PHP as the initial display currency and a path to multi-currency support  
**Design target:** Premium iOS-native experience aligned with the visual language and interaction quality of modern iOS (the user referenced iOS 27.2). Use platform APIs and the currently available SDKs rather than assuming unreleased OS APIs.

---

## 1. Executive Summary

MOVO is a personal financial tracker and money-management companion. It brings cards, bank accounts, e-wallets, transaction records, spending insights, notifications, and an AI financial assistant into one calm, premium interface.

The product should help a user answer, quickly and confidently:

- How much money do I have across the accounts I track?
- Where did my money go, and where did it come from?
- Which card, bank account, or e-wallet was used?
- Can I turn a payment alert, receipt, or imported transaction into a structured record?
- What subscriptions, bills, recurring payments, and unusual transactions should I review?
- What should I do next to improve my financial habits?

MOVO must feel simple and trustworthy rather than like a dense banking dashboard. The default design is restrained monochrome with optional user-selectable themes. Use generous spacing, legible typography, subtle depth, rounded cards, refined separators, restrained animation, and accessible controls.

**Important product boundary:** MOVO is a financial tracker, not a bank, card issuer, payment processor, or wallet that independently holds funds. Do not claim that MOVO can directly access every bank, card, Apple Pay transaction, SMS, or another app's notifications. Data ingestion depends on platform permissions, partner APIs, user-provided imports, and supported integrations.

---

## 2. Product Goals and Principles

### 2.1 Goals

1. Give users a consolidated view of their recorded financial accounts.
2. Make transaction capture and categorization fast, explainable, and editable.
3. Present balances, income, spending, transfers, and savings clearly.
4. Offer searchable transaction history and useful date/account/category filters.
5. Provide a secure wallet-style inventory of cards, bank accounts, and e-wallets.
6. Use notifications for important financial activity and actionable reminders.
7. Offer an optional NasrinAI chat experience for natural-language questions and assisted record creation.
8. Allow users to customize appearance and display preferences without sacrificing clarity.
9. Establish a maintainable, testable architecture with strong privacy and security boundaries.

### 2.2 Non-goals for the initial MVP

- Issuing payment cards or storing/holding customer funds.
- Initiating bank transfers or payments without a separately designed, authorized, compliant integration.
- Bypassing iOS privacy and sandbox restrictions to read other apps' notifications.
- Screen scraping financial accounts or collecting banking credentials.
- Treating AI-generated transaction details as verified financial facts.
- Presenting AI guidance as regulated financial, tax, legal, or investment advice.
- Requiring AI to use the app for ordinary navigation or basic transaction editing.

### 2.3 Product principles

- **Trust before cleverness:** show data source, status, and uncertainty.
- **User control:** imported records can be reviewed, corrected, excluded, or deleted.
- **Privacy by default:** collect the minimum required information.
- **Explicit confirmation:** never silently commit an uncertain AI-extracted transaction.
- **Accessible by design:** Dynamic Type, VoiceOver labels, sufficient contrast, large touch targets, reduced-motion support.
- **Fast first:** prioritize instant local interactions and progressively load non-critical analytics.
- **One coherent design system:** tabs may adapt their contextual top bar, but should remain recognizably the same app.

---

## 3. Target Users and Main Jobs

### Primary user
A person tracking everyday spending across debit/credit cards, bank accounts, and e-wallets, who wants a reliable record without manually building a spreadsheet.

### Core jobs to be done
- Record a purchase, cash withdrawal, transfer, refund, salary, or other income.
- Reconcile a transaction against a notification, receipt, statement, or manual entry.
- See account/card balances and how they contribute to a consolidated tracked balance.
- Review monthly spending and category trends.
- Search and filter historical transactions.
- Receive alerts for imported transactions, recurring bills, budget thresholds, and account security events.
- Ask NasrinAI to summarize, explain, or draft a transaction record.

---

## 4. Information Architecture and Navigation

### 4.1 Persistent bottom navigation

Use a floating, translucent, rounded bottom navigation bar inspired by the supplied visual references. It should be compact, premium, and readable, with five positions:

1. **Home** — house icon.
2. **Wallet** — wallet/card icon.
3. **NasrinAI Chat** — the official NasrinAI Chat logo, enlarged as the centered primary action.
4. **Transactions** — receipt/list icon.
5. **Profile** — person icon.

The central NasrinAI action is visually emphasized but must not overwhelm the other tabs. Use a restrained glow or accent surface only when appropriate to the chosen theme. Keep icon geometry and labels consistent. The active tab must be identifiable by more than color alone (e.g., filled icon, label weight, small indicator, or selected surface).

Do not use the heart, generic plus, or social-media icons from the original inspiration image as the final tab icons. The final agreed sequence is Home, Wallet, NasrinAI Chat, Transactions, Profile.

### 4.2 Navigation behavior

- Keep the bottom navigation persistent on primary tab roots.
- Hide or adapt it on focused full-screen flows where it would compete with the task, such as editing a transaction, authentication, or a modal confirmation.
- Preserve each tab's scroll position when practical.
- Switching tabs must not discard an unfinished form.
- Use native navigation stacks and predictable back behavior.
- Respect safe areas, the home indicator, Dynamic Island, keyboard, and system text-size settings.
- The center Chat button is a navigation action, not a fake decorative control.

### 4.3 Contextual top navigation

Top bars must change by tab while retaining the same design language.

**Home**
- Greeting and optional first name.
- Search.
- Notifications with unread indicator.
- Settings shortcut where it does not clutter the header.
- Main content: tracked balance, income/expense/savings summary, spending analysis, recent transactions.

**Wallet**
- Title: Wallet.
- Add (+) action.
- Optional wallet/card management action (e.g., card stack or manage icon).
- Overflow menu for secondary actions.
- Search can be accessible from the header or a floating/search affordance based on final layout testing.
- Wallet categories: All, Cards, Bank Accounts, and optionally E-Wallets.

**NasrinAI Chat**
- NasrinAI brand mark and current conversation title or mode.
- New chat and conversation history.
- Context and privacy indicators when the assistant is using selected financial records.
- Clearly identify when a proposed action will create or modify a record.

**Transactions**
- Title: Transactions.
- Search.
- Notifications shortcut if required by product consistency; avoid redundant controls if the global shell already provides access.
- Filters/sort control.
- Categories and date-range selectors in the content area.

**Profile**
- Profile title and avatar.
- Search (optional if it searches profile settings).
- Notifications and Settings shortcuts.
- Account, connected sources, plan/usage if applicable, and preferences.

**Settings and Notification Center**
- Use a focused subpage header with a back control and concise title.
- Search settings where the list is long.
- Keep notification preferences separate from the notification inbox.

---

## 5. Visual Design System

### 5.1 Design direction

- Premium, clean, simple, world-class mobile UI/UX.
- Default theme: light, near-monochrome surfaces with black/dark text, subtle gray dividers, and restrained shadows.
- Avoid excessive gradients, neon color, heavy borders, and stacked ornamental effects.
- Use color primarily for meaning (income, expense, warning, success) and user-selected accent styling.
- Use material/translucency sparingly; maintain contrast and readability in all backgrounds.
- Cards should have consistent corner radii, spacing, elevation, and internal padding.
- Keep charts informative, not decorative.

### 5.2 Themes and appearance preferences

Provide:
- **System (default):** follow device appearance.
- **Light:** clean, bright, neutral.
- **Dark:** deep neutral surfaces with accessible text contrast.
- **Custom/accent theme:** user selects a supported accent.

Initial accent choices shown in the references:
- Blue
- Purple
- Orange
- Green
- Red
- Charcoal / monochrome

Theme changes must apply consistently across the navigation bar, selected controls, focus rings, buttons, charts, and accents. Do not hard-code a theme color into component logic. Use semantic design tokens. Persist the user's choice and test contrast in every theme.

### 5.3 Layout and interaction rules

- Follow iOS safe-area and keyboard behavior.
- Support compact and comfortable density modes if testing proves useful.
- Respect Reduce Motion and system accessibility settings.
- Use native-feeling sheets for choosing a card, category, theme, and display layout.
- The Wallet may offer **Grid** and **List** presentation preferences. Persist the choice.
- Do not make essential content depend on hover.
- Every icon-only control must have an accessible label and a practical touch target.
- Provide skeleton/loading, empty, offline, error, permission-denied, and stale-data states.

### 5.4 Financial number presentation

- Default currency: PHP (₱), configurable in preferences.
- Use consistent decimal and thousands separators.
- Income/credits and expenses/debits must be distinguishable by sign and text, not color alone.
- Negative/positive signs must be consistent throughout charts, cards, notifications, and transaction details.
- Never imply a verified bank balance when the value is only a user-entered or calculated estimate. Label tracked/estimated balances appropriately.

---

## 6. Home Tab Specification

### 6.1 Header
- Greeting such as “Good morning” plus the user's preferred display name.
- Optional contextual greeting; do not require location or time-based personalization.
- Search icon opens global search.
- Notification icon opens Notification Center and displays an unread badge.
- Settings shortcut opens Settings.

### 6.2 Total Balance card
- Label: Total Balance or Total Tracked Balance, depending on whether all sources are verified.
- Prominent aggregate amount.
- Eye control to hide/show balances for privacy.
- Optional comparison with the previous period only when valid data exists.
- Subtle trend chart, with accessible textual summary.
- Tap opens a detailed balance/account breakdown.

The aggregate must avoid double counting. Transfers between two tracked accounts must not be treated as income or expense. If some accounts lack current balances, explain the calculation or mark the total as incomplete.

### 6.3 Summary tiles
- Income
- Expenses
- Savings (define clearly as a tracked metric, not necessarily the sum of bank savings accounts)

Each tile shows amount and, when data supports it, change versus the prior comparable period. The user can tap a tile to open a filtered Transactions view.

### 6.4 Spending this month
- Donut/ring chart or another accessible chart.
- Category breakdown with label, amount, and share.
- Categories are user-editable and can be customized.
- “See all” opens a detailed analytics or Transactions view.
- Always provide a text/list alternative to the chart.

### 6.5 Recent transactions
- Show merchant/payee, date/time, account/payment source, amount, and category.
- Use merchant logos only when reliably available and licensed/appropriate; otherwise use a consistent fallback icon.
- Display a source label such as Manual, Imported, Statement, Receipt, or Notification-derived.
- “See all” opens Transactions.
- Tap a row to open transaction detail.

### 6.6 Empty and first-run states
- Explain how to add an account, import a statement, or create the first transaction.
- Clearly distinguish demo/sample data from real data.
- Never show fabricated financial balances as if they belong to the signed-in user.

---

## 7. Wallet Tab Specification

The Wallet visual reference is a key requirement: the top of the screen focuses on the selected card/account; a large card stack sits lower on the screen and can be expanded to browse or manage the user's cards.

### 7.1 Wallet header
- Title: Wallet.
- Add (+) action to add a tracked account/card/wallet.
- A management or overflow control for secondary options.
- Search accessible without obscuring the selected card.

### 7.2 Category tabs
- All
- Cards
- Bank Accounts
- E-Wallets (recommended because e-wallets appear in the supplied references)

Category selection changes the content below. The category should remain selected during the current visit and may be persisted as a preference.

### 7.3 Selected account/card hero
- Show the selected card or account prominently at the top.
- For a card, show provider/issuer, network if known, user-defined nickname, masked last four digits only, and the tracked balance or available balance only if the data source truly supplies it.
- Never store or display full payment card numbers, CVV, PIN, or card authentication secrets.
- Use a neutral fallback card design if provider art is unavailable.
- Allow horizontal paging or selection from the expanded card stack.
- Card art is decorative and must not obscure essential details.

### 7.4 Expandable card stack at the bottom
- Cards are large, layered, and positioned in the lower section of the Wallet view, matching the supplied reference.
- Tapping/dragging the stack expands it to reveal all cards or account tiles.
- Expanded state presents a clean chooser/list/grid with card names, masked identifiers, and associated tracked amount.
- Selecting a card updates the selected hero at the top.
- Avoid relying solely on gestures: provide a clear tap target and accessibility action to expand/collapse.
- Support reduced motion and VoiceOver.

### 7.5 Balance tiles and layout preference
In All, Cards, and Bank Accounts categories, display each account/card's tracked amount in compact tiles or a grid, depending on the user's preference:
- **Grid:** visual overview with issuer/name, account type, and amount.
- **List:** more descriptive rows with masked account details and amount.
- Persist layout choice in preferences.
- Each tile/row opens account details.
- Totals must be calculated from eligible tracked balances and must avoid double counting between card accounts, bank accounts, and transfers.

### 7.6 Wallet quick actions
Potential MVP actions:
- Add account/card
- Edit nickname/details
- View account details
- Set opening/known balance
- Mark balance as manually maintained
- Import a statement
- Archive/remove a tracked account
- View recent transactions for this account

Do not offer real card blocking, limit changes, fund transfers, or payment execution unless a supported provider integration genuinely authorizes that action. If a future action is unavailable, label it as informational or redirect the user to the issuer's official channel.

### 7.7 Account types
- Debit card
- Credit card
- Bank account
- E-wallet
- Cash
- Savings/goal account (tracked record)
- Other custom account type

Keep the type model extensible.

---

## 8. Transactions Tab Specification

Transactions is the system of record for manually entered and imported financial activity.

### 8.1 Header and controls
- Title: Transactions.
- Search.
- Filter/sort button.
- Optional notification shortcut consistent with the global shell.
- Horizontal category chips or segmented controls.

### 8.2 Main filters
- All
- Income
- Expenses
- Transfers

Additional filters:
- Date range (today, week, month, custom)
- Account/card/e-wallet
- Category/subcategory
- Merchant/payee
- Amount range
- Transaction source
- Review status (confirmed, needs review, duplicate candidate)
- Recurring transactions
- Currency

### 8.3 Summary panel
- Total income, expenses, or transfers for the selected filter/date range.
- Period comparison only when comparable data is available.
- Spending chart/breakdown for expense views.
- Transfer totals are separate from income and expenses.
- Changing a filter updates totals and lists consistently.

### 8.4 Transaction rows
Each row should display:
- Merchant/payee or transaction title.
- Date/time.
- Account/payment source (e.g., user-defined card nickname, Apple Pay if explicitly supported by the source record, bank transfer, or manual).
- Amount with clear debit/credit sign.
- Category chip.
- Optional source/review indicator.

### 8.5 Sorting
- Date (newest/oldest)
- Amount (high/low)
- Merchant/payee
- Category
- Account/source

### 8.6 Transaction detail
- Title/merchant.
- Amount and currency.
- Type: income, expense, transfer, refund, fee, adjustment, or other supported type.
- Transaction date/time and time zone if known.
- Account/card/e-wallet.
- Category and subcategory.
- Merchant/payee.
- Note/memo.
- Receipt or attachment.
- Source and import metadata.
- Confidence/review state when AI extracted.
- Audit information: created/updated time and origin.
- Actions: edit, recategorize, duplicate, mark as reviewed, attach receipt, delete/archive, and view source where available.

### 8.7 Create/edit transaction
Fields:
- Type (income, expense, transfer).
- Amount.
- Currency.
- Date/time.
- Account/source.
- Merchant/payee.
- Category.
- Optional note.
- Optional receipt/attachment.
- Recurring toggle only if the user explicitly enables it.
- Source/provenance metadata managed by the app.

Validation:
- Amount must be valid and greater than zero for a normal transaction.
- A transfer must specify source and destination accounts and must not be counted as income/expense.
- Do not permit the same account as both transfer source and destination.
- Confirm destructive actions.
- Preserve edits and provide understandable error messages.

### 8.8 Duplicate handling
Imported records may overlap across notification text, email receipts, and statements. Use source IDs where available and conservative duplicate matching (account, amount, currency, merchant, timestamp window, reference ID). Never silently merge uncertain matches. Present duplicate candidates for user review and retain provenance.

---

## 9. NasrinAI Chat Tab

NasrinAI Chat is the central assistant entry point. It helps users understand their own recorded data and can propose transaction records from user-supplied content.

### 9.1 Core experiences
- Ask questions about spending, income, budgets, categories, recurring payments, and account history.
- Summarize selected date ranges.
- Explain changes in spending based on available records.
- Suggest a category for a new transaction.
- Extract structured transaction fields from pasted text, a receipt, or a supported imported message.
- Draft a record and show a review/confirmation screen before saving.
- Help locate transactions through natural language.
- Offer privacy-aware explanations of what data is being used.

### 9.2 Action safety
- Read-only questions can use authorized records within the current user's scope.
- Creating, editing, deleting, or categorizing a record must produce a visible preview and require explicit user confirmation unless the user has enabled a clearly defined rule for that exact class of low-risk action.
- Never invent amounts, merchants, dates, accounts, or transaction status.
- If extraction is uncertain, mark fields as unknown and ask a focused question.
- Do not claim that a payment succeeded based only on an ambiguous notification.
- AI-generated answers are informational and not a substitute for regulated financial advice.
- Do not expose system prompts, provider keys, secrets, internal routing, or another user's data.

### 9.3 Conversation UI
- Minimal, readable message bubbles.
- Clear composer with text input, attachment/import affordance, and send control.
- Voice features only if separately implemented and permissioned.
- New conversation and history controls.
- Suggested prompts should be contextual, optional, and dismissible.
- Show when a response is based on recorded MOVO data versus general knowledge.
- Keep the bottom navigation consistent, with Chat highlighted as the center action.

### 9.4 AI architecture
Use a server-side orchestrator. The client must not contain provider secrets. The orchestrator:
1. Authenticates the user and checks authorization.
2. Classifies the request as informational, search, extraction, or proposed mutation.
3. Retrieves only the minimum permitted financial records.
4. Calls an approved provider/model under server-side policy.
5. Validates structured output against a strict schema.
6. Returns a response and, if applicable, a proposed action preview.
7. Persists allowed conversation/usage telemetry under the retention policy.
8. Writes financial mutations only through authorized domain services, after confirmation.

Provider choice must be configurable, observable, and independent of UI logic. Add timeouts, retries, rate limits, budget limits, redaction, and safe fallbacks. AI should never query arbitrary tables or execute model-generated SQL.

---

## 10. Notification Center

The Notification Center and notification settings are separate experiences.

### 10.1 Notification inbox
Top header:
- Title: Notifications.
- Search.
- Settings shortcut.
- Filter chips: All, Unread, Transactions, Account, System.
- “Mark all as read” action.

Group entries by Today, Yesterday, and older date groups. Each row includes a type icon, title, short summary, timestamp, unread indicator, and navigation affordance.

Supported categories:
- Transaction/payment imported or recorded.
- Money received / income record.
- Transfer record.
- Possible duplicate or transaction requiring review.
- Budget threshold.
- Recurring bill/subscription reminder.
- Account/security sign-in alert.
- MOVO/NasrinAI feature update.
- Monthly summary/report.
- Promotions (off by default or opt-in; keep separate from essential financial alerts).

Do not display a real financial transaction notification unless it comes from a supported, attributable source or is clearly labelled as a local reminder/demo.

### 10.2 Notification detail
- Success/information/error state icon where applicable.
- Title and summary.
- Date/time.
- Related merchant or account, if known.
- Amount/currency only if source data includes it.
- Payment method/account shown masked.
- Category and record status.
- Location only when legitimately provided and useful; do not infer exact location.
- Link to the associated transaction or a “Review transaction” action.
- Clear source/provenance and whether the record is verified or user-confirmed.

### 10.3 Notification preferences
Global toggles:
- Notifications enabled.
- Push notifications.
- Email notifications (only if email delivery is configured and user consent is obtained).
- In-app alerts.

Category toggles:
- Transactions
- Account and security
- MOVO/NasrinAI updates
- Promotions
- Reports and summaries
- Budget and recurring-payment reminders

Quiet hours:
- User-defined start/end time.
- Time zone aware.
- Do not suppress legally/operationally required security notices without a clear policy.
- Respect OS-level notification permissions and show a helpful state if permission is denied.

### 10.4 Notification delivery and persistence
- Store in-app notification records server-side when appropriate.
- Track read/unread state and delivery attempts.
- Use idempotency keys to avoid duplicate alerts.
- Do not put full account numbers, sensitive transaction payloads, or private financial details into push-notification text by default. Offer privacy-conscious notification previews.
- Apply retention and deletion policies.
- Avoid sending marketing notifications without consent.

---

## 11. Profile Tab

### 11.1 Profile overview
- Avatar/profile image.
- Display name.
- Email or sign-in identifier, appropriately protected.
- Plan/entitlement summary only if a real plan system exists.
- Quick summary of tracked balance, income, and expenses may be shown, but must be labelled and calculated consistently.
- Account sections for bank accounts, cards, and e-wallets with counts and tracked totals.

### 11.2 Profile menu
- Personal information
- Wallet/accounts
- Financial preferences
- Notifications
- Security & Privacy
- App preferences
- Connected services
- Help & Support
- About MOVO
- Terms of Service
- Privacy Policy
- Sign out
- Delete account

### 11.3 Edit profile
- Display name.
- Profile image.
- Locale/language.
- Optional time zone preference.
- Email/phone changes must use secure verification flows.
- Do not display fake or sample personal information in production.

### 11.4 Account status and plan
If plans/paid tiers are introduced, show the actual active plan, billing status, usage, and renewal terms from authoritative server-side data. Do not hard-code sample tier names or token limits into the UI. If no paid plan exists in the MVP, omit the section rather than showing mock subscription data.

---

## 12. Settings

Settings should use a searchable, grouped native-feeling list with focused detail pages.

### 12.1 Account
- Profile
- Sign-in and authentication
- Connected accounts/services
- Session management where supported

### 12.2 Appearance
- System / Light / Dark / Custom
- Accent color
- Preview of bottom navigation and cards
- Compact/comfortable density
- Wallet display: Grid/List
- Transaction category colors toggle
- Card display style where applicable
- Reduce motion follows OS setting; provide app-specific options only if useful.

### 12.3 Regional and financial preferences
- App language
- Currency display (PHP default; multi-currency-ready)
- Date format
- Number format
- Week start day
- Time zone
- First day of financial month (optional)

Changing display currency must not rewrite original transaction currency or silently convert historical values. If conversion is later supported, store original amount/currency and conversion rate/date separately.

### 12.4 Notifications
- Push/email/in-app channels.
- Category preferences.
- Quiet hours.
- Privacy of notification previews.

### 12.5 Security & Privacy
- App lock / biometric unlock when supported.
- Session management.
- Privacy & Data.
- Export data.
- Delete individual records.
- Clear local cache.
- Delete account.
- Consent and connected-data controls.

### 12.6 Data & Sync
- Cloud sync status.
- Local-only mode if supported.
- Sync now.
- Import/export.
- Auto-categorization toggle.
- Data source permissions.
- Last successful sync and understandable error state.

### 12.7 Help & Support
- Help Center/FAQ.
- Contact support.
- Report a bug.
- Send diagnostics with explicit consent and redaction.
- Terms of Service.
- Privacy Policy.
- App version/build.

---

## 13. Transaction Capture and External Notification Reality

The desired workflow is:

**Payment or transfer occurs → user receives a notification/message/receipt → MOVO extracts the amount and direction → MOVO proposes a structured record → user reviews/edits → record is saved.**

This is a key product concept, but it must be implemented according to real platform constraints.

### 13.1 iOS restriction — critical

A normal third-party iOS app cannot freely read the notifications generated by Apple Wallet/Apple Pay, banking apps, or other apps. iOS does not provide a general API for an app to inspect other apps' notification contents. Do not design the MVP around unrestricted notification scraping, private APIs, accessibility abuse, or background notification interception.

Apple Pay payment activity also does not automatically give a third-party finance tracker a universal feed of all transactions. Availability depends on the card issuer, financial institution, supported APIs, and the user's authorization.

### 13.2 Supported ingestion paths to investigate

Implement only paths that are supported and approved:

1. **Manual entry:** reliable fallback; fast amount/type/account/category form.
2. **Share sheet / user-initiated share:** allow the user to share text, a receipt, or a file into MOVO when the source app exposes that content.
3. **Receipt capture:** camera/photo or supported file upload; extract candidate fields and request review.
4. **Statement import:** CSV and other documented statement formats; map columns and show an import preview.
5. **Email import:** only through a supported provider integration with explicit OAuth consent and narrow scopes. Process only relevant messages, make data use clear, and support disconnect/delete.
6. **Banking-data aggregation API:** evaluate providers available in the launch country and confirm coverage, licensing, cost, and permitted uses before committing.
7. **Official issuer/provider API or webhook:** use only with partner approval and valid authorization.
8. **User-pasted transaction alert:** parse text the user explicitly pastes into MOVO.
9. **Shortcuts or automation handoff:** investigate only documented iOS capabilities and user-initiated actions; do not promise automatic access to arbitrary notification content.
10. **Android notification access:** a separate Android-specific design may be possible with explicit notification-listener permission, transparent disclosure, strict local processing/retention controls, and policy review. This does not apply to iOS and must not be assumed available on both platforms.

### 13.3 Extraction pipeline

For each supported input:
1. Receive the user-authorized text/file/event.
2. Determine input type and source.
3. Parse candidate merchant, amount, currency, debit/credit direction, timestamp, reference, and payment/account hint.
4. Validate amount/currency/date and normalize formats.
5. Match a known account only when evidence supports the match.
6. Check for duplicate candidates.
7. Assign confidence per field; do not rely only on one overall score.
8. Display an editable preview.
9. Ask the user to confirm or correct uncertain fields.
10. Save through the transaction domain service.
11. Store provenance and a minimal audit record.
12. Allow the user to correct or delete the resulting record and associated imported data.

### 13.4 Transaction data states
- Draft / extracted
- Needs review
- Confirmed by user
- Imported from trusted supported integration
- Reconciled
- Duplicate candidate
- Rejected/deleted

Never label a user-pasted or AI-parsed alert as bank-verified unless a trusted integration actually verifies it.

---

## 14. Core Data Model

The final schema should be adapted to the chosen backend, but it must represent the following domain concepts. Use UUIDs or equivalent opaque identifiers, UTC timestamps with clear timezone handling, foreign keys, unique constraints, and tenant/user isolation.

### 14.1 User and preferences
**profiles**
- id (maps to authenticated user)
- display_name
- avatar reference
- locale
- timezone
- created_at
- updated_at

**user_preferences**
- user_id
- theme_mode (system/light/dark/custom)
- accent_theme
- wallet_layout (grid/list)
- density (comfortable/compact)
- display_currency
- date_format
- number_format
- week_start
- hide_balances_by_default
- notification_preview_privacy
- created_at
- updated_at

### 14.2 Financial accounts
**financial_accounts**
- id
- user_id
- type (bank/card/ewallet/cash/savings/other)
- provider_name
- nickname
- masked_identifier (never full PAN)
- currency
- tracked_balance (optional; clearly identified as manual/imported)
- balance_source
- balance_as_of
- is_archived
- metadata (allowlisted, non-secret fields only)
- created_at
- updated_at

Do not store card PAN, CVV, PIN, banking password, or raw authentication secrets in this table.

### 14.3 Transactions
**transactions**
- id
- user_id
- account_id
- transfer_counterparty_account_id (nullable)
- type (income/expense/transfer/refund/fee/adjustment/other)
- amount_minor_units (integer; avoid floating-point money)
- currency
- original_amount_minor_units (nullable if converted)
- original_currency (nullable)
- merchant_name
- description
- category_id
- transaction_at
- timezone (when known)
- source_type
- source_reference_id (nullable)
- status (draft/needs_review/confirmed/imported/reconciled/rejected)
- extraction_confidence or field-level extraction metadata
- notes
- created_by
- created_at
- updated_at
- deleted_at (nullable; if soft delete is used)

Use minor units appropriate to the currency. Do not assume every currency has two decimal places. Keep transaction sign semantics consistent: store a non-negative amount plus a transaction type/direction, or define a signed convention and enforce it everywhere. Document the selected convention.

**transaction_categories**
- id
- user_id (nullable for system categories)
- parent_id (nullable)
- name
- icon_key
- semantic_color_key
- type_scope
- is_archived

**transaction_attachments**
- id
- user_id
- transaction_id
- storage_key
- media_type
- size_bytes
- checksum
- created_at
- deleted_at

Use private storage and short-lived signed URLs where appropriate. Validate file type and size.

### 14.4 Import and provenance
**import_sources**
- id
- user_id
- source_type
- provider
- connection_status
- granted_scopes (minimal, non-secret representation)
- last_sync_at
- created_at
- updated_at

**import_jobs**
- id
- user_id
- source_id (nullable)
- status
- source_file_reference (nullable)
- started_at
- finished_at
- summary_counts
- error_code (safe, non-sensitive)

**transaction_source_events**
- id
- user_id
- source_id (nullable)
- transaction_id (nullable)
- source_type
- source_event_fingerprint
- received_at
- processed_at
- outcome
- minimal provenance metadata

Do not retain raw email bodies, notification text, or receipts indefinitely by default. Retention should be explicit and user-controllable.

### 14.5 Notifications
**notifications**
- id
- user_id
- category
- title
- body (minimize sensitive content)
- related_transaction_id (nullable)
- read_at
- created_at
- expires_at (nullable)
- delivery_metadata (non-secret)

### 14.6 AI conversations
**chat_conversations**
- id
- user_id
- title
- created_at
- updated_at
- archived_at

**chat_messages**
- id
- conversation_id
- user_id
- role
- content or encrypted content reference
- created_at
- retention metadata

**ai_action_proposals**
- id
- user_id
- conversation_id
- action_type
- validated_payload
- status (proposed/confirmed/rejected/expired/executed)
- expires_at
- created_at
- confirmed_at
- executed_at

Apply a retention policy to chat history, attachments, model inputs/outputs, and logs. Avoid duplicating financial data into chat logs when a reference to the relevant record will suffice.

### 14.7 Audit and security
**audit_events**
- id
- user_id (nullable for system/security events)
- actor_type
- action
- resource_type
- resource_id
- outcome
- created_at
- minimal safe metadata

Do not log access tokens, passwords, full account identifiers, CVV/PIN, or complete sensitive financial payloads.

---

## 15. Backend and System Architecture

### 15.1 Logical architecture

**iOS app**
- SwiftUI or the selected supported iOS UI framework.
- Design tokens and reusable components.
- Native navigation, safe-area handling, biometrics where appropriate.
- Local cache for responsive UI, with explicit sync state.
- Secure local storage for session material using platform-secure mechanisms.
- Import/share/file/camera flows only with user permission.
- No provider API secrets embedded in the client.

**Application API**
- Authenticated API boundary.
- Profile and preference service.
- Financial account service.
- Transaction service.
- Import/ingestion service.
- Notification service.
- Analytics/reporting service.
- AI orchestration service.
- Export/deletion service.

**Database**
- Relational database with user-level access control and migrations.
- Enforce authorization at the database/API boundary; never trust client-supplied user IDs.
- Row-level security where supported.
- Index common queries by user_id and transaction_at; use composite indexes based on actual query plans.

**Private object storage**
- Receipts and imported documents.
- File type/size validation, malware scanning where available, private buckets, short-lived access URLs, lifecycle retention, and deletion.

**Background jobs**
- Import parsing, sync, notifications, report generation, retention cleanup.
- Idempotent handlers, retry limits, dead-letter/error visibility, and safe replay.

**AI provider adapter**
- Server-side provider abstraction and strict structured-output schemas.
- Policy, budget, rate limits, timeouts, observability, and redaction.
- No model-generated SQL execution.

### 15.2 Recommended service boundaries
- Identity and profile
- Accounts and balances
- Transactions and categories
- Import and reconciliation
- Notifications and preferences
- Analytics and reports
- AI conversations and action proposals
- Data export, retention, and account deletion

Avoid a premature microservice architecture for MVP. A well-separated modular backend is preferable unless deployment scale or team structure justifies separate services.

### 15.3 API design principles
- Version APIs.
- Validate all request/response payloads.
- Use idempotency keys for imports and mutations that may be retried.
- Use cursor pagination for transaction history.
- Enforce per-user authorization on every object.
- Return safe, actionable errors without leaking stack traces or provider secrets.
- Use server-side transaction boundaries for multi-record operations.
- Use optimistic concurrency/version checks for edits where needed.
- Keep money calculations in exact integer/decimal arithmetic.

Example conceptual endpoints (names are illustrative, not final contracts):
- GET/PATCH /v1/profile
- GET/PATCH /v1/preferences
- GET/POST /v1/accounts
- GET/PATCH/DELETE /v1/accounts/{id}
- GET/POST /v1/transactions
- GET/PATCH/DELETE /v1/transactions/{id}
- POST /v1/imports/preview
- POST /v1/imports/confirm
- GET /v1/imports/{id}
- GET/PATCH /v1/notifications
- GET/POST /v1/chat/conversations
- POST /v1/chat/conversations/{id}/messages
- POST /v1/ai-action-proposals/{id}/confirm
- POST /v1/exports
- POST /v1/account-deletion

These endpoints are architecture examples and must be aligned with the repository's actual conventions before implementation.

---

## 16. Security, Privacy, and Compliance Requirements

Financial data is highly sensitive. Security and privacy are release gates, not future enhancements.

### 16.1 Authentication and authorization
- Use a proven authentication provider/framework.
- Enforce server-side identity checks and per-user resource ownership.
- Apply row-level security when available.
- Test cross-user reads/writes for every table and storage path.
- Use least privilege for service credentials.
- Never expose service-role keys or privileged credentials to the client.
- Support secure logout and session revocation.

### 16.2 Data protection
- TLS in transit and encryption at rest through supported infrastructure.
- Secure secrets management and rotation.
- Private receipt/document storage.
- Short-lived signed links.
- Avoid storing full card credentials.
- Redact sensitive data from logs, analytics, crash reports, and AI prompts.
- Limit retention and make data export/deletion understandable.
- Keep test fixtures synthetic.

### 16.3 AI safety and privacy
- Explicitly disclose when financial records are sent to an AI provider.
- Select providers and contractual settings appropriate for sensitive data.
- Minimize context sent to models.
- Never expose one user's data to another.
- Treat imported text and receipts as untrusted input, including prompt-injection attempts.
- Never execute instructions embedded in transaction text as privileged commands.
- Validate structured outputs and all proposed mutations.
- Do not let the model authorize its own action.
- Require user confirmation for record creation/editing/deletion by default.
- Maintain abuse controls, budget limits, and safe fallbacks.

### 16.4 Regulatory review
Before production launch, determine which local privacy, consumer protection, payment, financial-data, and electronic communications rules apply in each launch jurisdiction. Obtain appropriate legal/compliance review. Do not describe MOVO as a regulated banking or payment service unless it is authorized to operate as one.

### 16.5 Threat model to test
- Unauthorized access to another user's transactions.
- IDOR on account, transaction, notification, attachment, and chat IDs.
- Service-key leakage.
- Malicious or oversized uploads.
- CSV/statement formula injection on export.
- Prompt injection in imported receipts/messages.
- Duplicate/replay import attacks.
- Notification spam or sensitive lock-screen previews.
- Session theft and insecure local caches.
- AI hallucinated transaction writes.
- Incorrect balance aggregation or transfer double counting.
- Deletion flows that leave data in attachments, logs, backups, or provider systems beyond the disclosed retention policy.

---

## 17. Analytics, Insights, and Financial Calculations

### 17.1 Metrics
- Income by period.
- Expenses by period.
- Net cash flow (income minus expenses, with transfers excluded).
- Category breakdown.
- Account-level activity.
- Recurring payment/subscription candidates.
- Budget vs actual (if budgets are introduced).
- Period-over-period change.
- Reconciliation/import coverage.

### 17.2 Calculation rules
- Define all periods using the user's configured time zone.
- Use consistent inclusive/exclusive date boundaries.
- Transfers between tracked accounts do not count as income or expense.
- Refunds should be represented consistently and should offset expenses only according to the documented reporting convention.
- Pending, reversed, and deleted records must be treated consistently.
- Imported duplicates must not inflate totals.
- Multi-currency totals must not be summed as if all amounts were the same currency. Either group by currency or apply an explicitly sourced conversion rate with timestamp and clear disclosure.
- Calculations must be server/domain logic or shared deterministic functions, not independently reimplemented in every UI component.

### 17.3 Data freshness
- Show last updated/imported time where relevant.
- Differentiate live/provider-sourced balances from manual tracked balances.
- Explain missing sources or stale balances.
- Do not show a fabricated “real-time” total if the underlying sources are not real-time.

---

## 18. Accessibility, Localization, and Performance

### Accessibility
- VoiceOver labels and logical reading order.
- Dynamic Type and truncation-safe layouts.
- Sufficient contrast in every theme.
- Non-color indicators for positive/negative values and selected states.
- Minimum comfortable touch targets.
- Reduced-motion support for the expanding Wallet stack and central Chat button.
- Chart alternatives and accessible currency/date labels.

### Localization
- Start with English and PHP presentation for the Philippines.
- Keep strings externalized.
- Support locale-aware dates, number formatting, pluralization, and currency display.
- Store timestamps consistently and display in the configured user time zone.
- Do not assume a user's location based only on currency.

### Performance
- Paginate transactions.
- Avoid loading all historical records for the Home view.
- Cache safe, frequently used summaries and invalidate them on mutations/imports.
- Use database indexes guided by measured query plans.
- Optimize images and attachments.
- Handle weak networks and offline state gracefully.
- Keep scroll and tab switching smooth.
- Avoid excessive shadows, blur, and animation that affect older devices or battery.

---

## 19. QA and Testing Strategy

Do not mark a feature complete because it compiles or because a screenshot looks correct. Test functionality, data correctness, accessibility, privacy, and failure states.

### 19.1 Unit tests
- Money formatting and minor-unit arithmetic.
- Currency decimal rules.
- Transaction classification and sign/direction semantics.
- Transfer handling and double-count prevention.
- Date boundaries and time zones.
- Category aggregation.
- Duplicate candidate scoring.
- Import parsing and field validation.
- Theme token resolution.
- Preference persistence.
- AI schema validation and action state transitions.

### 19.2 Integration tests
- Authentication and account ownership.
- CRUD for accounts, transactions, categories, preferences, notifications.
- Import preview/confirm/idempotency.
- File upload authorization and deletion.
- Notification read/unread and delivery retry.
- AI proposed-action confirmation.
- Data export and account deletion.
- Database row-level policies and storage policies.

### 19.3 UI tests
- Five-tab navigation and correct icons.
- Dynamic top bars per tab.
- Home balance visibility toggle.
- Wallet category tabs, selected card hero, expandable card stack, Grid/List preference.
- Transaction search, filters, sorting, detail, create/edit/delete.
- Chat preview and confirmation before a proposed transaction is saved.
- Notification filters, detail, mark-as-read, and settings.
- Profile and Settings navigation.
- Theme changes across all tabs.
- Dark mode, larger text, keyboard, safe area, VoiceOver, and reduced motion.
- Empty, loading, offline, permission-denied, and error states.

### 19.4 Security tests
- Cross-user access denied for all private data.
- RLS and storage policies.
- Malformed payloads and oversized files.
- Secrets are absent from client bundles and logs.
- CSV formula injection protections.
- AI output cannot bypass validation or authorization.
- Imported untrusted text cannot trigger privileged actions.
- Rate limits and idempotency controls.
- Account deletion and retention enforcement.

### 19.5 Release gate
Before each release:
1. Run formatting/lint checks.
2. Run unit and integration tests.
3. Run UI/snapshot tests where available.
4. Run security and authorization checks.
5. Verify migration behavior and rollback plan.
6. Verify all supported ingestion flows on real devices.
7. Confirm no critical or high-severity unresolved defects.
8. Verify the production build and essential smoke tests.
9. Report the exact commands, pass/fail counts, and remaining limitations. Never claim tests passed unless they were actually run.

---

## 20. MVP Scope and Implementation Phases

### Phase 0 — Repository and product discovery
- Inspect the existing repository and current app stack.
- Identify build, test, lint, navigation, backend, authentication, and deployment conventions.
- Confirm target platforms and supported minimum OS.
- Map existing components to this specification.
- Create a gap analysis and implementation plan.
- Do not replace working architecture without evidence.

**Deliverable:** repository audit and approved implementation backlog.

### Phase 1 — Design system and navigation shell
- Define design tokens, typography, spacing, radii, elevation, semantic colors, and themes.
- Implement the five-item bottom navigation with the exact icon order.
- Implement contextual top bars for Home, Wallet, Chat, Transactions, and Profile.
- Implement System/Light/Dark and accent theme selection.
- Ensure safe areas, accessibility, and responsive layouts.

**Acceptance:** all five tabs navigate correctly, selected state is accessible, and theme changes persist across launches.

### Phase 2 — Core local/domain financial records
- User profile and preferences.
- Account/card/e-wallet models.
- Categories.
- Create/edit/delete transaction.
- Exact amount handling.
- Transfer semantics.
- Search, filters, and sorting.
- Local or backend persistence consistent with the selected architecture.

**Acceptance:** transaction changes update all relevant summaries; transfers do not inflate income/expense totals.

### Phase 3 — Home and Wallet
- Home balance card, income/expense/savings tiles, spending breakdown, recent transactions.
- Wallet category tabs.
- Selected account/card hero.
- Large expandable card stack at the bottom.
- Account tiles in Grid/List view.
- Account details and account-filtered transactions.

**Acceptance:** no fake balances in production; layout works with long names, large amounts, empty accounts, dark mode, and accessibility settings.

### Phase 4 — Transactions and Notifications
- Full transaction list, filter/sort, detail, edit flows.
- Notification inbox and detail.
- Read/unread state and category filters.
- Notification settings and quiet hours.
- Deep links from notifications to related records.

**Acceptance:** notifications never fabricate a verified event and deep links open the correct record.

### Phase 5 — Import and transaction capture
- Manual capture first.
- Share-sheet or user-initiated text/file import where supported.
- Receipt and statement import with preview.
- Duplicate detection and review workflow.
- Evaluate email and financial-data aggregation integrations based on availability, cost, consent, and legal review.
- Explicitly document iOS limitations.

**Acceptance:** every imported record has provenance, can be reviewed/edited/deleted, and cannot be silently duplicated or misrepresented as verified.

### Phase 6 — NasrinAI Chat
- Conversation UI and history.
- Read-only queries over authorized records.
- Structured extraction for user-provided text/receipts.
- Proposed transaction preview and explicit confirmation.
- Server-side provider adapter, schemas, budgets, rate limits, logging redaction, and fallbacks.

**Acceptance:** model outputs cannot write directly to the database, unauthorized data is inaccessible, and mutations require approved user confirmation.

### Phase 7 — Profile, Settings, privacy controls
- Profile editing.
- Connected-source management.
- Theme and display preferences.
- Security/privacy controls.
- Export, retention, and account deletion.
- Help, terms, and privacy policy pages.

**Acceptance:** preferences persist; disconnect/revoke/delete flows work; retention disclosures match actual behavior.

### Phase 8 — Hardening and release
- Performance optimization.
- Accessibility audit.
- Security review and threat-model testing.
- Import reliability and data reconciliation.
- TestFlight/beta feedback.
- Monitoring, crash reporting with redaction, backups, migration validation, and incident response.
- Production launch checklist.

**Acceptance:** all release gates in Section 19 pass, with any known limitations clearly documented.

---

## 21. Definition of Done

A feature is complete only when:
- Product behavior matches this specification or an approved documented change.
- UI states include loading, empty, error, offline, and success where applicable.
- Accessibility and theme variants have been checked.
- Authorization and validation are implemented server-side where needed.
- Data is persisted and restored correctly.
- Logs contain no secrets or unnecessary sensitive data.
- Unit/integration/UI tests relevant to the change pass.
- No unrelated functionality regresses.
- Documentation and migration notes are updated.
- The PR summary reports files changed, tests actually run, results, and known limitations.

---

## 22. Product Decisions Still Requiring Confirmation

These are explicit open questions, not assumptions to silently turn into implemented behavior:

1. **Platform:** iOS-first only, or iOS plus Android/web?
2. **Backend:** retain the repository's existing backend if viable, or select a new backend after audit?
3. **Authentication:** email, Apple sign-in, Google sign-in, or another combination?
4. **Financial data integrations:** which Philippine banks/e-wallets, if any, have an approved API/aggregator path?
5. **Email import:** should the MVP include Gmail/Outlook OAuth, or defer until later?
6. **Local vs cloud storage:** should users be able to choose local-only mode in the first release?
7. **Currency:** PHP only for MVP display, or multi-currency reporting at launch?
8. **Budgeting:** include budgets and alerts in MVP or after transaction tracking?
9. **Subscriptions:** identify recurring charges in MVP or defer?
10. **NasrinAI access:** available to all users or gated by a real entitlement/plan system?
11. **Retention:** what are the defaults for transaction sources, receipts, chat history, and raw import material?
12. **Account balance semantics:** manual tracked balances only at first, or verified balance synchronization where supported?
13. **Brand assets:** provide the approved NasrinAI Chat logo and MOVO logo files before final implementation.
14. **Legal/compliance:** confirm launch jurisdiction, data-processing notices, and required reviews.

---

## 23. Source-of-Truth Rules for Implementation Agents

- This document describes product intent and target behavior, not proof that any integration already exists.
- Inspect the repository before changing files, dependencies, database schema, or deployment.
- Prefer small, reviewable PRs with tests over a single risky rewrite.
- Do not commit secrets, user data, production credentials, or real financial records.
- Do not invent provider capabilities or claim API access without verifying official documentation and access rights.
- Do not use private APIs or platform-policy workarounds to capture other apps' notifications.
- Do not replace the user's agreed navigation icons with icons from the visual reference that were explicitly superseded.
- Keep the default design premium and restrained; color themes are optional user customization, not a mandate for a colorful default.
- Use the supplied visual references as guidance for layout and hierarchy, not as permission to copy third-party brand assets.
- Before implementation, post a concise repository audit, map the existing code to each phase, and identify dependencies/risks.
- During implementation, run relevant tests after each coherent change and the full available test suite before declaring completion.
- If a requirement is impossible or unavailable on the target platform, explain the constraint and implement the nearest supported, privacy-respecting workflow instead.

---

## 24. Final MVP Experience Summary

A user opens MOVO and sees a calm Home dashboard with tracked balance, income, expenses, savings, a spending breakdown, and recent activity. The Wallet tab displays a selected card/account at the top and a large expandable card stack below; category tabs and user-selected Grid/List layouts show each tracked account's amount. Transactions provides reliable search, filtering, sorting, categorization, and full record details. The center NasrinAI Chat tab can explain recorded data and turn user-provided transaction text or receipts into editable proposed records. Profile and Settings provide personal details, themes, notification preferences, connected sources, privacy, security, export, and support. Notification Center keeps actionable alerts separate from their preferences.

The product succeeds when financial records are understandable, accurate, user-controlled, and secure—not when it claims access to data that iOS or a financial provider does not expose.
