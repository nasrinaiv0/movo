import React, { useId } from 'react';

/* The MOVO mark: a wallet whose V-notched flap forms an "M", in three flat tones (no gradients). */
export const LOGO_TONES = {
  color: { light: '#3dba78', mid: '#10a866', dark: '#0b7a54' },
  mono: { light: '#8a8a8a', mid: '#555559', dark: '#2b2b2e' },
  white: { light: '#ffffff', mid: '#e9e9ec', dark: '#d4d4d8' },
  // Plan and badge tiers (2026-11-09): Free is the green mark, the free month is white, Pro is gold, Pro+ platinum.
  bronze: { light: '#efbd8f', mid: '#cd8a52', dark: '#8f5729' },
  silver: { light: '#f2f4f7', mid: '#bcc4ce', dark: '#7f8996' },
  gold: { light: '#f8dc8c', mid: '#e3b04a', dark: '#a87618' },
  // Platinum (owner, 2026-11-11): a neutral metallic white-silver, not lavender. The flat tones are the fallback; the
  // mark itself is drawn with a brushed-metal sheen (`metal`), the only tone that uses gradients.
  platinum: { light: '#fbfbfa', mid: '#d8dadc', dark: '#8e9397',
    metal: { light: ['#ffffff', '#eceeef', '#fdfdfd'], mid: ['#eef0f1', '#c3c7ca', '#e4e6e8'], dark: ['#b4b9bd', '#7a8085', '#a3a8ac'] } },
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
  const uid = useId().replace(/:/g, '');
  const metal = t.metal;
  const paint = key => (metal ? `url(#mm-${key}-${uid})` : t[key]);
  return <svg className={`movo-mark${metal ? ' is-metal' : ''} ${className}`.trim()} width={size} height={Math.round(size * 104 / 120)} viewBox={MARK_VIEWBOX} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
    {metal && <defs>{['light', 'mid', 'dark'].map(key => <linearGradient key={key} id={`mm-${key}-${uid}`} x1="0" y1="0" x2="1" y2="1">
      {metal[key].map((color, i) => <stop key={i} offset={`${(i / (metal[key].length - 1)) * 100}%`} stopColor={color} />)}
    </linearGradient>)}</defs>}
    <path className="mm-dark" d={MARK_PATHS.body} fill={paint('dark')} data-tone={t.dark} />
    <path className="mm-light" d={MARK_PATHS.flapLeft} fill={paint('light')} data-tone={t.light} />
    <path className="mm-mid" d={MARK_PATHS.flapRight} fill={paint('mid')} data-tone={t.mid} />
    <path className="mm-mid" d={MARK_PATHS.clasp} fill={paint('mid')} data-tone={t.mid} />
    <circle className="mm-light" cx="94" cy="76" r="5" fill={paint('light')} data-tone={t.light} />
  </svg>;
}
