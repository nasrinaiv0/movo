import React, { useId } from 'react';

/* EMV chip finishes: [id, name, base, groove, highlight, shade]. Older saved ids map to the nearest finish. */
export const CHIPS = [
  ['gold', 'Gold', '#DDB157', '#7A5617', '#FFF0BF', '#A9782A'],
  ['silver', 'Silver', '#C3C9D1', '#5A626D', '#F4F6F9', '#838B96'],
  ['platinum', 'Platinum', '#E8E4EC', '#76707F', '#FFFFFF', '#B3ACBA'],
];
const LEGACY = { bronze: 'gold', black: 'silver', gray: 'silver', white: 'platinum' };
export const chipColors = (id) => CHIPS.find(c => c[0] === (LEGACY[id] || id)) || CHIPS[0];

/* Contact pads after a real EMV module: a left column of four, a large centre pad, a right column and a split
   bottom row. Each groove is drawn twice (dark cut + light edge) so it reads as bevelled metal. */
const GROOVES = [
  'M30 2 V60', 'M64 2 V60', 'M2 60 H98', 'M50 60 V74',
  'M2 18 H30', 'M2 32 H30', 'M2 46 H30',
  'M64 18 H98', 'M46 18 H64', 'M46 2 V18', 'M64 38 H98',
];

/**
 * EMV chip: no outline, metallic gradient, soft inner shadow, bevelled pad grooves and a slow shine that sweeps
 * across every few seconds (CSS; off for reduced motion).
 */
export function EmvChip({ finish = 'gold', className = '' }) {
  const [, , fill, line, light, shade] = chipColors(finish);
  const raw = useId(); const u = `c${raw.replace(/[^a-z0-9]/gi, '')}`;
  return <svg className={`emv-chip ${className}`.trim()} viewBox="0 0 100 76" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={`${u}m`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={light} /><stop offset=".42" stopColor={fill} /><stop offset=".7" stopColor={fill} /><stop offset="1" stopColor={shade} /></linearGradient>
      <linearGradient id={`${u}g`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#fff" stopOpacity=".85" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
      <radialGradient id={`${u}s`} cx=".28" cy=".18" r=".7"><stop offset="0" stopColor="#fff" stopOpacity=".55" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
      <clipPath id={`${u}c`}><rect x="2" y="2" width="96" height="72" rx="13" /></clipPath>
      <filter id={`${u}i`} x="-10%" y="-10%" width="120%" height="120%">
        <feOffset dx="0" dy="1.6" /><feGaussianBlur stdDeviation="2" result="o" />
        <feComposite operator="out" in="SourceGraphic" in2="o" result="inv" />
        <feFlood floodColor="#000" floodOpacity=".35" /><feComposite operator="in" in2="inv" result="sh" />
        <feComposite operator="over" in="sh" in2="SourceGraphic" />
      </filter>
    </defs>
    <rect x="2" y="2" width="96" height="72" rx="13" fill={`url(#${u}m)`} filter={`url(#${u}i)`} />
    <g clipPath={`url(#${u}c)`} fill="none" strokeLinecap="round">
      <g stroke="#fff" strokeOpacity=".55" strokeWidth="1" transform="translate(.7 .7)">{GROOVES.map(d => <path key={d} d={d} />)}</g>
      <g stroke={line} strokeOpacity=".6" strokeWidth="1.1">{GROOVES.map(d => <path key={d} d={d} />)}</g>
      <rect x="2" y="2" width="96" height="72" fill={`url(#${u}s)`} stroke="none" />
      <rect className="chip-shine" x="-60" y="-20" width="34" height="120" fill={`url(#${u}g)`} stroke="none" transform="rotate(20 50 38)" />
    </g>
  </svg>;
}

/** Contactless (RFID / NFC) payment symbol. */
export function Contactless({ className = '' }) {
  return <svg className={`contactless ${className}`.trim()} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" focusable="false">
    <path d="M6.5 9a4.5 4.5 0 0 1 0 6" /><path d="M10 6.5a8.5 8.5 0 0 1 0 11" /><path d="M13.5 4a12.5 12.5 0 0 1 0 16" /><path d="M17 1.8a16 16 0 0 1 0 20.4" />
  </svg>;
}
