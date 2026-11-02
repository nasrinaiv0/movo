import React, { useEffect, useRef, useState } from 'react';
import { canAnimate } from '../lib/motion';
import { t as tr } from '../lib/i18n';

const MOOD_LABEL = { smile: 'happy', cute: 'cheerful', sad: 'disappointed', angry: 'upset' };
const ASSETS = `${process.env.PUBLIC_URL || ''}/mascot/`;

/** WebGL is skipped in tests and on browsers without it; the still poster shows instead. */
const canRender3D = () => typeof window !== 'undefined' && process.env.NODE_ENV !== 'test' && !!window.WebGLRenderingContext;

/**
 * The Home ram. It reacts to this month's spending limits (`mood` from lib/mascotMood) and to taps.
 * three.js and the model load lazily, so Home renders instantly and the ram fades in when ready.
 */
export default function RamMascot({ mood = 'cute', message = '', greeting = '', onChangeMascot }) {
  const host = useRef(null); const api = useRef(null); const timer = useRef(0);
  const [ready, setReady] = useState(false); const [failed, setFailed] = useState(false);
  const [bubble, setBubble] = useState(true);
  const moodRef = useRef(mood); moodRef.current = mood;

  useEffect(() => {
    if (!canRender3D()) return undefined;
    let alive = true;
    import('../lib/ramScene').then(({ createRamScene }) => {
      if (!alive || !host.current) return;
      api.current = createRamScene(host.current, { mood: moodRef.current, still: !canAnimate(), base: ASSETS, onReady: () => alive && setReady(true), onError: () => alive && setFailed(true) });
    }).catch(() => alive && setFailed(true));
    return () => { alive = false; api.current?.dispose(); api.current = null; };
  }, []);

  useEffect(() => { api.current?.setMood(mood); }, [mood]);

  // Pause while the ram is off screen or the app is in the background.
  useEffect(() => {
    const el = host.current; if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    let seen = true;
    const sync = () => api.current?.setActive(seen && document.visibilityState !== 'hidden');
    const io = new IntersectionObserver(([e]) => { seen = e.isIntersecting; sync(); });
    io.observe(el); document.addEventListener('visibilitychange', sync);
    return () => { io.disconnect(); document.removeEventListener('visibilitychange', sync); };
  }, [ready]);

  const showBubble = (ms = 4200) => { setBubble(true); clearTimeout(timer.current); timer.current = setTimeout(() => setBubble(false), ms); };
  useEffect(() => { showBubble(5200); return () => clearTimeout(timer.current); }, []);
  useEffect(() => { if (ready) showBubble(); }, [mood]);

  const poke = () => { api.current?.poke(); showBubble(); };
  const label = `${tr('MOVO ram')}: ${tr(MOOD_LABEL[mood] || 'cheerful')}. ${message}`;

  return <div className={`ram-mascot mood-${mood}${ready ? ' is-ready' : ''}${failed || !canRender3D() ? ' is-still' : ''}`}>
    <button type="button" className="ram-stage" aria-label={label} onClick={poke}>
      <span className="ram-glow" aria-hidden="true" />
      <img className="ram-poster" src={`${ASSETS}ram-poster.png`} alt="" aria-hidden="true" draggable="false" />
      <span className="ram-canvas" ref={host} aria-hidden="true" />
    </button>
    <div className={`ram-bubble${bubble ? ' is-open' : ''}`} aria-live="polite">
      {greeting && <h1 className="ram-greeting">{greeting}</h1>}
      <p>{message}</p>
      {onChangeMascot && <button type="button" className="ram-bubble-link" tabIndex={bubble ? 0 : -1} onClick={onChangeMascot}>{tr('Change mascot')}</button>}
    </div>
  </div>;
}
