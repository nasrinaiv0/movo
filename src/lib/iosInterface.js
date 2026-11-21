import { Capacitor } from '@capacitor/core';
import { MovoNative } from './native';
import { enableFontScaling } from './fontPrefs';

const generations = new WeakMap();

/** Device accessibility settings are ephemeral; never save them into an account's preferences. */
export function applyIosInterface(settings, root = document.documentElement) {
  generations.set(root, (generations.get(root) || 0) + 1);
  root.classList.toggle('ios-system-appearance', settings?.supportsSystemAppearance === true);
  for (const [key, name] of Object.entries({ panel: '--ios-panel-bg', field: '--ios-field-bg', separator: '--ios-separator' })) {
    const color = settings?.colors?.[key];
    if (typeof color === 'string' && /^rgba\(\d{1,3}, \d{1,3}, \d{1,3}, (?:0(?:\.\d+)?|1(?:\.0+)?)\)$/.test(color)) root.style.setProperty(name, color);
  }
  const scale = Number(settings?.textScale);
  if (Number.isFinite(scale) && scale >= 0.5 && scale <= 4) root.style.setProperty('--ios-text-scale', String(scale));
  const height = Number(settings?.topBarHeight);
  if (Number.isFinite(height) && height >= 44 && height <= 240) root.style.setProperty('--native-top-height', height + 'px');
  for (const [key, name] of Object.entries({ reduceMotion: 'ios-reduce-motion', reduceTransparency: 'ios-reduce-transparency', boldText: 'ios-bold-text', increaseContrast: 'ios-increase-contrast' })) {
    root.classList.toggle(name, settings?.[key] === true);
  }
}

/** Keep the hybrid content in step with UIKit, with web fallbacks for older installed binaries. */
export function startIosInterface() {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') return () => {};
  const root = document.documentElement;
  root.classList.add('ios-interface');
  enableFontScaling();
  let stopped = false;
  const requested = generations.get(root) || 0;
  const receive = settings => { if (!stopped) applyIosInterface(settings, root); };
  const listener = MovoNative.addListener('interfacePreferencesChanged', receive);
  MovoNative.getInterfacePreferences().then(settings => {
    if (!stopped && (generations.get(root) || 0) === requested) receive(settings);
  }).catch(() => {}); // Older binaries retain media-query and app text-size behavior.
  const viewport = window.visualViewport;
  const resize = () => {
    if (stopped || !viewport) return;
    if (Number.isFinite(viewport.height) && viewport.height > 0) root.style.setProperty('--ios-viewport-height', viewport.height + 'px');
    if (Number.isFinite(viewport.offsetTop) && viewport.offsetTop >= 0) root.style.setProperty('--ios-viewport-top', viewport.offsetTop + 'px');
  };
  viewport?.addEventListener('resize', resize);
  viewport?.addEventListener('scroll', resize);
  resize();
  return () => {
    stopped = true;
    Promise.resolve(listener).then(handle => handle?.remove()).catch(() => {});
    viewport?.removeEventListener('resize', resize);
    viewport?.removeEventListener('scroll', resize);
    root.classList.remove('ios-interface', 'ios-system-appearance', 'ios-reduce-motion', 'ios-reduce-transparency', 'ios-bold-text', 'ios-increase-contrast');
    for (const name of ['--ios-panel-bg', '--ios-field-bg', '--ios-separator', '--ios-text-scale', '--native-top-height', '--ios-viewport-height', '--ios-viewport-top']) root.style.removeProperty(name);
  };
}
