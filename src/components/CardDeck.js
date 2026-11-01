import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { canAnimate } from '../lib/motion';
import { t as tr } from '../lib/i18n';
import { money, shown } from '../lib/format';

/*
 * How the wallet shows several cards.
 * - Landscape: a stacked wallet. The chosen card sits in front; the others peek below as strips (name and balance).
 *   Tapping a strip, or swiping the front card up/down, sends the front card up and back while the chosen one rises
 *   into place.
 * - Portrait: a 3D cylinder. Cards sit on a curved surface and turn as the row is swiped; the centred card faces you.
 * Motion is transform/opacity only (GPU-composited) and is skipped for reduced-motion users and in tests.
 */
export default function CardDeck({ cards, selectedId, onSelect, renderCard, orientation = 'landscape', show = true }) {
  return orientation === 'portrait'
    ? <CardCylinder cards={cards} selectedId={selectedId} onSelect={onSelect} renderCard={renderCard} />
    : <CardStack cards={cards} selectedId={selectedId} onSelect={onSelect} renderCard={renderCard} show={show} />;
}

function CardStack({ cards, selectedId, onSelect, renderCard, show }) {
  const index = Math.max(0, cards.findIndex(a => a.id === selectedId));
  const front = cards[index];
  const rest = cards.filter((_, i) => i !== index);
  const [leaving, setLeaving] = useState(null); // the previous front card, animating up and behind
  const [entering, setEntering] = useState(false);
  const prev = useRef(front?.id);
  const touch = useRef(null);

  useEffect(() => {
    if (!front || prev.current === front.id) return undefined;
    const old = cards.find(a => a.id === prev.current);
    prev.current = front.id;
    if (!canAnimate() || !old) return undefined;
    setLeaving(old); setEntering(true);
    const t = setTimeout(() => { setLeaving(null); setEntering(false); }, 560);
    return () => clearTimeout(t);
  }, [front, cards]);

  if (!front) return null;
  const step = (dir) => { if (cards.length > 1) onSelect(cards[(index + dir + cards.length) % cards.length].id); };
  const onTouchStart = (e) => { touch.current = e.touches[0].clientY; };
  const onTouchEnd = (e) => {
    if (touch.current == null) return;
    const dy = e.changedTouches[0].clientY - touch.current; touch.current = null;
    if (Math.abs(dy) > 40) step(dy < 0 ? 1 : -1);
  };

  return <div className="card-stack" aria-label={tr('Your cards')}>
    <div className="card-stack-front" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {leaving && <div className="card-stack-leaving" aria-hidden="true">{renderCard(leaving)}</div>}
      <div key={front.id} className={`card-stack-card${entering ? ' entering' : ''}`}>{renderCard(front)}</div>
    </div>
    {rest.length > 0 && <div className="card-stack-strips" role="list">
      {rest.map((a, i) => <button type="button" role="listitem" key={a.id} className="card-stack-strip" style={{ '--i': i }} onClick={() => onSelect(a.id)} aria-label={tr('Show {name} card', { name: a.name })}>
        <span className="card-stack-peek" aria-hidden="true">{renderCard(a)}</span>
        <span className="card-stack-label"><strong>{a.name}</strong><span>{shown(show, money(a.balance, a.currency))}</span></span>
      </button>)}
    </div>}
  </div>;
}

/** Each card turns around a vertical axis by its distance from the centre, like faces of a cylinder. */
function paintFaces(el) {
  if (!el) return;
  const mid = el.scrollLeft + el.clientWidth / 2;
  Array.from(el.children).forEach(child => {
    const d = Math.max(-2, Math.min(2, (child.offsetLeft + child.offsetWidth / 2 - mid) / child.offsetWidth));
    child.style.setProperty('--d', d.toFixed(3));
    child.style.setProperty('--ad', Math.abs(d).toFixed(3));
  });
}

function CardCylinder({ cards, selectedId, onSelect, renderCard }) {
  const ref = useRef(null);
  const frame = useRef(0);
  const settle = useRef(0);
  const index = Math.max(0, cards.findIndex(a => a.id === selectedId));

  // Keep the chosen card centred (on first show, and when it is picked elsewhere, e.g. from the card list).
  useLayoutEffect(() => {
    const el = ref.current; const child = el?.children[index]; if (!child) return;
    const target = child.offsetLeft - (el.clientWidth - child.offsetWidth) / 2;
    if (Math.abs(el.scrollLeft - target) > 2) el.scrollLeft = target;
    paintFaces(el);
  }, [index, cards.length]);
  useEffect(() => () => { cancelAnimationFrame(frame.current); clearTimeout(settle.current); }, []);

  const onScroll = () => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => paintFaces(ref.current));
    clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      const el = ref.current; if (!el) return;
      const mid = el.scrollLeft + el.clientWidth / 2;
      let best = 0; let dist = Infinity;
      Array.from(el.children).forEach((child, i) => { const dd = Math.abs(child.offsetLeft + child.offsetWidth / 2 - mid); if (dd < dist) { dist = dd; best = i; } });
      if (cards[best] && cards[best].id !== selectedId) onSelect(cards[best].id);
    }, 90);
  };
  const go = (i) => {
    const el = ref.current; const child = el?.children[i]; if (!child) return;
    el.scrollTo({ left: child.offsetLeft - (el.clientWidth - child.offsetWidth) / 2, behavior: canAnimate() ? 'smooth' : 'auto' });
  };

  return <div className="card-cylinder" ref={ref} onScroll={onScroll} aria-label={tr('Your cards')}>
    {cards.map((a, i) => <button type="button" key={a.id} className={`card-cylinder-face${i === index ? ' active' : ''}`} onClick={() => (i === index ? null : go(i))} aria-label={tr('Show {name} card', { name: a.name })} aria-current={i === index ? 'true' : undefined}>
      {renderCard(a)}
    </button>)}
  </div>;
}
