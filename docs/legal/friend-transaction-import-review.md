# Draft consent/privacy text for review — NOT effective until approved

## Feature disclosure
MOVO lets you receive transaction snapshots from friends who deliberately choose to send them. A sender may share an amount, transaction type, currency, date, and optionally a description or category. MOVO does not share bank account identifiers, card credentials or original receipts through this feature.

When you accept a shared card, MOVO stores only your decision. MOVO does not send money, pay anyone, import banking records, or change your balance until you select one of your own eligible accounts and explicitly save a transaction in your own ledger. If the currency does not match an account you control, import is blocked. A shared transfer requires two distinct recipient-controlled accounts in the same currency.

MOVO retains an imported ledger record under your account even if you later end the friendship, subject to your existing account deletion, retention, and export policies. The chat decision is removed with the shared message/friend connection. You are responsible for reviewing the accuracy and suitability of shared financial information before logging it.

The recipient-import feature does not establish a debt, proof of payment, escrow, bank transfer, or money-remittance obligation. It is a record-sharing convenience only.

## Legal/UGC review required before release
- Confirm Apple and Google UGC reporting, blocking and moderation flows apply to messages and transaction cards; do not rely solely on profile summary reports.
- Confirm consent and data-retention documentation across supported markets; include a right-to-delete/access flow for messages, decisions and the recipient's imported record.
- Confirm no false statement of end-to-end encryption or bank linking.
- Review data-safety and privacy notices for shared financial information and recipient import metadata.
- Review translations for all supported territories. This draft does not modify MOVO's published Terms/Privacy or legal acceptance version.

## Atomic implementation review amendment
The proposed server RPC posts only after a fresh owner-bound consent and explicit account mapping, with one canonical transaction and receipt. Offline drafts do not change balances before authorized reconciliation. The shared date is a calendar label stored at noon UTC; UI date presentation and international disclosure require review. After removal, private decision data is deleted; retry fails closed and the recipient retains their previously imported ledger record. This remains an unpublished draft, not effective legal text.

## Staged UI and account-erasure boundary
Incoming cards remain informational unless the explicit client/server rollout flags are enabled in an approved isolated environment. Accept/decline does not post money; only explicit account selection and the atomic save action records a transaction. Unknown responses retry the same mapping; no offline posting fallback. Pending account erasure blocks new imports. Date presentation and full market translations remain subject to review. No published legal document is modified.

## Calendar date presentation amendment
For a date-only imported transaction, canonical UTC noon remains the stored timestamp; the app's normalized display treats it as a local calendar label rather than the sender's instant. This is not a claimed transaction time. Review export and edit behavior separately. This draft is not published.
