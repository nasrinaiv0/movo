import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import TutorialVideo, { SCENES } from './TutorialVideo';

global.IS_REACT_ACT_ENVIRONMENT = true;
let host, root;
beforeEach(() => { host = document.createElement('div'); document.body.append(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); });
const button = (label) => [...host.querySelectorAll('button')].find(b => b.textContent === label || b.getAttribute('aria-label') === label);

test('plays scene by scene; the last scene hands over to the walkthrough', () => {
  const done = jest.fn();
  act(() => root.render(<TutorialVideo onDone={done} />));
  expect(host.querySelector('[role="dialog"][aria-label="MOVO video guide"]')).not.toBeNull();
  expect(host.textContent).toContain('Welcome to MOVO');
  expect(host.textContent).toContain(`1 of ${SCENES.length}`);
  for (let i = 1; i < SCENES.length; i++) act(() => button('Next').click());
  expect(host.textContent).toContain('Your first month of Pro is free');
  expect(button('Previous').disabled).toBe(false);
  act(() => button('Start the walkthrough').click());
  expect(done).toHaveBeenCalledWith('finished');
});

test('Skip and Escape end the video at once; Previous is off on the first scene', () => {
  const done = jest.fn();
  act(() => root.render(<TutorialVideo onDone={done} />));
  expect(button('Previous').disabled).toBe(true);
  act(() => button('Skip').click());
  expect(done).toHaveBeenCalledWith('skipped');
  act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
  expect(done).toHaveBeenCalledTimes(2);
});

test('in tests and with reduced motion scenes stay still and do not advance by themselves', () => {
  jest.useFakeTimers();
  try {
    const done = jest.fn();
    act(() => root.render(<TutorialVideo onDone={done} />));
    act(() => { jest.advanceTimersByTime(20000); });
    expect(host.textContent).toContain('1 of');
    expect(host.querySelector('.tv-stage.is-still')).not.toBeNull();
    expect(button('Pause')).toBeUndefined();
    expect(done).not.toHaveBeenCalled();
  } finally { jest.useRealTimers(); }
});
