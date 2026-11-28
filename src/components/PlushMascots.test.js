import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { PlushCollection, plushExpressionForMood, resolveHomeMascot } from './PlushMascots';
import { canUseFeature } from '../lib/planAccess';
import { ZODIAC } from '../lib/homeHero';

global.IS_REACT_ACT_ENVIRONMENT = true;

test('existing mascot styles and Plus selections resolve safely after entitlement expiry', () => {
  const expiresAt = '2026-12-01T00:00:00Z';
  const beforeExpiry = Date.parse('2026-11-30T00:00:00Z');
  const entitlement = { tier: 'pro_plus', active: true, expiresAt };
  expect(resolveHomeMascot('photo', false).mode).toBe('photo');
  expect(resolveHomeMascot('ram', false).mode).toBe('ram');
  expect(resolveHomeMascot('plush:unknown', true).mode).toBe('ram');
  expect(resolveHomeMascot('plush:aries', false).plush.id).toBe('aries');
  expect(resolveHomeMascot('plush:capricorn', canUseFeature(entitlement, 'premiumMascots', beforeExpiry)).plush.id).toBe('capricorn');
  expect(resolveHomeMascot('plush:capricorn', canUseFeature(entitlement, 'premiumMascots', Date.parse(expiresAt))).mode).toBe('ram');
});

test.each([
  ['cute', 'calm'],
  ['smile', 'happy'],
  ['sad', 'concerned'],
  ['angry', 'concerned'],
])('maps the spending mood %s to a plush expression', (mood, expression) => {
  expect(plushExpressionForMood(mood)).toBe(expression);
});

test('previews every sign in order and applies only a confirmed, eligible mascot', () => {
  const host = document.createElement('div');
  const root = createRoot(host);
  const onApply = jest.fn();
  const onCancel = jest.fn();
  const onOpenPlans = jest.fn();
  const render = canUsePremium => act(() => root.render(<PlushCollection
    canUsePremium={canUsePremium} onApply={onApply} onCancel={onCancel} onOpenPlans={onOpenPlans} />));
  const press = text => act(() => Array.from(host.querySelectorAll('button'))
    .find(button => button.textContent.trim() === text).click());

  try {
    render(false);
    const signs = Array.from(host.querySelectorAll('[data-plush-sign]'));
    expect(signs.map(button => button.dataset.plushSign)).toEqual(ZODIAC.map(sign => sign.id));
    press('Gemini');
    press('Happy');
    expect(host.querySelector('.plush-stage img').dataset.expression).toBe('happy');
    press('View plans');
    expect(onOpenPlans).toHaveBeenCalledTimes(1);
    press('Cancel');
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onApply).not.toHaveBeenCalled();

    render(true);
    press('Use mascot');
    expect(onApply).toHaveBeenCalledWith('plush:gemini');
  } finally {
    act(() => root.unmount());
  }
});
