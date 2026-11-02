import React, { useId } from 'react';
import chipImage from '../assets/emv-chip-gold.png';

/* EMV chip finishes: [id, name, base, groove, highlight, shade]. Older saved ids map to the nearest finish. */
export const CHIPS = [
  ['gold', 'Gold', '#EFC659', '#8A6214', '#FFF3C2', '#C08F25'],
  ['silver', 'Silver', '#C9CFD6', '#5A626D', '#F6F8FA', '#8A929D'],
  ['platinum', 'Platinum', '#ECE8F0', '#76707F', '#FFFFFF', '#B6AFBE'],
];
const LEGACY = { bronze: 'gold', black: 'silver', gray: 'silver', white: 'platinum' };
export const chipColors = (id) => CHIPS.find(c => c[0] === (LEGACY[id] || id)) || CHIPS[0];

/* The chip module is the owner's actual chip image (src/assets/emv-chip-gold.png, 248 × 193, cut out with rounded
   corners). Silver and platinum finishes show the same chip desaturated. */
const MODULE = { x: 4.9, y: 2.9, w: 90.2, h: 70.2, r: 10.6 };

/**
 * EMV chip set into the card: a carved recess (dark rim top-left, light rim bottom-right, a lip shadow) holding the
 * owner's chip image, with a faint sheen that drifts across now and then (CSS; off for reduced motion). No outline and
 * no outward shadow, so it reads as cut into the card.
 */
export function EmvChip({ finish = 'gold', className = '' }) {
  const id = LEGACY[finish] || finish;
  const raw = useId(); const u = `c${raw.replace(/[^a-z0-9]/gi, '')}`;
  const { x, y, w, h, r } = MODULE;
  return <svg className={`emv-chip ${className}`.trim()} viewBox="0 0 100 76" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={`${u}r`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#000" stopOpacity=".55" /><stop offset=".45" stopColor="#000" stopOpacity=".18" /><stop offset=".6" stopColor="#fff" stopOpacity=".12" /><stop offset="1" stopColor="#fff" stopOpacity=".6" /></linearGradient>
      <linearGradient id={`${u}g`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#fff" stopOpacity=".3" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
      <clipPath id={`${u}c`}><rect x={x} y={y} width={w} height={h} rx={r} /></clipPath>
      {id !== 'gold' && <filter id={`${u}f`}><feColorMatrix type="saturate" values="0" /><feComponentTransfer><feFuncR type="linear" slope={id === 'platinum' ? 1.12 : 1.02} intercept={id === 'platinum' ? .08 : .02} /><feFuncG type="linear" slope={id === 'platinum' ? 1.1 : 1.02} intercept={id === 'platinum' ? .08 : .02} /><feFuncB type="linear" slope={id === 'platinum' ? 1.16 : 1.08} intercept={id === 'platinum' ? .1 : .04} /></feComponentTransfer></filter>}
    </defs>
    {/* the recess cut into the card */}
    <rect x={x - 2.2} y={y - 2.1} width={w + 4.4} height={h + 4.2} rx={r + 2} fill="#000" fillOpacity=".22" />
    <rect x={x - 2.2} y={y - 2.1} width={w + 4.4} height={h + 4.2} rx={r + 2} fill="none" stroke={`url(#${u}r)`} strokeWidth="1.6" />
    {/* the chip itself, seated slightly below the surface */}
    <g clipPath={`url(#${u}c)`}>
      <image href={chipImage} x={x} y={y} width={w} height={h} preserveAspectRatio="none" filter={id !== 'gold' ? `url(#${u}f)` : undefined} />
      <rect className="chip-shine" x="-60" y="-20" width="34" height="120" fill={`url(#${u}g)`} transform="rotate(20 50 38)" />
      <rect x={x} y={y} width={w} height={h} rx={r} fill="none" stroke="#000" strokeOpacity=".3" strokeWidth="2.4" transform="translate(.5 .9)" />
    </g>
  </svg>;
}

/** Contactless (RFID / NFC) payment symbol, drawn after the owner's chip image: a short thick arc and three wider ones,
    heavy round-capped strokes. Takes the text colour so it reads on any card. */
export function Contactless({ className = '' }) {
  return <svg className={`contactless ${className}`.trim()} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true" focusable="false">
    <path d="M5 10 A2.4 2.4 0 0 1 5 14" /><path d="M8.4 7.4 A5.6 5.6 0 0 1 8.4 16.6" /><path d="M12.2 4.6 A9 9 0 0 1 12.2 19.4" /><path d="M16 1.8 A12.4 12.4 0 0 1 16 22.2" />
  </svg>;
}
