import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Icon from './Icon';
import { Sheet } from './ui';
import { createReferralInvite, claimReferralInvite, getReferralStatus, activateNativeReferral } from '../lib/referrals';

const valid = value => typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value);

export default function ReferralSheet({ session, onClose, onSignIn, notify }) {
  const [loading, setLoading] = useState(false);
  const [invite, setInvite] = useState(null);
  const [summary, setSummary] = useState(null);
  const [claim, setClaim] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const authenticated = Boolean(session?.user?.id && session?.access_token);
  useEffect(() => {
    let active = true;
    if (!authenticated) return undefined;
    setLoading(true);
    Promise.all([createReferralInvite(session), getReferralStatus(session)])
      .then(([data, status]) => {
        if (active) { setInvite(valid(data?.token) ? data : null); setSummary(status); setNotice(valid(data?.token) ? '' : 'Unable to issue your invite.'); }
      })
      .catch(() => { if (active) setNotice('Could not load referral details. Check your connection.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [session?.user?.id, session?.access_token, authenticated]);

  async function newInvite() {
    if (busy || !authenticated) return;
    setBusy(true); setNotice('');
    try {
      const data = await createReferralInvite(session);
      if (!valid(data.token)) throw new Error('invalid_invite');
      setInvite(data);
    } catch { setNotice('Could not create another invite. Try again later.'); }
    finally { setBusy(false); }
  }
  async function copy() {
    if (!valid(invite?.token)) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard_unavailable');
      await navigator.clipboard.writeText(invite.token);
      setNotice('Invite code copied.');
    } catch { setNotice('Copy unavailable. Select the code below to copy it.'); }
  }
  async function share() {
    if (!valid(invite?.token)) return;
    const message = `Join me on MOVO. Enter this single-use invite code after signing in: ${invite.token}`;
    try {
      if (navigator.share) await navigator.share({ text: message });
      else await copy();
    } catch (error) {
      if (error?.name !== 'AbortError') setNotice('Sharing unavailable. Copy your invite code instead.');
    }
  }
  async function redeem() {
    if (busy || !valid(claim) || !authenticated) return;
    setBusy(true); setNotice('');
    try {
      await claimReferralInvite(session, claim.toLowerCase());
      setClaim('');
      // Points are not granted here; native app attestation is verified by the server.
      await activateNativeReferral(session).catch(() => false);
      setSummary(await getReferralStatus(session));
      setNotice('Invite recorded. Native verification may be required before points are awarded.');
      notify?.('Referral linked to this account.');
    } catch { setNotice('This invite is expired, already used or not eligible for this account.'); }
    finally { setBusy(false); }
  }

  return <Sheet title="Refer MOVO" className="referral-sheet" label="MOVO referral" onClose={onClose}>
    {!authenticated ? <div className="referral-empty">
      <Icon name="gift" size={27} />
      <p>Sign in to create your personal referral invite.</p>
      <button type="button" className="primary-button" onClick={onSignIn}>Sign in</button>
    </div> : <div className="referral-content">
      <div className="referral-intro">
        <span className="referral-intro-icon"><Icon name="gift" size={21} /></span>
        <div><strong>Invite friends. Earn points.</strong><small>5 points for a verified new app signup, plus 100 for their first verified paid upgrade.</small></div>
      </div>
      <div className="referral-stats">
        <span><strong>{Number(summary?.points ?? 0).toLocaleString()}</strong><small>Referral points</small></span>
        <span><strong>{Number(summary?.referredUsers ?? 0)}</strong><small>Invited users</small></span>
        <span><strong>{Number(summary?.paidUpgrades ?? 0)}</strong><small>Paid upgrades</small></span>
      </div>
      {Number(summary?.pendingReview ?? 0) > 0 && <p className="referral-note">Some referrals are awaiting security review.</p>}
      <div className="referral-divider" />
      {loading ? <p className="referral-note" role="status">Preparing your invite…</p> : valid(invite?.token) ? <>
        <div className="referral-qr" aria-label="Single-use MOVO invite QR code" role="img"><QRCodeSVG value={invite.token} size={164} level="M" bgColor="#fff" fgColor="#121512" marginSize={2} /></div>
        <label className="referral-code-label" htmlFor="movo-invite-code">Your single-use invite code</label>
        <input id="movo-invite-code" className="referral-code-input" readOnly value={invite.token} onFocus={e => e.target.select()} />
        <div className="referral-actions">
          <button type="button" onClick={copy}><Icon name="copy" size={16} /> Copy</button>
          <button type="button" className="primary-button" onClick={share}><Icon name="send" size={16} /> Share</button>
        </div>
        <button type="button" className="referral-regenerate" disabled={busy} onClick={newInvite}>Create another unique invite</button>
      </> : <button type="button" className="primary-button" disabled={busy} onClick={newInvite}>Create invite code</button>}
      <p className="referral-note">Each invite works once and expires after 30 days. Points have no cash value and never change your financial balances. Rewards require verified account and app checks.</p>
      <div className="referral-divider" />
      <label className="referral-code-label" htmlFor="movo-redeem-code">Have a friend's invite?</label>
      <div className="referral-redeem">
        <input id="movo-redeem-code" value={claim} maxLength={64} autoComplete="off" autoCapitalize="none" placeholder="Enter invite code" onChange={e => setClaim(e.target.value)} />
        <button type="button" disabled={busy || !valid(claim)} onClick={redeem}>Claim</button>
      </div>
      {Boolean(summary?.pendingNativeProof) && <p className="referral-note">Your referral is pending native app verification. It will not earn points until verified.</p>}
      {notice && <p className="referral-note" role="status">{notice}</p>}
    </div>}
  </Sheet>;
}
