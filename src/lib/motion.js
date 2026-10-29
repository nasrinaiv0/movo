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
