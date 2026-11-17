import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import AriesMascot, { ARIES_STATES } from './AriesMascot';
import { ARIES_POSES, ariesSvg, ariesDocument, ariesInner } from '../lib/ariesArt';
import * as motion from '../lib/motion';

global.IS_REACT_ACT_ENVIRONMENT = true;

function mount(node) {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(node));
  return { host, root, close: () => { act(() => root.unmount()); host.remove(); } };
}

afterEach(() => jest.restoreAllMocks());

test('at least ten expressions have distinct self-contained artwork with no external assets or WebGL', () => {
  expect(ARIES_STATES.length).toBeGreaterThanOrEqual(10);
  const expressions = ARIES_STATES.map(({ id }) => ariesInner(id, { idPrefix: 'same', animated: false }));
  expect(new Set(expressions).size).toBe(ARIES_STATES.length);
  expressions.forEach(svg => {
    expect(svg).toContain('class="aries-horn');
    expect(svg).toContain('url(#aries-same-scarf)');
    expect(svg).not.toMatch(/<image|href=|<script|<canvas|<foreignObject|on[a-z]+=|NaN|undefined/);
  });
  expect(ariesInner('unknown', { idPrefix: 'safe' })).toBe(ariesInner('welcome', { idPrefix: 'safe' }));
});

test('guide poses retain their meaning and static export API while using the same new Aries', () => {
  ARIES_POSES.forEach(pose => expect(ariesSvg(pose, 'x')).toContain('url(#aries-x-horn)'));
  expect(ariesSvg('alert')).toContain('aries-calendar');
  expect(ariesSvg('scan')).toContain('data-prop="receipt"');
  expect(ariesSvg('auto')).toContain('data-prop="automatic"');
  expect(ariesSvg('happy')).toContain('data-prop="goal"');
  expect(ariesSvg('unknown')).toBe(ariesSvg('home'));
  expect(ariesDocument('home', 120)).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 200 200" width="120"/);
});

test('is decorative by default, exposes a supplied label, and keeps every SVG reference unique', () => {
  const view = mount(<><AriesMascot pose="hello" size={80} /><AriesMascot state="love" label="Aries, the MOVO mascot, waving hello" /></>);
  const [plain, named] = view.host.querySelectorAll('svg');
  expect(plain.getAttribute('aria-hidden')).toBe('true');
  expect(plain.getAttribute('width')).toBe('80');
  expect(plain.getAttribute('fill')).toBe('none');
  expect(plain.style.height).toBe('auto');
  expect(plain.classList.contains('pose-hello')).toBe(true);
  expect(plain.dataset.state).toBe('waving');
  expect(named.getAttribute('role')).toBe('img');
  expect(named.getAttribute('aria-label')).toBe('Aries, the MOVO mascot, waving hello');
  const ids = [...view.host.querySelectorAll('[id]')].map(el => el.id);
  expect(new Set(ids).size).toBe(ids.length);
  for (const svg of [plain, named]) {
    const localIds = new Set([...svg.querySelectorAll('[id]')].map(el => el.id));
    for (const attr of ['fill', 'filter']) {
      svg.querySelectorAll(`[${attr}]`).forEach(el => {
        const match = el.getAttribute(attr).match(/^url\(#(.+)\)$/);
        if (match) expect(localIds.has(match[1])).toBe(true);
      });
    }
  }
  const firstIds = [...plain.querySelectorAll('[id]')].map(el => el.id);
  act(() => view.root.render(<><AriesMascot pose="hello" state="thinking" size={80} /><AriesMascot state="love" /></>));
  expect([...view.host.querySelector('svg').querySelectorAll('[id]')].map(el => el.id)).toEqual(firstIds);
  view.close();
});

test('walking is opt-in and motion responds immediately to a live reduced-motion preference', () => {
  jest.spyOn(motion, 'canAnimate').mockReturnValue(true);
  const previous = window.matchMedia;
  let changed;
  const media = { matches: false, addEventListener: jest.fn((event, listener) => { changed = listener; }), removeEventListener: jest.fn() };
  window.matchMedia = jest.fn(() => media);
  const view = mount(<AriesMascot walking />);
  const svg = view.host.querySelector('svg');
  expect(svg.classList.contains('aries--walking')).toBe(true);
  expect(svg.dataset.motion).toBe('animated');
  act(() => { media.matches = true; changed(); });
  expect(svg.dataset.motion).toBe('still');
  expect(svg.classList.contains('is-animated')).toBe(false);
  act(() => { media.matches = false; changed(); });
  expect(svg.dataset.motion).toBe('animated');
  act(() => view.root.render(<AriesMascot animated={false} />));
  expect(svg.classList.contains('aries--walking')).toBe(false);
  expect(svg.dataset.motion).toBe('still');
  view.close();
  expect(media.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  window.matchMedia = previous;
});

test('pauses motion outside the viewport and disconnects the observer on unmount', () => {
  const previous = global.IntersectionObserver;
  let notify;
  const disconnect = jest.fn(); const observe = jest.fn();
  global.IntersectionObserver = class {
    constructor(callback) { notify = callback; this.observe = observe; this.disconnect = disconnect; }
  };
  const view = mount(<AriesMascot />);
  const svg = view.host.querySelector('svg');
  expect(observe).toHaveBeenCalledWith(svg);
  act(() => notify([{ isIntersecting: false }]));
  expect(svg.classList.contains('is-paused')).toBe(true);
  act(() => notify([{ isIntersecting: true }]));
  expect(svg.classList.contains('is-paused')).toBe(false);
  view.close(); expect(disconnect).toHaveBeenCalled();
  global.IntersectionObserver = previous;
});


test('pauses while its document is in the background and resumes on foreground', () => {
  const visibility = jest.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  const view = mount(<AriesMascot />);
  const svg = view.host.querySelector('svg');
  act(() => { visibility.mockReturnValue('hidden'); document.dispatchEvent(new Event('visibilitychange')); });
  expect(svg.classList.contains('is-paused')).toBe(true);
  act(() => { visibility.mockReturnValue('visible'); document.dispatchEvent(new Event('visibilitychange')); });
  expect(svg.classList.contains('is-paused')).toBe(false);
  view.close();
});
