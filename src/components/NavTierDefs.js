import React, { useEffect, useState } from 'react';
import { canAnimate } from '../lib/motion';

/*
 * Paint for the active bottom-nav icon in the plan colour (owner, 2026-11-11; reworked 2026-11-16: "Do not use stripe
 * style. Make it real mix that glows and has animations"). Each paint is an SVG pattern: a soft base with four colour
 * clouds (radial gradients that fade to nothing), so the colours blend like a holographic foil instead of the bands a
 * multi-stop linear gradient made. The clouds turn slowly around the icon (a 14s loop, no pulsing); with reduced motion
 * they stay still. The glow is a CSS drop-shadow (App.css "Plan-coloured nav icon"). One set per theme for contrast.
 */
export const NAV_TIER_PAINTS = {
  'plat-dark': { base: ['#f4f6f9', '#dfe5ec'], clouds: ['#f6c6dc', '#bdeff5', '#f6e2b2', '#d6ccf6'] },
  'plat-light': { base: ['#5a6774', '#46525f'], clouds: ['#a0708f', '#3c8f9e', '#94804c', '#7067a3'] },
  'gold-dark': { base: ['#f8db8a', '#e9bb55'], clouds: ['#fff0bf', '#d99a2b', '#ffe08f', '#f3c467'] },
  'gold-light': { base: ['#b48424', '#946414'], clouds: ['#d4a443', '#7f5409', '#c7962f', '#e0b65a'] },
};
// Where each cloud sits in the icon's box (0–1), and how far it reaches.
const CLOUDS = [[0.15, 0.2, 0.62], [0.85, 0.3, 0.6], [0.3, 0.88, 0.58], [0.82, 0.85, 0.6]];

function useMotionAllowed() {
  const [allowed, setAllowed] = useState(canAnimate);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    let query;
    try { query = window.matchMedia('(prefers-reduced-motion: reduce)'); } catch { return undefined; }
    const update = () => setAllowed(canAnimate());
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);
  return allowed;
}

export default function NavTierDefs() {
  const animate = useMotionAllowed();
  return <svg className="nav-tier-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs>
    {Object.entries(NAV_TIER_PAINTS).map(([id, { base, clouds }]) => <React.Fragment key={id}>
      <linearGradient id={`movo-nav-${id}-base`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={base[0]} /><stop offset="100%" stopColor={base[1]} />
      </linearGradient>
      {clouds.map((color, i) => <radialGradient key={i} id={`movo-nav-${id}-c${i}`}>
        <stop offset="0%" stopColor={color} stopOpacity=".95" />
        <stop offset="55%" stopColor={color} stopOpacity=".45" />
        <stop offset="100%" stopColor={color} stopOpacity="0" />
      </radialGradient>)}
      <pattern id={`movo-nav-${id}`} className="nav-tier-paint" width="1" height="1" patternContentUnits="objectBoundingBox">
        <rect width="1" height="1" fill={`url(#movo-nav-${id}-base)`} />
        <g>
          {CLOUDS.map(([cx, cy, r], i) => <circle key={i} cx={cx} cy={cy} r={r} fill={`url(#movo-nav-${id}-c${i})`} />)}
          {animate && <animateTransform attributeName="transform" type="rotate" from="0 .5 .5" to="360 .5 .5" dur="14s" repeatCount="indefinite" />}
        </g>
        {/* A soft white sheen that sweeps across, like light moving over foil. */}
        <rect width="1" height="1" fill={`url(#movo-nav-sheen)`} opacity={id.endsWith('dark') ? 0.55 : 0.25}>
          {animate && <animate attributeName="x" values="-1;1;-1" dur="7s" repeatCount="indefinite" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1" />}
        </rect>
      </pattern>
    </React.Fragment>)}
    <linearGradient id="movo-nav-sheen" x1="0" y1="0" x2="1" y2="1">
      <stop offset="30%" stopColor="#fff" stopOpacity="0" />
      <stop offset="50%" stopColor="#fff" stopOpacity=".7" />
      <stop offset="70%" stopColor="#fff" stopOpacity="0" />
    </linearGradient>
  </defs></svg>;
}
