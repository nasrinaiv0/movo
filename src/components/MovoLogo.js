import React from 'react';

/* The MOVO "M": two rounded legs and a folded ribbon, in three flat tones (no gradients). */
export const LOGO_TONES = {
  color: { light: '#3dba78', mid: '#10a866', dark: '#0b7a54' },
  mono: { light: '#8a8a8a', mid: '#555559', dark: '#2b2b2e' },
  white: { light: '#ffffff', mid: '#e9e9ec', dark: '#d4d4d8' },
};

export function MovoMark({ size = 40, tone = 'color', className = '', title }) {
  const t = LOGO_TONES[tone] || LOGO_TONES.color;
  const id = React.useId().replace(/:/g, '');
  return <svg className={`movo-mark ${className}`.trim()} width={size} height={size * 0.78} viewBox="0 0 120 94" role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
    <defs>
      <clipPath id={`l${id}`}><rect x="0" y="0" width="60" height="94" /></clipPath>
      <clipPath id={`r${id}`}><rect x="60" y="0" width="60" height="94" /></clipPath>
    </defs>
    <rect className="mm-dark" x="0" y="0" width="31" height="94" rx="15.5" fill={t.dark} />
    <rect className="mm-dark" x="89" y="0" width="31" height="94" rx="15.5" fill={t.dark} />
    <line className="mm-light" x1="15.5" y1="15.5" x2="60" y2="60" stroke={t.light} strokeWidth="31" strokeLinecap="round" clipPath={`url(#l${id})`} />
    <line className="mm-mid" x1="104.5" y1="15.5" x2="60" y2="60" stroke={t.mid} strokeWidth="31" strokeLinecap="round" clipPath={`url(#r${id})`} />
  </svg>;
}
