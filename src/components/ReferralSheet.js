import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Icon from './Icon';
import { Sheet } from './ui';
import { t as tr } from '../lib/i18n';
import { isNativeApp, nativePlatform } from '../lib/platform';
import { formatDate } from '../lib/format';
import { useConfirm } from './ConfirmDialog';
import {
  PENDING_REFERRAL_EVENT, REFERRAL_REWARDS, activateNativeReferral, claimReferralCode, clearPendingReferralCode, downloadUrl, getReferralStatus,
  normalizeReferralCode, pendingReferralCode, redeemReferralPoints,
} from '../lib/referrals';

const PLATFORMS = [
  { id: 'ios', label: 'iOS', store: 'App Store' },
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

const longDate = value => formatDate(value, { year: 'numeric', month: 'short', day: 'numeric' });

export default function ReferralSheet({ session, entitlement, onClose, onSignIn, notify, onPlanChanged }) {
  const signedIn = Boolean(session?.user?.id && session?.access_token);
  const [status, setStatus] = useState(null);
  const [claim, setClaim] = useState(() => pendingReferralCode());
  useEffect(() => {
    const fill = (event) => setClaim(current => current || event.detail || '');
    window.addEventListener(PENDING_REFERRAL_EVENT, fill);
    return () => window.removeEventListener(PENDING_REFERRAL_EVENT, fill);
  }, []);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const confirm = useConfirm();
  useEffect(() => {
    let active = true;
    if (!signedIn) return undefined;
    getReferralStatus(session).then(data => { if (active) setStatus(data); }).catch(() => { if (active) setStatus(null); });
    return () => { active = false; };
  }, [session?.user?.id, session?.access_token, signedIn]);

  const code = (signedIn && (status?.referralCode || entitlement?.referralCode)) || '';
  const pointsOn = Boolean(status?.pointsEnabled);
  const canRedeem = nativePlatform() !== 'ios';
  const points = Number(status?.points) || 0;
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
  async function verifySignup() {
    setVerifying(true);
    try {
      const verified = await activateNativeReferral(session);
      const current = await getReferralStatus(session);
      setStatus(current);
      if (!verified && current.pendingNativeProof) setNotice(tr('Could not verify the referral right now. Try again in MOVO.'));
      if (verified && !current.pendingNativeProof && !current.pendingReview) setNotice(tr('Referral verified. Your signup points are available.'));
    } catch {
      setNotice(tr('Could not verify the referral right now. Try again in MOVO.'));
    } finally { setVerifying(false); }
  }

  async function addCode() {
    const entered = normalizeReferralCode(claim);
    if (busy || !entered || !signedIn) return;
    setBusy(true); setNotice('');
    try {
      await claimReferralCode(session, entered);
      if (pendingReferralCode() === entered) clearPendingReferralCode();
      setClaim('');
      setStatus(await getReferralStatus(session).catch(() => status));
      notify?.(tr('Friend’s code added.'));
      setNotice(tr('Code added. Thanks for joining through a friend.'));
      if (pointsOn && isNativeApp()) await verifySignup();
    } catch (error) {
      setNotice(tr(CLAIM_MESSAGES[error?.code] || 'Could not add the code. Check your connection and try again.'));
    } finally { setBusy(false); }
  }

  async function usePoints(reward) {
    if (busy || !signedIn || !canRedeem || status?.storePlanActive || points < reward.points) return;
    setBusy(true); setNotice('');
    try {
      const label = tr('Use {n} points', { n: reward.points });
      if (!(await confirm({
        title: tr('Redeem one month of {plan}?', { plan: reward.name }),
        icon: 'gift', confirmLabel: label,
        message: tr('Use {n} points for 1 month of {plan}. The reward starts after any current MOVO access ends and does not renew.', { n: reward.points, plan: reward.name }),
        detail: tr('Used points cannot be returned.'),
      }))) return;
      const result = await redeemReferralPoints(session, reward.tier);
      setStatus(current => current && ({ ...current, points: result.points, [reward.tier === 'pro' ? 'pointsProUntil' : 'pointsProPlusUntil']: result.expiresAt }));
      onPlanChanged?.();
      setNotice(tr('1 month of {plan} added. It runs from {start} to {end}.', {
        plan: reward.name, start: longDate(result.startsAt), end: longDate(result.expiresAt),
      }));
    } catch (error) {
      const messages = {
        not_enough_points: 'Your balance is too low for this reward.',
        store_plan_active: 'You can use points after your current store subscription ends.',
      };
      setNotice(tr(messages[error?.code] || 'Could not use your points. Try again.'));
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
        </> : <p className="referral-note">{tr('Your code appears when you are online.')}</p>}
      </section> : <section className="referral-code-card referral-signed-out">
        <p className="referral-note">{tr('Sign in to get your referral code.')}</p>
        <button type="button" className="primary-button" onClick={onSignIn}>{tr('Sign in')}</button>
      </section>}

      {pointsOn && <div className="referral-stats" aria-label={tr('Referral points')}>
        <span><strong>{Number(status.points || 0).toLocaleString()}</strong><small>{tr('Points')}</small></span>
        <span><strong>{Number(status.referredUsers || 0)}</strong><small>{tr('Friends joined')}</small></span>
        <span><strong>{Number(status.paidUpgrades || 0)}</strong><small>{tr('Friends subscribed')}</small></span>
      </div>}
      {pointsOn && canRedeem && REFERRAL_REWARDS.map(reward => {
        const until = reward.tier === 'pro' ? status.pointsProUntil : status.pointsProPlusUntil;
        return <div className="referral-points-redeem" key={reward.tier}>
          <span>
            <strong>{tr('{n} points = 1 month of {plan}', { n: reward.points, plan: reward.name })}</strong>
            {until && <small>{tr('Reward access ends {date}', { date: longDate(until) })}</small>}
          </span>
          <button type="button" disabled={busy || status.storePlanActive || points < reward.points} onClick={() => usePoints(reward)}>{tr('Use {n} points', { n: reward.points })}</button>
        </div>;
      })}
      {pointsOn && !canRedeem && <p className="referral-note">{tr('Direct point redemption is available on Android and web.')}</p>}
      {pointsOn && canRedeem && status.storePlanActive && <p className="referral-note">{tr('You can use points after your current store subscription ends.')}</p>}
      {pointsOn && <p className="referral-note">{tr('New members earn 20 points after adding a referral code and verifying in the MOVO app, plus 100 after their first confirmed paid subscription. Free trials do not earn the 100 points.')}</p>}
      {pointsOn && Number(status.pendingReview || 0) > 0 && <p className="referral-note">{tr('Some referrals are waiting for a security review.')}</p>}

      <section className="referral-download" aria-label={tr('Download MOVO')}>
        <h3>{tr('Download MOVO')}</h3>
        <div className="referral-qr-row">
          {PLATFORMS.map(p => <figure className="referral-qr" key={p.id}>
            <span className="referral-qr-code" role="img" aria-label={tr('QR code to get MOVO on {platform}', { platform: p.label })}>
              <QRCodeSVG value={downloadUrl(p.id, code)} size={112} level="M" bgColor="#ffffff" fgColor="#121512" marginSize={4} />
            </span>
            <figcaption><strong>{p.label}</strong><small>{p.store}</small></figcaption>
          </figure>)}
        </div>
        <p className="referral-note">{code ? tr('Scan with the phone’s camera to get MOVO. Friends can add your code after signing in.') : tr('Scan with the phone’s camera to get MOVO.')}</p>
      </section>

      {signedIn && status?.canClaim && <section className="referral-claim">
        <label className="referral-code-label" htmlFor="movo-redeem-code">{tr('Have a friend’s code?')}</label>
        <div className="referral-redeem">
          <input id="movo-redeem-code" value={claim} maxLength={8} autoComplete="off" autoCapitalize="characters" spellCheck={false}
            placeholder="M78038" onChange={e => setClaim(e.target.value.toUpperCase())} />
          <button type="button" disabled={busy || !normalizeReferralCode(claim)} onClick={addCode}>{busy ? tr('Adding…') : tr('Add')}</button>
        </div>
      </section>}
      {signedIn && status?.pendingNativeProof && pointsOn && (isNativeApp()
        ? <div className="referral-points-redeem">
          <span><small>{tr('Verify your referral in MOVO to claim your signup points.')}</small></span>
          <button type="button" disabled={busy || verifying} onClick={verifySignup}>{verifying ? tr('Verifying…') : tr('Verify referral')}</button>
        </div>
        : <p className="referral-note">{tr('Open MOVO on your phone to confirm the referral.')}</p>)}
      {notice && <p className="referral-note referral-notice" role="status">{notice}</p>}
    </div>
  </Sheet>;
}
