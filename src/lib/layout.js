import { useEffect, useState } from 'react';

/*
 * Picks the interface for the current screen: 'phone' (bottom dock), 'tablet' (side rail, two-column content)
 * or 'desktop' (labelled sidebar, wide two-column dashboard). `dual` is true on dual-screen and foldable devices
 * that report two viewport segments, so content can split along the hinge.
 */
export const BREAKPOINTS = { tablet: 768, desktop: 1100 };

const read = () => {
  if (typeof window === 'undefined' || !window.matchMedia) return { mode: 'phone', dual: false };
  const mq = (q) => { try { return window.matchMedia(q).matches; } catch { return false; } };
  const dual = mq('(horizontal-viewport-segments: 2)') || mq('(vertical-viewport-segments: 2)');
  const wideDual = mq('(horizontal-viewport-segments: 2)');
  const mode = mq(`(min-width: ${BREAKPOINTS.desktop}px)`) ? 'desktop' : (mq(`(min-width: ${BREAKPOINTS.tablet}px)`) || wideDual) ? 'tablet' : 'phone';
  return { mode, dual };
};

export function useLayout() {
  const [layout, setLayout] = useState(read);
  useEffect(() => {
    let frame = 0;
    const update = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => setLayout(cur => { const next = read(); return next.mode === cur.mode && next.dual === cur.dual ? cur : next; })); };
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', update); window.removeEventListener('orientationchange', update); };
  }, []);
  return layout;
}
