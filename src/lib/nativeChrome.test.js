import { Capacitor } from '@capacitor/core';
import { readChrome, startNativeChrome } from './nativeChrome';
import { MovoNative } from './native';

jest.mock('./native', () => ({ MovoNative: { setChrome: jest.fn(), addListener: jest.fn() } }));

const page = (html) => { document.body.innerHTML = html; return document; };

test('a root screen gives a title, its header buttons and the dock tabs', () => {
  const doc = page(`<main class="screen"><header class="screen-header root"><div class="title-block"><h1>Wallet</h1></div>
    <div class="header-actions"><button class="round-button" aria-label="Search"><svg></svg></button><button class="round-button" aria-label="Notifications"><svg></svg><i class="red-dot"></i></button></div></header></main>
    <nav class="bottom-nav"><button class="nav-item" aria-label="Home"><svg></svg><i class="nav-badge"></i></button><button class="nav-item nav-active" aria-label="Wallet"><svg></svg></button><button class="nav-item nav-center" aria-label="NasrinAI"><svg></svg></button></nav>`);
  const s = readChrome(doc);
  expect(s.top).toMatchObject({ hidden: false, title: 'Wallet', back: false });
  expect(s.top.actions.map(a => [a.label, a.dot])).toEqual([['Search', false], ['Notifications', true]]);
  expect(s.dock.active).toBe(1);
  expect(s.dock.tabs.map(t => [t.label, t.badge, t.original])).toEqual([['Home', true, false], ['Wallet', false, false], ['NasrinAI', false, true]]);
});

test('a wide window mirrors every sidebar action with reading direction and account/setup gates intact', () => {
  const doc = page(`<div class="movo-app" dir="rtl"><main class="screen"><header class="screen-header"><h1>Wallet</h1></header></main>
    <nav class="side-nav"><button class="side-item active" data-nav-target="Wallet" aria-label="Wallet"><svg></svg></button>
    <button class="side-item" data-nav-target="NasrinAI" aria-label="NasrinAI"><svg></svg></button>
    <button class="side-item side-add" title="Add transaction" disabled><svg></svg></button>
    <button class="side-item" title="Settings"><svg></svg></button></nav></div>`);
  const state = readChrome(doc);
  expect(state.dock).toMatchObject({ hidden: false, placement: 'leading', direction: 'rtl', active: 0 });
  expect(state.dock.tabs.map(tab => tab.label)).toEqual(['Wallet', 'NasrinAI', 'Add transaction', 'Settings']);
  expect(state.dock.tabs[1].original).toBe(true);
  expect(state.dock.tabs[2].disabled).toBe(true);
  expect(state.buttons.tabs).toHaveLength(4);
  doc.querySelector('nav').classList.add('is-locked');
  expect(readChrome(doc).dock.hidden).toBe(true);
  doc.body.insertAdjacentHTML('beforeend', '<section role="dialog" aria-modal="true"></section>');
  expect(readChrome(doc).dock.hidden).toBe(true);
});

test('a sub screen has a back button; Home keeps its greeting and sends only its action buttons', () => {
  let s = readChrome(page(`<main class="screen"><header class="screen-header sub"><button class="back-button" aria-label="Back"><svg></svg></button><h1>Help Center</h1><div class="header-actions"></div></header></main>`));
  expect(s.top).toMatchObject({ title: 'Help Center', back: true, actions: [] });
  s = readChrome(page(`<main class="screen"><header class="screen-header home-header"><div class="hello"><h1>Nasrin</h1></div>
    <div class="header-actions"><div class="header-action-buttons"><button class="round-button" aria-label="Search"><svg></svg></button></div><button class="period-pill">Nov</button></div></header></main>`));
  expect(s.top.title).toBe('');
  expect(s.top.actions.map(a => a.label)).toEqual(['Search']);
});

test('both bars step aside while a sheet or dialog is open', () => {
  const s = readChrome(page(`<main class="screen"><header class="screen-header root"><h1>Home</h1></header></main><nav class="bottom-nav"><button class="nav-item"></button></nav><section class="sheet" aria-modal="true"></section>`));
  expect(s.overlay).toBe(true);
  expect(s.top.hidden).toBe(true);
  expect(s.dock.hidden).toBe(true);
});

test('Android does not activate iOS native chrome or hide the web navigation', () => {
  const nativePlatform = jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
  const platform = jest.spyOn(Capacitor, 'getPlatform').mockReturnValue('android');
  try {
    page('<main class="screen"><header class="screen-header"><h1>MOVO</h1></header></main><nav class="bottom-nav"><button class="nav-item">Home</button></nav>');
    const stop = startNativeChrome();
    expect(document.documentElement.classList.contains('native-chrome')).toBe(false);
    expect(document.querySelector('main.screen .screen-header')).not.toBeNull();
    expect(document.querySelector('nav.bottom-nav')).not.toBeNull();
    stop();
  } finally {
    platform.mockRestore();
    nativePlatform.mockRestore();
  }
});

test('the native dock stays hidden while setup is unfinished (locked web nav)', () => {
  const doc = page(`<main class="screen"><header class="screen-header root"><h1>Sign in</h1></header></main>
    <nav class="bottom-nav is-locked"><button class="nav-item nav-active" aria-label="Home" disabled><svg></svg></button><button class="nav-item" aria-label="Wallet" disabled><svg></svg></button></nav>`);
  expect(readChrome(doc).dock.hidden).toBe(true);
});

test('the Plus action is marked primary so the native top bar draws it filled; other icons are plain', () => {
  const doc = page(`<main class="screen"><header class="screen-header root"><div class="title-block"><h1>Wallet</h1></div>
    <div class="header-actions"><div class="header-utility-group"><button class="round-button" aria-label="Edit"><svg></svg></button><button class="round-button" aria-label="Notifications"><svg></svg></button></div>
    <button class="round-button accent header-add-action" aria-label="New account"><svg></svg></button></div></header></main>`);
  expect(readChrome(doc).top.actions.map(a => [a.label, a.primary])).toEqual([['Edit', false], ['Notifications', false], ['New account', true]]);
});


test('native chrome mirrors system appearance and disabled states rather than assuming interactive buttons', () => {
  const s = readChrome(page(`<div class="movo-app" data-appearance="system"><main class="screen"><header class="screen-header"><button class="back-button" disabled>Back</button><h1>Wallet</h1><div class="header-actions"><button class="round-button" aria-label="Save" aria-disabled="true"></button></div></header></main><nav class="bottom-nav"><button class="nav-item" disabled>Home</button></nav></div>`));
  expect(s.appearance).toBe('system');
  expect(s.top.backDisabled).toBe(true);
  expect(s.top.actions[0].disabled).toBe(true);
  expect(s.dock.tabs[0].disabled).toBe(true);
});

describe('native bridge startup and fallback', () => {
  let platform, native, canvas, stop, tap;
  const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
  beforeEach(() => {
    platform = jest.spyOn(Capacitor, 'getPlatform').mockReturnValue('ios');
    native = jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    canvas = jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    document.documentElement.classList.add('ios-system-appearance');
    MovoNative.setChrome.mockResolvedValue({});
    MovoNative.addListener.mockImplementation((name, fn) => { tap = fn; return Promise.resolve({ remove: jest.fn() }); });
    page('<div class="movo-app theme-dark" data-appearance="system"><main class="screen"><header class="screen-header"><h1>Wallet</h1><div class="header-actions"><button class="round-button" aria-label="Save"></button></div></header></main><nav class="bottom-nav"><button class="nav-item" aria-label="Home"></button></nav></div>');
  });
  afterEach(() => { stop?.(); stop = null; document.documentElement.classList.remove('ios-system-appearance'); platform.mockRestore(); native.mockRestore(); canvas.mockRestore(); jest.clearAllMocks(); });

  test('web navigation stays available until native bars actually succeed, and System remains unspecified', async () => {
    let resolve;
    MovoNative.setChrome.mockReturnValueOnce(new Promise(done => { resolve = done; }));
    stop = startNativeChrome(); await flush();
    expect(document.documentElement.classList.contains('native-chrome')).toBe(false);
    expect(MovoNative.setChrome.mock.calls[0][0].theme).toBe('system');
    resolve({}); await flush();
    expect(document.documentElement.classList.contains('native-chrome')).toBe(true);
  });

  test('a rejected or late native activation cannot leave the web controls hidden', async () => {
    MovoNative.setChrome.mockRejectedValueOnce(new Error('bridge not ready'));
    stop = startNativeChrome(); await flush();
    expect(document.documentElement.classList.contains('native-chrome')).toBe(false);
    let resolve;
    stop();
    MovoNative.setChrome.mockReturnValueOnce(new Promise(done => { resolve = done; }));
    stop = startNativeChrome(); await flush();
    stop(); stop = null;
    resolve({}); await flush();
    expect(document.documentElement.classList.contains('native-chrome')).toBe(false);
  });

  test('a system light/dark change refreshes UIKit semantic colors even when the mirrored buttons do not change', async () => {
    stop = startNativeChrome(); await flush();
    document.querySelector('.movo-app').classList.replace('theme-dark', 'theme-light');
    await new Promise(resolve => setTimeout(resolve, 80)); await flush();
    expect(MovoNative.setChrome.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(MovoNative.setChrome.mock.calls.at(-1)[0].theme).toBe('system');
  });

  test('stale native taps cannot activate disabled or modal-covered web actions', async () => {
    stop = startNativeChrome(); await flush();
    const button = document.querySelector('.round-button'); const click = jest.fn(); button.onclick = click;
    tap({ kind: 'action', index: 0 }); expect(click).toHaveBeenCalledTimes(1);
    button.setAttribute('aria-disabled', 'true');
    tap({ kind: 'action', index: 0 }); expect(click).toHaveBeenCalledTimes(1);
    button.removeAttribute('aria-disabled');
    const overlay = document.createElement('section'); overlay.setAttribute('aria-modal', 'true'); document.body.append(overlay);
    tap({ kind: 'action', index: 0 }); expect(click).toHaveBeenCalledTimes(1);
  });
});
