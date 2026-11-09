import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { ActivityChart, CaptureChannels, KpiGrid, PlanMix, kpisReady } from './OwnerAnalytics';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
function render(ui) {
  const node = document.createElement('div'); document.body.appendChild(node);
  const root = createRoot(node); act(() => root.render(ui));
  return { node, cleanup: () => { act(() => root.unmount()); node.remove(); } };
}
const daily = Array.from({ length: 30 }, (_, i) => ({ day: `2026-10-${String(i + 1).padStart(2, '0')}`, signups: i % 3, activeUsers: i % 5, transactions: i }));
const kpis = { status: 'verified', data: {
  generatedAt: '2026-11-09T00:00:00Z',
  users: { total: 200, verified: 180, new7d: 12, new30d: 40, signedIn7d: 60, signedIn30d: 120 },
  plans: { free: 150, pro: 40, proPlus: 10, bySource: { store: 20, manual: 5, trial: 24, referral: 1 } },
  trials: { started: 80, active: 24, ended: 56, converted: 14 },
  activity: { transactions7d: 90, transactions30d: 435, activeUsers7d: 30, activeUsers30d: 87, usersWithAccounts: 140 },
  sources: [{ source: 'manual', count: 300 }, { source: 'notification', count: 100 }, { source: 'csv_import', count: 35 }],
  daily,
} };

test('only a verified, complete KPI payload is shown; anything else is unavailable, not zero', () => {
  expect(kpisReady(kpis)).toBe(true);
  expect(kpisReady({ status: 'unavailable' })).toBe(false);
  expect(kpisReady({ status: 'verified', data: { users: {} } })).toBe(false);
  const empty = render(<KpiGrid kpis={{ status: 'unavailable' }} />);
  expect(empty.node.innerHTML).toBe('');
  empty.cleanup();
});

test('key figures show accounts, activity, paid plans and trial conversion from the aggregates', () => {
  const ui = render(<KpiGrid kpis={kpis} />);
  const text = ui.node.textContent;
  expect(text).toContain('200');
  expect(text).toContain('180 verified · +12 this week');
  expect(text).toContain('87');
  expect(text).toContain('44% of accounts'); // 87 of 200
  expect(text).toContain('50'); // 40 Pro + 10 Pro+
  expect(text).toContain('Pro 40 · Pro+ 10 · 25% of accounts');
  expect(text).toContain('25% of ended trials subscribed'); // 14 of 56
  ui.cleanup();
});

test('activity chart switches measure, shows a tooltip on hover or focus, and has a table view', () => {
  const ui = render(<ActivityChart daily={daily} />);
  expect(ui.node.textContent).toContain('435'); // 0+1+...+29 records
  expect(ui.node.querySelectorAll('path.occ-bar').length).toBe(29); // the zero day draws no bar
  const hit = ui.node.querySelectorAll('rect.occ-hit')[29];
  act(() => { hit.focus(); });
  expect(ui.node.querySelector('.occ-tooltip').textContent).toContain('Records 29');
  const active = Array.from(ui.node.querySelectorAll('button')).find(b => b.textContent === 'Active accounts');
  act(() => active.click());
  expect(active.getAttribute('aria-pressed')).toBe('true');
  expect(ui.node.textContent).toContain('most in one day');
  const toggle = Array.from(ui.node.querySelectorAll('button')).find(b => b.textContent === 'Show table');
  act(() => toggle.click());
  expect(ui.node.querySelectorAll('tbody tr')).toHaveLength(30);
  expect(ui.node.querySelector('svg')).toBeNull();
  ui.cleanup();
});

test('plan mix and capture channels label every value with its share', () => {
  const plan = render(<PlanMix plans={kpis.data.plans} trials={kpis.data.trials} />);
  expect(plan.node.textContent).toContain('Pro · Gold4020%');
  expect(plan.node.textContent).toContain('Pro+ · Platinum105%');
  expect(plan.node.textContent).toContain('Free month24');
  expect(plan.node.textContent).toContain('Trials ended without subscribing42');
  plan.cleanup();
  const channels = render(<CaptureChannels sources={kpis.data.sources} activity={kpis.data.activity} />);
  expect(channels.node.textContent).toContain('Typed in MOVO300 69%');
  expect(channels.node.textContent).toContain('Bank & e-wallet alerts');
  expect(channels.node.textContent).toContain('5.0'); // 435 records / 87 active accounts
  channels.cleanup();
});
