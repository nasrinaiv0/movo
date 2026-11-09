import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import PlanBadge, { planBadge } from './PlanBadge';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
function render(ui) {
  const node = document.createElement('div'); document.body.appendChild(node);
  const root = createRoot(node);
  act(() => root.render(ui));
  return { node, cleanup: () => { act(() => root.unmount()); node.remove(); } };
}
const fills = node => Array.from(node.querySelectorAll('svg.movo-mark path')).map(p => p.getAttribute('fill'));

test('Pro wears the gold MOVO logo, Pro+ the platinum one, the free month the white one; Free shows none', () => {
  expect(planBadge('pro')).toEqual(expect.objectContaining({ tone: 'gold', label: 'Gold', plan: 'Pro' }));
  expect(planBadge('pro_plus')).toEqual(expect.objectContaining({ tone: 'platinum', label: 'Platinum', plan: 'Pro+' }));
  expect(planBadge('pro', true)).toEqual(expect.objectContaining({ tone: 'white', label: 'Free month' }));
  expect(planBadge('free')).toBeNull();
  expect(planBadge(undefined)).toBeNull();
});

test('renders the toned MOVO mark with an accessible name', () => {
  const pro = render(<PlanBadge plan="pro" />);
  const mark = pro.node.querySelector('.plan-badge-mark.tone-gold');
  expect(mark.getAttribute('aria-label')).toBe('Gold · Pro');
  expect(fills(pro.node)).toContain('#e3b04a');
  pro.cleanup();
  const plus = render(<PlanBadge plan="pro_plus" label />);
  expect(plus.node.querySelector('.tone-platinum')).not.toBeNull();
  expect(plus.node.textContent).toContain('Platinum');
  plus.cleanup();
  const trial = render(<PlanBadge plan="pro" trial />);
  expect(trial.node.querySelector('.tone-white')).not.toBeNull();
  trial.cleanup();
  const free = render(<PlanBadge plan="free" label />);
  expect(free.node.innerHTML).toBe('');
  free.cleanup();
});
