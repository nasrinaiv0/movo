import React, { useRef, useState } from 'react';
import { canAnimate } from '../lib/motion';
import { Sheet } from './ui';
import { apiUrl } from '../lib/platform';
import { PLAN_LABELS, effectivePlan } from '../lib/planAccess';

const PLAN_CARDS = [
  { name:'Free', description:'Local tracking, standard landscape cards, receipt attachments, export/import, and answers from your saved records.', tagline:'Local Storage', features:['Local records saved on this device.','Receipt attached','Export & import'] },
  { name:'Pro', description:'Cloud sync, insights and briefings, full NasrinAI, receipt scanning, premium card styles, portrait cards, card animations, custom Money Flow, and card/scenery uploads.', tagline:'Insights', features:['Cloud Sync','Briefing','Receipt Scanner','NasrinAI','Portrait','Money Flow'] },
  { name:'Pro+', description:'Everything in Pro, plus automation and an enhanced interface with glow and motion.', tagline:'Scheduled', features:['Pro','Scheduled','Portrait animation'], future:'Premium mascots and advanced native home-screen widgets are planned for a future release. Basic native widgets will be available on Free after store release; paid plans will get advanced widgets. The current ram stays the same.' },
];
export function PlanComparison() {
  const rail = useRef(null);
  const [active,setActive] = useState(0);
  const select = index => { setActive(index); rail.current?.children[index]?.scrollIntoView?.({ behavior:canAnimate() ? 'smooth' : 'auto', block:'nearest', inline:'center' }); };
  return <div className="plan-selector">
    <div className="plan-tabs" aria-label="Plan & Usage">{PLAN_CARDS.map((plan,index)=><button type="button" key={plan.name} aria-pressed={active===index} onClick={()=>select(index)}>{plan.name}</button>)}</div>
    <div className="plan-comparison" ref={rail} onScroll={event=>{ const node=event.currentTarget; const index=Math.round(node.scrollLeft / (node.firstElementChild?.getBoundingClientRect().width + 12 || 1)); setActive(Math.max(0,Math.min(2,index))); }} aria-label="MOVO plans">
      {PLAN_CARDS.map(plan=><section className="plan-detail-card" key={plan.name} aria-label={plan.name + ' plan'}><h3>{plan.name}</h3><p className="plan-tagline">{plan.tagline}</p><p className="plan-description">{plan.description}</p><ul>{plan.features.map(feature=><li key={feature}><span aria-hidden="true">✓</span>{feature}</li>)}</ul>{plan.future && <small>{plan.future}</small>}</section>)}
    </div>
    <small className="plan-swipe-hint">Swipe to compare</small>
  </div>;
}

export default function PlanOffer({ session, entitlement, onRefresh, onClose, onSignIn, onPlans, onOpenCloudSettings, cloudMode = true, feature }) {
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
  if (feature && !cloudMode) return <Sheet title="Local mode active" label="Offline feature access" onClose={onClose}>
    <p>Pro and Pro+ features are paused while Cloud Sync is off. You can still record transactions, manage local accounts and export your data on this device.</p>
    <p>Switching to local storage does not cancel or refund an existing subscription. Turn on Cloud Sync to restore eligible plan access after verification.</p>
    {onOpenCloudSettings && <button type="button" className="primary-button" onClick={onOpenCloudSettings}>Cloud Sync settings</button>}
  </Sheet>;
  return <Sheet title={feature ? 'Unlock more with MOVO' : 'Your first month of Pro is free'} label="MOVO plans" className="plan-offer-sheet" onClose={onClose}>
    <div className="plan-offer-scroll">
    <p>Current plan: <strong>{PLAN_LABELS[effectivePlan(entitlement)]}</strong></p>
    <PlanComparison />
    <p>Refer 10 people who purchase Pro or Pro+ to earn 3 additional months of Pro. Free trials do not count. One reward per account; refunded purchases do not qualify.</p>
    {entitlement?.referralCode && <div className="card pad"><label>Your referral code<input readOnly value={entitlement.referralCode} onFocus={e => e.target.select()} /></label><p>{entitlement.qualifiedReferrals || 0} / 10 qualifying subscribers</p></div>}
    {entitlement?.rewardStartsAt && <p>Your Pro reward starts {new Date(entitlement.rewardStartsAt).toLocaleDateString()} and ends {new Date(entitlement.rewardExpiresAt).toLocaleDateString()}. Store subscriptions continue to renew unless you cancel them in Apple or Google settings.</p>}
    </div>
    <div className="plan-offer-footer">
    {eligible && <><p className="plan-trial-note">One month free · No payment required, no automatic charge.</p>
      <label className="plan-referral-label">Referral code (optional)<input maxLength={24} value={code} onChange={e => setCode(e.target.value)} autoCapitalize="none" autoComplete="off" /></label>
      <button type="button" className="primary-button" disabled={busy} onClick={claim}>{busy ? 'Claiming…' : session?.access_token ? 'Claim my free month' : 'Sign in to claim my free month'}</button></>}
    {error && <p role="alert" className="form-error">{error}</p>}
    <div className="sheet-actions"><button type="button" className="secondary-button" onClick={onPlans}>Plans & purchases</button><button type="button" className="secondary-button" onClick={onClose}>Continue</button></div>
    </div>
  </Sheet>;
}
