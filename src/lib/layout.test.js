import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { panesFromNative, preferredPane, useLayout } from './layout';

jest.mock('@capacitor/core', () => ({ ...jest.requireActual('@capacitor/core'),
  registerPlugin: jest.fn(() => ({ addListener: jest.fn(), getWindowLayout: jest.fn() })) }));

global.IS_REACT_ACT_ENVIRONMENT = true;

function probe(queries) {
  window.matchMedia = (q) => ({ matches: queries.some(x => q.includes(x)), addEventListener() {}, removeEventListener() {} });
  let seen; const Probe = () => { seen = useLayout(); return null; };
  const el = document.createElement('div'); const root = createRoot(el);
  act(() => root.render(<Probe />)); act(() => root.unmount());
  return seen;
}

afterEach(() => { delete window.matchMedia; });

test('phone by default, tablet and desktop by width, dual on two-segment screens', () => {
  expect(probe([])).toEqual({ mode: 'phone', dual: false });
  expect(probe(['min-width: 768px'])).toEqual({ mode: 'tablet', dual: false });
  expect(probe(['min-width: 768px', 'min-width: 1100px'])).toEqual({ mode: 'desktop', dual: false });
  expect(probe(['horizontal-viewport-segments: 2'])).toEqual({ mode: 'tablet', dual: true });
  expect(probe(['vertical-viewport-segments: 2'])).toEqual({ mode: 'phone', dual: true });
});

test('native physical-pixel hinges scale into the current WebView CSS viewport', () => {
  const panes = panesFromNative({ width: 2000, height: 1600, folds: [{ left: 980, right: 1020, top: 0, bottom: 1600, separating: true }] }, 1000, 800);
  expect(panes).toEqual([{ x: 0, y: 0, width: 490, height: 800 }, { x: 510, y: 0, width: 490, height: 800 }]);
  expect(preferredPane(panes, 1000, 800)).toEqual(panes[0]);
  expect(preferredPane(panes, 1000, 800, true)).toEqual(panes[1]);
});

test('tabletop creases and trifold windows yield usable panes without including a hinge', () => {
  expect(panesFromNative({ width: 800, height: 1000, folds: [{ left: 0, right: 800, top: 500, bottom: 500, separating: true }] }, 800, 1000))
    .toEqual([{ x: 0, y: 0, width: 800, height: 500 }, { x: 0, y: 500, width: 800, height: 500 }]);
  const panes = panesFromNative({ width: 1200, height: 800, folds: [400, 800].map(left => ({ left, right: left, top: 0, bottom: 800, separating: true })) }, 1200, 800);
  expect(panes).toHaveLength(3);
  expect(panes.map(p => p.width)).toEqual([400, 400, 400]);
});

test.each([
  null, { width: 0, height: 800, folds: [] },
  { width: 800, height: 600, folds: [{ left: NaN, right: 410, top: 0, bottom: 600, separating: true }] },
  { width: 800, height: 600, folds: [{ left: 390, right: 410, top: 0, bottom: 600, separating: false }] },
  { width: 800, height: 600, folds: [{ left: 390, right: 410, top: 0, bottom: 200, separating: true }] },
  { width: 800, height: 600, folds: [{ left: -10, right: 410, top: 0, bottom: 600, separating: true }] },
])('invalid or non-separating features keep the normal width-based layout (%p)', value => {
  expect(panesFromNative(value, 800, 600)).toEqual([]);
});

test('malformed, overlapping and out-of-window browser panes are rejected', () => {
  expect(preferredPane([{ x: 0, y: 0, width: 500, height: 600 }, { x: 400, y: 0, width: 400, height: 600 }], 800, 600)).toBeNull();
  expect(preferredPane([{ x: 0, y: 0, width: 0, height: 600 }, { x: 400, y: 0, width: 500, height: 600 }], 800, 600)).toBeNull();
});

describe('live resizing and native lifecycle', () => {
  let root, el, seen, native, platform;
  const bridge = registerPlugin.mock.results[0].value;
  const flush = async () => { await act(async () => { await Promise.resolve(); jest.advanceTimersByTime(32); }); };
  beforeEach(() => {
    jest.useFakeTimers();
    window.matchMedia = jest.fn(() => ({ matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() }));
    native = jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
    platform = jest.spyOn(Capacitor, 'getPlatform').mockReturnValue('android');
    bridge.addListener.mockResolvedValue({ remove: jest.fn() });
    bridge.getWindowLayout.mockResolvedValue({ width: 0, height: 0, folds: [] });
    el = document.createElement('div'); document.body.appendChild(el); root = createRoot(el);
    const Probe = () => { seen = useLayout(); return null; };
    root.renderProbe = () => act(() => root.render(<Probe />));
  });
  afterEach(async () => {
    act(() => root.unmount()); await Promise.resolve(); el.remove();
    delete window.getWindowSegments; document.documentElement.dir = '';
    native.mockRestore(); platform.mockRestore(); jest.useRealTimers(); jest.clearAllMocks();
  });

  test('fold, direction change and unfold update the same mounted hook and clean up listeners', async () => {
    root.renderProbe(); await flush();
    expect(seen.mode).toBe('phone');
    const half = (document.documentElement.clientWidth || innerWidth) / 2;
    window.getWindowSegments = () => [{ left: 0, top: 0, width: half, height: innerHeight }, { left: half, top: 0, width: half, height: innerHeight }];
    window.dispatchEvent(new Event('resize')); await flush();
    expect(seen.pane.x).toBe(0);
    document.documentElement.dir = 'rtl'; await flush(); await flush();
    expect(seen.pane.x).toBe(half);
    window.getWindowSegments = () => [];
    window.dispatchEvent(new Event('orientationchange')); await flush();
    expect(seen.pane).toBeUndefined();
    expect(bridge.getWindowLayout).not.toHaveBeenCalled();
  });

  test('new native events beat a stale initial snapshot and no callbacks survive unmount', async () => {
    native.mockReturnValue(true);
    let resolve;
    bridge.getWindowLayout.mockReturnValue(new Promise(done => { resolve = done; }));
    const remove = jest.fn(); bridge.addListener.mockResolvedValue({ remove });
    root.renderProbe(); await flush();
    const receive = bridge.addListener.mock.calls[0][1];
    receive({ width: 1000, height: 1000, folds: [{ left: 500, right: 500, top: 0, bottom: 1000, separating: true }] });
    await flush(); expect(seen.dual).toBe(true);
    resolve({ width: 1000, height: 1000, folds: [] }); await flush();
    expect(seen.dual).toBe(true);
    act(() => root.unmount()); await flush();
    expect(remove).toHaveBeenCalledTimes(1);
    receive({ width: 1000, height: 1000, folds: [] }); await flush();
    expect(seen.dual).toBe(true);
  });

  test('older Android bridges reject without disabling the browser layout', async () => {
    native.mockReturnValue(true);
    bridge.getWindowLayout.mockRejectedValue(new Error('unimplemented'));
    bridge.addListener.mockRejectedValue(new Error('unimplemented'));
    root.renderProbe(); await flush();
    expect(seen).toEqual({ mode: 'phone', dual: false });
  });
});
