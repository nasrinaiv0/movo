import React from 'react';
import { SubHeader } from '../components/ui';
import { t as tr, rich } from '../lib/i18n';
import SocialLinks from '../components/SocialLinks';
import AriesMascot from '../components/AriesMascot';

export default function HelpCenter({ c }) {
  return <>
    <SubHeader title={tr('Help Center')} onBack={() => c.go('Settings')} />
    <article className="legal-page help-page" aria-labelledby="help-title">
      <header className="legal-intro help-aries">
        <AriesMascot pose="hello" size={76} />
        <div>
          <p className="legal-eyebrow">{tr('MOVO · HELP & SUPPORT')}</p>
          <h2 id="help-title">{tr('Help Center')}</h2>
          <p>{tr('Quick guidance for the features currently available in MOVO.')}</p>
        </div>
      </header>
      <section className="legal-section">
        <h2>{tr('Where do I start?')}</h2>
        <p>{tr('Aries, the MOVO mascot, walks you through every feature in the MOVO guide. It opens on first launch, and you can replay it any time from Settings → MOVO guide.')}</p>
        {c.openGuide && <button type="button" className="secondary-button help-guide-button" onClick={() => c.openGuide()}>{tr('Open the MOVO guide')}</button>}
      </section>
      <section className="legal-section">
        <h2>{tr('How do I add a transaction?')}</h2>
        <p>{tr('Open Home, Wallet, or Transactions and choose the add or quick-action control. Enter a description, a positive amount, type, category, date, and account when required. Review the details before saving. A saved transfer is a tracking record; it does not move money between banks.')}</p>
      </section>
      <section className="legal-section">
        <h2>{tr('How does the AI receipt scan work?')}</h2>
        <p>{tr('Open Settings → Receipt Scanner, then take a photo or upload a receipt, payment screenshot or PDF. Only after you agree for that receipt is the image or PDF text sent to MOVO’s AI provider, which reads the store, total, items and a suggested category. You check the details and choose the account before anything is logged. Basic scan reads the receipt on your device instead. AI receipt scanning is part of Pro. Never scan PINs, CVVs or one-time codes.')}</p>
      </section>
      <section className="legal-section">
        <h2>{tr('How does automatic logging work?')}</h2>
        <p>{tr('With Pro+ and a signed-in account, Settings → Set Up Phone Automation gives you a private device key and step-by-step recipes for iPhone Shortcuts or an Android automation. Your automation sends a payment, a bank app message or a voice entry to MOVO, which logs it straight away or asks you first. MOVO only receives what your automation sends; it never opens your bank or wallet apps.')}</p>
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
        <p>{rich('Read the {terms} and {privacy} for service terms and data-handling details.', { terms: <button type="button" className="inline-legal-link" onClick={() => c.openLegal?.('TermsOfService')}>{tr('Terms of Service')}</button>, privacy: <button type="button" className="inline-legal-link" onClick={() => c.openLegal?.('PrivacyPolicy')}>{tr('Privacy Policy')}</button> })}</p>
        <p>{rich('Contact {email}. Please do not email passwords, card security codes, one-time passcodes, or unnecessary financial details.', { email: <a href="mailto:support@nasrinai.com">support@nasrinai.com</a> })}</p>
      </section>
      <SocialLinks />
    </article>
  </>;
}
