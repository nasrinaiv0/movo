# Your Money, Your Data — MOVO Security & Privacy Guide

**Customer-facing explanation | Reviewed 13 November 2026**  
**Product:** MOVO — Money Organizer & Visual Outflow  
**Intended audience:** people considering MOVO or already using it  
**Release status:** proposed public copy; not published to production until this PR is approved and merged.

> **The short answer:** MOVO is designed to help you organize money without asking for your bank password or moving money on your behalf. When you sign in, account-specific database access controls are designed to keep your cloud records separate from other users. You decide whether to use local records, eligible cloud sync, mobile automations, and optional AI assistance. No app can promise perfect security; you still need to protect your device and exports.

## 1. What does MOVO help me do?

**Track money in one place.** Add manually tracked bank accounts, payment cards, cash, e-wallets, and other financial accounts. Record income, spending, payments, and transfers. MOVO displays calculated summaries from the records available to it; those figures are **not bank-verified balances**.

**Reduce repeated entry.** Optional iPhone Shortcuts or supported Android automation setups can send selected payment or notification information to MOVO. You choose whether to set them up. Automation is not an automatic connection to your bank, and you should verify imported or generated entries.

**Plan ahead.** Organize bills, subscriptions, savings goals, budgets, loans, receivables, and due-date reminders where those features are enabled. Use trends, money-flow charts, summaries, and eligible briefings to understand where your money goes.

**Explore, don't blindly follow.** Market watchlists and prices, optional financial insights, and NasrinAI assistance provide information, not verified advice or trading orders. Market data and AI responses can be delayed or inaccurate.

**Work in the way that suits you.** Local mode keeps records on that device. If you sign in and your plan/access supports it, cloud sync can keep eligible records with your account. Some information stays device-only; not everything automatically syncs.

## 2. What MOVO does NOT do

- MOVO is **not a bank, lender, payment processor, financial adviser, or investment brokerage**.
- It does **not** log into your bank, request your online-banking password, independently read your real bank transaction history, or move funds between institutions.
- A payment, transfer, or loan repayment recorded in MOVO is **a tracking entry**, not proof that money actually moved.
- Never enter your full card number, CVV, bank PIN, password, one-time passcode, or identity credentials into MOVO notes or chat.

## 3. How are cloud accounts protected?

**Sign-in and account boundaries.** MOVO uses an authentication service to identify signed-in users. The cloud database is configured with PostgreSQL **Row-Level Security (RLS)**, with access policies and account-specific checks intended to restrict what each user can read or change. Server functions also validate sensitive actions. These controls reduce unauthorized access but are not a guarantee against every bug or security incident.

**Protecting credentials.** Native iOS and Android implementations include secure device storage for applicable sign-in tokens: Apple Keychain on iOS and Android Keystore-backed storage on Android. Privileged backend credentials belong on the server, not in the public app.

**Network and browser protections.** The website is configured for HTTPS and includes security response headers, such as HSTS, frame protection, content-type protections, and a Content Security Policy. These mechanisms reduce some common risks; none is a substitute for updates, testing, or secure device use.

**Extra privacy for support and billing.** MOVO's owner tools restrict privileged access. Apple and Google handle payments for mobile subscriptions. MOVO receives store-verification or entitlement information, not your store-account password or full card details.

## 4. Local storage versus cloud sync: an important difference

| | Local mode | Eligible cloud mode |
|---|---|---|
| Where financial records live | On this device/browser profile | In your account's cloud records; a device copy may also exist |
| Available on another device | No automatic sync | Eligible records can sync after successful authentication and reconciliation |
| If you delete the app or browser storage | Local-only data can be lost | Cloud records may be recoverable after sign-in, but unsynced local changes can be lost |
| If you lose connection | Device records may still be visible and editable, depending on feature | Available cached data can be read; eligible edits are held for later sync |
| Security consideration | Protect the physical device and browser profile | Protect the device **and** your sign-in account |

**Important as of 13 November 2026:** the **production** MOVO implementation does **not yet provide MOVO-managed application-layer encryption for all local financial records**. Existing local browser wallet data and workspace snapshots may be readable to someone with access to an unlocked device or browser profile. The current Privacy Policy and Terms of Service say so. Device operating-system protection is separate from MOVO application encryption.

**In development, not yet live:** PR #289 proposes AES-256-GCM protection for offline financial read caches; PR #290 proposes XChaCha20-Poly1305 protection for local wallet/workspace records and the durable IndexedDB sync journal. Both require release, migration, native-device, and rollback verification before this public statement can change. MOVO does **not** claim that these improvements are already protecting production users.

## 5. What happens to records when the internet is unavailable?

MOVO is designed to retain eligible device records and unsynced changes for later reconciliation. When cloud access fails, last-known data should not be treated as a fresh bank balance. Some cloud-dependent features may be unavailable until the device reconnects. An interrupted sync, conflicting edit, or failed save can require review or retry; there is no promise that every entry is guaranteed to survive device loss, storage clearing, or a failed upgrade.

**Best practice:** keep important exports securely backed up, verify sync status before switching phones, and do not uninstall or clear app data if you still have unsynced transactions.

## 6. Do I have to share my finances with NasrinAI?

**No.** Financial-context sharing for NasrinAI requires a separate in-app choice. If you request AI assistance and grant that consent, MOVO may send a limited relevant financial snapshot with your question to the AI service and supporting providers. These external services may process that content under their applicable policies. You can decline optional AI financial-context sharing and continue using other MOVO features.

AI responses are informational and can be wrong. Always confirm important amounts and decisions independently.

## 7. What controls do users have?

- **Device access:** enable MOVO App Lock and supported Face ID/Touch ID or other biometric unlock options where available. App Lock is a convenience barrier; **it does not itself encrypt local financial records or replace cloud sign-in**.
- **Account and permissions:** use a private device, protect your email/sign-in credentials, and restrict camera/microphone permissions to features you choose.
- **Sync and automation:** decide whether to sign in, turn on eligible cloud sync, and configure phone logging. Review imported records for accuracy.
- **Exports:** CSV and other backups can expose account names, amounts, and notes. Store them privately and delete unnecessary copies.
- **Deletion:** you can request cloud-account deletion from **Settings → Privacy & Data → Delete Account** or use the published account-deletion instructions. Local-only copies on other devices must be cleared there separately. Some backups or legally required records may be retained for lawful periods.
- **Subscriptions:** deleting a MOVO account does **not** cancel a subscription billed by Apple or Google. Cancel it separately in the relevant store account.

## 8. Frequently asked questions

**Can MOVO withdraw money from my bank?** No. MOVO records information; it does not transfer your funds.

**Does MOVO need my bank password or card PIN?** No. Never provide them.

**Can other MOVO users see my records?** MOVO's cloud system uses authenticated, account-scoped database access rules designed to prevent cross-user access. No security control provides an absolute guarantee.

**Is everything encrypted on my phone today?** No. Native sign-in credentials have platform secure-storage protections, but **application-layer encryption of the main offline finance stores is not yet deployed to production**. The pending encryption PRs must be tested and released first.

**Are my records sold to advertisers?** MOVO's current Privacy Policy states that it does not sell users' personal financial records and does not use them for unrelated marketing in the documented product behavior.

**Can I use MOVO without AI?** Yes. The optional NasrinAI financial-context sharing can be declined.

**Does MOVO provide financial advice?** No. Its charts, forecasts, AI replies, and market information are tools to review, not guaranteed or personalized regulated advice.

**What if I lose my phone?** Cloud-synced data may be available after signing in again; device-only and unsynced records may be lost. Keep appropriate backups.

**How do I ask a privacy question or report a concern?** Email **support@nasrinai.com**. Do not include passwords, card PINs, CVVs, or one-time codes.

## 9. More information

- Privacy Policy: https://movo.nasrinai.com/privacy
- Terms of Service: https://movo.nasrinai.com/terms
- Account deletion: https://movo.nasrinai.com/account-deletion.html
- Security contact: mailto:support@nasrinai.com

**This guide explains features and precautions; the Privacy Policy and Terms of Service control the formal data-use and service terms.** It is not an independent audit, certification, penetration-test report, zero-knowledge encryption claim, or guarantee that breaches are impossible.

---

### Editorial approval and release checklist (internal; omit from public page)

- [ ] Verify the exact deployed main branch and Supabase access controls before publishing.
- [ ] Do not advertise offline encryption as live while PR #289 or #290 remains unmerged or unverified on physical devices.
- [ ] Reconcile every statement with `public/privacy.html` and `public/terms.html`.
- [ ] Re-review AI consent, native key handling, cloud permissions, data retention, and app-store metadata.
- [ ] Keep an accessible link in Settings and legal documents; check keyboard, reduced motion, contrast, iPhone Safari, Android Chrome, and native browser presentation.
- [ ] Confirm support contact receives requests and does not require sending sensitive credentials.
- [ ] If encryption ships, update **all three** disclosures together, with native migration evidence; do not silently change local-storage claims.
