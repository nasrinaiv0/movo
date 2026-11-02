import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import RamMascot from './RamMascot';

global.IS_REACT_ACT_ENVIRONMENT = true;

test('renders the still ram with its mood, message and greeting (no WebGL in tests)', () => {
  const el = document.createElement('div'); const root = createRoot(el); const onChange = jest.fn();
  act(() => root.render(<RamMascot mood="angry" message="Grr! Food is over its limit." greeting="Good evening, Friend" onChangeMascot={onChange} />));
  expect(el.querySelector('.ram-mascot.mood-angry.is-still')).not.toBeNull();
  expect(el.querySelector('canvas')).toBeNull();
  expect(el.querySelector('.ram-stage').getAttribute('aria-label')).toBe('MOVO ram: upset. Grr! Food is over its limit.');
  expect(el.querySelector('h1').textContent).toBe('Good evening, Friend');
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
