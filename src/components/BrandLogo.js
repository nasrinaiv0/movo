import React, { useEffect, useState } from 'react';
import { MovoMark } from './MovoLogo';
import { merchantLogoUrl } from '../lib/merchantFavicons';
import { thirdPartyArtworkAllowed } from '../lib/assetRights';
import offlineLogos from '../lib/offlineBrandLogos.json';

/** The MOVO mark in a neutral app-icon tile: shown wherever a bank, wallet or merchant logo cannot be fetched. */
export function MovoFallback({ className = '' }) {
  return <span className={`brand-fallback ${className}`.trim()} aria-hidden="true"><MovoMark size={24} /></span>;
}

/** A remote brand logo that falls back to the MOVO mark (or a given `fallback`) when there is no URL or it fails. */
export default function BrandLogo({ src, name, fallbackSrcs = [], fallback, className = '', size, onMissing }) {
  const remoteSources = !thirdPartyArtworkAllowed() ? [] : [src, name ? merchantLogoUrl(name, { size: size || 64 }) : '', ...fallbackSrcs];
  const sources = remoteSources.flatMap(value => {
    try {
      const url = new URL(value);
      const domain = url.hostname === 'www.google.com' && url.pathname === '/s2/favicons' ? url.searchParams.get('domain') : '';
      return offlineLogos[domain] ? [offlineLogos[domain], value] : [value];
    } catch { return [value]; }
  }).filter((value, index, all) => Boolean(value) && all.indexOf(value) === index);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => { setAttempt(0); }, [sources.join('|')]);
  const activeSrc = sources[attempt] || '';
  const failed = !activeSrc;
  useEffect(() => { onMissing?.(failed); }, [failed, onMissing]);
  if (failed) return fallback === undefined ? <MovoFallback className={className} /> : fallback;
  return <img className={className} src={activeSrc} alt="" width={size} height={size} loading="lazy" decoding="async" referrerPolicy="no-referrer" draggable="false" onError={() => setAttempt(index => Math.min(index + 1, sources.length))} />;
}
