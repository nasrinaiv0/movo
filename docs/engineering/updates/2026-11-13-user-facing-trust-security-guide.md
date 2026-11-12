# MOVO customer security and features explanation — 2026-11-13

## Requested outcome

Publish a premium, comprehensible public explanation of **what MOVO does, how it protects user data, what is optional, and what protections are NOT yet live**. Make it discoverable to iOS/Android/web users and align with the currently deployed legal copy. No production changes before PR review.

### Evidence reviewed before editing

- `main` at `636eb358f217d8dd645b223e89c1f87db3b12854`, `public/privacy.html`, `public/terms.html`, `public/account-deletion.html`, `public/.well-known/security.txt`, `vercel.json`, `src/screens/Settings.js`, `src/lib/nativeSecureAuthStorage.js`, `src/lib/localFinanceStore.js`, `src/lib/offlineWorkspaceStore.js`, `src/lib/appLock.js`, `api/nasrinai/chat.js`, `api/owner/index.js`.
- Read-only production Supabase check earlier on 13 November 2026: RLS enabled for the 44 public tables listed in the inspection; financial tables have access policies. **Not** a substitute for active cross-tenant exploit testing. Security advisor continues to flag 15 authenticated-callable SECURITY DEFINER functions; do not claim certification or perfect authorization.
- PR #289 (offline financial read-cache AES-GCM) and PR #290 (local finance/workspace/IDB encryption) both remain **open and unmerged**. Do not imply either is deployed.
- Current Privacy Policy and Terms explicitly say MOVO does **not** encrypt browser local storage itself. The new page and customer guide must preserve that fact until encryption has shipped and all native migration checks have been verified.
- Android app prohibits standard backup in manifest; native auth credentials are stored via secure platform vault. App Lock is **not encryption**. Web CSP is configured but includes broad network/image sources, so do not claim resistance to active XSS.

## Changed files (documented before commit)

1. `public/security.html`: static, no-JavaScript, accessible, responsive dark/light Security & Data Guide with hero, diagram, six feature cards, sign-in/cloud/app-lock explanations, local-vs-cloud comparison, conspicuous encryption-not-live warning, consent, export/deletion information, FAQs and official policy/support links. Uses native HTML details; no trackers or third-party assets; motion disabled for reduced-motion users; no gradients.
2. `docs/security/MOVO_USER_DATA_SECURITY_GUIDE.md`: canonical editorial guide, answers, customer copy, and **internal prepublication verification checklist**. Internal review list stays out of the public HTML.
3. `vercel.json`: one static `/security` to `/security.html` rewrite. Preserve the existing global security headers.
4. `public/privacy.html`, `public/terms.html`: navigation **links only**, without changing legal clauses, effective dates, data handling definitions, or published promises.
5. `src/screens/Settings.js`: one new menu row under Security & Privacy, opening the canonical HTTPS guide through the already-installed Capacitor Browser plugin. Reuses existing translated strings so no new untranslated keys are introduced.
6. `src/screens/Settings.test.js`: new UI regression for the Settings link and URL.
7. `src/lib/securityGuideContracts.test.js`: new test checks route, legal navigation, presence of accuracy disclaimers, version dates, absence of remote scripts and gradients, and coverage of financial privacy choices.
8. `docs/PR_PROGRESS.md`: this update recorded before commit.

## Marketing / legal accuracy gates

- Do NOT say: guaranteed secure, hacker-proof, military-grade, bank-level, end-to-end encrypted, zero-knowledge, fully encrypted locally, GDPR/Philippines-DPA certified/compliant, SOC2/ISO-certified, independently penetration-tested, or backed by an external audit.
- Do say: account-scoped cloud policies **designed** to restrict access; native sign-in credential storage; user choice of local/eligible cloud; optional phone automations; optional consent for AI financial context; not a bank or real-money transfer service; sensitive exports; local data can be lost; account deletion and store cancellation are distinct; encryption PRs are **not deployed**.
- Avoid publishing operational vulnerabilities or internal audit details on the customer page; keep these in restricted developer/review documentation. Do not touch runtime DB policies or apply new migrations for a documentation-only request.
- Security guide is educational, not a new legal contract. Published Privacy Policy and Terms of Service stay authoritative.

## Tests and shipping gates

- Required: exact-head Jest/i18n/TS/build, security guide contracts, Settings interaction test, Vercel preview `READY`, clean PR check, mobile layout and native browser behavior review. **Do not merge until required gates pass and owner approves.**
- A polished four-page editable Word explainer was also authored for the user, rendered to four page PNGs and inspected. Word document does not contain code, secrets, or private user data.
- Pending: manual iPhone Safari / Android Chrome preview smoke, third-party privacy/legal approval, real-device Browser plugin tap where available.

## CI issue found and fixed in next commit (precommit record)

Initial PR #294 commit eecbfbd: Vercel build reported one new Settings test failing (`jest.spyOn(...).mockResolvedValue is not a function`). This is a test setup defect caused by spying on Capacitor's proxy, not an app feature or security breach. Replace that spy with an explicit `jest.mock('@capacitor/browser')`. Keep the actual `Browser.open` implementation in the app. First preview was ERROR; do not merge until a new exact-head READY preview and test success. Also simplify customer page wording by omitting internal PR identifiers; current production encryption limitation remains explicit.
