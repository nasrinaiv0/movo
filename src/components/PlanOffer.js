import React, { useRef, useState } from 'react';
import Icon from './Icon';
import { canAnimate } from '../lib/motion';
import { Sheet } from './ui';
import { apiUrl } from '../lib/platform';
import { PLAN_LABELS, effectivePlan } from '../lib/planAccess';
import { t as tr } from '../lib/i18n';

/*
 * MOVO plans: a compact comparison (swipe or tap a tab) and the first-month-free offer. Every verified first-time
 * account gets one month of Pro (server rule: claim_movo_trial); App.js starts it automatically after this sheet
 * if the person did not claim it here, so a referral code can still be entered first.
 */
const PLAN_CARDS = [
  { name: 'Free', tagline: 'On this device', features: ['Unlimited records on this device', 'Export & import', 'Receipt attachments', 'NasrinAI answers from your records'] },
  { name: 'Pro', tagline: 'Sync and insights', features: ['Cloud Sync', 'Insights & briefings', 'Full NasrinAI', 'Receipt scanner', 'Portrait cards & animations', 'Custom Money Flow', 'Premium card styles & uploads', 'Gold badges'] },
  { name: 'Pro+', tagline: 'Everything, automated', features: ['Everything in Pro', 'Automatic logging', 'Glow and motion finish', 'Platinum badges'], future: 'Premium mascots and advanced widgets arrive in a future release. The current ram stays the same.' },
];

export function PlanComparison() {
  const rail = useRef(null);
  const [active, setActive] = useState(0);
  const select = index => { setActive(index); rail.current?.children[index]?.scrollIntoView?.({ behavior: canAnimate() ? 'smooth' : 'auto', block: 'nearest', inline: 'center' }); };
  return <div className="plan-selector">
    <div className="plan-tabs" role="group" aria-label={tr('Compare plans')}>{PLAN_CARDS.map((plan, index) => <button type="button" key={plan.name} aria-pressed={active === index} onClick={() => select(index)}>{tr(plan.name)}</button>)}</div>
    <div className="plan-comparison" ref={rail} onScroll={event => { const node = event.currentTarget; const index = Math.round(node.scrollLeft / (node.firstElementChild?.getBoundingClientRect().width + 12 || 1)); setActive(Math.max(0, Math.min(2, index))); }} aria-label={tr('MOVO plans')}>
      {PLAN_CARDS.map(plan => <section className={`plan-detail-card plan-${plan.name === 'Pro+' ? 'plus' : plan.name.toLowerCase()}`} key={plan.name} aria-label={tr('{plan} plan', { plan: tr(plan.name) })}>
        <h3>{tr(plan.name)}</h3><p className="plan-tagline">{tr(plan.tagline)}</p>
        <ul>{plan.features.map(feature => <li key={feature}><Icon name="check" size={14} strokeWidth={2.4} />{tr(feature)}</li>)}</ul>
        {plan.future && <small>{tr(plan.future)}</small>}
      </section>)}
    </div>
  </div>;
}

export default function PlanOffer({ session, entitlement, onRefresh, onClose, onSignIn, onPlans, onOpenCloudSettings, cloudMode = true, feature }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const eligible = !entitlement || entitlement.trialEligible;
  const plan = effectivePlan(entitlement);
  const claim = async () => {
    if (!session?.access_token) { onSignIn(); return; }
    setBusy(true); setError('');
    try {
      const response = await fetch(apiUrl('/api/purchases/trial'), {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
        body: JSON.stringify({ ...(code.trim() ? { referralCode: code.trim().toLowerCase() } : {}) }),
      });
      if (!response.ok) throw new Error(tr('Could not start the free month. Check the referral code, then try again.'));
      await onRefresh(); onClose();
    } catch (cause) { setError(cause.message); } finally { setBusy(false); }
  };
  // Cloud Sync off (#245): paid features pause on this device; the subscription itself is untouched.
  if (feature && !cloudMode) return <Sheet title={tr('Local mode active')} label={tr('Offline feature access')} onClose={onClose}>
    <p>{tr('Pro and Pro+ features are paused while Cloud Sync is off. You can still record transactions, manage local accounts and export your data on this device.')}</p>
    <p>{tr('Switching to local storage does not cancel or refund an existing subscription. Turn on Cloud Sync to restore eligible plan access after verification.')}</p>
    {onOpenCloudSettings && <button type="button" className="primary-button" onClick={onOpenCloudSettings}>{tr('Cloud Sync settings')}</button>}
  </Sheet>;
  return <Sheet title={feature ? tr('Unlock with Pro') : tr('Your first month of Pro is free')} label={tr('MOVO plans')} className="plan-offer-sheet" onClose={onClose}>
    <div className="plan-offer-scroll">
      <p className="plan-current">{tr('Current plan')} <strong>{tr(PLAN_LABELS[plan])}</strong></p>
      <PlanComparison />
      <p className="plan-referral-line"><Icon name="gift" size={15} /> {tr('Invite 10 friends who subscribe and get 3 months of Pro.')}</p>
      {entitlement?.referralCode && <div className="plan-code-row"><input readOnly aria-label={tr('Your referral code')} value={entitlement.referralCode} onFocus={e => e.target.select()} /><small>{tr('{n} of 10', { n: entitlement.qualifiedReferrals || 0 })}</small></div>}
      {entitlement?.rewardStartsAt && <p className="plan-fine">{tr('Pro reward: {start} – {end}', { start: new Date(entitlement.rewardStartsAt).toLocaleDateString(), end: new Date(entitlement.rewardExpiresAt).toLocaleDateString() })}</p>}
    </div>
    <div className="plan-offer-footer">
      {eligible && <>
        <p className="plan-trial-note">{tr('1 month free · no payment, no automatic charge')}</p>
        {session?.access_token && (showCode
          ? <input className="plan-referral-input" maxLength={24} value={code} onChange={e => setCode(e.target.value)} placeholder={tr('Referral code')} aria-label={tr('Referral code')} autoCapitalize="none" autoComplete="off" />
          : <button type="button" className="link-button plan-referral-toggle" onClick={() => setShowCode(true)}>{tr('Have a referral code?')}</button>)}
        <button type="button" className="primary-button" disabled={busy} onClick={claim}>{busy ? tr('Starting…') : session?.access_token ? tr('Start my free month') : tr('Sign in to claim my free month')}</button>
      </>}
      {error && <p role="alert" className="form-error">{error}</p>}
      <div className="sheet-actions"><button type="button" className="secondary-button" onClick={onPlans}>{tr('Plans & purchases')}</button><button type="button" className="secondary-button" onClick={onClose}>{tr('Not now')}</button></div>
    </div>
  </Sheet>;
}
