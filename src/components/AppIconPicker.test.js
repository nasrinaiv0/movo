import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import AppIconPicker from './AppIconPicker';
import { setNativeAppIcon } from '../lib/native';
import { isNativeApp } from '../lib/platform';

jest.mock('../lib/native', () => ({ setNativeAppIcon: jest.fn() }));
jest.mock('../lib/platform', () => ({ isNativeApp: jest.fn() }));
global.IS_REACT_ACT_ENVIRONMENT = true;

function render(c) {
  const el = document.createElement('div'); document.body.appendChild(el);
  const root = createRoot(el);
  act(() => root.render(<AppIconPicker c={c} />));
  return { el, cleanup: () => { act(() => root.unmount()); el.remove(); } };
}
const option = (el, name) => Array.from(el.querySelectorAll('.app-icon-option')).find(b => b.querySelector('strong').textContent === name);

test('a Pro subscriber switches the iPhone icon to an unlocked badge; Platinum stays locked with its streak', async () => {
  isNativeApp.mockReturnValue(true); setNativeAppIcon.mockResolvedValue(true);
  const c = { prefs: { appIcon: 'default', streak: { count: 2, best: 2 } }, setPref: jest.fn(), plan: 'pro', openPlans: jest.fn() };
  const { el, cleanup } = render(c);
  expect(option(el, 'Gold').classList.contains('locked')).toBe(false);
  expect(option(el, 'Platinum').textContent).toContain('365-day streak');
  await act(async () => option(el, 'Gold').click());
  expect(c.setPref).toHaveBeenCalledWith('appIcon', 'gold');
  expect(setNativeAppIcon).toHaveBeenCalledWith('AppIcon-Gold');
  await act(async () => option(el, 'Platinum').click());
  expect(c.setPref).toHaveBeenCalledTimes(1);
  expect(el.textContent).toContain('Keep a 365-day streak');
  cleanup();
});

test('without a plan, badge icons are locked and open the plans panel', async () => {
  isNativeApp.mockReturnValue(false);
  const c = { prefs: { appIcon: 'default', streak: { count: 30, best: 30 } }, setPref: jest.fn(), plan: 'free', openPlans: jest.fn() };
  const { el, cleanup } = render(c);
  expect(option(el, 'Bronze').textContent).toContain('Pro or Pro+');
  await act(async () => option(el, 'Bronze').click());
  expect(c.openPlans).toHaveBeenCalled();
  expect(c.setPref).not.toHaveBeenCalled();
  expect(option(el, 'MOVO').getAttribute('aria-checked')).toBe('true');
  cleanup();
});
