import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import RamMascot from './RamMascot';

global.IS_REACT_ACT_ENVIRONMENT = true;

test('renders Aries with its spending mood and message without WebGL', () => {
  const el = document.createElement('div'); const root = createRoot(el); const onChange = jest.fn();
  act(() => root.render(<RamMascot mood="angry" message="Grr! Food is over its limit." onChangeMascot={onChange} />));
  expect(el.querySelector('.ram-mascot.mood-angry.is-still')).not.toBeNull();
  expect(el.querySelector('canvas')).toBeNull();
  expect(el.querySelector('img')).toBeNull();
  expect(el.querySelector('.aries--angry')).not.toBeNull();
  expect(el.querySelector('.ram-stage').getAttribute('aria-label')).toBe('MOVO ram: upset. Grr! Food is over its limit.');
  expect(el.querySelector('.ram-bubble.is-open')).toBeNull();
  act(() => el.querySelector('.ram-stage').click());
  expect(el.querySelector('.ram-bubble.is-open')).not.toBeNull();
  expect(el.querySelector('.aries--waving')).not.toBeNull();
  act(() => el.querySelector('.ram-bubble-link').click());
  expect(onChange).toHaveBeenCalled();
  act(() => root.unmount());
});

test('a tap reaction returns to the current spending mood and cleans up on unmount', () => {
  jest.useFakeTimers();
  const el = document.createElement('div'); const root = createRoot(el);
  act(() => root.render(<RamMascot mood="smile" message="On track" />));
  expect(el.querySelector('.aries--happy')).not.toBeNull();
  act(() => el.querySelector('.ram-stage').click());
  act(() => jest.advanceTimersByTime(1800));
  expect(el.querySelector('.aries--happy')).not.toBeNull();
  act(() => root.render(<RamMascot mood="sad" message="Near a limit" />));
  expect(el.querySelector('.aries--sad')).not.toBeNull();
  act(() => root.unmount());
  expect(jest.getTimerCount()).toBe(0);
  jest.useRealTimers();
});

test('a disappointed ram says so to assistive tech, and taps keep the message showing', () => {
  const el = document.createElement('div'); const root = createRoot(el);
  act(() => root.render(<RamMascot mood="sad" message="Oh no, Food is close to its limit." />));
  expect(el.querySelector('.ram-stage').getAttribute('aria-label')).toMatch(/disappointed/);
  act(() => el.querySelector('.ram-stage').click());
  expect(el.querySelector('.ram-bubble.is-open p').textContent).toBe('Oh no, Food is close to its limit.');
  act(() => root.unmount());
});


test('the Change mascot text link stays borderless despite global button hairlines', () => {
  const css = require('fs').readFileSync(require('path').join(__dirname, '..', 'App.css'), 'utf8');
  expect(css).toContain('button:not(.search-scrim):not(.ram-stage):not(.ram-bubble-link)');
  expect(css).toMatch(/\.ram-bubble-link\s*\{[^}]*border:\s*0;/);
});
