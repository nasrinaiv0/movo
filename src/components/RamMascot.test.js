import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import RamMascot from './RamMascot';

global.IS_REACT_ACT_ENVIRONMENT = true;

test('renders the still ram with its mood and message (no WebGL in tests)', () => {
  const el = document.createElement('div'); const root = createRoot(el); const onChange = jest.fn();
  act(() => root.render(<RamMascot mood="angry" message="Grr! Food is over its limit." onChangeMascot={onChange} />));
  expect(el.querySelector('.ram-mascot.mood-angry.is-still')).not.toBeNull();
  expect(el.querySelector('canvas')).toBeNull();
  expect(el.querySelector('.ram-stage').getAttribute('aria-label')).toBe('MOVO ram: upset. Grr! Food is over its limit.');
  expect(el.querySelector('.ram-bubble.is-open')).toBeNull();
  act(() => el.querySelector('.ram-stage').click());
  expect(el.querySelector('.ram-bubble.is-open')).not.toBeNull();
  act(() => el.querySelector('.ram-bubble-link').click());
  expect(onChange).toHaveBeenCalled();
  act(() => root.unmount());
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
