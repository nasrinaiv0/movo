import React, { useCallback, useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { MovoMark } from './MovoLogo';
import { canAnimate } from '../lib/motion';
import { t as tr } from '../lib/i18n';

/*
 * First-run video guide (owner, 2026-11-11): a recording of the real MOVO app with invented sample records, narrated in
 * the MOVO voice (public/tutorial/movo-guide.mp4, made by scripts/tutorial-video/README.md). Chapters give the progress bar,
 * the captions (translated, so every language can follow the English narration) and tap-to-skip: right side next,
 * left side back, hold to pause. Skip or the end hands over to the spotlight walkthrough (Walkthrough.js).
 * Autoplay starts with sound where the platform allows and muted otherwise, with a sound button. Reduced motion:
 * nothing plays until the person presses Play. If the video cannot load (offline web, old device), the animated
 * scenes below play instead.
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

function TutorialScenes({ onDone, scenes = SCENES }) {
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

/* Chapters of movo-guide.mp4: start time in seconds, and the caption shown (narration text, translated). */
export const CHAPTERS = [
  { id: 'welcome', at: 0, title: 'Welcome to MOVO', text: 'Your money, in one calm place.' },
  { id: 'wallet', at: 5.9, title: 'Add your accounts', text: 'Add your banks, cards, e-wallets and cash. You enter the balances. MOVO never connects to your bank.' },
  { id: 'log', at: 15.3, title: 'Log in seconds', text: 'Type “Grab 250” to NasrinAI, or tap +.' },
  { id: 'insights', at: 23.8, title: 'See where it goes', text: 'Transactions and Money Flow show where every peso goes.' },
  { id: 'plans', at: 29.6, title: 'Plan ahead', text: 'Plan ahead with budgets, goals and subscription reminders.' },
  { id: 'data', at: 35.5, title: 'Your data stays yours', text: 'Export it, or delete your account, any time in Settings.' },
  { id: 'logos', at: 43.2, title: 'About logos', text: 'Bank and brand logos only help you recognise your accounts. MOVO is not affiliated with them, and never moves your money.' },
  { id: 'start', at: 52.6, title: 'Your first month of Pro is free', text: 'Last step: review and accept the Terms of Service and Privacy Policy.' },
];
const base = () => (typeof process !== 'undefined' && process.env.PUBLIC_URL) || '';
export const VIDEO_SRC = () => `${base()}/tutorial/movo-guide.mp4`;
export const POSTER_SRC = () => `${base()}/tutorial/movo-guide.jpg`;

/** The chapter playing at `time` seconds. */
export function chapterAt(time, chapters = CHAPTERS) {
  let index = 0;
  chapters.forEach((c, i) => { if (time >= c.at - 0.05) index = i; });
  return index;
}

export default function TutorialVideo({ onDone, chapters = CHAPTERS, src = VIDEO_SRC(), poster = POSTER_SRC() }) {
  const [failed, setFailed] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [ended, setEnded] = useState(false);
  const videoRef = useRef(null);
  const heldRef = useRef(false);
  const auto = canAnimate();
  const index = chapterAt(time, chapters);
  const last = index === chapters.length - 1;
  const chapter = chapters[index];

  const play = useCallback(async () => {
    const v = videoRef.current;
    if (!v || typeof v.play !== 'function') return;
    try { await v.play(); }
    catch {
      // Autoplay with sound is blocked until the person taps: start muted and offer the sound button instead.
      try { v.muted = true; setMuted(true); await v.play(); } catch { /* stays paused; the Play button remains */ }
    }
  }, []);
  const pause = useCallback(() => { try { videoRef.current?.pause(); } catch { /* not supported */ } }, []);
  const seek = useCallback((i) => {
    if (i >= chapters.length) { onDone('finished'); return; }
    const at = chapters[Math.max(0, i)].at;
    setTime(at); setEnded(false);
    try { if (videoRef.current) videoRef.current.currentTime = at; } catch { /* not seekable yet */ }
  }, [chapters, onDone]);
  useEffect(() => { if (auto && !failed) play(); }, [auto, failed, play]);
  useEffect(() => {
    const key = (e) => {
      if (e.key === 'ArrowRight') seek(index + 1); else if (e.key === 'ArrowLeft') seek(index - 1);
      else if (e.key === 'Escape') onDone('skipped');
      else if (e.key === ' ') { e.preventDefault(); if (playing) pause(); else play(); }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [index, seek, onDone, playing, play, pause]);
  useEffect(() => () => pause(), [pause]);

  if (failed) return <TutorialScenes onDone={onDone} />;
  const end = (i) => (chapters[i + 1] ? chapters[i + 1].at : (duration || chapters[i].at + 9));
  const fill = (i) => (i < index ? 100 : i > index ? 0 : Math.min(100, Math.max(0, ((time - chapters[i].at) / Math.max(0.1, end(i) - chapters[i].at)) * 100)));
  const toggleSound = () => { const v = videoRef.current; const next = !muted; if (v) v.muted = next; setMuted(next); if (!next && !playing) play(); };

  // The recording plays on a phone screen (owner, 2026-11-12): a generic modern phone with a dynamic-island cut-out,
  // a status bar and a home indicator, drawn in CSS so it stays sharp at any size. Caption and controls sit around it.
  return <div className="tv-backdrop" role="presentation">
    <div className="tv-player tv-film tv-framed" role="dialog" aria-modal="true" aria-label={tr('MOVO video guide')} aria-roledescription={tr('video')}>
      <div className="tv-progress" aria-hidden="true">{chapters.map((c, i) => <span key={c.id}><i style={{ width: `${ended ? 100 : fill(i)}%` }} /></span>)}</div>
      <div className="tv-top">
        <span className="tv-count">{tr('{n} of {total}', { n: index + 1, total: chapters.length })}</span>
        <button type="button" className={`tv-icon tv-sound${muted ? ' is-muted' : ''}`} aria-label={muted ? tr('Turn sound on') : tr('Mute')} aria-pressed={!muted} onClick={toggleSound}><Icon name="speaker" size={16} /></button>
        <button type="button" className="tv-icon" aria-label={playing ? tr('Pause') : tr('Play')} onClick={() => (playing ? pause() : play())}><Icon name={playing ? 'pause' : 'play'} size={16} /></button>
        <button type="button" className="tv-skip" onClick={() => onDone('skipped')}>{tr('Skip')}</button>
      </div>
      <div className="tv-stage-frame">
        <div className="tv-device">
          <div className="tv-screen">
            <div className="tv-statusbar" aria-hidden="true">
              <b>9:41</b><span className="tv-island" />
              <span className="tv-sb-icons"><svg viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1" /><rect x="5" y="5.5" width="3" height="6.5" rx="1" /><rect x="10" y="3" width="3" height="9" rx="1" /><rect x="15" y="0" width="3" height="12" rx="1" /></svg>
                <svg viewBox="0 0 16 12"><path d="M8 11.4 5.6 8.9a3.4 3.4 0 0 1 4.8 0Z" /><path d="M3.4 6.7a6.5 6.5 0 0 1 9.2 0l-1.4 1.4a4.5 4.5 0 0 0-6.4 0Z" /><path d="M1.2 4.5a9.6 9.6 0 0 1 13.6 0l-1.4 1.4a7.6 7.6 0 0 0-10.8 0Z" /></svg>
                <svg viewBox="0 0 27 13"><rect x=".5" y=".5" width="23" height="12" rx="3.5" fill="none" stroke="currentColor" strokeOpacity=".45" /><rect x="2.5" y="2.5" width="19" height="8" rx="2" /><rect x="25" y="4.5" width="1.6" height="4" rx=".8" opacity=".45" /></svg></span>
            </div>
            <video ref={videoRef} className="tv-video" src={src} poster={poster} playsInline preload="auto" muted={muted}
              aria-label={tr('MOVO video guide')}
              onTimeUpdate={e => setTime(e.currentTarget.currentTime || 0)} onLoadedMetadata={e => setDuration(e.currentTarget.duration || 0)}
              onPlay={() => { setPlaying(true); setEnded(false); }} onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); setEnded(true); }}
              onError={() => setFailed(true)} />
            <span className="tv-homebar" aria-hidden="true" />
            {!playing && !ended && <button type="button" className="tv-bigplay" aria-label={tr('Play')} onClick={play}><Icon name="play" size={30} /></button>}
          </div>
        </div>
        <div className="tv-hold" onPointerDown={() => { if (playing) { heldRef.current = true; pause(); } }} onPointerUp={() => { if (heldRef.current) { heldRef.current = false; play(); } }} onPointerLeave={() => { if (heldRef.current) { heldRef.current = false; play(); } }} aria-hidden="true" />
        <button type="button" className="tv-tap tv-prev" aria-label={tr('Previous')} onClick={() => seek(index - 1)} disabled={index === 0} />
        <button type="button" className="tv-tap tv-next" aria-label={tr('Next')} onClick={() => seek(index + 1)} />
      </div>
      <div className="tv-caption" key={chapter.id}>
        <h2>{tr(chapter.title)}</h2>
        <p aria-live="polite">{tr(chapter.text)}</p>
      </div>
      <div className="tv-actions">
        {last || ended ? <button type="button" className="primary-button" onClick={() => onDone('finished')} autoFocus={ended}>{tr('Continue')}</button>
          : <button type="button" className="secondary-button" onClick={() => seek(index + 1)}>{tr('Next')}</button>}
      </div>
    </div>
  </div>;
}

export { TutorialScenes };
