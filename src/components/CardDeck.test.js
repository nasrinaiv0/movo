import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import CardDeck, { PEEK_FIRST, PEEK_RATIO, peekOffsets } from './CardDeck';

global.IS_REACT_ACT_ENVIRONMENT = true;
const cards = [{ id: 'a', name: 'BPI', balance: 38, currency: 'PHP' }, { id: 'b', name: 'GoTyme', balance: 500, currency: 'PHP' }, { id: 'c', name: 'Metrobank', balance: 1200, currency: 'PHP' }];
const renderCard = (a) => <div className="fake-card">{a.name}</div>;

function mount(props) {
  const el = document.createElement('div'); document.body.appendChild(el);
  const root = createRoot(el);
  act(() => root.render(<CardDeck cards={cards} renderCard={renderCard} {...props} />));
  return { el, root };
}

test('landscape shows the chosen card in front, the next ones peeking behind, and dots to switch', () => {
  const picked = [];
  const { el, root } = mount({ selectedId: 'b', onSelect: (id) => picked.push(id), orientation: 'landscape' });
  expect(el.querySelector('.card-stack-card').textContent).toBe('GoTyme');
  // Stack transition: every other card waits behind, full size, nearest last (--k 1 is right behind the front card).
  expect(Array.from(el.querySelectorAll('.card-stack-peek')).map(p => [p.style.getPropertyValue('--k'), p.textContent])).toEqual([['2', 'BPI'], ['1', 'Metrobank']]);
  expect(el.querySelector('.card-stack').style.getPropertyValue('--peeks')).toBe('2');
  expect(el.querySelector('.card-stack-strip')).toBeNull();
  const dots = Array.from(el.querySelectorAll('.card-stack-dots button'));
  expect(dots).toHaveLength(3);
  expect(dots[1].getAttribute('aria-current')).toBe('true');
  act(() => dots[2].click());
  expect(picked).toEqual(['c']);
  // Swiping up on the front card shows the next card.
  const front = el.querySelector('.card-stack-front');
  act(() => {
    front.dispatchEvent(Object.assign(new Event('touchstart', { bubbles: true }), { touches: [{ clientX: 100, clientY: 300 }] }));
    front.dispatchEvent(Object.assign(new Event('touchend', { bubbles: true }), { changedTouches: [{ clientX: 100, clientY: 200 }] }));
  });
  expect(picked).toEqual(['c', 'c']);
  act(() => root.unmount());
});

test('portrait shows every card on the cylinder and marks the chosen one', () => {
  const { el, root } = mount({ selectedId: 'a', onSelect: () => {}, orientation: 'portrait' });
  const faces = el.querySelectorAll('.card-cylinder-face');
  expect(faces).toHaveLength(3);
  expect(faces[0].getAttribute('aria-current')).toBe('true');
  act(() => root.unmount());
});

test('the pile shows every card, each further card showing a thinner strip of its top', () => {
  expect(peekOffsets(0)).toEqual([]);
  const off = peekOffsets(6);
  const strips = off.map((o, i) => o - (off[i - 1] || 0));
  expect(strips[0]).toBeCloseTo(PEEK_FIRST, 1);
  for (let i = 1; i < strips.length; i += 1) expect(strips[i]).toBeLessThan(strips[i - 1]);
  expect(strips[1] / strips[0]).toBeCloseTo(PEEK_RATIO, 1);
  expect(peekOffsets(40).at(-1)).toBeLessThan(PEEK_FIRST / (1 - PEEK_RATIO) + 0.01); // stays compact with many cards
});
