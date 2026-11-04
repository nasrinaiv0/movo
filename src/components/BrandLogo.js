import React, { useEffect, useState } from 'react';
import { MovoMark } from './MovoLogo';
import { merchantLogoUrl } from '../lib/merchantFavicons';

/** The MOVO mark in a neutral app-icon tile: shown wherever a bank, wallet or merchant logo cannot be fetched. */
export function MovoFallback({ className = '' }) {
  return <span className={`brand-fallback ${className}`.trim()} aria-hidden="true"><MovoMark size={24} /></span>;
}

/** A remote brand logo that falls back to the MOVO mark (or a given `fallback`) when there is no URL or it fails. */
export default function BrandLogo({ src, name, fallbackSrcs = [], fallback, className = '', size, onMissing }) {
  const sources = [src || (name ? merchantLogoUrl(name, { size: size || 64 }) : ''), ...fallbackSrcs].filter((value, index, all) => Boolean(value) && all.indexOf(value) === index);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => { setAttempt(0); }, [sources.join('|')]);
  const activeSrc = sources[attempt] || '';
  const failed = !activeSrc;
  useEffect(() => { onMissing?.(failed); }, [failed, onMissing]);
  if (failed) return fallback === undefined ? <MovoFallback className={className} /> : fallback;
  return <img className={className} src={activeSrc} alt="" width={size} height={size} loading="lazy" decoding="async" referrerPolicy="no-referrer" draggable="false" onError={() => setAttempt(index => Math.min(index + 1, sources.length))} />;
}
