import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import Menu from './Menu';

jest.mock('../components/Icon', () => () => null);
jest.mock('../components/ui', () => ({ RootHeader: () => null }));
jest.mock('../components/MovoLogo', () => ({ MovoMark: () => null }));
jest.mock('../components/ProfileAvatar', () => () => null);
jest.mock('../components/PlanBadge', () => () => null);
jest.mock('../lib/i18n', () => ({ t: (key) => key }));
jest.mock('../lib/streak', () => ({
  BADGES: [], TIER_LABEL: {}, nextBadge: () => null,
  badgeEarned: () => false, badgeByPlan: () => false,
}));

test('Menu restores one combined Plans & limits shortcut without replacing Financial planning', () => {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  const priorActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const openBudgets = jest.fn();
  const go = jest.fn();
  try {
    act(() => root.render(<Menu c={{
      user: { name: 'Test user' }, prefs: {}, subSummary: { activeCount: 0 },
      go, openBudgets, plan: 'free',
    }} />));
    const tiles = Array.from(host.querySelectorAll('.menu-tile'));
    const matching = tiles.filter(tile => tile.querySelector('strong')?.textContent === 'Plans & limits');
    expect(matching).toHaveLength(1);
    act(() => matching[0].click());
    expect(openBudgets).toHaveBeenCalledTimes(1);
    expect(openBudgets).toHaveBeenCalledWith('plans');
    const financialPlanning = tiles.find(tile => tile.querySelector('strong')?.textContent === 'Financial planning');
    expect(financialPlanning).toBeDefined();
    act(() => financialPlanning.click());
    expect(go).toHaveBeenCalledWith('FinancialPlanning');
  } finally {
    act(() => root.unmount());
    host.remove();
    globalThis.IS_REACT_ACT_ENVIRONMENT = priorActEnvironment;
  }
});
