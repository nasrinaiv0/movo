import React, { useState } from 'react';
import Icon from './Icon';
import { Sheet } from './ui';
import { formatDate } from '../lib/format';
import { t as tr } from '../lib/i18n';
import { PLAN_LABEL, FEATURE_LABEL, REFERRAL_CODE, requiredPlan, planErrorMessage } from '../lib/plans';

/*
 * MOVO plans: the first-launch offer (claim a free month of Pro), the plan comparison, referral progress and the
 * referral code field. Opened from Settings → Plans and from any locked feature (`feature` names it).
 * Subscriptions are bought with Apple's and Google's in-app purchases; until those are live the sheet says so and
 * offers only what works today (the trial and referrals). Plan changes happen on the server.
 */
const FREE = ['Unlimited records on this device', 'Export and import all your data', 'NasrinAI answers from your saved records', 'Upload receipts'];
const PRO = ['cloud', 'portraitCards', 'cardAnimations', 'insights', 'customRange', 'uploads', 'premiumStyles', 'nasrinaiFull', 'receiptScan'];
const PRO_PLUS = ['automation', 'premiumLook'];

export default function PlanSheet({ membership = { plan: 'free' }, signedIn, feature, welcome = false, onSignIn, onClaim, onApplyReferral, notify, onClose }) {
  const plan = membership.plan === 'legacy' ? 'pro_plus' : membership.plan || 'free';
  const [busy, setBusy] = useState('');
  const [code, setCode] = useState('');
  const [problem, setProblem] = useState('');
  const run = async (what, task) => {
    setBusy(what); setProblem('');
    try { await task(); return true; } catch (error) { setProblem(planErrorMessage(error)); return false; } finally { setBusy(''); }
  };
  const trialOpen = plan === 'free' && (!signedIn || membership.trial_available !== false);
  const share = async () => {
    const text = tr('Join me on MOVO with my code {code}.', { code: membership.referral_code });
    try {
      if (navigator.share) { await navigator.share({ text }); return; }
      await navigator.clipboard.writeText(membership.referral_code);
      notify?.(tr('Referral code copied.'));
    } catch { /* share sheet dismissed */ }
  };
  const goal = membership.referral_goal || 10;
  const subscribed = Math.min(goal, Number(membership.referrals_subscribed) || 0);

  return <Sheet title={tr('MOVO plans')} subtitle={plan === 'free' ? tr('You are on Free.') : membership.ends_at ? tr('You are on {plan} until {date}.', { plan: PLAN_LABEL[plan], date: formatDate(membership.ends_at) }) : tr('You are on {plan}.', { plan: PLAN_LABEL[plan] })} onClose={onClose} label={tr('MOVO plans')} className="plan-sheet">
    {feature && FEATURE_LABEL[feature] && plan === 'free' && <p className="plan-reason" role="status"><Icon name="lock" size={14} strokeWidth={2.2} /> {tr('{feature} is part of {plan}.', { feature: tr(FEATURE_LABEL[feature]), plan: PLAN_LABEL[requiredPlan(feature)] })}</p>}
    {feature && FEATURE_LABEL[feature] && plan === 'pro' && requiredPlan(feature) === 'pro_plus' && <p className="plan-reason" role="status"><Icon name="lock" size={14} strokeWidth={2.2} /> {tr('{feature} is part of {plan}.', { feature: tr(FEATURE_LABEL[feature]), plan: PLAN_LABEL.pro_plus })}</p>}

    {trialOpen && <section className="card plan-offer" aria-label={tr('Free month of Pro')}>
      <span className="plan-offer-icon" aria-hidden="true"><Icon name="gift" size={22} /></span>
      <h3>{tr('Claim your free month of Pro')}</h3>
      <p>{tr('Try every Pro feature for one month. No payment needed, and nothing renews by itself.')}</p>
      {signedIn
        ? <button type="button" className="primary-button" disabled={!!busy} onClick={() => run('claim', onClaim)}>{busy === 'claim' ? tr('Starting…') : tr('Claim free month')}</button>
        : <button type="button" className="primary-button" onClick={onSignIn}>{tr('Sign in to claim')}</button>}
      {welcome && <button type="button" className="link-button" onClick={onClose}>{tr('Maybe later')}</button>}
    </section>}
    {problem && <p className="form-error" role="alert">{problem}</p>}

    <section className="plan-grid" aria-label={tr('Compare plans')}>
      <article className={`card plan-card${plan === 'free' ? ' is-current' : ''}`}>
        <header><strong>{tr('Free')}</strong>{plan === 'free' && <small>{tr('Current')}</small>}</header>
        <ul>{FREE.map(item => <li key={item}><Icon name="check" size={14} strokeWidth={2.4} /> {tr(item)}</li>)}</ul>
      </article>
      <article className={`card plan-card plan-pro${plan === 'pro' ? ' is-current' : ''}`}>
        <header><strong>Pro</strong>{plan === 'pro' && <small>{tr('Current')}</small>}</header>
        <ul>{PRO.map(item => <li key={item}><Icon name="check" size={14} strokeWidth={2.4} /> {tr(FEATURE_LABEL[item])}</li>)}</ul>
      </article>
      <article className={`card plan-card plan-pro-plus${plan === 'pro_plus' ? ' is-current' : ''}`}>
        <header><strong>Pro+</strong>{plan === 'pro_plus' && <small>{tr('Current')}</small>}</header>
        <ul>
          <li><Icon name="check" size={14} strokeWidth={2.4} /> {tr('Everything in Pro')}</li>
          {PRO_PLUS.map(item => <li key={item}><Icon name="check" size={14} strokeWidth={2.4} /> {tr(FEATURE_LABEL[item])}</li>)}
          <li><Icon name="star" size={14} strokeWidth={2.4} /> {tr('Premium mascots (coming soon)')}</li>
        </ul>
      </article>
    </section>
    <p className="form-note plan-store-note">{tr('Pro and Pro+ subscriptions will be available through in-app purchase on the App Store and Google Play.')}</p>

    {signedIn && membership.referral_code && <section className="card plan-referral" aria-label={tr('Invite friends')}>
      <h3>{tr('Invite friends')}</h3>
      <p>{tr('When {goal} people you invite subscribe to Pro or Pro+, you get 3 extra months of Pro.', { goal })}</p>
      <div className="plan-code"><code aria-label={tr('Your referral code')}>{membership.referral_code}</code><button type="button" className="secondary-button" onClick={share}><Icon name="send" size={16} /> {tr('Share')}</button></div>
      <div className="plan-progress" role="progressbar" aria-valuemin={0} aria-valuemax={goal} aria-valuenow={subscribed} aria-label={tr('Friends who subscribed')}><span style={{ width: `${(subscribed / goal) * 100}%` }} /></div>
      <small>{membership.referral_reward_granted ? tr('Reward unlocked: 3 extra months of Pro.') : tr('{n} of {goal} subscribed', { n: subscribed, goal })}</small>
      {!membership.referred_by && <form className="plan-redeem" onSubmit={e => { e.preventDefault(); if (!REFERRAL_CODE.test(code.trim().toUpperCase())) { setProblem(planErrorMessage({ message: 'referral_code_invalid' })); return; } run('code', () => onApplyReferral(code)).then(ok => { if (ok) setCode(''); }); }}>
        <label htmlFor="plan-referral-code">{tr('Have a friend’s code?')}</label>
        <div><input id="plan-referral-code" value={code} onChange={e => setCode(e.target.value.toUpperCase().slice(0, 8))} autoCapitalize="characters" autoComplete="off" spellCheck="false" placeholder="ABCD2345" />
          <button type="submit" className="secondary-button" disabled={!!busy || code.trim().length !== 8}>{busy === 'code' ? tr('Checking…') : tr('Apply')}</button></div>
      </form>}
    </section>}
  </Sheet>;
}
