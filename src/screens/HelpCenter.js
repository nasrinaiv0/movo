import React from 'react';
import { SubHeader } from '../components/ui';
import { t as tr } from '../lib/i18n';

export default function HelpCenter({ c }) {
  return <>
    <SubHeader title={tr('Help Center')} onBack={() => c.go('Settings')} />
    <article className="legal-page help-page" aria-labelledby="help-title">
      <header className="legal-intro">
        <p className="legal-eyebrow">{tr('MOVO · HELP & SUPPORT')}</p>
        <h2 id="help-title">{tr('Help Center')}</h2>
        <p>{tr('Quick guidance for the features currently available in MOVO.')}</p>
      </header>
      <section className="legal-section">
        <h2>{tr('How do I add a transaction?')}</h2>
        <p>{tr('Open Home, Wallet, or Transactions and choose the add or quick-action control. Enter a description, a positive amount, type, category, date, and account when required. Review the details before saving. A saved transfer is a tracking record; it does not move money between banks.')}</p>
      </section>
      <section className="legal-section">
        <h2>{tr('Where are my records stored?')}</h2>
        <p>{tr('In local/demo mode, manually entered financial records and accounts are stored in this browser\'s local storage and persist across reloads in the same browser profile. They are not synced to other devices and can be removed with Clear All Data or by clearing browser storage. Cloud records require sign-in and a working MOVO database connection. Browser storage is not encrypted by MOVO itself.')}</p>
      </section>
      <section className="legal-section">
        <h2>{tr('Does MOVO connect to my bank or move money?')}</h2>
        <p>{tr('No. MOVO currently organizes records you enter or import. It does not automatically connect to a bank, read private Apple Pay history, initiate payments, block cards, or verify that a transaction occurred. Treat balances as calculations from available records, not verified bank balances.')}</p>
      </section>
      <section className="legal-section">
        <h2>{tr('How does NasrinAI use my financial information?')}</h2>
        <p>{tr('NasrinAI chat requires an authenticated cloud session and a separate, explicit consent step before a limited snapshot of relevant, user-scoped financial records is sent with your message. You can decline consent and continue using other MOVO features. Never enter bank passwords, card PINs, CVVs, or one-time passcodes. AI responses can be inaccurate and are not professional financial advice.')}</p>
      </section>
      <section className="legal-section">
        <h2>{tr('Are push and email notifications active?')}</h2>
        <p>{tr('No. Push and email delivery are not connected in this web build. In-app notification preferences only affect the feed shown inside MOVO; do not rely on MOVO for urgent alerts.')}</p>
      </section>
      <section className="legal-section">
        <h2>{tr('How do I export or clear data?')}</h2>
        <p>{tr('Use the CSV export action in Profile when available. The exported file can contain sensitive financial information, so store and share it carefully. Clear All Data permanently deletes MOVO data on this device and, when you are signed in, the records in your MOVO account. To request access, correction, or deletion of cloud data, contact the support address below.')}</p>
      </section>
      <section className="legal-section">
        <h2>{tr('Policies and privacy requests')}</h2>
        <p>Read the <button type="button" className="inline-legal-link" onClick={() => c.openLegal?.('TermsOfService')}>{tr('Terms of Service')}</button> and <button type="button" className="inline-legal-link" onClick={() => c.openLegal?.('PrivacyPolicy')}>{tr('Privacy Policy')}</button> for service terms and data-handling details.</p>
        <p>Contact <a href="mailto:support@nasrinai.com">{tr('support@nasrinai.com')}</a>. Please do not email passwords, card security codes, one-time passcodes, or unnecessary financial details.</p>
      </section>
    </article>
  </>;
}
