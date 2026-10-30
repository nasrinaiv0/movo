import React from 'react';

/* Flat EMV chip finishes (fill, contact lines) — no gradients. */
export const CHIPS = [
  ['gold', 'Gold', '#E5BE4F', '#6E5410'], ['silver', 'Silver', '#C7CBD1', '#3F4650'], ['bronze', 'Bronze', '#C68A4E', '#5E3714'],
  ['black', 'Black', '#1E2126', '#8C949E'], ['white', 'White', '#FFFFFF', '#1E2126'], ['gray', 'Light gray', '#E3E5E8', '#3F4650'],
];
export const chipColors = (id) => CHIPS.find(c => c[0] === id) || CHIPS[0];

/** EMV contact chip, drawn as vector so it stays crisp on any card size. */
export function EmvChip({ finish = 'gold', className = '' }) {
  const [, , fill, line] = chipColors(finish);
  return <svg className={`emv-chip ${className}`.trim()} viewBox="0 0 100 76" aria-hidden="true" focusable="false">
    <rect x="2" y="2" width="96" height="72" rx="15" fill={fill} stroke={line} strokeWidth="3" />
    <g fill="none" stroke={line} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M38 2 L48 14 L62 2 M48 14 V30" />
      <path d="M36 74 L48 62 L62 74 M48 62 V48" />
      <path d="M2 26 H34 V50 H2" />
      <path d="M98 26 H64 V50 H98" />
      <path d="M34 38 H40 V30 H58 V48 H40 V44" />
    </g>
  </svg>;
}

/** Contactless (RFID / NFC) payment symbol. */
export function Contactless({ className = '' }) {
  return <svg className={`contactless ${className}`.trim()} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" focusable="false">
    <path d="M6.5 9a4.5 4.5 0 0 1 0 6" /><path d="M10 6.5a8.5 8.5 0 0 1 0 11" /><path d="M13.5 4a12.5 12.5 0 0 1 0 16" /><path d="M17 1.8a16 16 0 0 1 0 20.4" />
  </svg>;
}
