import { Capacitor } from '@capacitor/core';
import { isNativeApp } from './platform';
import { MovoNative } from './native';
import { applyIosInterface } from './iosInterface';

/*
 * iOS app: the native Liquid Glass top bar and dock mirror the web app's own header and dock.
 * The web header and dock still render (hidden by `.native-chrome` CSS), so screens need no changes: this module
 * reads their title, buttons, badges and icons from the page, sends them to MovoNative.setChrome, and turns native
 * taps back into clicks on the same web buttons. While a sheet or dialog is open, both bars step aside.
 */

const ICON_PX = 72; // 24pt at 3x

/** What the native bars should show, read from the current page. Pure apart from the DOM, so it is unit-tested. */
export function readChrome(doc = document) {
  const header = doc.querySelector('main.screen .screen-header');
  const isHome = !!header?.classList.contains('home-header');
  const back = header?.querySelector('.back-button') || null;
  const actionButtons = header ? Array.from(header.querySelectorAll(isHome ? '.header-action-buttons button' : '.header-actions .round-button')) : [];
  const fallbackActions = header && !isHome && !actionButtons.length ? Array.from(header.querySelectorAll('.header-actions > button')) : [];
  const actions = actionButtons.length ? actionButtons : fallbackActions;
  const rail = doc.querySelector('nav.side-nav');
  const navItems = Array.from(doc.querySelectorAll(rail ? 'nav.side-nav button' : 'nav.bottom-nav .nav-item'));
  const overlay = !!doc.querySelector('[aria-modal="true"], .search-overlay');
  return {
    overlay,
    appearance: doc.querySelector('.movo-app')?.getAttribute('data-appearance'),
    top: {
      hidden: overlay || !header,
      title: isHome ? '' : (header?.querySelector('h1')?.textContent || '').trim(),
      back: !!back,
      backLabel: back?.getAttribute('aria-label') || 'Back',
      backDisabled: !!back && (back.disabled || back.getAttribute('aria-disabled') === 'true'),
      backSvg: back?.querySelector('svg') || null,
      // primary: the Plus ("add") action, drawn as a filled circle; the other icons have no background.
      actions: actions.map(b => ({ disabled: b.disabled || b.getAttribute('aria-disabled') === 'true', label: b.getAttribute('aria-label') || b.textContent.trim(), dot: !!b.querySelector('.red-dot'), primary: b.classList.contains('header-add-action') || b.classList.contains('accent'), svg: b.querySelector('svg') })),
    },
    dock: {
      // Hidden during setup too: the web nav is locked (App.js setupDone) until the Terms are accepted.
      hidden: overlay || !navItems.length || !!doc.querySelector('nav.bottom-nav.is-locked, nav.side-nav.is-locked'),
      placement: rail ? 'leading' : 'bottom',
      direction: doc.querySelector('.movo-app')?.getAttribute('dir') || doc.documentElement.dir || 'ltr',
      active: navItems.findIndex(b => b.classList.contains('nav-active') || b.classList.contains('active')),
      tabs: navItems.map(b => ({ disabled: b.disabled || b.getAttribute('aria-disabled') === 'true', label: b.getAttribute('aria-label') || b.getAttribute('title') || b.textContent.trim(), badge: !!b.querySelector('.nav-badge'), original: b.classList.contains('nav-center') || b.dataset.navTarget === 'NasrinAI', svg: b.querySelector('svg') })),
    },
    buttons: { back, actions, tabs: navItems },
  };
}

/** Normalise any CSS colour (rgb(), named, #abc) to #rrggbb for the native side. */
function toHex(color) {
  try {
    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) return undefined;
    ctx.fillStyle = '#000000'; ctx.fillStyle = color;
    return /^#[0-9a-f]{6}$/i.test(ctx.fillStyle) ? ctx.fillStyle : undefined;
  } catch { return undefined; }
}

const iconCache = new Map();
/** Render a web icon (an <svg>) to a PNG for the native bars. Monochrome icons become template images. */
function iconPng(svg, original = false) {
  if (!svg) return Promise.resolve(undefined);
  const clone = svg.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(ICON_PX)); clone.setAttribute('height', String(ICON_PX));
  if (!original) clone.setAttribute('color', '#000000');
  const markup = new XMLSerializer().serializeToString(clone).replace(/currentColor/g, original ? 'currentColor' : '#000000');
  if (iconCache.has(markup)) return iconCache.get(markup);
  const job = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas'); canvas.width = ICON_PX; canvas.height = ICON_PX;
        canvas.getContext('2d').drawImage(img, 0, 0, ICON_PX, ICON_PX);
        resolve(canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, ''));
      } catch { resolve(undefined); }
    };
    img.onerror = () => resolve(undefined);
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
  });
  iconCache.set(markup, job);
  return job;
}

/** Start mirroring. Returns a stop function. Does nothing outside the iOS app. */
export function startNativeChrome() {
  // Only iOS installs native Liquid Glass bars. Android must retain the web header and dock.
  if (!isNativeApp() || Capacitor.getPlatform() !== 'ios' || typeof document === 'undefined') return () => {};
  const root = document.documentElement;
  let stopped = false;
  let generation = 0;
  let buttons = { back: null, actions: [], tabs: [] };
  let timer = 0; let last = '';

  const sync = async () => {
    if (stopped) return;
    const current = ++generation;
    const state = readChrome(document);
    const styles = getComputedStyle(document.querySelector('.movo-app') || document.body);
    const dark = !!document.querySelector('.theme-dark') || root.classList.contains('theme-dark');
    const [backIcon, actionIcons, tabIcons] = await Promise.all([
      iconPng(state.top.backSvg),
      Promise.all(state.top.actions.map(a => iconPng(a.svg))),
      Promise.all(state.dock.tabs.map(t => iconPng(t.svg, t.original))),
    ]);
    const payload = {
      theme: state.appearance === 'system' && root.classList.contains('ios-system-appearance') ? 'system' : dark ? 'dark' : 'light',
      // The iOS dock tints its active tab with this colour: the plan colour (platinum / gold, a solid tone because the
      // native bar cannot draw the web gradient) when the navigation follows the plan, else the app accent.
      accent: toHex(styles.getPropertyValue('--nav-tier').trim() || styles.getPropertyValue('--accent').trim() || '#10a866'),
      top: { hidden: state.top.hidden, title: state.top.title, back: state.top.back, backLabel: state.top.backLabel, backDisabled: state.top.backDisabled, backIcon, actions: state.top.actions.map((a, i) => ({ disabled: a.disabled, label: a.label, dot: a.dot, primary: a.primary, icon: actionIcons[i] })) },
      dock: { ...state.dock, tabs: state.dock.tabs.map((t, i) => ({ disabled: t.disabled, label: t.label, badge: t.badge, original: t.original, icon: tabIcons[i] })) },
    };
    if (stopped || current !== generation) return;
    // System mode keeps UIKit unspecified, but a resolved light/dark change must refresh its semantic colors.
    const key = JSON.stringify({ ...payload, resolvedTheme: dark ? 'dark' : 'light' });
    if (key === last) return;
    try {
      const settings = await MovoNative.setChrome(payload);
      if (!stopped && current === generation && settings?.supportsSystemAppearance === true) applyIosInterface(settings, root);
      if (!stopped && current === generation) { buttons = state.buttons; last = key; root.classList.add('native-chrome'); }
    } catch {
      if (!stopped && current === generation) {
        last = '';
        if (root.classList.contains('native-chrome')) root.classList.remove('native-chrome');
        MovoNative.setChrome({ top: { hidden: true }, dock: { hidden: true } }).catch(() => {});
      }
    }
  };
  const schedule = () => { clearTimeout(timer); timer = setTimeout(sync, 50); };

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true, attributeFilter: ['class', 'dir', 'aria-label', 'aria-current', 'aria-modal', 'disabled', 'aria-disabled', 'data-appearance'] });
  const tap = MovoNative.addListener('chromeTap', ({ kind, index }) => {
    const target = kind === 'back' ? buttons.back : kind === 'action' ? buttons.actions[index] : kind === 'tab' ? buttons.tabs[index] : null;
    if (!target?.isConnected || target.disabled || target.getAttribute('aria-disabled') === 'true') return;
    if (readChrome(document).overlay) return;
    target.click();
  });
  sync();

  return () => {
    stopped = true; ++generation;
    clearTimeout(timer); observer.disconnect();
    Promise.resolve(tap).then(h => h?.remove()).catch(() => {});
    root.classList.remove('native-chrome');
    MovoNative.setChrome({ top: { hidden: true }, dock: { hidden: true } }).catch(() => {});
  };
}
