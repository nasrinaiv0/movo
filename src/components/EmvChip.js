import React, { useId } from 'react';

/* EMV chip finishes: [id, name, base, groove, highlight, shade]. Older saved ids map to the nearest finish. */
export const CHIPS = [
  ['gold', 'Gold', '#EFC659', '#8A6214', '#FFF3C2', '#C08F25'],
  ['silver', 'Silver', '#C9CFD6', '#5A626D', '#F6F8FA', '#8A929D'],
  ['platinum', 'Platinum', '#ECE8F0', '#76707F', '#FFFFFF', '#B6AFBE'],
];
const LEGACY = { bronze: 'gold', black: 'silver', gray: 'silver', white: 'platinum' };
export const chipColors = (id) => CHIPS.find(c => c[0] === (LEGACY[id] || id)) || CHIPS[0];

/* Contact pads as on the owner's reference cards: four pads down each side, a tall centre pad under a small top
   pad, and the centre opening into two curved legs at the bottom edge. Each groove is drawn twice (dark cut + light
   edge) so it reads as bevelled metal. viewBox 100 × 76; the chip body is inset 3 units for the carved recess. */
const GROOVES = [
  'M36 3 V52', 'M64 3 V52',
  'M3 20 H36', 'M3 38 H36', 'M3 55 H34',
  'M64 20 H97', 'M64 38 H97', 'M66 55 H97',
  'M36 20 H64',
  'M36 52 C37.5 60 39.5 67 41 73', 'M64 52 C62.5 60 60.5 67 59 73',
];

/**
 * EMV chip set into the card: a carved recess (dark rim top-left, light rim bottom-right, inner shadow under the lip)
 * holding a polished metal module with bevelled pad grooves and a faint sheen that drifts across now and then
 * (CSS; off for reduced motion). No outline and no outward shadow, so it reads as cut into the card, not on it.
 */
export function EmvChip({ finish = 'gold', className = '' }) {
  const [, , fill, line, light, shade] = chipColors(finish);
  const raw = useId(); const u = `c${raw.replace(/[^a-z0-9]/gi, '')}`;
  return <svg className={`emv-chip ${className}`.trim()} viewBox="0 0 100 76" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={`${u}m`} x1="0" y1="0" x2="1" y2=".7"><stop offset="0" stopColor={light} /><stop offset=".2" stopColor={fill} /><stop offset=".42" stopColor={shade} /><stop offset=".58" stopColor={fill} /><stop offset=".74" stopColor={light} stopOpacity=".95" /><stop offset=".88" stopColor={fill} /><stop offset="1" stopColor={shade} /></linearGradient>
      <linearGradient id={`${u}r`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#000" stopOpacity=".55" /><stop offset=".45" stopColor="#000" stopOpacity=".18" /><stop offset=".6" stopColor="#fff" stopOpacity=".12" /><stop offset="1" stopColor="#fff" stopOpacity=".6" /></linearGradient>
      <linearGradient id={`${u}g`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#fff" stopOpacity=".32" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
      <radialGradient id={`${u}s`} cx=".28" cy=".18" r=".75"><stop offset="0" stopColor="#fff" stopOpacity=".28" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
      <pattern id={`${u}b`} width="100" height="1.6" patternUnits="userSpaceOnUse"><rect width="100" height=".55" fill="#fff" fillOpacity=".08" /><rect y=".8" width="100" height=".45" fill="#000" fillOpacity=".06" /></pattern>
      <clipPath id={`${u}c`}><rect x="3" y="3" width="94" height="70" rx="12" /></clipPath>
      <filter id={`${u}i`} x="-10%" y="-10%" width="120%" height="120%">
        <feOffset dx="1" dy="2.4" /><feGaussianBlur stdDeviation="2.2" result="o" />
        <feComposite operator="out" in="SourceGraphic" in2="o" result="inv" />
        <feFlood floodColor="#000" floodOpacity=".5" /><feComposite operator="in" in2="inv" result="sh" />
        <feComposite operator="over" in="sh" in2="SourceGraphic" />
      </filter>
    </defs>
    {/* the recess cut into the card */}
    <rect x=".8" y=".8" width="98.4" height="74.4" rx="14" fill="#000" fillOpacity=".22" />
    <rect x=".8" y=".8" width="98.4" height="74.4" rx="14" fill="none" stroke={`url(#${u}r)`} strokeWidth="1.6" />
    {/* the metal module, seated slightly below the surface */}
    <rect x="3" y="3" width="94" height="70" rx="12" fill={`url(#${u}m)`} filter={`url(#${u}i)`} />
    <g clipPath={`url(#${u}c)`} fill="none" strokeLinecap="round">
      <rect x="3" y="3" width="94" height="70" fill={`url(#${u}b)`} stroke="none" />
      <g stroke="#fff" strokeOpacity=".5" strokeWidth=".9" transform="translate(.6 .7)">{GROOVES.map(d => <path key={d} d={d} />)}</g>
      <g stroke={line} strokeOpacity=".8" strokeWidth="1.25">{GROOVES.map(d => <path key={d} d={d} />)}</g>
      <rect x="3" y="3" width="94" height="70" fill={`url(#${u}s)`} stroke="none" />
      <rect className="chip-shine" x="-60" y="-20" width="34" height="120" fill={`url(#${u}g)`} stroke="none" transform="rotate(20 50 38)" />
      {/* lip shadow along the top edge of the recess */}
      <rect x="3" y="3" width="94" height="70" rx="12" fill="none" stroke="#000" strokeOpacity=".28" strokeWidth="2.2" transform="translate(.4 .8)" />
    </g>
  </svg>;
}

/** Contactless (RFID / NFC) payment symbol. */
export function Contactless({ className = '' }) {
  return <svg className={`contactless ${className}`.trim()} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" focusable="false">
    <path d="M6.5 9a4.5 4.5 0 0 1 0 6" /><path d="M10 6.5a8.5 8.5 0 0 1 0 11" /><path d="M13.5 4a12.5 12.5 0 0 1 0 16" /><path d="M17 1.8a16 16 0 0 1 0 20.4" />
  </svg>;
}
