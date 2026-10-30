import React from 'react';

/* The MOVO mark: a wallet whose V-notched flap forms an "M", in three flat tones (no gradients). */
export const LOGO_TONES = {
  color: { light: '#3dba78', mid: '#10a866', dark: '#0b7a54' },
  mono: { light: '#8a8a8a', mid: '#555559', dark: '#2b2b2e' },
  white: { light: '#ffffff', mid: '#e9e9ec', dark: '#d4d4d8' },
};

export const MARK_VIEWBOX = '0 0 120 104';
/* Wallet body (dark), a V-notched flap whose two halves form the "M" (light | mid), and a clasp (mid + light dot). */
export const MARK_PATHS = {
  body: 'M26 10H94Q116 10 116 32V78Q116 100 94 100H26Q4 100 4 78V32Q4 10 26 10Z',
  flapLeft: 'M4 32Q4 10 26 10H34L60 46V56H10Q4 56 4 50Z',
  flapRight: 'M60 46L86 10H94Q116 10 116 32V50Q116 56 110 56H60Z',
  clasp: 'M92 64H108Q120 64 120 76Q120 88 108 88H92Q80 88 80 76Q80 64 92 64Z',
};

export function MovoMark({ size = 40, tone = 'color', className = '', title }) {
  const t = LOGO_TONES[tone] || LOGO_TONES.color;
  return <svg className={`movo-mark ${className}`.trim()} width={size} height={Math.round(size * 104 / 120)} viewBox={MARK_VIEWBOX} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
    <path className="mm-dark" d={MARK_PATHS.body} fill={t.dark} />
    <path className="mm-light" d={MARK_PATHS.flapLeft} fill={t.light} />
    <path className="mm-mid" d={MARK_PATHS.flapRight} fill={t.mid} />
    <path className="mm-mid" d={MARK_PATHS.clasp} fill={t.mid} />
    <circle className="mm-light" cx="94" cy="76" r="5" fill={t.light} />
  </svg>;
}
