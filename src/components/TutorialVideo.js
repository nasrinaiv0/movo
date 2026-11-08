import React, { useCallback, useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { MovoMark } from './MovoLogo';
import { canAnimate } from '../lib/motion';
import { t as tr } from '../lib/i18n';

/*
 * First-run video guide: a short, story-style animated tutorial built from MOVO's own UI pieces (no downloads, works
 * offline and in every language). It plays scene by scene with a progress bar; tap the right side to go on, the
 * left side to go back, hold or use the pause button to stop. Skip or the last scene hands over to the spotlight
 * walkthrough (Walkthrough.js). Reduced motion: scenes do not animate or advance by themselves.
 */
export const SCENES = [
  { id: 'welcome', title: 'Welcome to MOVO', text: 'Track every peso in one calm place.' },
  { id: 'wallet', title: 'Add your accounts', text: 'Banks, cards, e-wallets and cash. You enter the balances.' },
  { id: 'log', title: 'Log in seconds', text: 'Type “Grab 250” to NasrinAI, or tap +.' },
  { id: 'insights', title: 'See where it goes', text: 'Money Flow and budgets show your month at a glance.' },
  { id: 'plans', title: 'Plan ahead', text: 'Bills, goals and renewals, with reminders.' },
  { id: 'pro', title: 'Your first month of Pro is free', text: 'Cloud Sync, insights and full NasrinAI. No payment needed.' },
];
const SCENE_MS = 4200;

function SceneArt({ id }) {
  if (id === 'welcome') return <div className="tv-art tv-welcome"><span className="tv-logo"><MovoMark size={72} /></span><span className="tv-ring" /></div>;
  if (id === 'wallet') return <div className="tv-art tv-cards">{['tv-c1', 'tv-c2', 'tv-c3'].map((c, i) => <span key={c} className={`tv-card ${c}`} style={{ '--i': i }}><i /><b /></span>)}</div>;
  if (id === 'log') return <div className="tv-art tv-chat"><span className="tv-bubble me">{tr('Grab 250')}</span><span className="tv-bubble bot"><Icon name="check" size={14} strokeWidth={2.6} /> {tr('Logged ₱250 · Transport')}</span></div>;
  if (id === 'insights') return <div className="tv-art tv-bars">{[46, 72, 38, 88, 60, 30].map((h, i) => <span key={i} style={{ '--h': `${h}%`, '--i': i }} />)}</div>;
  if (id === 'plans') return <div className="tv-art tv-plans">{[['receipt', 72], ['target', 45], ['calendar', 88]].map(([icon, p], i) => <span key={icon} className="tv-plan" style={{ '--p': `${p}%`, '--i': i }}><Icon name={icon} size={16} /><i /></span>)}</div>;
  return <div className="tv-art tv-pro"><span className="tv-badge"><Icon name="star" size={30} /></span><span className="tv-chip">{tr('1 month free')}</span></div>;
}

export default function TutorialVideo({ onDone, scenes = SCENES }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const auto = canAnimate();
  const last = index === scenes.length - 1;
  const start = useRef(0);

  const spentRef = useRef(0); // time already played in this scene, kept across pauses
  const go = useCallback((n) => { spentRef.current = 0; setElapsed(0); if (n >= scenes.length) onDone('finished'); else setIndex(Math.max(0, n)); }, [scenes.length, onDone]);
  useEffect(() => {
    if (!auto || paused || last) return undefined;
    start.current = performance.now() - spentRef.current;
    let frame;
    const tick = (now) => {
      const spent = now - start.current;
      if (spent >= SCENE_MS) { go(index + 1); return; }
      spentRef.current = spent; setElapsed(spent); frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [auto, paused, last, index, go]);
  useEffect(() => {
    const key = (e) => { if (e.key === 'ArrowRight') go(index + 1); else if (e.key === 'ArrowLeft') go(index - 1); else if (e.key === 'Escape') onDone('skipped'); else if (e.key === ' ') setPaused(p => !p); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [index, go, onDone]);

  const scene = scenes[index];
  return <div className="tv-backdrop" role="presentation">
    <div className="tv-player" role="dialog" aria-modal="true" aria-label={tr('MOVO video guide')} aria-roledescription={tr('video')}>
      <div className="tv-progress" aria-hidden="true">{scenes.map((s, i) => <span key={s.id}><i style={{ width: i < index ? '100%' : i === index ? `${last ? 100 : Math.min(100, (elapsed / SCENE_MS) * 100)}%` : '0%' }} /></span>)}</div>
      <div className="tv-top">
        <span className="tv-count">{tr('{n} of {total}', { n: index + 1, total: scenes.length })}</span>
        {auto && !last && <button type="button" className="tv-icon" aria-label={paused ? tr('Play') : tr('Pause')} onClick={() => setPaused(p => !p)}><Icon name={paused ? 'play' : 'pause'} size={16} /></button>}
        <button type="button" className="tv-skip" onClick={() => onDone('skipped')}>{tr('Skip')}</button>
      </div>
      <div className={`tv-stage${auto ? '' : ' is-still'}`} key={scene.id}
        onPointerDown={() => auto && setPaused(true)} onPointerUp={() => auto && setPaused(false)} onPointerLeave={() => auto && paused && setPaused(false)}>
        <SceneArt id={scene.id} />
        <h2>{tr(scene.title)}</h2>
        <p aria-live="polite">{tr(scene.text)}</p>
      </div>
      <button type="button" className="tv-tap tv-prev" aria-label={tr('Previous')} onClick={() => go(index - 1)} disabled={index === 0} />
      <button type="button" className="tv-tap tv-next" aria-label={tr('Next')} onClick={() => go(index + 1)} />
      <div className="tv-actions">
        {last ? <button type="button" className="primary-button" onClick={() => onDone('finished')} autoFocus>{tr('Start the walkthrough')}</button>
          : <button type="button" className="secondary-button" onClick={() => go(index + 1)}>{tr('Next')}</button>}
      </div>
    </div>
  </div>;
}
