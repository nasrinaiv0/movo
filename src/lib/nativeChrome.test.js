import { Capacitor } from '@capacitor/core';
import { readChrome, startNativeChrome } from './nativeChrome';

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
