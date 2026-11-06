import React from 'react';
import { SubHeader } from '../components/ui';
import { t as tr, rich } from '../lib/i18n';
import { formatDate } from '../lib/format';
import { MovoMark } from '../components/MovoLogo';
import legalSupplement from '../lib/legalSupplement.json';

const TERMS_EFFECTIVE_DATE = '2026-11-06T12:00:00Z';
const PRIVACY_EFFECTIVE_DATE = '2026-11-06T12:00:00Z';

function LegalNavigation({ c, current }) {
  return <nav className="legal-nav" aria-label={tr('Legal documents')}>
    <button type="button" className={current === 'TermsOfService' ? 'selected' : ''} aria-current={current === 'TermsOfService' ? 'page' : undefined} onClick={() => c.openLegal?.('TermsOfService')}>{tr('Terms of Service')}</button>
    <button type="button" className={current === 'PrivacyPolicy' ? 'selected' : ''} aria-current={current === 'PrivacyPolicy' ? 'page' : undefined} onClick={() => c.openLegal?.('PrivacyPolicy')}>{tr('Privacy Policy')}</button>
  </nav>;
}

/**
 * Additional policy disclosures are one shared source for the in-app policy
 * and the public standalone policy pages. English text remains canonical until
 * legal translation review is completed.
 */
export function LegalSupplement({ kind }) {
  const sections = legalSupplement[kind] || [];
  return <div data-legal-supplement={kind} lang="en">
    {sections.map(section => <section className="legal-section" key={section.heading}>
      <h2>{section.heading}</h2>
      {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
      {(section.links || []).length > 0 && <p className="legal-supplement-links">
        {section.links.map(link => <React.Fragment key={link.url}>
          <a href={link.url} target="_blank" rel="noopener noreferrer">{link.label}</a>{' '}
        </React.Fragment>)}
      </p>}
    </section>)}
  </div>;
}

function LegalPage({ c, title, current, effectiveDate, children }) {
  const back = c.legalReturnView || 'Profile';
  return <>
    <SubHeader title={title} onBack={() => c.go(back)} />
    <article className="legal-page" aria-labelledby="legal-title">
      <header className="legal-intro">
        <div className="legal-intro-copy">
          <p className="legal-eyebrow">{tr('MOVO · IMPORTANT INFORMATION')}</p>
          <h2 id="legal-title">{title}</h2>
          <p>{tr('Effective date: {date}', { date: formatDate(effectiveDate, { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }, 'effective') })}</p>
        </div>
        <div className="legal-intro-brand" aria-label="MOVO">
          <MovoMark size={44} tone="color" />
          <span>MOVO</span>
        </div>
      </header>
      <LegalNavigation c={c} current={current} />
      {children}
      <LegalSupplement kind={current === 'TermsOfService' ? 'terms' : 'privacy'} />
      <footer className="legal-contact">
        <h2>{tr('Questions or privacy requests?')}</h2>
        <p>{rich('Contact the MOVO service team at {link}. Please do not email passwords, card security codes, one-time passcodes, or unnecessary financial details.', { link: <a href="mailto:support@nasrinai.com">{tr('support@nasrinai.com')}</a> })}</p>
      </footer>
    </article>
  </>;
}

export function TermsOfService({ c }) {
  return <LegalPage c={c} title={tr('Terms of Service')} current="TermsOfService" effectiveDate={TERMS_EFFECTIVE_DATE}>
    <section className="legal-section">
      <h2>{tr('1. What MOVO does')}</h2>
      <p>{tr('MOVO is a personal finance tracking tool that lets you record, organize, review, and export financial information you choose to provide. Unless a screen explicitly confirms otherwise, displayed balances and totals are calculations from the records available in MOVO and are not verified bank balances.')}</p>
      <p>{tr('MOVO is not a bank, payment processor, credit provider, accounting firm, tax adviser, investment adviser, or emergency service. It does not connect to your bank or move money. Optional phone automations that you set up yourself can send MOVO the details of a payment or bank notification so it can be recorded.')}</p>
      <h3>{tr('Store subscriptions and billing')}</h3>
      <p>{tr('Subscriptions purchased through the MOVO iOS or Android app are billed and managed by Apple or Google. The store shows the price, billing period, applicable taxes, and renewal terms before purchase. Subscriptions renew automatically unless you cancel through your Apple or Google account before the renewal date. You can restore eligible purchases from the same store account while signed in to the MOVO account originally linked to the purchase. Deleting your MOVO account does not cancel a store subscription.')}</p>
    </section>
    <section className="legal-section">
      <h2>{tr('2. Your account and responsibilities')}</h2>
      <ul>
        <li>{tr('Provide accurate account information and protect access to your device and sign-in credentials.')}</li>
        <li>{tr('Use only accounts and financial records you are authorized to access, and review imported records for errors.')}</li>
        <li>{tr('Do not submit bank passwords, card PINs, CVVs, one-time passcodes, government identifiers, or other credentials that MOVO does not need.')}</li>
        <li>{tr('Do not misuse the service, attempt to access another person\'s records, interfere with security controls, or use MOVO unlawfully.')}</li>
      </ul>
      <p>{tr('You must be legally able to enter into these terms where you live. If you are not, use MOVO only with the permission and supervision of a parent or legal guardian where permitted by law.')}</p>
    </section>
    <section className="legal-section">
      <h2>{tr('3. Local data, cloud accounts, and exports')}</h2>
      <p>{tr('Local mode stores manually entered financial records and accounts in this browser\'s local storage. They persist across page reloads in the same browser profile, but they are not synced to another device and can be removed by clearing browser data or using Clear All Data. Browser storage is not encrypted by MOVO itself. Keep a separate copy of important records.')}</p>
      <p>{tr('Custom card-sticker artwork is cropped in your browser and saved in browser storage on this device. MOVO does not send that artwork to its cloud database or sync it to another device. Clear All Data removes custom sticker artwork as well as local financial records.')}</p>
      <p>{tr('When cloud features are available and you sign in, records are stored in MOVO\'s configured cloud database and access is restricted by account-scoped authorization controls. Keep your own records where needed. CSV exports are generated from the records currently available to your session and may contain sensitive financial information; store and share them carefully.')}</p>
    </section>
    <section className="legal-section">
      <h2>{tr('4. NasrinAI features')}</h2>
      <p>{tr('If you choose to use the NasrinAI financial copilot and affirm its consent checkbox, MOVO may send your question and a limited, user-scoped snapshot of relevant financial records to NasrinAI to generate a response. You can decline consent and continue using other MOVO features. Chat responses may be inaccurate, incomplete, or outdated and are for informational assistance only.')}</p>
      <p>{rich('NasrinAI does not execute financial transactions for you through MOVO chat. You remain responsible for checking calculations and making financial decisions. See the {privacy} for details about data handling.', { privacy: <button type="button" className="inline-legal-link" onClick={() => c.openLegal?.('PrivacyPolicy')}>{tr('Privacy Policy')}</button> })}</p>
    </section>
    <section className="legal-section">
      <h2>{tr('5. MOVO content and intellectual property')}</h2>
      <p>{tr('Except for your own records, third-party materials, and components governed by their own licences, the MOVO name, interface, software, and documentation belong to the service operator or its licensors. You may use MOVO for your own lawful personal tracking. Do not copy, redistribute, reverse engineer, or misuse the service except where applicable law permits it.')}</p>
    </section>
    <section className="legal-section">
      <h2>{tr('6. Availability and changes')}</h2>
      <p>{tr('Features may be in preview, unavailable, or changed as the service develops. We will label unsupported features where practical and may temporarily suspend functionality to maintain security, reliability, or comply with law. No particular uptime, backup, or recovery time is guaranteed.')}</p>
    </section>
    <section className="legal-section">
      <h2>{tr('7. Your content and acceptable use')}</h2>
      <p>{tr('You retain responsibility for the information you enter or import and must have the rights and authority needed to use it. You authorize MOVO to process that information only as needed to provide the features you request, secure the service, and comply with applicable law. Do not upload malware, unlawful content, or another person\'s information without proper authority.')}</p>
    </section>
    <section className="legal-section">
      <h2>{tr('8. Disclaimers and limits')}</h2>
      <p>{tr('To the extent permitted by applicable law, MOVO is provided on an “as available” basis. We do not warrant that every calculation, categorization, import, AI response, or record will be error-free. You should independently verify important information and keep backups of records that matter to you.')}</p>
      <p>{tr('Nothing in these terms excludes or limits a right or liability that cannot lawfully be excluded or limited. To the extent permitted by law, MOVO is not responsible for indirect losses arising from your reliance on unverified records or AI-generated information.')}</p>
    </section>
    <section className="legal-section">
      <h2>{tr('9. Suspension, deletion, and changes to these terms')}</h2>
      <p>{tr('You may stop using MOVO at any time. You can permanently delete your cloud account and its records in Settings → Delete Account, or ask the service team to do it. Clearing local browser data does not delete cloud records. Some records may need to be retained where lawfully required or to resolve security, fraud, or legal issues.')}</p>
      <p>{tr('We may update these terms as the product changes. We will update the effective date above when the text changes. Continued use after an update is subject to applicable law and any consent or notice requirements that apply.')}</p>
    </section>
    <section className="legal-section">
      <h2>{tr('10. Applicable law and resolving disputes')}</h2>
      <p>{tr('These terms are subject to the laws and mandatory consumer protections that apply to the service and your use of it. If a concern arises, please contact the service team first so we can try to resolve it. Nothing in these terms removes rights that cannot be waived under applicable law.')}</p>
    </section>
    <section className="legal-section">
      <h2>{tr('11. Contact')}</h2>
      <p>{rich('For questions about these terms, email {link}.', { link: <a href="mailto:support@nasrinai.com">{tr('support@nasrinai.com')}</a> })}</p>
    </section>
  </LegalPage>;
}

export function PrivacyPolicy({ c }) {
  return <LegalPage c={c} title={tr('Privacy Policy')} current="PrivacyPolicy" effectiveDate={PRIVACY_EFFECTIVE_DATE}>
    <section className="legal-section">
      <h2>{tr('1. Who is responsible for your data')}</h2>
      <p>{rich('The MOVO service team operates MOVO and is responsible for the personal information described in this policy. For privacy questions or requests, contact {link}. This policy describes how MOVO handles information and should be read with applicable privacy laws, including the Philippines\' Data Privacy Act of 2012 where it applies.', { link: <a href="mailto:support@nasrinai.com">{tr('support@nasrinai.com')}</a> })}</p>
    </section>
    <section className="legal-section">
      <h2>{tr('2. Information MOVO may handle')}</h2>
      <ul>
        <li><strong>{tr('Account information:')}</strong> {tr('email address and, if provided, display name and profile details returned by your sign-in provider.')}</li>
        <li><strong>{tr('Financial records:')}</strong> {tr('account labels and types, institution names, opening balances, transaction descriptions, amounts, dates, categories, notes, and other details you manually enter or import.')}</li>
        <li><strong>{tr('Preferences and artwork:')}</strong> {tr('theme, accent color, display choices, notification read-state or settings, card-style selections, and custom card-sticker artwork saved in browser storage.')} {tr('When you are signed in, preferences (but not sticker artwork or scenery photos) are also saved to your account so they follow you across devices.')}</li>
        <li><strong>{tr('Phone automations:')}</strong> {tr('payment and bank-notification details that shortcuts you set up send to MOVO (amount, merchant, card or account), and records of automations that could not be logged until you log or archive them.')}</li>
        <li><strong>{tr('Voice chat:')}</strong> {tr('when you talk with NasrinAI, short audio clips are sent for transcription and spoken replies are generated; MOVO does not store the audio.')}</li>
        <li><strong>{tr('NasrinAI chat:')}</strong> {tr('your message, conversation identifier, assistant reply, and—only after you affirm the relevant consent—the limited financial context needed for the request.')}</li>
        <li><strong>{tr('Technical information:')}</strong> {tr('basic request and error metadata needed to operate and protect the service. MOVO\'s chat error logging is designed to avoid recording prompts, financial records, or secret values.')}</li>
      </ul>
      <p>{tr('Please do not submit passwords, card PINs, CVVs, one-time passcodes, or unnecessary sensitive personal information.')}</p>
    </section>
    <section className="legal-section">
      <h2>{tr('Store purchase information:')}</h2>
      <p>{tr('When you subscribe through Apple or Google, the store processes your payment. MOVO receives product identifiers, transaction and purchase-verification data, subscription status, and expiry information to verify and provide your entitlement. Google purchase tokens are used transiently for verification; MOVO stores a one-way hash. MOVO does not receive or store your full payment card number or store-account password.')}</p>
      <p>{tr('You can request account deletion in MOVO or at movo.nasrinai.com/account-deletion.html. Deleting your MOVO account does not automatically cancel a subscription billed by Apple or Google; cancel it in your store account to stop renewal.')}</p>
    </section>
    <section className="legal-section">
      <h2>{tr('3. Local mode and cloud mode')}</h2>
      <p>{tr('In local mode, manually entered financial records and accounts are stored in this browser\'s local storage and persist across page reloads in the same browser profile. They are not synced to other devices and can be removed by clearing browser data or using Clear All Data. MOVO does not encrypt browser storage itself; anyone with access to your unlocked device or browser profile may be able to inspect locally stored information.')}</p>
      <p>{tr('Custom card-sticker artwork is processed in your browser and saved locally on this device, including when you are signed in. It is not sent to MOVO\'s cloud database. You can remove individual stickers from Card Style or remove all local sticker artwork with Clear All Data. Browser storage can be unavailable or full; MOVO will show an error when it cannot confirm that a sticker was saved or removed.')}</p>
      <p>{tr('When you sign in and use cloud features, MOVO uses its configured authentication and database services. Database policies and server-side ownership checks are intended to restrict records to the authenticated account. Do not use cloud features on a shared device unless you can sign out and protect the device afterward.')}</p>
    </section>
    <section className="legal-section">
      <h2>{tr('4. How information is used')}</h2>
      <ul>
        <li>{tr('Provide dashboards, transaction lists, account summaries, search, filters, imports, and exports that you request.')}</li>
        <li>{tr('Authenticate you, protect account boundaries, prevent abuse, troubleshoot errors, and maintain service reliability.')}</li>
        <li>{tr('Save your selected preferences and notification read state.')}</li>
        <li>{tr('Generate a NasrinAI response when you actively send a message and affirm the financial-context consent.')}</li>
        <li>{tr('Respond to valid legal requests and exercise or defend legal claims where permitted by law.')}</li>
      </ul>
      <p>{tr('MOVO does not sell your personal financial records. We do not use your records for unrelated marketing purposes in the current product behavior described here.')}</p>
    </section>
    <section className="legal-section">
      <h2>{tr('5. When information is shared')}</h2>
      <p>{tr('MOVO uses service providers for hosting, authentication, and cloud storage, including Vercel and Supabase where configured. Those providers may process technical or account data to provide their services under their own terms and contractual arrangements.')}</p>
      <p>{tr('When you affirm the NasrinAI consent and send a chat message, MOVO sends your message and a limited, account-scoped snapshot of relevant account labels, recent transactions, and budgets to NasrinAI. NasrinAI and any providers it uses may process submitted content under their applicable policies. You can use MOVO without granting this chat-specific consent.')}</p>
      <p>{tr('Information may also be disclosed where required by law, to address security incidents, or to protect rights and safety. Service providers may process data in locations outside your country; the exact location can depend on provider configuration.')}</p>
    </section>
    <section className="legal-section">
      <h2>{tr('6. Retention and deletion')}</h2>
      <p>{tr('Local browser preferences, manually entered financial records, manually created accounts, and custom sticker artwork are stored in this browser until cleared. This storage is device-specific and is not encrypted by MOVO itself. Clear All Data removes preferences, local finance records and custom sticker artwork; individual stickers can also be removed from Card Style. Things you delete in MOVO stay in the Archive for 90 days so you can restore them, and are then deleted. Cloud records and chat history remain while your account is active. Deleting your account in Settings → Delete Account permanently removes your cloud records; it does not remove data stored in a browser, which you can clear with Clear All Data.')}</p>
      <p>{rich('To request access, correction, export, blocking, or deletion of cloud data, email {link} from the account email when possible. We may ask for reasonable verification. Requests are handled subject to applicable law and legitimate retention requirements. Clearing browser storage does not delete cloud records, and signing out does not itself delete them.', { link: <a href="mailto:support@nasrinai.com">support@nasrinai.com</a> })}</p>
    </section>
    <section className="legal-section">
      <h2>{tr('7. Security')}</h2>
      <p>{tr('MOVO uses authentication, server-side access checks, user-scoped database policies, HTTPS deployment, and secret separation as part of its security design. No internet service or storage method is risk-free, and local browser storage is not encrypted by MOVO itself. Keep your device and the email or sign-in account you use for MOVO secure, and report suspected unauthorized access promptly.')}</p>
    </section>
    <section className="legal-section">
      <h2>{tr('8. Your privacy rights')}</h2>
      <p>{rich('Depending on applicable law, you may have rights to be informed, access or correct personal information, object to certain processing, request erasure or blocking, receive a portable copy, or lodge a complaint with the relevant privacy regulator. Requests can be sent to {link}. We will assess each request under the law that applies.', { link: <a href="mailto:support@nasrinai.com">{tr('support@nasrinai.com')}</a> })}</p>
      <p>{rich('For background, read the official {link} information published by the National Privacy Commission.', { link: <a href="https://privacy.gov.ph/data-privacy-act-/" target="_blank" rel="noreferrer">{tr('Philippines Data Privacy Act of 2012')}</a> })}</p>
    </section>
    <section className="legal-section">
      <h2>{tr('9. Children and policy updates')}</h2>
      <p>{tr('MOVO is a personal finance tool and is not designed for children. If you believe a child has provided personal information without appropriate authorization, contact the service team so the matter can be reviewed.')}</p>
      <p>{tr('We may update this policy as product features and legal requirements change. The effective date at the top identifies the latest published version. Material changes may require additional notice or consent where applicable.')}</p>
    </section>
  </LegalPage>;
}
