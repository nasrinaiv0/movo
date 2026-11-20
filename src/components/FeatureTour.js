import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { MovoMark } from './MovoLogo';
import AriesMascot from './AriesMascot';
import { canAnimate } from '../lib/motion';
import { t as tr } from '../lib/i18n';
import manifest from '../lib/tourManifest.json';

/*
 * The MOVO guide (owner, 2026-11-16): a walk through every part of MOVO on screenshots of the real app, replacing
 * the earlier video. Each step shows one screenshot with the feature it is about left sharp and ringed while the rest
 * is blurred white (dark theme: blurred dark), a caption, and a short spoken line.
 *
 *  - Screenshots show invented sample records only ("Ana"); they are made by scripts/tutorial-guide/capture.cjs, which
 *    also records where each highlight sits (src/lib/tourManifest.json), so the pictures and highlights never drift.
 *  - Narration: one clip per step in a clear female voice made with the open Kokoro model
 *    (scripts/tutorial-guide/narrate.py). English only; the captions are translated so every language can follow.
 *  - Sound starts on its own where the platform allows it; otherwise the steps still advance on their timing and the
 *    sound button (or any tap on Next) turns it on. Tap the right side for next, the left for back, hold to pause.
 *  - Reduced motion (and tests): nothing plays or moves by itself; Next and Back step through.
 *  - Aries, MOVO's welcoming mascot (AriesMascot), stands beside each caption in a pose that suits the step.
 *  - Skip, or Continue on the last step, hands over to the spotlight walkthrough (Walkthrough.js) on first run.
 * `title` and `text` must match scripts/tutorial-guide/steps.cjs, which is what the narrator reads (a test checks).
 */
export const TOUR_STEPS = [
  { id: 'welcome', title: 'Welcome to MOVO', text: 'Your money, in one calm place. This short tour shows you around.' },
  { id: 'balance', title: 'Your balance at a glance', text: 'Home shows your total balance, with this month’s income, expenses and savings.' },
  { id: 'planning', title: 'Know where you stand', text: 'Net worth, bills due, loans and goals sit together in Financial planning.' },
  { id: 'flow', title: 'See where it goes', text: 'Money Flow charts what came in and what went out, by day, week, month or year.' },
  { id: 'budgets', title: 'Budgets and goals', text: 'Set monthly budgets and savings goals, and watch your progress.' },
  { id: 'wallet', title: 'Your cards in Wallet', text: 'Add your banks, cards, e-wallets and cash. You enter the balances. MOVO never connects to your bank.' },
  { id: 'accounts', title: 'Accounts and store cards', text: 'Every account has its own card. Keep loyalty and membership cards here too, with their points.' },
  { id: 'add', title: 'Log in seconds', text: 'Tap plus, enter the amount and pick a category. You can add a receipt too.' },
  { id: 'scan', title: 'Scan receipts with AI', text: 'With your permission, AI reads the store, total and items from a photo. Check them, choose the account and log it. Included in Pro.' },
  { id: 'chat', title: 'Or tell NasrinAI', text: 'Type “Mang Inasal 250” and it is logged for you. Ask about your spending any time.' },
  { id: 'automation', title: 'Automatic logging', text: 'Phone automations can log your Apple Pay and Google Pay payments, bank app messages and voice entries. Included in Pro+.' },
  { id: 'transactions', title: 'Every record in one list', text: 'Search and filter your transactions. Each row shows the balance after it.' },
  { id: 'subscriptions', title: 'Never miss a renewal', text: 'Track your subscriptions and see what renews next.' },
  { id: 'menu', title: 'More tools in Menu', text: 'Cashback, scheduled payments, exchange rates, crypto and stock watchlists, spending limits and your archive.' },
  { id: 'appearance', title: 'Make it yours', text: 'Choose a theme, text size, language and home currency in Settings.' },
  { id: 'security', title: 'Your data stays yours', text: 'Lock the app with a passcode. Clear your data or delete your account any time.' },
  { id: 'sync', title: 'Sync across devices', text: 'Cloud Sync keeps your records up to date on every device you sign in to.' },
  { id: 'logos', title: 'About logos', text: 'Bank and brand logos only help you recognise your accounts. MOVO is not affiliated with them, and never moves your money.' },
  { id: 'pro', title: 'Your first month of Pro is free', text: 'Cloud Sync, insights and full NasrinAI. No payment needed.' },
  { id: 'done', title: 'You’re all set', text: 'Replay this tour any time from Settings.' },
];

// Aries, the welcoming mascot, guides every step; its pose follows what the step is about.
export const TOUR_POSES = { welcome: 'hello', planning: 'alert', budgets: 'happy', scan: 'scan', automation: 'auto', sync: 'auto', subscriptions: 'alert', done: 'happy' };
export const tourPose = (id) => TOUR_POSES[id] || 'point';

const ASPECT = manifest.size[1] / manifest.size[0]; // screenshot height / width
const TAIL_MS = 900;      // a breath after each spoken line
const WAIT_MS = 2500;     // how long a step waits for its clip to load before carrying on without it
const STILL_MS = 5200;    // a step with no clip length (never the case for shipped steps)
const base = () => (typeof process !== 'undefined' && process.env.PUBLIC_URL) || '';
export const tourImage = (name, dark) => `${base()}/tutorial/${name}-${dark ? 'dark' : 'light'}.webp`;
export const tourAudio = (id) => `${base()}/tutorial/${id}.mp3`;
const entry = (id) => manifest.steps[id] || { image: '', rect: [0, 0, 1, 1], ms: 0 };
const isWhole = (rect) => rect[2] >= 0.999 && rect[3] >= 0.999;

/**
 * Where the screenshot sits in the stage so the highlight is centred and fully visible. The screenshot is drawn at
 * the stage's width and shrunk only when the highlight (or, with no highlight, the whole screen) is taller than the
 * stage. Returns the scale and the top-left offset in pixels. Pure, so it is unit-tested.
 */
export function stageLayout(rect, stageW, stageH, aspect = ASPECT, margin = 10) {
  const width = Math.max(1, stageW); const height = Math.max(1, stageH);
  const shotH = width * aspect;
  const focusH = Math.max(0.02, rect[3]) * shotH;
  const scale = Math.min(1, Math.max(0.2, (height - margin * 2) / focusH));
  const w = width * scale; const h = shotH * scale;
  const x = (width - w) / 2;
  const centred = height / 2 - (rect[1] + rect[3] / 2) * h;
  const y = h <= height ? (height - h) / 2 : Math.min(0, Math.max(height - h, centred));
  return { scale, x, y, shotH };
}

const pct = (v) => `${Math.round(v * 10000) / 100}%`;

export default function FeatureTour({ onDone, dark = false, steps = TOUR_STEPS }) {
  const auto = canAnimate();
  const [index, setIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  // With reduced motion nothing starts by itself, sound included: the person turns it on with the sound button.
  const [wantSound, setWantSound] = useState(auto);
  const [blocked, setBlocked] = useState(false); // the platform refused to play without a tap
  const [stage, setStage] = useState({ w: 360, h: 420 });
  const [broken, setBroken] = useState({});
  const stageRef = useRef(null);
  const audioRef = useRef(null);
  const heldRef = useRef(false);
  const elapsedRef = useRef(0);
  const waitedRef = useRef(0);
  const indexRef = useRef(0);
  const wantRef = useRef(auto);

  const step = steps[index];
  const info = entry(step.id);
  const last = index === steps.length - 1;
  const total = (info.ms || STILL_MS) + TAIL_MS;
  const audible = wantSound && !blocked;

  /* ---- sound ---- */
  const startedRef = useRef(false); // a clip has been asked to play, so there may be something to pause
  const stopClip = useCallback(() => { if (!startedRef.current) return; try { audioRef.current?.pause(); } catch { /* not supported */ } }, []);
  // Called straight from tap handlers too, so browsers that need a tap before sound accept it.
  const playClip = useCallback((i) => {
    const audio = audioRef.current;
    if (!audio || typeof audio.play !== 'function') { setBlocked(true); return; }
    try {
      const url = tourAudio(steps[i].id);
      if (audio.getAttribute('src') !== url) audio.setAttribute('src', url);
      audio.currentTime = 0;
    } catch { /* not seekable yet */ }
    let started; startedRef.current = true;
    try { started = audio.play(); } catch { setBlocked(true); return; }
    if (started && typeof started.then === 'function') started.then(() => setBlocked(false), () => setBlocked(true));
    else setBlocked(false);
  }, [steps]);

  const show = useCallback((next, { speak = true } = {}) => {
    if (next >= steps.length) { stopClip(); onDone('finished'); return; }
    const i = Math.max(0, next);
    indexRef.current = i; elapsedRef.current = 0; waitedRef.current = 0;
    setIndex(i); setElapsed(0); setPaused(false);
    if (speak && wantRef.current) playClip(i); else stopClip();
  }, [steps.length, onDone, playClip, stopClip]);

  // First step: try to speak at once (allowed in the apps and after a tap on the web).
  useEffect(() => { if (auto) playClip(0); return () => stopClip(); }, [auto, playClip, stopClip]);

  /* ---- timing: follows the clip while it plays, a plain timer otherwise ---- */
  useEffect(() => {
    if (!auto || paused) return undefined;
    let frame; let before = performance.now();
    const tick = (now) => {
      const dt = Math.min(250, now - before); before = now;
      const audio = audioRef.current;
      const speaking = wantRef.current && audio && !audio.paused && !audio.ended;
      let next = elapsedRef.current;
      if (speaking && audio.readyState >= 2) next = Math.max(next, audio.currentTime * 1000);
      else if (speaking && waitedRef.current < WAIT_MS) waitedRef.current += dt; // the clip is still loading
      else next += dt;
      elapsedRef.current = next; setElapsed(next);
      if (next >= total) { if (indexRef.current < steps.length - 1) { show(indexRef.current + 1); return; } return; }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [auto, paused, index, total, show, steps.length]);

  const pause = useCallback(() => { setPaused(true); stopClip(); }, [stopClip]);
  const resume = useCallback(() => {
    setPaused(false);
    const audio = audioRef.current;
    if (wantRef.current && audio && !audio.ended && typeof audio.play === 'function') { try { const p = audio.play(); if (p && p.catch) p.catch(() => {}); } catch { /* stays silent */ } }
  }, []);
  const toggleSound = () => {
    if (audible) { wantRef.current = false; setWantSound(false); stopClip(); return; }
    wantRef.current = true; setWantSound(true);
    // Start this step's line again so nothing is missed.
    elapsedRef.current = 0; waitedRef.current = 0; setElapsed(0); setPaused(false);
    playClip(indexRef.current);
  };

  useEffect(() => {
    const key = (e) => {
      if (e.key === 'ArrowRight') show(indexRef.current + 1); else if (e.key === 'ArrowLeft') show(indexRef.current - 1);
      else if (e.key === 'Escape') { stopClip(); onDone('skipped'); }
      else if (e.key === ' ' && auto) { e.preventDefault(); if (paused) resume(); else pause(); }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [show, onDone, auto, paused, pause, resume, stopClip]);

  /* ---- stage size ---- */
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return undefined;
    const measure = () => { const r = el.getBoundingClientRect(); if (r.width > 0 && r.height > 0) setStage(s => (Math.abs(s.w - r.width) < 0.5 && Math.abs(s.h - r.height) < 0.5 ? s : { w: r.width, h: r.height })); };
    measure();
    if (typeof ResizeObserver === 'function') { const ro = new ResizeObserver(measure); ro.observe(el); return () => ro.disconnect(); }
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Have the next screenshot ready before it is needed.
  useEffect(() => {
    const next = steps[index + 1];
    if (!next || typeof Image !== 'function') return;
    const img = new Image(); img.src = tourImage(entry(next.id).image, dark);
  }, [index, steps, dark]);

  const rect = info.rect;
  const whole = isWhole(rect);
  const { scale, x, y, shotH } = stageLayout(rect, stage.w, stage.h);
  const src = tourImage(info.image, dark);
  const failed = Boolean(broken[src]);
  const clip = whole ? `inset(0% 0% 0% 0% round 0px)`
    : `inset(${pct(rect[1])} ${pct(1 - rect[0] - rect[2])} ${pct(1 - rect[1] - rect[3])} ${pct(rect[0])} round ${Math.round(14 / scale)}px)`;
  const fill = (i) => (i < index ? 100 : i > index ? 0 : Math.min(100, Math.max(0, (elapsed / total) * 100)));
  const skip = () => { stopClip(); onDone('skipped'); };

  return <div className="ft-backdrop" role="presentation">
    <div className={`ft-panel${dark ? ' is-dark' : ''}${auto ? '' : ' is-still'}`} role="dialog" aria-modal="true" aria-label={tr('MOVO guide')}>
      <div className="ft-progress" aria-hidden="true">{steps.map((s, i) => <span key={s.id}><i style={{ width: `${auto ? fill(i) : (i <= index ? 100 : 0)}%` }} /></span>)}</div>
      <div className="ft-top">
        <span className="ft-count">{tr('{n} of {total}', { n: index + 1, total: steps.length })}</span>
        <button type="button" className={`ft-icon ft-sound${audible ? '' : ' is-muted'}`} aria-label={audible ? tr('Mute') : tr('Turn sound on')} aria-pressed={audible} onClick={toggleSound}><Icon name="speaker" size={16} /></button>
        {auto && <button type="button" className="ft-icon" aria-label={paused ? tr('Play') : tr('Pause')} onClick={() => (paused ? resume() : pause())}><Icon name={paused ? 'play' : 'pause'} size={16} /></button>}
        <button type="button" className="ft-skip" onClick={skip}>{tr('Skip')}</button>
      </div>

      <div className="ft-stage" ref={stageRef}
        onPointerDown={() => { if (auto && !paused) { heldRef.current = true; pause(); } }}
        onPointerUp={() => { if (heldRef.current) { heldRef.current = false; resume(); } }}
        onPointerLeave={() => { if (heldRef.current) { heldRef.current = false; resume(); } }}>
        {failed ? <div className="ft-missing" aria-hidden="true"><MovoMark size={64} /></div>
          : <div className={`ft-sheet${whole ? ' is-whole' : ''}`} style={{ width: `${stage.w}px`, height: `${shotH}px`, transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${scale.toFixed(4)})` }}>
            <img className="ft-shot ft-soft" src={src} alt="" aria-hidden="true" draggable="false" />
            <span className="ft-veil" aria-hidden="true" />
            <img className="ft-shot ft-sharp" key={src} src={src} alt={tr(step.title)} draggable="false" style={{ clipPath: clip, WebkitClipPath: clip }}
              onError={() => setBroken(b => ({ ...b, [src]: true }))} />
            <span className="ft-ring" aria-hidden="true" style={{ left: pct(rect[0]), top: pct(rect[1]), width: pct(rect[2]), height: pct(rect[3]), borderRadius: `${Math.round(14 / scale)}px`, borderWidth: `${(2 / scale).toFixed(2)}px` }} />
          </div>}
        <button type="button" className="ft-tap ft-prev" aria-label={tr('Previous')} onClick={() => show(index - 1)} disabled={index === 0} />
        <button type="button" className="ft-tap ft-next" aria-label={tr('Next')} onClick={() => show(index + 1)} />
      </div>

      <div className={`ft-caption${step.id === 'welcome' || last ? ' is-big' : ''}`} key={step.id}>
        <AriesMascot pose={tourPose(step.id)} size={step.id === 'welcome' || last ? 76 : 58} className="ft-guide" />
        <div className="ft-words">
          <h2>{tr(step.title)}</h2>
          <p aria-live="polite">{tr(step.text)}</p>
        </div>
      </div>
      <div className="ft-actions">
        <button type="button" className="secondary-button" onClick={() => show(index - 1)} disabled={index === 0}>{tr('Back')}</button>
        {last ? <button type="button" className="primary-button" onClick={() => show(steps.length)}>{tr('Continue')}</button>
          : <button type="button" className="primary-button" onClick={() => show(index + 1)}>{tr('Next')}</button>}
      </div>
      {/* One element for every clip: once a tap has started it, later lines may play by themselves. */}
      <audio ref={audioRef} preload="auto" />
    </div>
  </div>;
}
