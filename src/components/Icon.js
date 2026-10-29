import React from 'react';

const FILLED = {
  home: <path d="M12.7 2.6a1.1 1.1 0 0 0-1.4 0L3.4 9.2A2 2 0 0 0 2.7 10.7V19a2.5 2.5 0 0 0 2.5 2.5H8.5a1 1 0 0 0 1-1V16a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v4.5a1 1 0 0 0 1 1h3.3a2.5 2.5 0 0 0 2.5-2.5v-8.3a2 2 0 0 0-.7-1.5Z" />,
  wallet: <path fillRule="evenodd" d="M6.5 4.5H17a2.5 2.5 0 0 1 2.5 2.5v.6A2.6 2.6 0 0 1 21.5 10v8.2a2.8 2.8 0 0 1-2.8 2.8H6.5A3.5 3.5 0 0 1 3 17.5V8A3.5 3.5 0 0 1 6.5 4.5Zm9.8 8.6a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />,
  list: <path fillRule="evenodd" d="M8 2.5h8A3.5 3.5 0 0 1 19.5 6v12a3.5 3.5 0 0 1-3.5 3.5H8A3.5 3.5 0 0 1 4.5 18V6A3.5 3.5 0 0 1 8 2.5Zm.6 5.2a.9.9 0 0 0 0 1.8h6.8a.9.9 0 0 0 0-1.8Zm0 4a.9.9 0 0 0 0 1.8h6.8a.9.9 0 0 0 0-1.8Zm0 4a.9.9 0 0 0 0 1.8h3.8a.9.9 0 0 0 0-1.8Z" />,
  user: <><circle cx="12" cy="7.8" r="4.3" /><path d="M3.9 20a8.1 8.1 0 0 1 16.2 0 1 1 0 0 1-1 1H4.9a1 1 0 0 1-1-1Z" /></>,
  bell: <path d="M12 2.6a6.4 6.4 0 0 0-6.4 6.4c0 4.7-1.7 6.3-2.5 7a.9.9 0 0 0 .6 1.5h16.6a.9.9 0 0 0 .6-1.5c-.8-.7-2.5-2.3-2.5-7A6.4 6.4 0 0 0 12 2.6Zm-2.2 16.2a2.3 2.3 0 0 0 4.4 0Z" />,
  gear: null,
};
const P = {
  drop: <path d="M12 3.2c3.6 4.2 6 7.2 6 10.3a6 6 0 0 1-12 0c0-3.1 2.4-6.1 6-10.3Z M9 14.2a3 3 0 0 0 2.4 2.7" />,
  home: <path d="M3 10.6 12 3l9 7.6V19a2 2 0 0 1-2 2h-4v-6H9v6H5a2 2 0 0 1-2-2z" />,
  wallet: <><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18a2 2 0 0 1 2 2v1.5" /><path d="M4 7.5V17a2.5 2.5 0 0 0 2.5 2.5H19a1 1 0 0 0 1-1V10a1 1 0 0 0-1-1H6.5A2.5 2.5 0 0 1 4 6.5" /><circle cx="16.2" cy="14" r="1" /></>,
  list: <><rect x="5" y="3" width="14" height="18" rx="3" /><path d="M8.5 8h7M8.5 12h7M8.5 16h4" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" /></>,
  search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
  bell: <path d="M18 9a6 6 0 0 0-12 0c0 6.5-2.5 8-2.5 8h17S18 15.5 18 9M10.3 20.5a2 2 0 0 0 3.4 0" />,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
  chevron: <path d="m9 18 6-6-6-6" />,
  back: <path d="m15 18-6-6 6-6" />,
  down: <path d="m6 9 6 6 6-6" />,
  eye: <><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" /><circle cx="12" cy="12" r="2.6" /></>,
  arrowUp: <path d="M12 19V5M6 11l6-6 6 6" />,
  arrowDown: <path d="M12 5v14M6 13l6 6 6-6" />,
  arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="m18 6-12 12M6 6l12 12" />,
  check: <path d="m5 12.5 4.2 4.2L19 7" />,
  card: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M3 10h18M7 15h3" /></>,
  bank: <path d="m3 9.5 9-6 9 6M5 10.5v7m4-7v7m6-7v7m4-7v7M3 20.5h18" />,
  send: <path d="M21 3 10.5 13.5M21 3l-6.5 18-4-7.5L3 9.5z" />,
  transfer: <><path d="M17 4l3 3-3 3M20 7H8" /><path d="M7 20l-3-3 3-3M4 17h12" /></>,
  more: <><circle cx="5.5" cy="12" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="18.5" cy="12" r="1.2" /></>,
  spark: <path d="M12 2.5 14.4 9 21 11.5 14.4 14 12 21.5 9.6 14 3 11.5 9.6 9z" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.5 1.5M17.2 17.2l1.5 1.5M5.3 18.7l1.5-1.5M17.2 6.8l1.5-1.5" /></>,
  moon: <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z" />,
  contrast: <><circle cx="12" cy="12" r="8.5" /><path d="M12 3.5v17a8.5 8.5 0 0 0 0-17Z" /></>,
  palette: <><path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.9 1.8-1.8 0-1.4-1.2-1.5-1.2-2.6 0-1 .8-1.6 1.8-1.6H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3Z" /><circle cx="7.5" cy="11" r="1" /><circle cx="10" cy="7.3" r="1" /><circle cx="14.5" cy="7.3" r="1" /></>,
  cloud: <path d="M7 18a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 9.5 4 4 0 0 1 17.5 18Z" />,
  database: <><ellipse cx="12" cy="5.5" rx="7" ry="2.8" /><path d="M5 5.5v13c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8v-13M5 12c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8" /></>,
  refresh: <><path d="M20 12a8 8 0 0 1-14 5.3M4 12a8 8 0 0 1 14-5.3" /><path d="M18.5 3v4h-4M5.5 21v-4h4" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 7.5 8 6 8-6" /></>,
  shield: <><path d="M12 3 4.5 6v5.5c0 4.6 3 8 7.5 9.5 4.5-1.5 7.5-4.9 7.5-9.5V6z" /><path d="m9 12 2.2 2.2L15.5 10" /></>,
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></>,
  trash: <path d="M4 6.5h16M9 6.5V4h6v2.5M6.5 6.5 7.5 20h9l1-13.5M10 10.5v6M14 10.5v6" />,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z" /></>,
  layout: <><rect x="3.5" y="3.5" width="7.5" height="7.5" rx="2" /><rect x="13" y="3.5" width="7.5" height="7.5" rx="2" /><rect x="3.5" y="13" width="7.5" height="7.5" rx="2" /><rect x="13" y="13" width="7.5" height="7.5" rx="2" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M8 3v4M16 3v4M3.5 10h17" /></>,
  coin: <><circle cx="12" cy="12" r="9" /><path d="M9.5 8.5h4a2 2 0 0 1 0 4h-4m0-4v8m0-4h4.5" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1 1-1.1 1.8M12 17h.01" /></>,
  face: <><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" /><path d="M9 10v1M15 10v1M12 10v3h-1M9.5 15.5c1.4 1 3.6 1 5 0" /></>,
  sliders: <path d="M4 7h9M17 7h3M4 17h3M11 17h9M13 4.5v5M7 14.5v5" />,
  chart: <path d="M5 20V12M12 20V5M19 20v-9" />,
  cart: <><path d="M3 4h2.5l2 11h10.5l2-8H7" /><circle cx="9.5" cy="19" r="1.3" /><circle cx="17" cy="19" r="1.3" /></>,
  briefcase: <><rect x="3" y="7.5" width="18" height="12.5" rx="3" /><path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5M3 13h18" /></>,
  gift: <><rect x="3.5" y="9" width="17" height="11" rx="2" /><path d="M12 9v11M3 13h18M12 9c-1-3.5-5-4-5-1.5C7 9 9 9 12 9Zm0 0c1-3.5 5-4 5-1.5 0 1.5-2 1.5-5 1.5Z" /></>,
  doc: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4M9 12h6M9 16h6" /></>,
  message: <path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2.5v-7A7.5 7.5 0 1 1 20 11.5Z" />,
  tag: <><path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3a1.5 1.5 0 0 1 0 2.1l-5.6 5.6a1.5 1.5 0 0 1-2.1 0Z" /><circle cx="8.5" cy="8.5" r="1.2" /></>,
  camera: <><path d="M4 8h3l1.5-2.5h7L17 8h3v11H4z" /><circle cx="12" cy="13" r="3.3" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  pin: <><path d="M12 21s7-6.2 7-11.5a7 7 0 0 0-14 0C5 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  star: <path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 7.8h.01" /></>,
  download: <path d="M12 3.5v12m-5-5 5 5 5-5M4.5 20h15" />,
  logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3.5h6.5A1.5 1.5 0 0 1 20 5v14a1.5 1.5 0 0 1-1.5 1.5H12" /></>,
  edit: <path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17zM14.5 7.5l3 3" />,
  phone: <><rect x="7" y="2.5" width="10" height="19" rx="2.6" /><path d="M11 18.5h2" /></>,
  diamond: <path d="M6.5 4h11l4 5.5L12 21 2.5 9.5z M2.5 9.5h19M9 4l-1 5.5L12 21l4-11.5L15 4" />,
};

export default function Icon({ name, size = 20, strokeWidth = 1.7, filled = false, className = '' }) {
  const solid = filled && FILLED[name];
  return (
    <svg className={`movo-icon ${className}`.trim()} width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'}
      stroke={solid ? 'none' : 'currentColor'} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {solid || P[name] || P.spark}
    </svg>
  );
}

/** NasrinAI mark: a sphere of dots, drawn as vector so it stays sharp at any size. */
const DOTS = (() => {
  const n = 54; const golden = Math.PI * (3 - Math.sqrt(5)); const out = [];
  for (let i = 0; i < n; i += 1) {
    const y = 1 - (i / (n - 1)) * 2; const r = Math.sqrt(1 - y * y); const t = golden * i;
    const x = Math.cos(t) * r; const z = Math.sin(t) * r;
    if (z > -0.1) out.push({ cx: +(12 + x * 9.2).toFixed(2), cy: +(12 + y * 9.2).toFixed(2), r: +(0.8 + ((z + 0.1) / 1.1) * 1.15).toFixed(2), o: +(0.55 + ((z + 0.1) / 1.1) * 0.45).toFixed(2) });
  }
  return out;
})();

export function NasrinMark({ size = 26, className = '' }) {
  return (
    <svg className={`nasrin-mark ${className}`.trim()} width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      {DOTS.map((d, i) => <circle key={i} cx={d.cx} cy={d.cy} r={d.r} opacity={d.o} />)}
    </svg>
  );
}
