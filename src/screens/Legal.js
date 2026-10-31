import React from 'react';
import { SubHeader } from '../components/ui';
import { t as tr, rich } from '../lib/i18n';
import { formatDate } from '../lib/format';

const TERMS_EFFECTIVE_DATE = '2026-10-31T12:00:00Z';
const PRIVACY_EFFECTIVE_DATE = '2026-10-31T12:00:00Z';

function LegalNavigation({ c, current }) {
  return <nav className="legal-nav" aria-label={tr('Legal documents')}>
    <button type="button" className={current === 'TermsOfService' ? 'selected' : ''} aria-current={current === 'TermsOfService' ? 'page' : undefined} onClick={() => c.openLegal?.('TermsOfService')}>{tr('Terms of Service')}</button>
    <button type="button" className={current === 'PrivacyPolicy' ? 'selected' : ''} aria-current={current === 'PrivacyPolicy' ? 'page' : undefined} onClick={() => c.openLegal?.('PrivacyPolicy')}>{tr('Privacy Policy')}</button>
  </nav>;
}

function LegalPage({ c, title, current, effectiveDate, children }) {
  const back = c.legalReturnView || 'Profile';
  return <>
    <SubHeader title={title} onBack={() => c.go(back)} />
    <article className="legal-page" aria-labelledby="legal-title">
      <header className="legal-intro">
        <p className="legal-eyebrow">{tr('MOVO · IMPORTANT INFORMATION')}</p>
        <p className="legal-brand-name">MOVO — Money Organizer &amp; Visual Outflow</p>
        <h2 id="legal-title">{title}</h2>
        <p>{tr('Effective date: {date}', { date: formatDate(effectiveDate, { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }, 'effective') })}</p>
      </header>
      <LegalNavigation c={c} current={current} />
      <aside className="legal-readiness-notice" role="note" aria-label={tr('Important publication notice')}>
        <strong>{tr('Important before using real financial data')}</strong>
        <p>{tr('The privacy contact details are published below, but the operator\'s legal entity status, actual retention/deletion behavior, provider disclosures, and security claims still require verification. Do not rely on this notice as a guarantee of any unverified technical control.')}</p>
      </aside>
      {children}
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
      <p>{tr('MOVO is a personal finance tracking tool that lets you record, organize, review, and export financial information you choose to provide. Some screens may contain sample or demonstration records. Unless a screen explicitly confirms otherwise, displayed balances and totals are calculations from the records available in MOVO and are not verified bank balances.')}</p>
      <p>{tr('MOVO is not a bank, payment processor, credit provider, accounting firm, tax adviser, investment adviser, or emergency service. It does not automatically connect to your bank or read private Apple Pay history in this version.')}</p>
    </section>
    <section className="legal-section">
      <h2>{tr('2. Your account and responsibilities')}</h2>
      <ul>
        <li>{tr('Provide accurate account information and protect access to your device and sign-in credentials.')}</li>
        <li>{tr('Use only accounts and financial records you are authorized to access, and review imported records for errors.')}</li>
        <li>{tr('Do not submit bank passwords, card PINs, CVVs, one-time passcodes, government identifiers, or other credentials that MOVO does not need.')}</li>
        <li>{tr('Do not misuse the service, attempt to access another person\'s records, interfere with security controls, or use MOVO unlawfully.')}</li>
      </ul>
      <p>{tr('MOVO is intended for adults aged 18 and older. Anyone under 18 must not use the service unless use is permitted by applicable law and a parent or legal guardian has provided any required consent and supervision. If MOVO is configured as an adults-only service, that restriction takes precedence. The operator must implement age-appropriate controls where legally required.')}</p>
    </section>
    <section className="legal-section">
      <h2>{tr('3. Local data, cloud accounts, and exports')}</h2>
      <p>{tr('Local/demo mode stores manually entered financial records and accounts in this browser\'s local storage. They persist across page reloads in the same browser profile, but they are not synced to another device and can be removed by clearing browser data or using Clear All Data. Browser storage is not encrypted by MOVO itself. Keep a separate copy of important records.')}</p>
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
      <p>{tr('Except for your own records, third-party materials, and components governed by their own licences, the MOVO name, original interface, software, and documentation are owned by the service operator or its licensors. All third-party names, logos, product names, trademarks, and service marks remain the property of their respective owners. Where shown, third-party names or logos are used only to identify or describe a user-entered institution, merchant, payment method, or related service; their display does not mean that MOVO is affiliated with, sponsored by, partnered with, endorsed by, or advertising on behalf of that institution, merchant, or company. No ownership of a third-party mark is claimed. Display does not grant MOVO any ownership rights in those marks, and use must be limited to what is lawful. A rights holder or authorized representative may request review or removal of a name or logo at any time by emailing support@nasrinai.com with the item and relevant details. MOVO will review the request promptly and take appropriate action, including removal where warranted. Users must not upload or use logos or artwork they are not authorized to use. You may use MOVO for your own lawful personal tracking. Do not copy, redistribute, reverse engineer, or misuse MOVO-owned materials except where applicable law permits it.')}</p>
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
      <p>{tr('You may stop using MOVO at any time. You can sign out of a cloud account or clear local browser data, but clearing local data does not delete cloud records. To request deletion of cloud account data, contact the service team and complete any reasonable identity verification. Some records may need to be retained where lawfully required or to resolve security, fraud, or legal issues.')}</p>
      <p>{tr('We may update these terms as the product changes. We will update the effective date above when the text changes. Continued use after an update is subject to applicable law and any consent or notice requirements that apply.')}</p>
    </section>
    <section className="legal-section">
      <h2>{tr('10. Applicable law and resolving disputes')}</h2>
      <p>{tr('These terms are subject to applicable law, including the laws of the Philippines where applicable. Where relevant, this includes the Data Privacy Act of 2012 (Republic Act No. 10173) and its implementing rules, the Consumer Act of the Philippines (Republic Act No. 7394), and the Electronic Commerce Act of 2000 (Republic Act No. 8792), as amended and interpreted by competent authorities. This reference is not a representation that every legal obligation has already been satisfied. If a concern arises, please contact the service team first so we can try to resolve it. Nothing in these terms excludes, limits, or waives a consumer or other statutory right or remedy that cannot lawfully be excluded, limited, or waived.')}</p>
    </section>
    <section className="legal-section">
      <h2>{tr('11. Contact')}</h2>
      <p>{rich('For questions about these terms, email {link}.', { link: <a href="mailto:support@nasrinai.com">{tr('support@nasrinai.com')}</a> })}</p>
      <p>{tr('Privacy contact: Nasrin Abubakar, Data Protection Officer / privacy contact; telephone +63 947 387 5093; email support@nasrinai.com; address 142 Pag-asa Village, Matina Aplaya, Davao City, Philippines. The operator must verify whether a separate legal entity name or other registration details are required for the service and publish them if applicable.')}</p>
    </section>
    <section className="legal-section">
      <h2>{tr('12. Regional availability and app-store requirements')}</h2>
      <p>{tr('MOVO may be offered only in countries and regions where the operator has decided to make the service available and where distribution is permitted by applicable law and the relevant platform rules. A country or region appearing in the app settings is a localization preference only; it is not a representation that MOVO has completed every legal, regulatory, tax, registration, or licensing review for that location.')}</p>
      <p>{tr('For countries or regions not listed in the settings, MOVO will be offered only where the operator has assessed applicable local requirements and the requirements of the distribution platform, including Apple App Store and Google Play policies. If the operator cannot reasonably establish that a feature or the service may lawfully be offered, or that applicable platform requirements are met, that feature or the service may be unavailable or restricted in that location until reviewed. Platform availability or store approval does not itself establish legal compliance.')}</p>
      <p>{tr('You must use MOVO only where you are legally permitted to do so. Mandatory rights under the laws that apply to you remain unaffected. The operator may restrict a feature or market to comply with law, platform rules, security requirements, or a regulator’s direction, and will provide notice where required by law.')}</p>
    </section>
    <section className="legal-section">
      <h2>{tr('13. Automation and imported information')}</h2>
      <p>{tr('If you configure a shortcut, link, import, or other automation to create a MOVO record, you are responsible for reviewing its permissions, setup, and source. Depending on your setup, transaction details such as a merchant, amount, date, card label, or reference may be passed through a link or automation. An incoming link or notification is not proof that a payment occurred, was authorized, cleared, or came from a financial institution.')}</p>
      <p>{tr('Automation may create an entry without a separate confirmation when you have enabled that behavior. Check the details and correct or delete inaccurate records. Disable the automation and revoke or rotate its access key if you no longer want it to run. MOVO does not guarantee that every transaction will be detected, that duplicate or incorrect records will never occur, or that an automation can prevent, reverse, or verify a payment.')}</p>
    </section>
  </LegalPage>;
}

export function PrivacyPolicy({ c }) {
  return <LegalPage c={c} title={tr('Privacy Policy')} current="PrivacyPolicy" effectiveDate={PRIVACY_EFFECTIVE_DATE}>
    <section className="legal-section">
      <h2>{tr('1. Who is responsible for your data')}</h2>
      <p>{rich('MOVO\'s privacy contact is Nasrin Abubakar, Data Protection Officer / privacy contact. Contact: +63 947 387 5093; {link}; 142 Pag-asa Village, Matina Aplaya, Davao City, Philippines. The operator must verify whether a separate legal entity name or additional registration details are required and publish them if applicable. This policy describes MOVO\'s current documented practices; it is not a certification of legal compliance. Where applicable, processing must comply with the Philippine Data Privacy Act of 2012 (Republic Act No. 10173), its implementing rules, and relevant National Privacy Commission issuances.', { link: <a href="mailto:support@nasrinai.com">{tr('support@nasrinai.com')}</a> })}</p>
      <p><strong>{tr('Important:')}</strong> {tr('Before relying on the service for sensitive financial information, review the disclosures and remember that cloud security, deletion, retention, and provider controls must be verified against actual implementation.')}</p>
    </section>
    <section className="legal-section">
      <h2>{tr('Third-party brands and logos')}</h2>
      <p>{tr('MOVO is not affiliated with, sponsored by, partnered with, endorsed by, or advertising on behalf of any institution, merchant, or company.')}</p>
      <p>{tr('Except for your own records, third-party materials, and components governed by their own licences, the MOVO name, original interface, software, and documentation are owned by the service operator or its licensors. All third-party names, logos, product names, trademarks, and service marks remain the property of their respective owners. Where shown, third-party names or logos are used only to identify or describe a user-entered institution, merchant, payment method, or related service; their display does not mean that MOVO is affiliated with, sponsored by, partnered with, endorsed by, or advertising on behalf of that institution, merchant, or company. No ownership of a third-party mark is claimed. Display does not grant MOVO any ownership rights in those marks, and use must be limited to what is lawful. A rights holder or authorized representative may request review or removal of a name or logo at any time by emailing support@nasrinai.com with the item and relevant details. MOVO will review the request promptly and take appropriate action, including removal where warranted. Users must not upload or use logos or artwork they are not authorized to use. You may use MOVO for your own lawful personal tracking. Do not copy, redistribute, reverse engineer, or misuse MOVO-owned materials except where applicable law permits it.')}</p>
    </section>
    <section className="legal-section">
      <h2>{tr('2. Information MOVO may handle')}</h2>
      <ul>
        <li><strong>{tr('Account information:')}</strong> {tr('email address and, if provided, display name and profile details returned by your sign-in provider.')}</li>
        <li><strong>{tr('Financial records:')}</strong> {tr('account labels and types, institution names, opening balances, transaction descriptions, amounts, dates, categories, notes, and other details you manually enter or import.')}</li>
        <li><strong>{tr('Preferences and artwork:')}</strong> {tr('theme, accent color, display choices, notification read-state or settings, card-style selections, and custom card-sticker artwork saved in browser storage.')}</li>
        <li><strong>{tr('NasrinAI chat:')}</strong> {tr('your message, conversation identifier, assistant reply, and—only after you affirm the relevant consent—the limited financial context needed for the request.')}</li>
        <li><strong>{tr('Technical information:')}</strong> {tr('basic request and error metadata needed to operate and protect the service. MOVO\'s chat error logging is designed to avoid recording prompts, financial records, or secret values.')}</li>
      </ul>
      <p>{tr('Please do not submit passwords, card PINs, CVVs, one-time passcodes, or unnecessary sensitive personal information.')}</p>
    </section>
    <section className="legal-section">
      <h2>{tr('3. Local mode and cloud mode')}</h2>
      <p>{tr('In local/demo mode, manually entered financial records and accounts are stored in this browser\'s local storage and persist across page reloads in the same browser profile. They are not synced to other devices and can be removed by clearing browser data or using Clear All Data. MOVO does not encrypt browser storage itself; anyone with access to your unlocked device or browser profile may be able to inspect locally stored information.')}</p>
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
      <p>{tr('MOVO does not sell personal information or financial records, and does not authorize third parties to use them for their own independent marketing or unrelated commercial benefit. Hosting, authentication, database, and AI providers may process information only as needed to deliver, secure, or support features you request, subject to applicable law and the relevant provider terms. Processing must have an applicable lawful basis and follow transparency, legitimate purpose, proportionality, data quality, and retention principles. Depending on the activity, the lawful basis may be consent, steps necessary to provide a service you request, compliance with a legal obligation, or another basis permitted by law. Consent for optional NasrinAI financial-context sharing is separate and specific to that feature; it should remain off unless you affirmatively opt in. This does not replace the operator\'s required activity-by-activity lawful-basis assessment.')}</p>
    </section>
    <section className="legal-section">
      <h2>{tr('5. When information is shared')}</h2>
      <p>{tr('MOVO uses service providers for hosting, authentication, and cloud storage, including Vercel and Supabase where configured. Those providers may process technical or account data to provide their services under their own terms and contractual arrangements.')}</p>
      <p>{tr('When you affirm the NasrinAI consent and send a chat message, MOVO sends your message and a limited, account-scoped snapshot of relevant account labels, recent transactions, and budgets to NasrinAI. The end-to-end upstream context boundary has not yet been independently verified in the deployed integration; avoid sending real or highly sensitive financial details until that verification and the remaining provider disclosures are complete. NasrinAI and any providers it uses may process submitted content under their applicable policies. You can use MOVO without granting this chat-specific consent.')}</p>
      <p>{tr('Information may also be disclosed where required by law, to address security incidents, or to protect rights and safety. Service providers may process data in locations outside your country; the exact location can depend on provider configuration.')}</p>
    </section>
    <section className="legal-section">
      <h2>{tr('6. Retention and deletion')}</h2>
      <p>{tr('Local browser preferences, manually entered financial records, manually created accounts, and custom sticker artwork are stored in this browser until cleared. This storage is device-specific and is not encrypted by MOVO itself. Clear All Data removes preferences, local finance records and custom sticker artwork; individual stickers can also be removed from Card Style. Local records are separate from cloud records, so clearing local data does not by itself delete cloud data. Cloud records are intended to remain associated with your account while it is active, unless you delete them earlier or applicable law requires otherwise. You can use the deletion controls available in Settings to request or initiate deletion of stored cloud data. Some information may remain temporarily in backups, security logs, or records that must be retained by law or to resolve disputes or security incidents; such exceptions must be limited and handled under applicable law. The operator must verify that the Settings controls actually delete all relevant cloud records and establish a documented retention schedule for each data category before treating this policy as final. Clearing browser storage or local data alone does not delete cloud records.')}</p>
      <p>{rich('To request access, correction, export, blocking, or deletion of cloud data, email {link} from the account email when possible. We may ask for reasonable verification. Requests are handled subject to applicable law and legitimate retention requirements. Clearing browser storage does not delete cloud records, and signing out does not itself delete them.', { link: <a href="mailto:support@nasrinai.com">support@nasrinai.com</a> })}</p>
    </section>
    <section className="legal-section">
      <h2>{tr('7. Security')}</h2>
      <p>{tr('MOVO uses authentication, server-side access checks, user-scoped database policies, HTTPS deployment, and secret separation as part of its security design. No internet service or storage method is risk-free, and local browser storage is not encrypted by MOVO itself. Keep your device secure, use a unique password, and report suspected unauthorized access promptly.')}</p>
    </section>
    <section className="legal-section">
      <h2>{tr('8. Your privacy rights')}</h2>
      <p>{rich('Under the Philippine Data Privacy Act of 2012, where applicable, you may exercise rights recognized by law, which can include being informed, access, correction, objecting to or blocking certain processing, erasure or destruction where legally available, data portability where applicable, and lodging a complaint with the National Privacy Commission (NPC). To request access, correction, deletion, or report a suspected illegal activity involving the service, contact the privacy contact listed above or email support@nasrinai.com. These rights are subject to statutory conditions and exceptions and are not absolute in every circumstance. Requests can be sent to {link}. We will assess each request under the law that applies and explain any lawful limitation where appropriate.', { link: <a href="mailto:support@nasrinai.com">{tr('support@nasrinai.com')}</a> })}</p>
      <p>{rich('For background, read the official {link} information published by the National Privacy Commission. You may also contact the NPC through its official website if you believe your statutory privacy rights have been infringed. This policy does not prevent you from contacting a regulator or exercising any right provided by law.', { link: <a href="https://privacy.gov.ph/data-privacy-act-/" target="_blank" rel="noreferrer">{tr('Philippines Data Privacy Act of 2012')}</a> })}</p>
    </section>
    <section className="legal-section">
      <h2>{tr('9. Children and policy updates')}</h2>
      <p>{tr('MOVO is a personal finance tool and is not designed for children. If you believe a child has provided personal information without appropriate authorization, contact the service team so the matter can be reviewed.')}</p>
      <p>{tr('We may update this policy as product features and legal requirements change. The effective date at the top identifies the latest published version. Material changes may require additional notice or consent where applicable.')}</p>
    </section>
    <section className="legal-section">
      <h2>{tr('10. International use and regional requirements')}</h2>
      <p>{tr('MOVO may be accessed from different countries, but the laws that apply depend on the circumstances, including where you live, where the operator is established, what the service does, and where processing occurs. Selecting a country, language, or currency in Settings changes localization preferences and does not determine your legal residence, establish that a local compliance review is complete, or guarantee that every feature is available in that jurisdiction.')}</p>
      <p>{tr('Where applicable, we will assess and respect the privacy, consumer-protection, electronic-commerce, and other mandatory requirements that apply to the service and its processing in the relevant jurisdiction. These may include rights to access, correct, delete, restrict, object to, or obtain a copy of personal data; rights to withdraw consent; and rights to complain to a competent regulator. The availability and scope of each right depend on applicable law and its lawful exceptions. We will assess requests under the law that applies rather than treating the examples in this policy as an exhaustive list.')}</p>
      <p>{tr('For countries or regions not listed in MOVO Settings, the service or particular features will be offered only after the operator has assessed applicable local law and relevant distribution-platform requirements, including Apple App Store and Google Play policies. If those requirements have not been assessed or cannot reasonably be met, availability may be restricted until review. Neither listing a country nor platform approval is a certification of legal compliance.')}</p>
    </section>
    <section className="legal-section">
      <h2>{tr('11. International transfers and service providers')}</h2>
      <p>{tr('To operate requested features, information may be processed by hosting, authentication, database, security, support, and AI service providers, including providers configured for the deployed version of MOVO. These providers may process information in countries other than your own. Provider names, processing locations, retention terms, and transfer safeguards must be confirmed against the live configuration and applicable contracts; do not assume that all data stays in your country.')}</p>
      <p>{tr('Where applicable law requires safeguards for international transfers, the operator will assess and implement the required legal mechanism and supplementary protections. We aim to limit each provider to the information and processing needed for its assigned service and to require appropriate confidentiality and security obligations. The actual provider inventory and transfer arrangements must be maintained and disclosed accurately.')}</p>
    </section>
    <section className="legal-section">
      <h2>{tr('12. Automated features and user review')}</h2>
      <p>{tr('MOVO may use rules, calculations, optical character recognition, categorization, reminders, shortcuts, or AI-generated responses to help organize information. These features can be incomplete or incorrect and should not be treated as independent verification of a transaction, financial account, merchant, or institution. Review extracted or automatically created records before relying on them.')}</p>
      <p>{tr('MOVO does not intend to make a decision with legal or similarly significant effects about you solely through automated processing. If that changes, we will assess any notice, legal basis, human review, objection, or other safeguards required by applicable law before enabling the relevant feature.')}</p>
    </section>
    <section className="legal-section">
      <h2>{tr('13. Account deletion and external requests')}</h2>
      <p>{tr('You may request deletion of your account and associated personal data through the deletion options made available in MOVO or through the service team at support@nasrinai.com. If an applicable app store requires a separate external account-deletion webpage, the operator must provide and maintain a direct, publicly accessible deletion-request page and submit the required URL in the relevant developer console before publication. This policy does not mean that such an external page has been implemented unless it is actually available.')}</p>
      <p>{tr('We will explain any material processing steps, reasonable identity checks, expected timing, and any data that must be retained under law or for legitimate security or legal purposes. Account deletion may not automatically cancel a subscription billed by Apple, Google, or another provider; manage or cancel that subscription through the relevant billing provider. Data that is lawfully retained will be limited to the applicable purpose and retention period.')}</p>
    </section>
  </LegalPage>;
}
