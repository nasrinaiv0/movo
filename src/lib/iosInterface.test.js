import { Capacitor } from '@capacitor/core';
import { MovoNative } from './native';
import { applyIosInterface, startIosInterface } from './iosInterface';

jest.mock('./native', () => ({ MovoNative: { addListener: jest.fn(), getInterfacePreferences: jest.fn() } }));
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
let platform, native, stop;
beforeEach(() => {
  platform = jest.spyOn(Capacitor, 'getPlatform').mockReturnValue('ios');
  native = jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
  MovoNative.addListener.mockResolvedValue({ remove: jest.fn() });
  MovoNative.getInterfacePreferences.mockResolvedValue({ textScale: 1 });
});
afterEach(() => { stop?.(); stop = null; platform.mockRestore(); native.mockRestore(); jest.clearAllMocks(); });

test('device text scale and accessibility changes update shared presentation without changing stored preferences', () => {
  const before = localStorage.length;
  applyIosInterface({ textScale: 1.65, topBarHeight: 88, supportsSystemAppearance: true, colors: { panel: 'rgba(28, 28, 30, 1)', separator: 'invalid' }, reduceMotion: true, reduceTransparency: true, boldText: true, increaseContrast: true });
  const root = document.documentElement;
  expect(root.style.getPropertyValue('--ios-text-scale')).toBe('1.65');
  expect(root.style.getPropertyValue('--native-top-height')).toBe('88px');
  expect(root.style.getPropertyValue('--ios-panel-bg')).toBe('rgba(28, 28, 30, 1)');
  expect(root.style.getPropertyValue('--ios-separator')).toBe('');
  expect(root.classList.contains('ios-reduce-motion')).toBe(true);
  expect(root.classList.contains('ios-reduce-transparency')).toBe(true);
  expect(localStorage.length).toBe(before);
  applyIosInterface({ textScale: NaN, topBarHeight: -10, reduceMotion: false });
  expect(root.style.getPropertyValue('--ios-text-scale')).toBe('1.65');
  expect(root.style.getPropertyValue('--native-top-height')).toBe('88px');
  expect(root.classList.contains('ios-reduce-motion')).toBe(false);
  root.removeAttribute('style'); root.className = '';
});

test('a newer native event wins over an initial response and late responses cannot change a stopped view', async () => {
  let resolve;
  MovoNative.getInterfacePreferences.mockReturnValue(new Promise(done => { resolve = done; }));
  stop = startIosInterface();
  const receive = MovoNative.addListener.mock.calls[0][1];
  receive({ textScale: 1.5 });
  resolve({ textScale: 1 }); await flush();
  expect(document.documentElement.style.getPropertyValue('--ios-text-scale')).toBe('1.5');
  stop(); stop = null;
  receive({ textScale: 2 });
  expect(document.documentElement.style.getPropertyValue('--ios-text-scale')).toBe('');
});

test('keyboard viewport height and offset follow resize/scroll, then listeners are removed', async () => {
  const viewport = new EventTarget(); viewport.height = 844; viewport.offsetTop = 0;
  const original = Object.getOwnPropertyDescriptor(window, 'visualViewport');
  Object.defineProperty(window, 'visualViewport', { value: viewport, configurable: true });
  try {
    stop = startIosInterface(); await flush();
    viewport.height = 390; viewport.offsetTop = 12; viewport.dispatchEvent(new Event('resize'));
    expect(document.documentElement.style.getPropertyValue('--ios-viewport-height')).toBe('390px');
    expect(document.documentElement.style.getPropertyValue('--ios-viewport-top')).toBe('12px');
    stop(); stop = null;
    viewport.dispatchEvent(new Event('scroll'));
    expect(document.documentElement.style.getPropertyValue('--ios-viewport-height')).toBe('');
  } finally {
    if (original) Object.defineProperty(window, 'visualViewport', original); else delete window.visualViewport;
  }
});

test('older iOS binaries retain the CSS/app fallback without an unhandled bridge rejection', async () => {
  MovoNative.getInterfacePreferences.mockRejectedValue(new Error('unimplemented'));
  stop = startIosInterface(); await flush();
  expect(document.documentElement.classList.contains('ios-interface')).toBe(true);
});

test.each(['android', 'web'])('%s never installs iOS presentation or calls the iOS bridge', value => {
  platform.mockReturnValue(value);
  stop = startIosInterface();
  expect(document.documentElement.classList.contains('ios-interface')).toBe(false);
  expect(MovoNative.getInterfacePreferences).not.toHaveBeenCalled();
});


test('a newer native appearance response wins over the initial settings snapshot', async () => {
  let resolve;
  MovoNative.getInterfacePreferences.mockReturnValue(new Promise(done => { resolve = done; }));
  stop = startIosInterface();
  applyIosInterface({ textScale: 1.2, supportsSystemAppearance: true, colors: { panel: 'rgba(28, 28, 30, 1)' } });
  resolve({ textScale: 1, colors: { panel: 'rgba(255, 255, 255, 1)' } }); await flush();
  expect(document.documentElement.style.getPropertyValue('--ios-panel-bg')).toBe('rgba(28, 28, 30, 1)');
});
