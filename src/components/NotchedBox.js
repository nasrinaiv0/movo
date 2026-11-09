import React, { useLayoutEffect, useRef, useState } from 'react';
import { notchMask } from '../lib/notch';

const GAP = 6;

/**
 * A box with a smooth cut in its top-right corner holding `corner` (e.g. the month pill).
 * The cut is a CSS mask sized from the live box and pill, so it follows any width, language or font size.
 */
export default function NotchedBox({ className = '', label, corner, children }) {
  const box = useRef(null); const slot = useRef(null);
  const [mask, setMask] = useState(''); const [notchWidth, setNotchWidth] = useState(0);
  useLayoutEffect(() => {
    const el = box.current; const pill = slot.current;
    if (!el || !pill) return undefined;
    const update = () => {
      const w = el.offsetWidth; const h = el.offsetHeight; const pw = pill.offsetWidth; const ph = pill.offsetHeight;
      if (!w || !h || !pw || !ph) return;
      const R = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 22;
      setMask(notchMask(w, h, pw + GAP, ph + GAP, { R, f: 14, rn: ph / 2 + GAP })); setNotchWidth(pw + GAP);
    };
    update();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(update); ro.observe(el); ro.observe(pill);
    return () => ro.disconnect();
  }, []);
  // --notch-w lets the box's own content (a label on the first row) stop short of the cut.
  return <div className={`notched-box${mask ? ' is-cut' : ''}`} style={notchWidth ? { '--notch-w': `${notchWidth}px` } : undefined}>
    <section ref={box} className={className} aria-label={label} style={mask ? { WebkitMaskImage: mask, maskImage: mask } : undefined}>{children}</section>
    <div ref={slot} className="notch-slot">{corner}</div>
  </div>;
}
