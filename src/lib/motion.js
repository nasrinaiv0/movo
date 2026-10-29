import { useEffect, useRef, useState } from 'react';

/** Motion is skipped in tests and for people who ask their device to reduce it. */
export function canAnimate() {
  if (typeof window === 'undefined' || process.env.NODE_ENV === 'test') return false;
  try { return !window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return true; }
}

/** Eases a number toward `target` (ease-out quart). First paint counts up from zero. */
export function useCountUp(target, duration = 950) {
  const animate = canAnimate();
  const [value, setValue] = useState(animate ? 0 : target);
  const from = useRef(animate ? 0 : target);
  useEffect(() => {
    if (!canAnimate()) { setValue(target); from.current = target; return undefined; }
    const start = performance.now(); const origin = from.current; let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration); const eased = 1 - (1 - t) ** 4;
      const next = origin + (target - origin) * eased; from.current = next; setValue(next);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

/* Where the last tap landed, so an appearance change can fill in from that point. */
let origin = null;
if (typeof document !== 'undefined') {
  document.addEventListener('pointerdown', (e) => { origin = { x: e.clientX, y: e.clientY, t: Date.now() }; }, { capture: true, passive: true });
}
function revealOrigin() {
  if (origin && Date.now() - origin.t < 1500) return origin;
  const el = typeof document !== 'undefined' ? document.activeElement : null;
  const r = el && el !== document.body ? el.getBoundingClientRect() : null;
  return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}

/**
 * Runs `update` so the new appearance fills in as a circle growing from the tap point.
 * Updates queued in the same tick share one reveal. Falls back to an instant change.
 */
let queue = null;
export function revealChange(update, flush) {
  if (queue) { queue.push(update); return; }
  if (!canAnimate() || typeof document.startViewTransition !== 'function') { update(); return; }
  queue = [update];
  const { x, y } = revealOrigin();
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  const root = document.documentElement;
  root.classList.add('appearance-reveal');
  let transition;
  try {
    transition = document.startViewTransition(() => { const pending = queue; queue = null; flush(() => pending.forEach(fn => fn())); });
  } catch {
    const pending = queue; queue = null; root.classList.remove('appearance-reveal'); pending.forEach(fn => fn()); return;
  }
  transition.ready.then(() => root.animate(
    { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
    { duration: 620, easing: 'cubic-bezier(.22,1,.36,1)', pseudoElement: '::view-transition-new(root)' }
  )).catch(() => {});
  transition.finished.finally(() => root.classList.remove('appearance-reveal'));
}
