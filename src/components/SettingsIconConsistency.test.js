import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import fs from 'fs';
import path from 'path';
import Icon from './Icon';
import { RootHeader } from './ui';
import Profile from '../screens/Profile';

global.IS_REACT_ACT_ENVIRONMENT = true;

const render = element => {
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => root.render(element));
  return { container, unmount: () => act(() => root.unmount()) };
};
const context = () => ({
  show: true, stats: { balance: 0, income: 0, expenses: 0 }, deltas: {},
  user: { name: 'Friend', email: 'Local-only session', initial: 'F' },
  accountsByType: { bank: [], card: [], e_wallet: [] },
  go: jest.fn(), notify: jest.fn(), session: null, signOutNow: jest.fn(),
  exportCsv: jest.fn(), setWalletFilter: jest.fn(),
  prefs: { theme: 'system', accent: 'green' }, setPref: jest.fn(),
  cloudMode: false, supabaseConfigured: false,
});

test('legacy gear aliases exactly the solid adaptive Settings glyph', () => {
  const { container, unmount } = render(<div><Icon name="gear" size={19} /><Icon name="gearSolid" size={19} /></div>);
  const [legacy, canonical] = container.querySelectorAll('svg');
  expect(legacy.outerHTML).toBe(canonical.outerHTML);
  expect(canonical.querySelectorAll('path')).toHaveLength(1);
  expect(canonical.querySelector('path').getAttribute('fill')).toBe('currentColor');
  expect(canonical.querySelector('path').getAttribute('stroke')).toBe('none');
  unmount();
});

test('shared Settings header remains clickable with its solid gear', () => {
  const onSettings = jest.fn();
  const { container, unmount } = render(<RootHeader title="Wallet" onSettings={onSettings} />);
  const button = container.querySelector('button[aria-label="Settings"]');
  expect(button).not.toBeNull();
  expect(button.querySelector('svg path').getAttribute('fill')).toBe('currentColor');
  expect(button.querySelector('svg').getAttribute('width')).toBe('23');
  act(() => button.click());
  expect(onSettings).toHaveBeenCalledTimes(1);
  unmount();
});

test('Profile header and Financial Settings row use identical artwork and original routes', () => {
  const c = context();
  const { container, unmount } = render(<Profile c={c} />);
  const button = container.querySelector('button[aria-label="Settings"]');
  const item = [...container.querySelectorAll('button.menu-row')].find(el =>
    el.textContent.includes('Financial Settings'));
  expect(button).not.toBeNull();
  expect(item).toBeDefined();
  expect(button.querySelector('svg').getAttribute('width')).toBe('19');
  expect(item.querySelector('svg').getAttribute('width')).toBe('20');
  expect(button.querySelector('svg path').getAttribute('d')).toBe(item.querySelector('svg path').getAttribute('d'));
  act(() => { button.click(); item.click(); });
  expect(c.go).toHaveBeenNthCalledWith(1, 'Settings');
  expect(c.go).toHaveBeenNthCalledWith(2, 'Settings');
  unmount();
});

test('Home, Profile, shared headers and sidebar consistently request solid settings icon', () => {
  const root = path.join(__dirname, '..');
  const sources = ['screens/Home.js', 'screens/Profile.js', 'components/ui.js', 'App.js'];
  sources.forEach(file => {
    const src = fs.readFileSync(path.join(root, file), 'utf8');
    expect(src).toContain('gearSolid');
  });
  const profile = fs.readFileSync(path.join(root, 'screens/Profile.js'), 'utf8');
  expect(profile).toContain("['gearSolid', 'Financial Settings', 'Settings']");
  expect(profile).toContain('<Icon name="gearSolid" size={19} />');
  const app = fs.readFileSync(path.join(root, 'App.js'), 'utf8');
  expect(app).toContain('<Icon name="gearSolid" size={22} />');
  for (const file of ['screens/Profile.js', 'App.js']) {
    expect(fs.readFileSync(path.join(root, file), 'utf8')).not.toMatch(/name="gear"/);
  }
});
