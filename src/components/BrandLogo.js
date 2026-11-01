import React, { useEffect, useState } from 'react';

/** A remote brand logo that falls back to `fallback` when there is no URL or the image fails to load. */
export default function BrandLogo({ src, fallback = null, className = '', size }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [src]);
  if (!src || failed) return fallback;
  return <img className={className} src={src} alt="" width={size} height={size} loading="lazy" decoding="async" referrerPolicy="no-referrer" draggable="false" onError={() => setFailed(true)} />;
}
