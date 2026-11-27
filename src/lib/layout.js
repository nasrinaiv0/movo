import { useEffect, useState } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';

const MovoWindow = registerPlugin('MovoWindow');

/*
 * Pick navigation from usable window width. Separating folds keep the existing app mounted in one safe pane;
 * continuous displays retain the full responsive workspace. Device names never determine the layout.
 */
export const BREAKPOINTS = { tablet: 768, desktop: 1100 };

/** Only geometry crosses this bridge. Never persist device posture in account preferences. */
export function panesFromNative(value, width, height) {
  if (!value || !Number.isFinite(value.width) || !Number.isFinite(value.height)
      || value.width <= 0 || value.height <= 0 || !Array.isArray(value.folds)) return [];
  const sx = width / value.width, sy = height / value.height;
  let panes = [{ x: 0, y: 0, width, height }];
  for (const fold of value.folds.slice(0, 2)) {
    if (fold?.separating !== true || !['left', 'top', 'right', 'bottom'].every(key => Number.isFinite(fold[key]))) continue;
    const left = fold.left * sx, right = fold.right * sx, top = fold.top * sy, bottom = fold.bottom * sy;
    if (left < 0 || top < 0 || right < left || bottom < top || right > width || bottom > height) continue;
    panes = panes.flatMap(pane => {
      if (top <= pane.y + 1 && bottom >= pane.y + pane.height - 1 && left > pane.x && right < pane.x + pane.width) {
        return [{ ...pane, width: left - pane.x }, { ...pane, x: right, width: pane.x + pane.width - right }];
      }
      if (left <= pane.x + 1 && right >= pane.x + pane.width - 1 && top > pane.y && bottom < pane.y + pane.height) {
        return [{ ...pane, height: top - pane.y }, { ...pane, y: bottom, height: pane.y + pane.height - bottom }];
      }
      return [pane];
    });
  }
  return panes.length > 1 ? panes : [];
}

export function preferredPane(panes, width, height, rtl = false) {
  if (!Array.isArray(panes) || panes.length < 2 || panes.length > 4) return null;
  const valid = panes.every(p => ['x', 'y', 'width', 'height'].every(key => Number.isFinite(p?.[key]))
    && p.width > 0 && p.height > 0 && p.x >= 0 && p.y >= 0 && p.x + p.width <= width + 1 && p.y + p.height <= height + 1);
  if (!valid) return null;
  if (panes.some((a, i) => panes.slice(i + 1).some(b => Math.min(a.x + a.width, b.x + b.width) > Math.max(a.x, b.x)
      && Math.min(a.y + a.height, b.y + b.height) > Math.max(a.y, b.y)))) return null;
  // Prefer the largest usable pane; equal panes follow reading order. Zero-width creases are valid boundaries.
  return [...panes].sort((a, b) => b.width * b.height - a.width * a.height || a.y - b.y || (rtl ? b.x - a.x : a.x - b.x))[0];
}

function browserPanes() {
  try {
    const segments = window.getWindowSegments?.() || window.viewport?.segments || window.visualViewport?.segments;
    if (segments) return Array.from(segments, p => ({ x: p.left ?? p.x, y: p.top ?? p.y, width: p.width, height: p.height }));
    // Some WebViews expose CSS segments without the JavaScript segments API.
    if (!window.matchMedia('(horizontal-viewport-segments: 2)').matches && !window.matchMedia('(vertical-viewport-segments: 2)').matches) return [];
    const horizontal = window.matchMedia('(horizontal-viewport-segments: 2)').matches;
    return [0, 1].map(index => {
      const probe = document.createElement('i');
      const at = horizontal ? `${index} 0` : `0 ${index}`;
      probe.style.cssText = `position:fixed;visibility:hidden;pointer-events:none;left:env(viewport-segment-left ${at},0px);top:env(viewport-segment-top ${at},0px);width:env(viewport-segment-width ${at},0px);height:env(viewport-segment-height ${at},0px)`;
      document.documentElement.appendChild(probe);
      const box = probe.getBoundingClientRect(); probe.remove();
      return { x: box.x, y: box.y, width: box.width, height: box.height };
    });
  } catch { return []; }
}

const read = (nativeGeometry = null) => {
  if (typeof window === 'undefined' || !window.matchMedia) return { mode: 'phone', dual: false };
  const mq = (q) => { try { return window.matchMedia(q).matches; } catch { return false; } };
  const width = document.documentElement.clientWidth || window.innerWidth;
  const height = window.innerHeight;
  const nativePanes = panesFromNative(nativeGeometry, width, height);
  const pane = preferredPane(nativePanes.length ? nativePanes : browserPanes(), width, height, document.documentElement.dir === 'rtl');
  const dual = !!pane || mq('(horizontal-viewport-segments: 2)') || mq('(vertical-viewport-segments: 2)');
  const wideDual = mq('(horizontal-viewport-segments: 2)');
  const mode = pane ? (pane.width >= BREAKPOINTS.desktop ? 'desktop' : pane.width >= BREAKPOINTS.tablet ? 'tablet' : 'phone')
    : mq(`(min-width: ${BREAKPOINTS.desktop}px)`) ? 'desktop' : (mq(`(min-width: ${BREAKPOINTS.tablet}px)`) || wideDual) ? 'tablet' : 'phone';
  return { mode, dual, ...(pane ? { pane } : {}) };
};

export function useLayout() {
  const [layout, setLayout] = useState(read);
  useEffect(() => {
    let frame = 0, stopped = false, nativeGeometry = null, generation = 0, listener;
    const update = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => {
      if (!stopped) setLayout(cur => { const next = read(nativeGeometry); return JSON.stringify(next) === JSON.stringify(cur) ? cur : next; });
    }); };
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    window.visualViewport?.addEventListener('resize', update);
    const direction = new MutationObserver(update);
    direction.observe(document.documentElement, { attributes: true, attributeFilter: ['dir'] });
    const queries = ['(horizontal-viewport-segments: 2)', '(vertical-viewport-segments: 2)', `(min-width: ${BREAKPOINTS.tablet}px)`, `(min-width: ${BREAKPOINTS.desktop}px)`].map(q => window.matchMedia?.(q));
    queries.forEach(q => q?.addEventListener?.('change', update));
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
      const receive = value => { if (!stopped) { nativeGeometry = value; generation++; update(); } };
      listener = MovoWindow.addListener('windowLayoutChanged', receive);
      Promise.resolve(listener).catch(() => {}); // Older installed binaries retain the responsive browser fallback.
      MovoWindow.getWindowLayout().then(value => { if (!stopped && generation === 0) receive(value); }).catch(() => {});
    }
    update();
    return () => {
      stopped = true; cancelAnimationFrame(frame);
      direction.disconnect();
      window.removeEventListener('resize', update); window.removeEventListener('orientationchange', update);
      window.visualViewport?.removeEventListener('resize', update);
      queries.forEach(q => q?.removeEventListener?.('change', update));
      Promise.resolve(listener).then(handle => handle?.remove()).catch(() => {});
    };
  }, []);
  return layout;
}
