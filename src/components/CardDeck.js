import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { canAnimate } from '../lib/motion';
import { t as tr } from '../lib/i18n';

/** Card-switching animations a person can choose (Wallet → Sort & view), per orientation. */
export const LANDSCAPE_FX = [['stack', 'Stack'], ['slide', 'Slide'], ['flip', 'Flip'], ['cube', 'Cube'], ['depth', 'Depth']];
export const PORTRAIT_FX = [['cylinder', 'Cylinder'], ['coverflow', 'Coverflow'], ['cards', 'Cards'], ['focus', 'Focus'], ['fan', 'Fan']];
const pickFx = (list, fx) => (list.some(([k]) => k === fx) ? fx : list[0][0]);

/*
 * How the wallet shows several cards.
 * - Landscape: one card at a time. Swiping the front card (any direction) or tapping a dot sends it up and back
 *   while the next one rises into place.
 * - Portrait: a 3D cylinder. Cards sit on a curved surface and turn as the row is swiped; the centred card faces you.
 * Motion is transform/opacity only (GPU-composited) and is skipped for reduced-motion users and in tests.
 */
export default function CardDeck({ cards, selectedId, onSelect, renderCard, orientation = 'landscape', effect }) {
  return orientation === 'portrait'
    ? <CardCylinder cards={cards} selectedId={selectedId} onSelect={onSelect} renderCard={renderCard} effect={pickFx(PORTRAIT_FX, effect)} />
    : <CardStack cards={cards} selectedId={selectedId} onSelect={onSelect} renderCard={renderCard} effect={pickFx(LANDSCAPE_FX, effect)} />;
}

function CardStack({ cards, selectedId, onSelect, renderCard, effect }) {
  const index = Math.max(0, cards.findIndex(a => a.id === selectedId));
  const front = cards[index];
  const [leaving, setLeaving] = useState(null); // the previous front card, animating up and behind
  const [entering, setEntering] = useState(false);
  const [dir, setDir] = useState(1); // 1: moving to a later card, -1: to an earlier one (mirrors slide, flip and cube)
  const prev = useRef(front?.id);
  const touch = useRef(null);

  useEffect(() => {
    if (!front || prev.current === front.id) return undefined;
    const old = cards.find(a => a.id === prev.current);
    prev.current = front.id;
    if (!canAnimate() || !old) return undefined;
    const from = cards.indexOf(old); const to = cards.indexOf(front); const n = cards.length;
    setDir(((to - from + n) % n) <= n / 2 ? 1 : -1);
    setLeaving(old); setEntering(true);
    const t = setTimeout(() => { setLeaving(null); setEntering(false); }, 560);
    return () => clearTimeout(t);
  }, [front, cards]);

  if (!front) return null;
  const step = (dir) => { if (cards.length > 1) onSelect(cards[(index + dir + cards.length) % cards.length].id); };
  const onTouchStart = (e) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const onTouchEnd = (e) => {
    if (!touch.current) return;
    const dx = (e.changedTouches[0].clientX ?? touch.current.x) - touch.current.x;
    const dy = (e.changedTouches[0].clientY ?? touch.current.y) - touch.current.y;
    touch.current = null;
    const d = Math.abs(dx) > Math.abs(dy) ? dx : dy;
    if (Math.abs(d) > 40) step(d < 0 ? 1 : -1);
  };

  // Stack transition: every other card waits behind the front one, full size and sharp, with a thin strip of its
  // top edge showing like a real pile. The strip narrows as cards are added so the whole pile stays compact.
  const peeks = effect === 'stack' ? cards.slice(1).map((_, i) => cards[(index + cards.length - 1 - i) % cards.length]) : [];
  const offsets = peekOffsets(peeks.length); // offsets[k-1]: how far card k sits above the front card, % of a card's height
  return <div className={`card-stack${peeks.length ? ' has-peeks' : ''}`} data-fx={effect} style={{ '--dir': dir, '--peeks': peeks.length, '--peek-total': offsets[offsets.length - 1] || 0 }} aria-label={tr('Your cards')}>
    <div className="card-stack-front" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {peeks.map((c, i) => <button type="button" key={c.id} className="card-stack-peek" style={{ '--k': peeks.length - i, '--off': offsets[peeks.length - i - 1], zIndex: i + 1 }} onClick={() => onSelect(c.id)} aria-label={tr('Show {name} card', { name: c.name })} tabIndex={-1}>{renderCard(c)}</button>)}
      {leaving && <div className="card-stack-leaving" aria-hidden="true">{renderCard(leaving)}</div>}
      <div key={front.id} className={`card-stack-card${entering ? ' entering' : ''}`}>{renderCard(front)}</div>
    </div>
    {cards.length > 1 && <div className="card-stack-dots">
      {cards.map((a, i) => <button type="button" key={a.id} className={i === index ? 'active' : ''} onClick={() => onSelect(a.id)} aria-label={tr('Show {name} card', { name: a.name })} aria-current={i === index ? 'true' : undefined} />)}
    </div>}
  </div>;
}

/** How much of each back card shows, as a percentage of a card's height: 9% for a few cards, thinner for many. */
/**
 * Perspective pile: the card right behind the front one shows the most of its top edge, and each card further back
 * shows less (each strip is PEEK_RATIO of the one in front). Returns cumulative offsets, % of a card's height:
 * offsets[k-1] is how far card k sits above the front card. The total stays under FIRST / (1 - PEEK_RATIO).
 */
export const PEEK_FIRST = 11;
export const PEEK_RATIO = 0.72;
export function peekOffsets(n) {
  const out = []; let strip = PEEK_FIRST; let total = 0;
  for (let k = 0; k < n; k += 1) { total += strip; out.push(Math.round(total * 100) / 100); strip *= PEEK_RATIO; }
  return out;
}

/**
 * A pile of cards (Wallet → My Cards): the first card in front, the next ones behind it with only their top edge
 * (logo and name) showing, like cards stacked in a wallet. Tapping any card opens it.
 */
export function CardPile({ cards, renderCard, onOpen, max = 4 }) {
  const shown = cards.slice(0, max).reverse(); // back-most first, the front card last
  return <div className="card-pile" data-count={shown.length} aria-label={tr('Your cards')}>
    {shown.map((a, i) => <button type="button" key={a.id} className={`card-pile-item${i === shown.length - 1 ? ' front' : ''}`} onClick={() => onOpen(a)} aria-label={tr('Open {name} card', { name: a.name })}>{renderCard(a)}</button>)}
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
    child.style.zIndex = String(100 - Math.round(Math.abs(d) * 10));
  });
}

function CardCylinder({ cards, selectedId, onSelect, renderCard, effect }) {
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

  return <div className="card-cylinder" data-fx={effect} ref={ref} onScroll={onScroll} aria-label={tr('Your cards')}>
    {cards.map((a, i) => <button type="button" key={a.id} className={`card-cylinder-face${i === index ? ' active' : ''}`} onClick={() => (i === index ? null : go(i))} aria-label={tr('Show {name} card', { name: a.name })} aria-current={i === index ? 'true' : undefined}>
      {renderCard(a)}
    </button>)}
  </div>;
}
