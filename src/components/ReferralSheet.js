import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Icon from './Icon';
import { Sheet } from './ui';
import { t as tr } from '../lib/i18n';
import { isNativeApp } from '../lib/platform';
import {
  activateNativeReferral, claimReferralCode, clearPendingReferralCode, downloadUrl, getReferralStatus,
  normalizeReferralCode, pendingReferralCode,
} from '../lib/referrals';

/*
 * Refer MOVO, on one compact panel: your short code (M78038) with Copy and Share, progress toward the
 * 10-friend reward, points when the server has them switched on, one download QR code for iPhone and one for
 * Android, and a field for a friend's code. The server decides every link and reward; nothing here grants one.
 */
const PLATFORMS = [
  { id: 'ios', label: 'iPhone', store: 'App Store' },
  { id: 'android', label: 'Android', store: 'Google Play' },
];
const CLAIM_MESSAGES = {
  invalid_referral_code: 'That code was not found. Check it and try again.',
  own_referral_code: 'That is your own code. Share it with a friend instead.',
  already_referred: 'This account already uses a friend’s code.',
  account_not_new: 'A friend’s code can be added within 7 days of creating your account.',
  already_purchased: 'A friend’s code cannot be added after buying a plan.',
  too_many_attempts: 'Too many tries. Try the code again in an hour.',
  verified_account_required: 'Verify your email address first, then add the code.',
};

export default function ReferralSheet({ session, entitlement, onClose, onSignIn, notify }) {
  const signedIn = Boolean(session?.user?.id && session?.access_token);
  const [status, setStatus] = useState(null);
  const [claim, setClaim] = useState(() => pendingReferralCode());
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    if (!signedIn) return undefined;
    getReferralStatus(session).then(data => { if (active) setStatus(data); }).catch(() => { if (active) setStatus(null); });
    return () => { active = false; };
  }, [session?.user?.id, session?.access_token, signedIn]);

  const code = (signedIn && (status?.referralCode || entitlement?.referralCode)) || '';
  const friends = Number(entitlement?.qualifiedReferrals) || 0;
  const pointsOn = Boolean(status?.pointsEnabled);
  const shareText = () => [
    tr('Join me on MOVO. Use my referral code {code} after you sign in.', { code }),
    ...PLATFORMS.map(p => `${p.label}: ${downloadUrl(p.id, code)}`),
  ].join('\n');

  async function copy() {
    if (!code) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard_unavailable');
      await navigator.clipboard.writeText(code);
      setNotice(tr('Code copied.'));
    } catch { setNotice(tr('Copy is not available here. Select the code to copy it.')); }
  }
  async function share() {
    if (!code) return;
    try {
      if (navigator.share) await navigator.share({ title: 'MOVO', text: shareText() });
      else await copy();
    } catch (error) {
      if (error?.name !== 'AbortError') setNotice(tr('Sharing is not available here. Copy your code instead.'));
    }
  }
  async function redeem() {
    const entered = normalizeReferralCode(claim);
    if (busy || !entered || !signedIn) return;
    setBusy(true); setNotice('');
    try {
      await claimReferralCode(session, entered);
      clearPendingReferralCode();
      setClaim('');
      setStatus(await getReferralStatus(session).catch(() => status));
      // Points are never granted here; on the phone apps the server checks the app first.
      activateNativeReferral(session).catch(() => false);
      notify?.(tr('Friend’s code added.'));
      setNotice(tr('Code added. Thanks for joining through a friend.'));
    } catch (error) {
      setNotice(tr(CLAIM_MESSAGES[error?.code] || 'Could not add the code. Check your connection and try again.'));
    } finally { setBusy(false); }
  }

  return <Sheet title={tr('Refer MOVO')} className="referral-sheet" label={tr('Refer MOVO')} onClose={onClose}>
    <div className="referral-content">
      {signedIn ? <section className="referral-code-card" aria-label={tr('Your referral code')}>
        <small>{tr('Your referral code')}</small>
        {code ? <>
          <strong className="referral-code" aria-live="polite">{code}</strong>
          <div className="referral-actions">
            <button type="button" onClick={copy}><Icon name="copy" size={16} />{tr('Copy')}</button>
            <button type="button" className="primary-button" onClick={share}><Icon name="send" size={16} />{tr('Share')}</button>
          </div>
          <p className="referral-progress">{tr('{n} of 10 friends subscribed. At 10, you get 3 months of Pro.', { n: friends })}</p>
        </> : <p className="referral-note">{tr('Your code appears when you are online.')}</p>}
      </section> : <section className="referral-code-card referral-signed-out">
        <p className="referral-note">{tr('Sign in to get your referral code.')}</p>
        <button type="button" className="primary-button" onClick={onSignIn}>{tr('Sign in')}</button>
      </section>}

      {pointsOn && <div className="referral-stats" aria-label={tr('Referral points')}>
        <span><strong>{Number(status.points || 0).toLocaleString()}</strong><small>{tr('Points')}</small></span>
        <span><strong>{Number(status.referredUsers || 0)}</strong><small>{tr('Friends joined')}</small></span>
        <span><strong>{Number(status.paidUpgrades || 0)}</strong><small>{tr('Subscribed')}</small></span>
      </div>}
      {pointsOn && <p className="referral-note">{tr('5 points when a friend joins in the MOVO app, 100 more when they first subscribe. Points have no cash value.')}</p>}
      {pointsOn && Number(status.pendingReview || 0) > 0 && <p className="referral-note">{tr('Some referrals are waiting for a security review.')}</p>}

      <section className="referral-download" aria-label={tr('Download MOVO')}>
        <h3>{tr('Download MOVO')}</h3>
        <div className="referral-qr-row">
          {PLATFORMS.map(p => <figure className="referral-qr" key={p.id}>
            <span className="referral-qr-code" role="img" aria-label={tr('QR code to get MOVO on {platform}', { platform: p.label })}>
              <QRCodeSVG value={downloadUrl(p.id, code)} size={112} level="M" bgColor="#ffffff" fgColor="#121512" marginSize={2} />
            </span>
            <figcaption><strong>{p.label}</strong><small>{p.store}</small></figcaption>
          </figure>)}
        </div>
        <p className="referral-note">{tr('Scan with the phone’s camera to get MOVO.')}</p>
      </section>

      {signedIn && status?.canClaim && <section className="referral-claim">
        <label className="referral-code-label" htmlFor="movo-redeem-code">{tr('Have a friend’s code?')}</label>
        <div className="referral-redeem">
          <input id="movo-redeem-code" value={claim} maxLength={8} autoComplete="off" autoCapitalize="characters" spellCheck={false}
            placeholder="M78038" onChange={e => setClaim(e.target.value.toUpperCase())} />
          <button type="button" disabled={busy || !normalizeReferralCode(claim)} onClick={redeem}>{busy ? tr('Adding…') : tr('Add')}</button>
        </div>
      </section>}
      {signedIn && status?.pendingNativeProof && pointsOn && !isNativeApp() && <p className="referral-note">{tr('Open MOVO on your phone to confirm the referral.')}</p>}
      {notice && <p className="referral-note referral-notice" role="status">{notice}</p>}
    </div>
  </Sheet>;
}
