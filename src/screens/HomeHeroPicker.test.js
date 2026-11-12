import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { HomeHeroPicker } from './Settings';
import { PlanProvider } from '../lib/PlanContext';

global.IS_REACT_ACT_ENVIRONMENT = true;
let host, root;
beforeEach(() => { host = document.createElement('div'); document.body.append(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); });

const render = (entitlement, prefs = { homeHero: 'auto' }) => {
  const setPref = jest.fn(); const upgrades = [];
  act(() => root.render(<PlanProvider entitlement={entitlement} cloudMode onUpgrade={f => upgrades.push(f)}><HomeHeroPicker c={{ prefs, setPref }} /></PlanProvider>));
  return { setPref, upgrades };
};
const tab = (name) => act(() => [...host.querySelectorAll('.hero-tabs [role="tab"]')].find(b => b.textContent === name).click());
const tile = (name) => [...host.querySelectorAll('.hero-tile')].find(b => b.textContent.endsWith(name));

test('Free: zodiac and glow tiles are marked Pro; choosing one asks to upgrade and keeps the header', () => {
  const { setPref, upgrades } = render(null);
  tab('Zodiac');
  expect(host.querySelectorAll('.hero-tile').length).toBe(12);
  expect(tile('Leo').getAttribute('aria-label')).toBe('Leo (Pro)');
  act(() => tile('Leo').click());
  expect(upgrades).toEqual(['headerThemes']);
  expect(setPref).not.toHaveBeenCalled();
  tab('Scenery');
  act(() => tile('None').click());
  expect(setPref).toHaveBeenCalledWith('homeHero', 'plain');
});

test('Pro: every zodiac sign and glow can be chosen', () => {
  const { setPref, upgrades } = render({ tier: 'pro', active: true, expiresAt: '2099-01-01T00:00:00Z' });
  tab('Glow');
  expect(host.querySelector('.hero-lock')).toBeNull();
  act(() => tile('Aurora').click());
  expect(setPref).toHaveBeenCalledWith('homeHero', 'glow:aurora');
  tab('Zodiac');
  act(() => tile('Pisces').click());
  expect(setPref).toHaveBeenCalledWith('homeHero', 'zodiac:pisces');
  expect(upgrades).toEqual([]);
});
