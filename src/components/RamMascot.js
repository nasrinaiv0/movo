import React, { useEffect, useRef, useState } from 'react';
import AriesMascot from './AriesMascot';
import { t as tr } from '../lib/i18n';
import { canAnimate } from '../lib/motion';

// Aries greets with a hero entrance and a wave once per app session, not on every return to Home.
let greeted = false;

const MOOD_LABEL = { smile: 'happy', cute: 'cheerful', sad: 'disappointed', angry: 'upset' };
const MOOD_STATE = { smile: 'happy', cute: 'welcome', sad: 'sad', angry: 'angry' };

/**
 * The Home ram. It reacts to this month's spending limits (`mood` from lib/mascotMood) and to taps.
 * Aries uses the same lightweight vector artwork as sign-in, plans and the guide. Its feet stay on
 * the balance card; only the face, arms and head move. Spending mood remains driven by real records.
 */
export default function RamMascot({ mood = 'cute', message = '', onChangeMascot }) {
  const timer = useRef(0);
  const reactionTimer = useRef(0);
  const [heroIn] = useState(() => { const first = !greeted && canAnimate(); greeted = true; return first; });
  const [reacting, setReacting] = useState(heroIn);
  const [bubble, setBubble] = useState(false);

  const showBubble = (ms = 4200) => { setBubble(true); clearTimeout(timer.current); timer.current = setTimeout(() => setBubble(false), ms); };
  // Leave the greeting unobstructed until the user taps the mascot.
  useEffect(() => () => { clearTimeout(timer.current); clearTimeout(reactionTimer.current); }, []);
  useEffect(() => { if (heroIn) reactionTimer.current = setTimeout(() => setReacting(false), 2400); }, [heroIn]);
  const firstMood = useRef(true);
  useEffect(() => { if (firstMood.current) { firstMood.current = false; return; } setReacting(false); clearTimeout(reactionTimer.current); }, [mood]);

  const poke = () => {
    setReacting(true); clearTimeout(reactionTimer.current);
    reactionTimer.current = setTimeout(() => setReacting(false), 1800);
    showBubble();
  };
  const label = `${tr('MOVO ram')}: ${tr(MOOD_LABEL[mood] || 'cheerful')}. ${message}`;

  return <div className={`ram-mascot ram-aries mood-${mood} is-still${heroIn ? ' is-hero-in' : ''}`}>
    <button type="button" className="ram-stage" aria-label={label} onClick={poke}>
      <AriesMascot state={reacting ? 'waving' : MOOD_STATE[mood] || 'welcome'} size="100%" className="aries-home" />
    </button>
    <div className={`ram-bubble${bubble ? ' is-open' : ''}`} aria-hidden={!bubble}>
      <p>{message}</p>
      {onChangeMascot && <button type="button" className="ram-bubble-link" tabIndex={bubble ? 0 : -1} onClick={onChangeMascot}>{tr('Change mascot')}</button>}
    </div>
  </div>;
}
