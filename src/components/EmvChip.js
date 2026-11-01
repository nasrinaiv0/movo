import React, { useId } from 'react';

/* EMV chip finishes: [id, name, base, contact line, highlight, shade]. */
export const CHIPS = [
  ['gold', 'Gold', '#E2B84E', '#9A6F12', '#FFF0B8', '#A5761C'], ['silver', 'Silver', '#C9CED5', '#6B737D', '#FAFBFC', '#858D97'],
  ['bronze', 'Bronze', '#C68A4E', '#6E4218', '#F4CC9E', '#8A5524'], ['black', 'Black', '#24272C', '#5F6670', '#5A616B', '#0E1013'],
  ['white', 'White', '#F4F5F7', '#9AA1AA', '#FFFFFF', '#C9CDD3'], ['gray', 'Light gray', '#DDE0E4', '#7A828C', '#FFFFFF', '#AEB4BB'],
];
export const chipColors = (id) => CHIPS.find(c => c[0] === id) || CHIPS[0];

/**
 * EMV contact chip, drawn as vector so it stays crisp on any card size: no outline, a metallic gradient,
 * a soft inner shadow and a specular highlight. Contact pads are fine recessed lines.
 */
export function EmvChip({ finish = 'gold', className = '' }) {
  const [, , fill, line, light, shade] = chipColors(finish);
  const raw = useId(); const u = `c${raw.replace(/[^a-z0-9]/gi, '')}`;
  return <svg className={`emv-chip ${className}`.trim()} viewBox="0 0 100 76" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={`${u}m`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={light} /><stop offset=".45" stopColor={fill} /><stop offset="1" stopColor={shade} /></linearGradient>
      <radialGradient id={`${u}s`} cx=".3" cy=".22" r=".6"><stop offset="0" stopColor="#fff" stopOpacity=".75" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
      <filter id={`${u}i`} x="-10%" y="-10%" width="120%" height="120%">
        <feOffset dx="0" dy="2.2" /><feGaussianBlur stdDeviation="2.4" result="o" />
        <feComposite operator="out" in="SourceGraphic" in2="o" result="inv" />
        <feFlood floodColor="#000" floodOpacity=".42" /><feComposite operator="in" in2="inv" result="sh" />
        <feComposite operator="over" in="sh" in2="SourceGraphic" />
      </filter>
    </defs>
    <rect x="2" y="2" width="96" height="72" rx="15" fill={`url(#${u}m)`} filter={`url(#${u}i)`} />
    <g fill="none" stroke={line} strokeOpacity=".55" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M38 2 L48 14 L62 2 M48 14 V30" />
      <path d="M36 74 L48 62 L62 74 M48 62 V48" />
      <path d="M2 26 H34 V50 H2" />
      <path d="M98 26 H64 V50 H98" />
      <path d="M34 38 H40 V30 H58 V48 H40 V44" />
    </g>
    <rect x="2" y="2" width="96" height="72" rx="15" fill={`url(#${u}s)`} />
  </svg>;
}

/** Contactless (RFID / NFC) payment symbol. */
export function Contactless({ className = '' }) {
  return <svg className={`contactless ${className}`.trim()} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" focusable="false">
    <path d="M6.5 9a4.5 4.5 0 0 1 0 6" /><path d="M10 6.5a8.5 8.5 0 0 1 0 11" /><path d="M13.5 4a12.5 12.5 0 0 1 0 16" /><path d="M17 1.8a16 16 0 0 1 0 20.4" />
  </svg>;
}
