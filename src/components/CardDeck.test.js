import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import CardDeck from './CardDeck';

global.IS_REACT_ACT_ENVIRONMENT = true;
const cards = [{ id: 'a', name: 'BPI', balance: 38, currency: 'PHP' }, { id: 'b', name: 'GoTyme', balance: 500, currency: 'PHP' }, { id: 'c', name: 'Metrobank', balance: 1200, currency: 'PHP' }];
const renderCard = (a) => <div className="fake-card">{a.name}</div>;

function mount(props) {
  const el = document.createElement('div'); document.body.appendChild(el);
  const root = createRoot(el);
  act(() => root.render(<CardDeck cards={cards} renderCard={renderCard} {...props} />));
  return { el, root };
}

test('landscape stacks the chosen card in front with the others as strips', () => {
  const picked = [];
  const { el, root } = mount({ selectedId: 'b', onSelect: (id) => picked.push(id), orientation: 'landscape' });
  expect(el.querySelector('.card-stack-front').textContent).toBe('GoTyme');
  const strips = Array.from(el.querySelectorAll('.card-stack-strip'));
  expect(strips.map(s => s.querySelector('strong').textContent)).toEqual(['BPI', 'Metrobank']);
  act(() => strips[1].click());
  expect(picked).toEqual(['c']);
  // Swiping up on the front card shows the next card.
  const front = el.querySelector('.card-stack-front');
  act(() => {
    front.dispatchEvent(Object.assign(new Event('touchstart', { bubbles: true }), { touches: [{ clientY: 300 }] }));
    front.dispatchEvent(Object.assign(new Event('touchend', { bubbles: true }), { changedTouches: [{ clientY: 200 }] }));
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
