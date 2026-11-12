import React, { useState } from 'react';
import Icon from './Icon';
import { MovoMark } from './MovoLogo';
import { t as tr } from '../lib/i18n';

/*
 * The last setup step (owner, 2026-11-11): after the video guide, the walkthrough and signing in (or choosing this
 * device only), the person reads these points and accepts the Terms of Service and Privacy Policy. Until then the
 * dashboard and the bottom navigation stay closed; reading either document returns here.
 */
export const AGREEMENT_POINTS = [
  { icon: 'bank', text: 'MOVO records the money you enter. It never connects to your bank, moves money or controls your cards.' },
  { icon: 'tag', text: 'Bank, e-wallet, merchant and subscription logos are site icons shown only to help you recognise your records. They belong to their owners and do not imply a partnership or endorsement.' },
  { icon: 'trash', text: 'Your data stays yours. Export or clear it, or delete your account and its cloud records, any time in Settings.' },
  { icon: 'card', text: 'MOVO digital subscriptions use Apple In-App Purchase on iOS and Google Play Billing on Android.' },
];

export default function SetupAgreement({ onAccept, onOpenLegal }) {
  const [agreed, setAgreed] = useState(false);
  return <div className="setup-agreement" role="presentation">
    <section className="setup-agreement-card" role="dialog" aria-modal="true" aria-labelledby="setup-agreement-title" aria-describedby="setup-agreement-text">
      <span className="setup-agreement-mark" aria-hidden="true"><MovoMark size={40} /></span>
      <h2 id="setup-agreement-title">{tr('Before you start')}</h2>
      <p id="setup-agreement-text">{tr('Please read and accept to open MOVO.')}</p>
      <ul className="setup-agreement-points">
        {AGREEMENT_POINTS.map((p, i) => <li key={p.icon} style={{ '--i': i }}><span className="setup-agreement-icon" aria-hidden="true"><Icon name={p.icon} size={17} /></span><span>{tr(p.text)}</span></li>)}
      </ul>
      <div className="setup-agreement-links">
        <button type="button" className="link-button" onClick={() => onOpenLegal('TermsOfService')}>{tr('Terms of Service')} <Icon name="chevron" size={14} /></button>
        <button type="button" className="link-button" onClick={() => onOpenLegal('PrivacyPolicy')}>{tr('Privacy Policy')} <Icon name="chevron" size={14} /></button>
      </div>
      <label className="setup-agreement-check"><input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} /><span>{tr('I have read and agree to the Terms of Service and Privacy Policy.')}</span></label>
      <button type="button" className="primary-button setup-agreement-accept" disabled={!agreed} onClick={() => { if (agreed) onAccept(); }}>{tr('Accept and continue')}</button>
    </section>
  </div>;
}
