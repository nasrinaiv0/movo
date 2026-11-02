import React, { useEffect, useState } from 'react';
import { MovoMark } from './MovoLogo';

/** The MOVO mark in a neutral app-icon tile: shown wherever a bank, wallet or merchant logo cannot be fetched. */
export function MovoFallback({ className = '' }) {
  return <span className={`brand-fallback ${className}`.trim()} aria-hidden="true"><MovoMark size={24} /></span>;
}

/** A remote brand logo that falls back to the MOVO mark (or a given `fallback`) when there is no URL or it fails. */
export default function BrandLogo({ src, fallback, className = '', size, onMissing }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [src]);
  // Lets a parent (the card face) switch to its MOVO design when there is no logo or it fails to load.
  useEffect(() => { onMissing?.(!src || failed); }, [src, failed, onMissing]);
  if (!src || failed) return fallback === undefined ? <MovoFallback className={className} /> : fallback;
  return <img className={className} src={src} alt="" width={size} height={size} loading="lazy" decoding="async" referrerPolicy="no-referrer" draggable="false" onError={() => setFailed(true)} />;
}
