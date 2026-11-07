import React, { useState } from 'react';
import { Sheet } from './ui';
import { apiUrl } from '../lib/platform';
import { PLAN_LABELS, effectivePlan } from '../lib/planAccess';

export function PlanComparison() {
  return <div className="plan-comparison">
    <section className="card pad"><h3>Free</h3><p>Local tracking, standard landscape cards, receipt attachments, export/import, and answers from your saved records.</p></section>
    <section className="card pad"><h3>Pro</h3><p>Cloud sync, insights and briefings, full NasrinAI, receipt scanning, premium card styles, portrait cards, card animations, custom Money Flow, and card/scenery uploads.</p></section>
    <section className="card pad plan-plus-preview"><h3>Pro+</h3><p>Everything in Pro, plus automation and an enhanced interface with glow and motion.</p><small>Premium mascots and advanced native home-screen widgets are planned for a future release. Basic native widgets will be available on Free after store release; paid plans will get advanced widgets. The current ram stays the same.</small></section>
  </div>;
}

export default function PlanOffer({ session, entitlement, onRefresh, onClose, onSignIn, onPlans, feature }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const eligible = !entitlement || entitlement.trialEligible;
  const claim = async () => {
    if (!session?.access_token) { onSignIn(); return; }
    setBusy(true); setError('');
    try {
      const response = await fetch(apiUrl('/api/purchases/trial'), {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
        body: JSON.stringify({ ...(code.trim() ? { referralCode: code.trim().toLowerCase() } : {}) }),
      });
      if (!response.ok) throw new Error('Could not claim the trial. Check your referral code and account eligibility, then try again.');
      await onRefresh(); onClose();
    } catch (cause) { setError(cause.message); } finally { setBusy(false); }
  };
  return <Sheet title={feature ? 'Unlock more with MOVO' : 'Your first month of Pro is free'} label="MOVO plans" onClose={onClose}>
    <p>Current plan: <strong>{PLAN_LABELS[effectivePlan(entitlement)]}</strong></p>
    <PlanComparison />
    {eligible && <><p>Claim one calendar month of Pro per verified MOVO account. No payment required, no automatic charge. After the trial, cloud records remain readable and exportable; cloud changes require Pro or Pro+.</p>
      <label className="plan-referral-label">Referral code (optional)<input maxLength={24} value={code} onChange={e => setCode(e.target.value)} autoCapitalize="none" autoComplete="off" /></label>
      <button type="button" className="primary-button" disabled={busy} onClick={claim}>{busy ? 'Claiming…' : session?.access_token ? 'Claim my free month' : 'Sign in to claim my free month'}</button></>}
    <p>Refer 10 people who purchase Pro or Pro+ to earn 3 additional months of Pro. Free trials do not count. One reward per account; refunded purchases do not qualify.</p>
    {entitlement?.referralCode && <div className="card pad"><label>Your referral code<input readOnly value={entitlement.referralCode} onFocus={e => e.target.select()} /></label><p>{entitlement.qualifiedReferrals || 0} / 10 qualifying subscribers</p></div>}
    {entitlement?.rewardStartsAt && <p>Your Pro reward starts {new Date(entitlement.rewardStartsAt).toLocaleDateString()} and ends {new Date(entitlement.rewardExpiresAt).toLocaleDateString()}. Store subscriptions continue to renew unless you cancel them in Apple or Google settings.</p>}
    {error && <p role="alert" className="form-error">{error}</p>}
    <div className="sheet-actions"><button type="button" className="secondary-button" onClick={onPlans}>Plans & purchases</button><button type="button" className="secondary-button" onClick={onClose}>Continue</button></div>
  </Sheet>;
}
