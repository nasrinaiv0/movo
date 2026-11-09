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

test('Pro wears the Gold badge and Pro+ the Platinum badge; Free shows none', () => {
  expect(planBadge('pro')).toEqual(expect.objectContaining({ tier: 'max', label: 'Gold', plan: 'Pro' }));
  expect(planBadge('pro_plus')).toEqual(expect.objectContaining({ tier: 'ultra', label: 'Platinum', plan: 'Pro+' }));
  expect(planBadge('free')).toBeNull();
  expect(planBadge(undefined)).toBeNull();
});

test('renders the MOVO mark in the tier badge with an accessible name', () => {
  const pro = render(<PlanBadge plan="pro" />);
  const mark = pro.node.querySelector('.streak-badge.tier-max.earned');
  expect(mark).not.toBeNull();
  expect(mark.getAttribute('aria-label')).toBe('Gold · Pro');
  expect(mark.querySelector('svg.movo-mark')).not.toBeNull();
  pro.cleanup();
  const plus = render(<PlanBadge plan="pro_plus" label />);
  expect(plus.node.querySelector('.tier-ultra')).not.toBeNull();
  expect(plus.node.textContent).toContain('Pro+');
  expect(plus.node.textContent).toContain('Platinum');
  plus.cleanup();
  const free = render(<PlanBadge plan="free" label />);
  expect(free.node.innerHTML).toBe('');
  free.cleanup();
});
