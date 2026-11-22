import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

jest.mock('../lib/motion', () => ({ ...jest.requireActual('../lib/motion'), canAnimate: () => true }));
global.IS_REACT_ACT_ENVIRONMENT = true;

test('Aries makes a hero entrance and greets once per app session, then follows the spending mood', () => {
  jest.useFakeTimers();
  const RamMascot = require('./RamMascot').default;
  const el = document.createElement('div'); const root = createRoot(el);
  act(() => root.render(<RamMascot mood="smile" message="On track" />));
  expect(el.querySelector('.ram-mascot.is-hero-in')).not.toBeNull();
  expect(el.querySelector('.aries--waving')).not.toBeNull();
  act(() => jest.advanceTimersByTime(2400));
  expect(el.querySelector('.aries--happy')).not.toBeNull();
  act(() => root.unmount());
  // Returning to Home later in the same session: no second entrance or greeting.
  const again = createRoot(el);
  act(() => again.render(<RamMascot mood="smile" message="On track" />));
  expect(el.querySelector('.ram-mascot.is-hero-in')).toBeNull();
  expect(el.querySelector('.aries--happy')).not.toBeNull();
  act(() => again.unmount());
  jest.useRealTimers();
});

test('every mood has an idle motion and an entrance that stops under reduced motion', () => {
  const css = require('fs').readFileSync(require('path').join(__dirname, 'AriesMascot.css'), 'utf8');
  for (const mood of ["welcome", "happy", "sad", "angry"]) expect(css).toMatch(new RegExp(`\\.aries--${mood}\\.is-animated \\.aries-head \\{ animation: [^}]*infinite`));
  expect(css).toMatch(/\.ram-aries\.is-hero-in \.ram-stage \{ animation: aries-hero-in/);
  expect(css).toMatch(/prefers-reduced-motion: reduce\) \{ \.ram-aries\.is-hero-in \.ram-stage \{ animation: none !important; \}/);
  // calm motion: no overshoot keyframe values above the resting scale
  expect(css).not.toMatch(/scale\(1\.0[5-9]|scale\(1\.[1-9]/);
});
