import React, { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { PENDING_REFERRAL_EVENT, clearPendingReferralCode, pendingReferralCode, savePendingReferralCode, trialReferralCode } from '../lib/referrals';
import { canAnimate } from '../lib/motion';
import { Sheet } from './ui';
import { apiUrl } from '../lib/platform';
import { MovoMark } from './MovoLogo';
import { getStoreProducts, isNativePurchasePlatform, purchaseStoreProduct } from '../lib/nativePurchases';
import { STORE_PRODUCT_BY_ID, annualSavingPercent } from '../lib/storeProducts';
import { effectivePlan } from '../lib/planAccess';
import SubscriptionLinks from './SubscriptionLinks';
import { t as tr } from '../lib/i18n';
import { money } from '../lib/format';

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

const PLANS = [
  { tier: 'free', name: 'Free', tone: 'color', heading: 'Included:', features: ['Unlimited records on this device', 'Export & import', 'Receipt attachments', 'NasrinAI answers from your records'] },
  { tier: 'pro', name: 'Pro', tone: 'gold', heading: 'Everything in Free, plus:', features: ['Cloud Sync', 'Insights & briefings', 'Full NasrinAI', 'Receipt scanner', 'Custom Money Flow', 'Zodiac & glow Home headers', 'Gold badges & app icons'] },
  { tier: 'pro_plus', name: 'Pro+', tone: 'platinum', heading: 'Everything in Pro, plus:', features: ['Automatic logging', 'Glow and motion finish', 'Premium card styles & uploads', 'Platinum badges & app icons'] },
];
const PLUS_ONLY = ['automation', 'premiumMascots', 'premiumUI'];

/*
 * One compact panel (2026-11-09 reference): MOVO mark, Monthly/Annual, Free (green MOVO) · Pro (gold MOVO) · Pro+ (platinum MOVO),
 * the store's own localized price, what the plan adds, one action. Free is the green mark, the free month white,
 * Pro gold, Pro+ platinum. Prices only ever come from the App Store / Google Play; none are invented here.
 */
export default function PlanOffer({ session, entitlement, onRefresh, onClose, onSignIn, onPlans, onOpenCloudSettings, onOpenTerms, cloudMode = true, feature, currency = 'PHP' }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('monthly');
  const [products, setProducts] = useState([]);
  // A friend's code from a download link (?ref=M78038) is filled in, ready to use.
  // The field is part of the panel from the first frame (owner, 2026-11-12): no "Have a referral code?" step and no
  // waiting for sign-in or the plan check to load.
  const [code, setCode] = useState(() => pendingReferralCode());
  // A code from a Google Play download link can arrive a moment after the app opens; fill it in if the field is empty.
  useEffect(() => {
    const fill = (event) => setCode(current => current || event.detail || '');
    window.addEventListener(PENDING_REFERRAL_EVENT, fill);
    return () => window.removeEventListener(PENDING_REFERRAL_EVENT, fill);
  }, []);
  const eligible = !entitlement || entitlement.trialEligible;
  const plan = effectivePlan(entitlement);
  const onTrial = entitlement?.source === 'trial' && plan === 'pro';
  const [index, setIndex] = useState(() => (PLUS_ONLY.includes(feature) || plan === 'pro_plus' ? 2 : 1));
  const native = isNativePurchasePlatform();
  useEffect(() => {
    let live = true;
    if (native) getStoreProducts().then(items => { if (live) setProducts(items || []); }).catch(() => { if (live) setProducts([]); });
    return () => { live = false; };
  }, [native]);
  const selected = PLANS[index];
  const productFor = (tier, which) => products.find(item => STORE_PRODUCT_BY_ID[item.productIdentifier]?.tier === tier && STORE_PRODUCT_BY_ID[item.productIdentifier]?.period === which);
  const product = selected.tier === 'free' ? null : productFor(selected.tier, period);
  const other = selected.tier === 'free' ? null : productFor(selected.tier, period === 'monthly' ? 'annual' : 'monthly');
  const monthly = selected.tier === 'free' ? null : productFor(selected.tier, 'monthly');
  const annual = selected.tier === 'free' ? null : productFor(selected.tier, 'annual');
  const saving = monthly?.price > 0 && annual?.price > 0 ? Math.round((1 - annual.price / (monthly.price * 12)) * 100) : 0;
  // Each tile shows its own amount for the chosen period (owner, 2026-11-12). Prices only ever come from the store;
  // without a store (the website) the paid tiles say "Price in app" rather than show an invented number.
  const tilePrice = (tier) => {
    if (tier === 'free') return money(0, currency).replace(/[.,]00(?=\D*$)/, '');
    const item = productFor(tier, period);
    return item ? `${item.priceString}/${tr(period === 'monthly' ? 'mo' : 'yr')}` : tr('Price in app');
  };
  // "Save 20%" on each paid plan once Annual is chosen (owner, 2026-11-12); worked out from that plan's store prices
  // whenever they are loaded, else the owner's annual pricing.
  const tileSaving = (tier) => tier === 'free' || period !== 'annual' ? 0
    : annualSavingPercent([{ monthly: productFor(tier, 'monthly'), annual: productFor(tier, 'annual') }]);
  const claim = async () => {
    // Signed out: keep the typed code on this device, so it is filled in again after signing in.
    if (!session?.access_token) { savePendingReferralCode(code); onSignIn(); return; }
    setBusy(true); setError('');
    try {
      // Short codes such as M78038 (any case, spaces ignored); older 24-character codes still work.
      const entered = trialReferralCode(code);
      if (entered === null) throw new Error(tr('Could not start the free month. Check the referral code, then try again.'));
      const response = await fetch(apiUrl('/api/purchases/trial'), {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
        body: JSON.stringify({ ...(entered ? { referralCode: entered } : {}) }),
      });
      if (response.status === 429) throw new Error(tr('Too many tries. Try the code again in an hour.'));
      if (!response.ok) throw new Error(tr('Could not start the free month. Check the referral code, then try again.'));
      if (entered) clearPendingReferralCode();
      await onRefresh(); onClose();
    } catch (cause) { setError(cause.message); } finally { setBusy(false); }
  };
  const purchase = async () => {
    if (!session?.access_token) { onSignIn(); return; }
    if (!product) return;
    setBusy(true); setError('');
    try { await purchaseStoreProduct(product, session); await onRefresh(); onClose(); }
    catch (cause) { setError(cause?.message || tr('Purchase could not be verified.')); } finally { setBusy(false); }
  };
  // Cloud Sync off (#245): paid features pause on this device; the subscription itself is untouched.
  if (feature && !cloudMode) return <Sheet title={tr('Local mode active')} label={tr('Offline feature access')} className="local-mode-sheet" onClose={onClose}>
    <div className="local-mode-content">
      <p>{tr('Pro and Pro+ features are paused while Cloud Sync is off. You can still record transactions, manage local accounts and export your data on this device.')}</p>
      <div className="local-mode-detail"><Icon name="check" size={18} /><span>{tr('Local Storage: records stay on this device.')}</span></div>
      <div className="local-mode-detail"><Icon name="shield" size={18} /><span>{tr('Switching to local storage does not cancel or refund an existing subscription. Turn on Cloud Sync to restore eligible plan access after verification.')}</span></div>
      {onOpenCloudSettings && <button type="button" className="primary-button local-mode-action" onClick={onOpenCloudSettings}>{tr('Cloud Sync settings')}</button>}
    </div>
  </Sheet>;

  const isCurrent = selected.tier === plan && !(selected.tier === 'pro' && onTrial);
  const trialOffer = selected.tier === 'pro' && eligible && !isCurrent;
  let action;
  if (isCurrent) action = { label: tr('Current plan'), disabled: true };
  else if (selected.tier === 'free') action = plan === 'free' ? { label: tr('Current plan'), disabled: true } : { label: tr('Plans & purchases'), run: onPlans };
  else if (trialOffer) action = { label: busy ? tr('Starting…') : session?.access_token ? tr('Start my free month') : tr('Sign in to claim my free month'), run: claim };
  else if (!session?.access_token) action = { label: tr('Sign in to continue'), run: onSignIn };
  else if (product) action = { label: busy ? tr('Please wait…') : tr('Continue with {plan}', { plan: selected.name }), run: purchase };
  else action = { label: tr('Continue with {plan}', { plan: selected.name }), disabled: true, note: native ? tr('Store subscription products are not available yet.') : tr('Subscribe in the MOVO iOS or Android app.') };
  const markTone = trialOffer || (selected.tier === 'pro' && onTrial) ? 'white' : selected.tone;

  return <Sheet center label={tr('MOVO plans')} className="plan-offer-sheet plan-panel" onClose={onClose}>
    <div className="plan-panel-head">
      <span className="plan-panel-brand"><MovoMark size={30} tone={markTone} /><b>MOVO</b></span>
      <h2>{feature ? tr('Unlock with Pro') : tr('Upgrade MOVO')}</h2>
    </div>
    <div className="plan-period" role="group" aria-label={tr('Billing period')}>
      {[['monthly', 'Monthly'], ['annual', 'Annual']].map(([id, label]) => <button type="button" key={id} aria-pressed={period === id} className={period === id ? 'selected' : ''} onClick={() => setPeriod(id)}>{tr(label)}</button>)}
    </div>
    <div className="plan-tiles" role="radiogroup" aria-label={tr('Compare plans')}>
      {PLANS.map((item, i) => <button type="button" role="radio" aria-checked={index === i} key={item.tier} className={`plan-tile tier-${item.tier}${index === i ? ' selected' : ''}`} onClick={() => setIndex(i)}>
        {item.tier === plan ? <small className="plan-tile-badge">{onTrial && item.tier === 'pro' ? tr('Free month') : tr('Current')}</small>
          : tileSaving(item.tier) > 0 && <small className="plan-tile-badge is-save" key="save">{tr('Save {n}%', { n: tileSaving(item.tier) })}</small>}
        <MovoMark size={26} tone={item.tone} />
        <strong>{tr(item.name)}</strong>
        <span className={`plan-tile-price${item.tier !== 'free' && !productFor(item.tier, period) ? ' is-note' : ''}`}>{tilePrice(item.tier)}</span>
      </button>)}
    </div>
    {/* The selected plan's price in large type only when there is one to show: the tiles already carry each plan's
        amount (₱0 for Free, the store price, or "Price in app" on the website). */}
    {(product || trialOffer) && <div className="plan-price" aria-live="polite" key={`${selected.tier}:${period}`}>
      {product ? <><strong>{product.priceString}</strong><span>/ {tr(period === 'monthly' ? 'month' : 'year')}</span></>
        : <><MovoMark size={22} tone="white" /><strong>{tr('1 month free')}</strong></>}
      {selected.tier !== 'free' && other && <small>{tr('or {price} / {period}', { price: other.priceString, period: tr(period === 'monthly' ? 'year' : 'month') })}{saving > 0 && period === 'monthly' ? <em> {tr('(save {n}%)', { n: saving })}</em> : null}</small>}
      {trialOffer && <small className="plan-trial-note">{tr('No payment, no automatic charge')}</small>}
    </div>}
    <div className={`plan-features tier-${selected.tier}`} key={selected.tier}>
      <b>{tr(selected.heading)}</b>
      <ul>{selected.features.map((item, i) => <li key={item} style={{ '--i': i }}><Icon name="check" size={15} strokeWidth={2.4} />{tr(item)}</li>)}</ul>
    </div>
    {trialOffer && <input className="plan-referral-input" maxLength={24} value={code} onChange={e => setCode(e.target.value)} placeholder={tr('Referral code, e.g. M78038')} aria-label={tr('Referral code')} autoCapitalize="none" autoComplete="off" />}
    <div className="plan-panel-foot">
    {error && <p role="alert" className="form-error">{error}</p>}
    <button type="button" key={selected.tier} className={`plan-cta tier-${selected.tier}`} disabled={busy || action.disabled} onClick={action.run}>{action.label}</button>
    {action.note && <p className="plan-fine">{action.note}</p>}
    <p className="plan-fine">{selected.tier === 'free' ? tr('Your records stay on this device unless you turn on Cloud Sync.') : trialOffer ? tr('The free month ends on its own; nothing renews.') : tr('Auto-renews unless canceled.')} {onOpenTerms ? <button type="button" className="link-button" onClick={onOpenTerms}>{tr('Terms apply.')}</button> : tr('Terms apply.')}
      {onPlans && selected.tier !== 'free' && <> · <button type="button" className="link-button" onClick={onPlans}>{tr('Plans & purchases')}</button></>}</p>
    <SubscriptionLinks session={session} onSignIn={onSignIn} onRefresh={() => onRefresh?.()} className="plan-fine" />
    </div>
  </Sheet>;
}
