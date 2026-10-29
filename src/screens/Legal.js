import React from 'react';
import { SubHeader } from '../components/ui';

const EFFECTIVE_DATE = 'October 29, 2026';

function LegalNavigation({ c, current }) {
  return <nav className="legal-nav" aria-label="Legal documents">
    <button type="button" className={current === 'TermsOfService' ? 'selected' : ''} aria-current={current === 'TermsOfService' ? 'page' : undefined} onClick={() => c.openLegal?.('TermsOfService')}>Terms of Service</button>
    <button type="button" className={current === 'PrivacyPolicy' ? 'selected' : ''} aria-current={current === 'PrivacyPolicy' ? 'page' : undefined} onClick={() => c.openLegal?.('PrivacyPolicy')}>Privacy Policy</button>
  </nav>;
}

function LegalPage({ c, title, current, children }) {
  const back = c.legalReturnView || 'Profile';
  return <>
    <SubHeader title={title} onBack={() => c.go(back)} />
    <article className="legal-page" aria-labelledby="legal-title">
      <header className="legal-intro">
        <p className="legal-eyebrow">MOVO · IMPORTANT INFORMATION</p>
        <h2 id="legal-title">{title}</h2>
        <p>Effective date: {EFFECTIVE_DATE}</p>
      </header>
      <LegalNavigation c={c} current={current} />
      {children}
      <footer className="legal-contact">
        <h2>Questions or privacy requests?</h2>
        <p>Contact the MOVO service team at <a href="mailto:support@nasrinai.com">support@nasrinai.com</a>. Please do not email passwords, card security codes, one-time passcodes, or unnecessary financial details.</p>
      </footer>
    </article>
  </>;
}

export function TermsOfService({ c }) {
  return <LegalPage c={c} title="Terms of Service" current="TermsOfService">
    <section className="legal-section">
      <h2>1. What MOVO does</h2>
      <p>MOVO is a personal finance tracking tool that lets you record, organize, review, and export financial information you choose to provide. Some screens may contain sample or demonstration records. Unless a screen explicitly confirms otherwise, displayed balances and totals are calculations from the records available in MOVO and are not verified bank balances.</p>
      <p>MOVO is not a bank, payment processor, credit provider, accounting firm, tax adviser, investment adviser, or emergency service. It does not automatically connect to your bank or read private Apple Pay history in this version.</p>
    </section>
    <section className="legal-section">
      <h2>2. Your account and responsibilities</h2>
      <ul>
        <li>Provide accurate account information and protect access to your device and sign-in credentials.</li>
        <li>Use only accounts and financial records you are authorized to access, and review imported records for errors.</li>
        <li>Do not submit bank passwords, card PINs, CVVs, one-time passcodes, government identifiers, or other credentials that MOVO does not need.</li>
        <li>Do not misuse the service, attempt to access another person's records, interfere with security controls, or use MOVO unlawfully.</li>
      </ul>
      <p>You must be legally able to enter into these terms where you live. If you are not, use MOVO only with the permission and supervision of a parent or legal guardian where permitted by law.</p>
    </section>
    <section className="legal-section">
      <h2>3. Local data, cloud accounts, and exports</h2>
      <p>Local/demo mode is limited to the current browser session for financial records in this version; preferences may be saved in browser storage. Browser storage is device-specific and is not encrypted by MOVO itself. Do not rely on local/demo mode as your only copy of important records.</p>
      <p>When cloud features are available and you sign in, records are stored in MOVO's configured cloud database and access is restricted by account-scoped authorization controls. Keep your own records where needed. CSV exports are generated from the records currently available to your session and may contain sensitive financial information; store and share them carefully.</p>
    </section>
    <section className="legal-section">
      <h2>4. NasrinAI features</h2>
      <p>If you choose to use the NasrinAI financial copilot and affirm its consent checkbox, MOVO may send your question and a limited, user-scoped snapshot of relevant financial records to NasrinAI to generate a response. You can decline consent and continue using other MOVO features. Chat responses may be inaccurate, incomplete, or outdated and are for informational assistance only.</p>
      <p>NasrinAI does not execute financial transactions for you through MOVO chat. You remain responsible for checking calculations and making financial decisions. See the <button type="button" className="inline-legal-link" onClick={() => c.openLegal?.('PrivacyPolicy')}>Privacy Policy</button> for details about data handling.</p>
    </section>
    <section className="legal-section">
      <h2>5. Availability and changes</h2>
      <p>Features may be in preview, unavailable, or changed as the service develops. We will label unsupported features where practical and may temporarily suspend functionality to maintain security, reliability, or comply with law. No particular uptime, backup, or recovery time is guaranteed.</p>
    </section>
    <section className="legal-section">
      <h2>6. Your content and acceptable use</h2>
      <p>You retain responsibility for the information you enter or import and must have the rights and authority needed to use it. You authorize MOVO to process that information only as needed to provide the features you request, secure the service, and comply with applicable law. Do not upload malware, unlawful content, or another person's information without proper authority.</p>
    </section>
    <section className="legal-section">
      <h2>7. Disclaimers and limits</h2>
      <p>To the extent permitted by applicable law, MOVO is provided on an “as available” basis. We do not warrant that every calculation, categorization, import, AI response, or record will be error-free. You should independently verify important information and keep backups of records that matter to you.</p>
      <p>Nothing in these terms excludes or limits a right or liability that cannot lawfully be excluded or limited. To the extent permitted by law, MOVO is not responsible for indirect losses arising from your reliance on unverified records or AI-generated information.</p>
    </section>
    <section className="legal-section">
      <h2>8. Suspension, deletion, and changes to these terms</h2>
      <p>You may stop using MOVO at any time. You can sign out of a cloud account or clear local browser data, but clearing local data does not delete cloud records. To request deletion of cloud account data, contact the service team and complete any reasonable identity verification. Some records may need to be retained where lawfully required or to resolve security, fraud, or legal issues.</p>
      <p>We may update these terms as the product changes. We will update the effective date above when the text changes. Continued use after an update is subject to applicable law and any consent or notice requirements that apply.</p>
    </section>
    <section className="legal-section">
      <h2>9. Contact</h2>
      <p>For questions about these terms, email <a href="mailto:support@nasrinai.com">support@nasrinai.com</a>.</p>
    </section>
  </LegalPage>;
}

export function PrivacyPolicy({ c }) {
  return <LegalPage c={c} title="Privacy Policy" current="PrivacyPolicy">
    <section className="legal-section">
      <h2>1. Who is responsible for your data</h2>
      <p>The MOVO service operator is responsible for the personal information handled through MOVO. For privacy questions or requests, contact <a href="mailto:support@nasrinai.com">support@nasrinai.com</a>. This policy is intended to explain MOVO's current product behavior and should be read with applicable privacy laws, including the Philippines' Data Privacy Act of 2012 where it applies.</p>
    </section>
    <section className="legal-section">
      <h2>2. Information MOVO may handle</h2>
      <ul>
        <li><strong>Account information:</strong> email address and, if provided, display name and profile details returned by your sign-in provider.</li>
        <li><strong>Financial records:</strong> account labels and types, institution names, opening balances, transaction descriptions, amounts, dates, categories, notes, and other details you manually enter or import.</li>
        <li><strong>Preferences:</strong> theme, accent color, display choices, and notification read-state or settings saved by the app.</li>
        <li><strong>NasrinAI chat:</strong> your message, conversation identifier, assistant reply, and—only after you affirm the relevant consent—the limited financial context needed for the request.</li>
        <li><strong>Technical information:</strong> basic request and error metadata needed to operate and protect the service. MOVO's chat error logging is designed to avoid recording prompts, financial records, or secret values.</li>
      </ul>
      <p>Please do not submit passwords, card PINs, CVVs, one-time passcodes, or unnecessary sensitive personal information.</p>
    </section>
    <section className="legal-section">
      <h2>3. Local mode and cloud mode</h2>
      <p>In local/demo mode, financial records in this version are held in browser application state and may be lost when the page is refreshed or the browser session ends. Some preferences are stored in browser local storage. MOVO does not encrypt browser storage itself; anyone with access to your unlocked device or browser profile may be able to inspect locally stored information.</p>
      <p>When you sign in and use cloud features, MOVO uses its configured authentication and database services. Database policies and server-side ownership checks are intended to restrict records to the authenticated account. Do not use cloud features on a shared device unless you can sign out and protect the device afterward.</p>
    </section>
    <section className="legal-section">
      <h2>4. How information is used</h2>
      <ul>
        <li>Provide dashboards, transaction lists, account summaries, search, filters, imports, and exports that you request.</li>
        <li>Authenticate you, protect account boundaries, prevent abuse, troubleshoot errors, and maintain service reliability.</li>
        <li>Save your selected preferences and notification read state.</li>
        <li>Generate a NasrinAI response when you actively send a message and affirm the financial-context consent.</li>
        <li>Respond to valid legal requests and exercise or defend legal claims where permitted by law.</li>
      </ul>
      <p>MOVO does not sell your personal financial records. We do not use your records for unrelated marketing purposes in the current product behavior described here.</p>
    </section>
    <section className="legal-section">
      <h2>5. When information is shared</h2>
      <p>MOVO uses service providers for hosting, authentication, and cloud storage, including Vercel and Supabase where configured. Those providers may process technical or account data to provide their services under their own terms and contractual arrangements.</p>
      <p>When you affirm the NasrinAI consent and send a chat message, MOVO sends the message and a limited, account-scoped financial snapshot to NasrinAI. NasrinAI and any providers it uses may process that submitted content to produce the response under their applicable policies. Do not send information you are not comfortable sharing with the AI service. You can use MOVO without granting this chat-specific consent.</p>
      <p>Information may also be disclosed where required by law, to address security incidents, or to protect rights and safety. Service providers may process data in locations outside your country; the exact location can depend on provider configuration.</p>
    </section>
    <section className="legal-section">
      <h2>6. Retention and deletion</h2>
      <p>Local browser preferences remain until changed or cleared. Local/demo financial records are not guaranteed to persist in this version. Cloud records and chat history may remain while your account is active and for as long as reasonably needed to provide the service, meet legal obligations, resolve disputes, or protect the service. A fixed automatic deletion schedule is not currently published.</p>
      <p>To request access, correction, export, blocking, or deletion of cloud data, email <a href="mailto:support@nasrinai.com">support@nasrinai.com</a> from the account email when possible. We may ask for reasonable verification. Requests are handled subject to applicable law and legitimate retention requirements. Clearing browser storage does not delete cloud records, and signing out does not itself delete them.</p>
    </section>
    <section className="legal-section">
      <h2>7. Security</h2>
      <p>MOVO uses authentication, server-side access checks, user-scoped database policies, HTTPS deployment, and secret separation as part of its security design. No internet service or storage method is risk-free, and local browser storage is not encrypted by MOVO itself. Keep your device secure, use a unique password, and report suspected unauthorized access promptly.</p>
    </section>
    <section className="legal-section">
      <h2>8. Your privacy rights</h2>
      <p>Depending on applicable law, you may have rights to be informed, access or correct personal information, object to certain processing, request erasure or blocking, receive a portable copy, or lodge a complaint with the relevant privacy regulator. Requests can be sent to <a href="mailto:support@nasrinai.com">support@nasrinai.com</a>. We will assess each request under the law that applies.</p>
      <p>For background, read the official <a href="https://privacy.gov.ph/data-privacy-act-/" target="_blank" rel="noreferrer">Philippines Data Privacy Act of 2012</a> information published by the National Privacy Commission.</p>
    </section>
    <section className="legal-section">
      <h2>9. Children and policy updates</h2>
      <p>MOVO is a personal finance tool and is not designed for children. If you believe a child has provided personal information without appropriate authorization, contact the service team so the matter can be reviewed.</p>
      <p>We may update this policy as product features and legal requirements change. The effective date at the top identifies the latest published version. Material changes may require additional notice or consent where applicable.</p>
    </section>
  </LegalPage>;
}
