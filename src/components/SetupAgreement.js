import React, { useLayoutEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { MovoMark } from './MovoLogo';
import { t as tr } from '../lib/i18n';

/*
 * The last setup step (owner, 2026-11-11): after the MOVO guide, the walkthrough and signing in (or choosing this
 * device only), the person reads these points and accepts the Terms of Service and Privacy Policy. Until then the
 * dashboard and the bottom navigation stay closed; reading either document returns here.
 */
export const AGREEMENT_POINTS = [
  { icon: 'bank', text: 'MOVO records the money you enter. It never connects to your bank, moves money or controls your cards.' },
  { icon: 'tag', text: 'Bank, e-wallet, merchant and subscription logos are site icons shown only to help you recognise your records. They belong to their owners and do not imply a partnership or endorsement.' },
  { icon: 'trash', text: 'Your data stays yours. Export or clear it, or delete your account and its cloud records, any time in Settings.' },
  { icon: 'card', text: 'MOVO digital subscriptions use Apple In-App Purchase on iOS and Google Play Billing on Android.' },
];

export default function SetupAgreement({ onAccept, onOpenLegal, onDeleteAccount }) {
  const [agreed, setAgreed] = useState(false);
  const dialogRef = useRef(null);
  const titleRef = useRef(null);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    titleRef.current.focus({ preventScroll: true });

    const keepFocusInDialog = event => {
      if (event.key !== 'Tab' || event.defaultPrevented) return;
      const controls = dialog.querySelectorAll('button:not(:disabled), input:not(:disabled)');
      const active = document.activeElement;
      const first = controls[0];
      const last = controls[controls.length - 1];

      // Start with the heading so the disclosure is announced before its controls.
      // Query enabled controls at each Tab so acknowledgement can enable Accept.
      if (!dialog.contains(active) || active === titleRef.current ||
          active === (event.shiftKey ? first : last)) {
        event.preventDefault();
        (event.shiftKey ? last : first)?.focus();
      }
    };
    document.addEventListener('keydown', keepFocusInDialog);
    return () => document.removeEventListener('keydown', keepFocusInDialog);
  }, []);

  return <div className="setup-agreement" role="presentation">
    <section ref={dialogRef} className="setup-agreement-card" role="dialog" aria-modal="true" aria-labelledby="setup-agreement-title" aria-describedby="setup-agreement-text">
      <span className="setup-agreement-mark" aria-hidden="true"><MovoMark size={40} /></span>
      <h2 ref={titleRef} id="setup-agreement-title" tabIndex={-1}>{tr('Before you start')}</h2>
      <p id="setup-agreement-text">{tr('Please read and accept to open MOVO.')}</p>
      <ul className="setup-agreement-points">
        {AGREEMENT_POINTS.map((p, i) => <li key={p.icon} style={{ '--i': i }}><span className="setup-agreement-icon" aria-hidden="true"><Icon name={p.icon} size={17} /></span><span>{tr(p.text)}</span></li>)}
      </ul>
      <div className="setup-agreement-links">
        <button type="button" className="link-button" onClick={() => onOpenLegal('TermsOfService')}>{tr('Terms of Service')} <Icon name="chevron" size={14} /></button>
        <button type="button" className="link-button" onClick={() => onOpenLegal('PrivacyPolicy')}>{tr('Privacy Policy')} <Icon name="chevron" size={14} /></button>
      </div>
      <label className="setup-agreement-check"><input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} /><span>{tr('I am at least 18 years old.')} {tr('I agree to the Terms of Service and acknowledge the Privacy Policy.')}</span></label>
      <button type="button" className="primary-button setup-agreement-accept" disabled={!agreed} onClick={() => { if (agreed) onAccept(); }}>{tr('Accept and continue')}</button>
      {onDeleteAccount && <button type="button" className="link-button" onClick={onDeleteAccount}>{tr('Delete Account')}</button>}
    </section>
  </div>;
}
