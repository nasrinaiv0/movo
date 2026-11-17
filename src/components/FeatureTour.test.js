import React, { act } from 'react';
import fs from 'fs';
import path from 'path';
import { createRoot } from 'react-dom/client';
import FeatureTour, { TOUR_STEPS, stageLayout, tourAudio, tourImage, tourPose } from './FeatureTour';
import { ARIES_POSES } from '../lib/ariesArt';
import manifest from '../lib/tourManifest.json';

const { STEPS, narration } = require('../../scripts/tutorial-guide/steps.cjs');

global.IS_REACT_ACT_ENVIRONMENT = true;
let container; let root;
beforeEach(() => { container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container); });
afterEach(() => { act(() => root.unmount()); container.remove(); jest.restoreAllMocks(); });

const button = (label) => [...container.querySelectorAll('button')].find(b => b.textContent.trim() === label || b.getAttribute('aria-label') === label);
const click = (el) => act(() => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
const tap = async (el) => { await act(async () => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); }); };
const mount = (props = {}) => { const onDone = jest.fn(); act(() => root.render(<FeatureTour onDone={onDone} {...props} />)); return onDone; };

test('the tour walks through every part of MOVO and every step has its picture, highlight and spoken line', () => {
  const ids = TOUR_STEPS.map(s => s.id);
  expect(ids).toEqual(['welcome', 'balance', 'planning', 'flow', 'budgets', 'wallet', 'accounts', 'add', 'scan', 'chat', 'automation',
    'transactions', 'subscriptions', 'menu', 'appearance', 'security', 'sync', 'logos', 'pro', 'done']);
  expect(Object.keys(manifest.steps).sort()).toEqual([...ids].sort());
  const dir = path.join(__dirname, '..', '..', 'public', 'tutorial');
  for (const step of TOUR_STEPS) {
    const { image, rect, ms } = manifest.steps[step.id];
    for (const theme of ['light', 'dark']) expect(fs.existsSync(path.join(dir, `${image}-${theme}.webp`))).toBe(true);
    expect(fs.statSync(path.join(dir, `${step.id}.mp3`)).size).toBeGreaterThan(8000);
    expect(ms).toBeGreaterThan(2000); expect(ms).toBeLessThan(11000);
    // The highlight is a real area inside the screenshot.
    expect(rect).toHaveLength(4);
    rect.forEach(v => { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); });
    expect(rect[0] + rect[2]).toBeLessThanOrEqual(1.0001); expect(rect[1] + rect[3]).toBeLessThanOrEqual(1.0001);
    expect(rect[2]).toBeGreaterThan(0.2); expect(rect[3]).toBeGreaterThan(0.05);
  }
  // The old video is gone, and nothing else is shipped in the folder.
  expect(fs.readdirSync(dir).filter(f => !/\.(webp|mp3)$/.test(f))).toEqual([]);
});

test('captions are exactly what the narrator reads, and product names are respelled only for the voice', () => {
  expect(STEPS.map(({ id, title, text }) => ({ id, title, text }))).toEqual(TOUR_STEPS);
  expect(STEPS.map(s => s.image)).toEqual(TOUR_STEPS.map(s => manifest.steps[s.id].image));
  const spoken = STEPS.map(narration).join(' ');
  expect(spoken).not.toMatch(/MOVO|NasrinAI|[“”’]/);
  expect(spoken).toContain('Mowvo never connects to your bank');
  // Honest wording: no claim of bank links, moving money or guaranteed alerts.
  const shown = TOUR_STEPS.map(s => `${s.title} ${s.text}`).join(' ');
  expect(shown).toContain('MOVO never connects to your bank');
  expect(shown).toContain('MOVO is not affiliated with them, and never moves your money');
  expect(shown).not.toMatch(/remind|notif|guarantee|bank-verified/i);
  // The AI receipt scan asks first and says which plan includes it; so does automatic logging.
  const said = id => TOUR_STEPS.find(s => s.id === id).text;
  expect(said('scan')).toMatch(/^With your permission, AI reads/);
  expect(said('scan')).toContain('Included in Pro.');
  expect(said('automation')).toContain('Included in Pro+.');
  expect(narration(STEPS.find(s => s.id === 'automation'))).toContain('Pro plus');
});

test('Aries, the welcoming mascot, guides every step in a pose that fits it', () => {
  expect(TOUR_STEPS.map(s => tourPose(s.id)).every(p => ARIES_POSES.includes(p))).toBe(true);
  expect(tourPose('welcome')).toBe('hello');
  expect(tourPose('scan')).toBe('scan');
  expect(tourPose('automation')).toBe('auto');
  expect(tourPose('done')).toBe('happy');
  mount();
  const guide = container.querySelector('.ft-caption .aries-mascot');
  expect(guide.getAttribute('class')).toContain('pose-hello');
  expect(guide.getAttribute('aria-hidden')).toBe('true'); // decorative: the caption already says everything
  click(button('Next'));
  expect(container.querySelector('.ft-caption .aries-mascot').getAttribute('class')).toContain('pose-point');
});

test('the picture is placed so the highlight is centred and never cut off', () => {
  const aspect = 932 / 430;
  // A small highlight near the bottom of the screenshot: full width, scrolled so the highlight is in the middle.
  let l = stageLayout([0.03, 0.8, 0.94, 0.07], 400, 500, aspect);
  expect(l.scale).toBe(1); expect(l.x).toBe(0);
  const shotH = 400 * aspect;
  expect(l.y).toBeCloseTo(Math.max(500 - shotH, 250 - 0.835 * shotH), 3);
  expect(l.y).toBeLessThanOrEqual(0); expect(l.y).toBeGreaterThanOrEqual(500 - shotH);
  // A highlight near the top never leaves a gap above the screenshot.
  l = stageLayout([0.03, 0.02, 0.94, 0.1], 400, 500, aspect);
  expect(l.y).toBe(0);
  // A highlight taller than the stage is shrunk until it fits, and stays centred.
  l = stageLayout([0, 0.1, 1, 0.82], 400, 500, aspect);
  expect(l.scale).toBeLessThan(1);
  expect(0.82 * shotH * l.scale).toBeLessThanOrEqual(500 - 20 + 0.01);
  expect(l.x).toBeCloseTo((400 - 400 * l.scale) / 2, 3);
  // No highlight: the whole screen is shown, centred.
  l = stageLayout([0, 0, 1, 1], 400, 500, aspect);
  expect(shotH * l.scale).toBeLessThanOrEqual(480.01);
  expect(l.y).toBeCloseTo((500 - shotH * l.scale) / 2, 3);
  // Every shipped step fits a small phone stage.
  for (const step of TOUR_STEPS) {
    const { rect } = manifest.steps[step.id];
    const s = stageLayout(rect, 328, 300, aspect);
    const top = s.y + rect[1] * 328 * aspect * s.scale; const bottom = top + rect[3] * 328 * aspect * s.scale;
    expect(top).toBeGreaterThanOrEqual(-0.5); expect(bottom).toBeLessThanOrEqual(300.5);
  }
});

test('shows one step at a time with Next and Back, in the light or dark screenshots', () => {
  const onDone = mount();
  const dialog = container.querySelector('[role="dialog"]');
  expect(dialog.getAttribute('aria-label')).toBe('MOVO guide');
  expect(container.querySelector('video')).toBeNull();
  expect(container.querySelector('h2').textContent).toBe('Welcome to MOVO');
  expect(container.textContent).toContain('1 of 20');
  expect(container.querySelector('.ft-sharp').getAttribute('src')).toBe(tourImage('home-top', false));
  expect(container.querySelector('.ft-sheet').className).toContain('is-whole');
  expect(button('Back').disabled).toBe(true);

  click(button('Next'));
  expect(container.querySelector('h2').textContent).toBe('Your balance at a glance');
  expect(container.querySelector('.ft-sheet').className).not.toContain('is-whole');
  // The highlight ring and the sharp cut-out sit where the manifest says.
  const [x, y, w, h] = manifest.steps.balance.rect;
  const ring = container.querySelector('.ft-ring');
  expect(parseFloat(ring.style.left)).toBeCloseTo(x * 100, 1);
  expect(parseFloat(ring.style.top)).toBeCloseTo(y * 100, 1);
  expect(parseFloat(ring.style.width)).toBeCloseTo(w * 100, 1);
  expect(parseFloat(ring.style.height)).toBeCloseTo(h * 100, 1);
  expect(container.querySelector('.ft-sharp').style.clipPath).toMatch(/^inset\(/);

  click(button('Back'));
  expect(container.querySelector('h2').textContent).toBe('Welcome to MOVO');
  click(button('Next')); click(container.querySelector('.ft-next'));
  expect(container.querySelector('h2').textContent).toBe('Know where you stand');
  click(container.querySelector('.ft-prev'));
  expect(container.textContent).toContain('2 of 20');
  expect(onDone).not.toHaveBeenCalled();

  act(() => root.unmount()); root = createRoot(container);
  mount({ dark: true });
  expect(container.querySelector('.ft-panel').className).toContain('is-dark');
  expect(container.querySelector('.ft-sharp').getAttribute('src')).toBe(tourImage('home-top', true));
});

test('Skip, Escape and Continue on the last step end the tour', () => {
  let onDone = mount();
  click(button('Skip'));
  expect(onDone).toHaveBeenCalledWith('skipped');

  act(() => root.unmount()); root = createRoot(container);
  onDone = mount();
  act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' })); });
  expect(container.textContent).toContain('2 of 20');
  act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); });
  expect(onDone).toHaveBeenCalledWith('skipped');

  act(() => root.unmount()); root = createRoot(container);
  onDone = mount();
  for (let i = 0; i < TOUR_STEPS.length - 1; i += 1) click(button('Next'));
  expect(container.querySelector('h2').textContent).toBe('You’re all set');
  expect([...container.querySelectorAll('.ft-actions button')].map(b => b.textContent)).toEqual(['Back', 'Continue']);
  click(button('Continue'));
  expect(onDone).toHaveBeenCalledWith('finished');
});

test('with reduced motion nothing plays by itself; the sound button speaks the current step', async () => {
  const play = jest.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());
  const pause = jest.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  mount();
  expect(play).not.toHaveBeenCalled();
  expect(button('Pause')).toBeUndefined(); // nothing is moving, so there is nothing to pause
  await tap(button('Next'));
  expect(play).not.toHaveBeenCalled();
  expect(button('Turn sound on').getAttribute('aria-pressed')).toBe('false');

  await tap(button('Turn sound on'));
  expect(play).toHaveBeenCalledTimes(1);
  expect(container.querySelector('audio').getAttribute('src')).toBe(tourAudio('balance'));
  expect(button('Mute').getAttribute('aria-pressed')).toBe('true');
  // With sound on, each step speaks as it is opened.
  await tap(button('Next'));
  expect(play).toHaveBeenCalledTimes(2);
  expect(container.querySelector('audio').getAttribute('src')).toBe(tourAudio('planning'));
  await tap(button('Mute'));
  expect(pause).toHaveBeenCalled();
  await tap(button('Next'));
  expect(play).toHaveBeenCalledTimes(2);
});

test('a refused or missing sound never stops the tour, and a missing picture shows the MOVO mark', async () => {
  jest.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.reject(new Error('NotAllowedError')));
  jest.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  mount();
  await tap(button('Turn sound on'));
  expect(button('Turn sound on')).toBeDefined(); // still offered, shown as off
  await tap(button('Next'));
  expect(container.querySelector('h2').textContent).toBe('Your balance at a glance');
  act(() => { container.querySelector('.ft-sharp').dispatchEvent(new Event('error')); });
  expect(container.querySelector('.ft-sharp')).toBeNull();
  expect(container.querySelector('.ft-missing')).not.toBeNull();
  await tap(button('Next'));
  expect(container.querySelector('h2').textContent).toBe('Know where you stand');
});
