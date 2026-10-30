import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import Icon from './Icon';
import { MovoMark } from './MovoLogo';
import { t as tr } from '../lib/i18n';

/* First-run tour: a welcome card, then a few steps that each spotlight one part of the app. */
export const TOUR_STEPS = [
  { target: '.balance-card', icon: 'chart', title: 'Your money at a glance', text: 'Your total balance and this month’s income and spending appear here as you add records.' },
  { target: '.bottom-nav .nav-item[aria-label="Wallet"]', icon: 'wallet', title: 'Add your accounts', text: 'Add bank accounts, cards, e-wallets and cash in Wallet. Balances are the numbers you enter; MOVO never connects to your bank.' },
  { target: '.bottom-nav .nav-center', icon: 'message', title: 'Log by chatting', text: 'Open NasrinAI and type something like “Grab 250” or “Salary 50000”. It is saved straight to your records.' },
  { target: '.bottom-nav .nav-item[aria-label="Menu"]', icon: 'grid', title: 'Subscriptions, plans and limits', text: 'Track renewals, savings goals and monthly limits from Menu. Settings is there too.' },
];

const PAD = 6;
const rectOf = (selector) => {
  const el = typeof document !== 'undefined' ? document.querySelector(selector) : null;
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return r.width && r.height ? { top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2, radius: parseFloat(getComputedStyle(el).borderRadius) + PAD || 16 } : null;
};

export default function Walkthrough({ steps = TOUR_STEPS, onDone }) {
  const [stage, setStage] = useState(-1); // -1 = welcome card
  const [rect, setRect] = useState(null);
  const step = stage >= 0 ? steps[stage] : null;

  const measure = useCallback(() => { if (step) setRect(rectOf(step.target)); }, [step]);
  useLayoutEffect(() => {
    if (!step) return;
    const el = document.querySelector(step.target);
    if (!el) { if (stage < steps.length - 1) setStage(stage + 1); else onDone(); return; } // skip a step whose target is not on screen
    if (typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'center', behavior: 'auto' });
    measure();
  }, [step, stage, steps.length, measure, onDone]);
  useEffect(() => {
    window.addEventListener('resize', measure); window.addEventListener('scroll', measure, true);
    const esc = (e) => { if (e.key === 'Escape') onDone(); };
    window.addEventListener('keydown', esc);
    return () => { window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true); window.removeEventListener('keydown', esc); };
  }, [measure, onDone]);

  const next = () => (stage < steps.length - 1 ? setStage(stage + 1) : onDone());

  if (!step) {
    return <div className="tour-backdrop" role="presentation">
      <div className="tour-welcome" role="dialog" aria-modal="true" aria-labelledby="tour-title">
        <span className="tour-logo" aria-hidden="true"><MovoMark size={64} /></span>
        <h2 id="tour-title">{tr('Welcome to MOVO')}</h2>
        <p>{tr('A private place to track your money. Your records stay on this device unless you sign in.')}</p>
        <div className="sheet-actions"><button type="button" className="secondary-button" onClick={onDone}>{tr('Skip')}</button><button type="button" className="primary-button" onClick={() => setStage(0)} autoFocus>{tr('Take a quick tour')}</button></div>
      </div>
    </div>;
  }

  const below = rect ? rect.top + rect.height + 220 < window.innerHeight : true;
  const cardStyle = rect ? (below ? { top: rect.top + rect.height + 14 } : { bottom: window.innerHeight - rect.top + 14 }) : { bottom: 120 };
  const arrowLeft = rect ? Math.min(Math.max(rect.left + rect.width / 2, 36), window.innerWidth - 36) : '50%';
  return <div className="tour-layer" role="presentation">
    {rect ? <span className="tour-spot" style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height, borderRadius: rect.radius }} aria-hidden="true" /> : <span className="tour-dim" aria-hidden="true" />}
    <div className={`tour-card ${below ? 'below' : 'above'}`} style={{ ...cardStyle, '--arrow-x': typeof arrowLeft === 'number' ? `${arrowLeft}px` : arrowLeft }} role="dialog" aria-modal="true" aria-labelledby="tour-step-title" aria-describedby="tour-step-text">
      <div className="tour-card-head"><span className="tour-icon"><Icon name={step.icon} size={18} strokeWidth={2} /></span><span className="tour-count">{tr('{n} of {total}', { n: stage + 1, total: steps.length })}</span></div>
      <h3 id="tour-step-title">{tr(step.title)}</h3>
      <p id="tour-step-text">{tr(step.text)}</p>
      <div className="tour-actions"><button type="button" className="link-button" onClick={onDone}>{tr('Skip')}</button><button type="button" className="primary-button" onClick={next} autoFocus key={stage}>{stage < steps.length - 1 ? tr('Next') : tr('Done')}</button></div>
    </div>
  </div>;
}
