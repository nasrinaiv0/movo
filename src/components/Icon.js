import React from 'react';
import { canAnimate } from '../lib/motion';

const FILLED = {
  home: <path d="M3.6 11.4 10.9 4.5a1.5 1.5 0 0 1 2.2 0l7.3 6.9a1.5 1.5 0 0 1 .5 1.1V19a2.2 2.2 0 0 1-2.2 2.2h-3.2a.9.9 0 0 1-.9-.9v-3.6a2.2 2.2 0 0 0-2.2-2.2h-.0a2.2 2.2 0 0 0-2.2 2.2v3.6a.9.9 0 0 1-.9.9H5.3A2.2 2.2 0 0 1 3.1 19v-6.5a1.5 1.5 0 0 1 .5-1.1Z" />,
  wallet: <path fillRule="evenodd" d="M6.2 5.3 16 3.2a2 2 0 0 1 2.4 2v1.2h.4A3.2 3.2 0 0 1 22 9.6v7.2a3.2 3.2 0 0 1-3.2 3.2H5.2A3.2 3.2 0 0 1 2 16.8V8.9a3.1 3.1 0 0 1 2.4-3.1Zm10.3 8.2a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2Z" />,
  list: <path fillRule="evenodd" d="M8.2 2.6h7.6a4.1 4.1 0 0 1 4.1 4.1v10.6a4.1 4.1 0 0 1-4.1 4.1H8.2a4.1 4.1 0 0 1-4.1-4.1V6.7a4.1 4.1 0 0 1 4.1-4.1Zm.5 5.1a1 1 0 0 0 0 2h6.6a1 1 0 0 0 0-2Zm0 4.1a1 1 0 0 0 0 2h6.6a1 1 0 0 0 0-2Zm0 4.1a1 1 0 0 0 0 2h3.6a1 1 0 0 0 0-2Z" />,
  user: <><circle cx="12" cy="7.6" r="4.4" /><path d="M4 19.6C4 16.5 7.6 14.6 12 14.6s8 1.9 8 5a1.4 1.4 0 0 1-1.4 1.4H5.4A1.4 1.4 0 0 1 4 19.6Z" /></>,
  bell: <path d="M12 2.6a6.4 6.4 0 0 0-6.4 6.4c0 4.7-1.7 6.3-2.5 7a.9.9 0 0 0 .6 1.5h16.6a.9.9 0 0 0 .6-1.5c-.8-.7-2.5-2.3-2.5-7A6.4 6.4 0 0 0 12 2.6Zm-2.2 16.2a2.3 2.3 0 0 0 4.4 0Z" />,
  gear: null,
};
const P = {
  drop: <path d="M12 3.2c3.6 4.2 6 7.2 6 10.3a6 6 0 0 1-12 0c0-3.1 2.4-6.1 6-10.3Z M9 14.2a3 3 0 0 0 2.4 2.7" />,
  home: <path d="M3.6 11.4 10.9 4.5a1.5 1.5 0 0 1 2.2 0l7.3 6.9a1.5 1.5 0 0 1 .5 1.1V19a2.2 2.2 0 0 1-2.2 2.2h-3.2a.9.9 0 0 1-.9-.9v-3.6a2.2 2.2 0 0 0-2.2-2.2 2.2 2.2 0 0 0-2.2 2.2v3.6a.9.9 0 0 1-.9.9H5.3A2.2 2.2 0 0 1 3.1 19v-6.5a1.5 1.5 0 0 1 .5-1.1Z" />,
  wallet: <><path d="M6.2 5.3 16 3.2a2 2 0 0 1 2.4 2v1.2" /><rect x="2.9" y="6.4" width="18.2" height="13.6" rx="3.4" /><circle cx="16.5" cy="13.2" r="1.1" /></>,
  list: <><rect x="4.4" y="2.9" width="15.2" height="18.2" rx="4.2" /><path d="M8.7 8.7h6.6M8.7 12.4h6.6M8.7 16.1h3.6" /></>,
  user: <><circle cx="12" cy="7.8" r="4.2" /><path d="M4.2 19.8c0-2.8 3.5-4.8 7.8-4.8s7.8 2 7.8 4.8" /></>,
  search: <><circle cx="10.6" cy="10.6" r="6.6" /><path d="m15.6 15.6 4.6 4.6" /></>,
  bell: <><path d="M6 10a6 6 0 0 1 12 0c0 4.2 1.2 5.6 2 6.4.5.5.1 1.4-.6 1.4H4.6c-.7 0-1.1-.9-.6-1.4.8-.8 2-2.2 2-6.4Z" /><path d="M9.8 20.4a2.4 2.4 0 0 0 4.4 0" /></>,
  gear: <><circle cx="12" cy="12" r="3.1" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></>,
  chevron: <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />,
  back: <path d="M14.5 5.5 8 12l6.5 6.5" />,
  down: <path d="m5.5 9.5 6.5 6.5 6.5-6.5" />,
  eye: <><path d="M2.6 12c1.9-3.7 5.3-6 9.4-6s7.5 2.3 9.4 6c-1.9 3.7-5.3 6-9.4 6s-7.5-2.3-9.4-6Z" /><circle cx="12" cy="12" r="3" /></>,
  arrowUp: <path d="M12 19.5v-15M6 10.5l6-6 6 6" />,
  arrowDown: <path d="M12 4.5v15M6 13.5l6 6 6-6" />,
  arrow: <path d="M4.5 12h15M13.5 6l6 6-6 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="m17.5 6.5-11 11M6.5 6.5l11 11" />,
  check: <path d="m5 12.8 4.4 4.4L19 7.4" />,
  card: <><rect x="2.8" y="5" width="18.4" height="14" rx="4" /><path d="M2.8 10h18.4M7 15h3" /></>,
  bank: <><path d="m3.5 9.6 7.6-5.1a1.6 1.6 0 0 1 1.8 0l7.6 5.1" /><path d="M6.2 11.5v5.8M10.1 11.5v5.8M13.9 11.5v5.8M17.8 11.5v5.8M3.8 20h16.4" /></>,
  send: <path d="M20.6 3.4 3.8 9.9a.9.9 0 0 0 0 1.7l6.4 2.5 2.5 6.4a.9.9 0 0 0 1.7 0L20.9 4.5a.9.9 0 0 0-.3-1.1ZM10.2 14.1l5.6-5.6" />,
  transfer: <><path d="m16.5 4 3.5 3.5-3.5 3.5M20 7.5H8.5" /><path d="m7.5 20-3.5-3.5L7.5 13M4 16.5h11.5" /></>,
  more: <><circle cx="5.5" cy="12" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="18.5" cy="12" r="1.4" /></>,
  spark: <path d="M12 3c.9 5.4 2.6 7.1 8 8-5.4.9-7.1 2.6-8 8-.9-5.4-2.6-7.1-8-8 5.4-.9 7.1-2.6 8-8Z" />,
  sun: <><circle cx="12" cy="12" r="4.2" /><path d="M12 2.8v2M12 19.2v2M2.8 12h2M19.2 12h2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M5.5 18.5l1.4-1.4M17.1 6.9l1.4-1.4" /></>,
  moon: <path d="M20.2 14.4A8.4 8.4 0 0 1 9.6 3.8a8.4 8.4 0 1 0 10.6 10.6Z" />,
  contrast: <><circle cx="12" cy="12" r="8.8" /><path d="M12 3.2v17.6a8.8 8.8 0 0 0 0-17.6Z" /></>,
  palette: <><path d="M12 3.2a8.8 8.8 0 1 0 0 17.6c1.3 0 1.9-.9 1.9-1.9 0-1.4-1.2-1.6-1.2-2.7 0-1 .8-1.7 1.8-1.7H17a3.9 3.9 0 0 0 3.9-3.9c0-4-3.9-7.4-8.9-7.4Z" /><circle cx="7.6" cy="11" r="1" /><circle cx="10" cy="7.4" r="1" /><circle cx="14.4" cy="7.4" r="1" /></>,
  cloud: <path d="M7.5 18.5a4.5 4.5 0 0 1-.9-8.9 5.8 5.8 0 0 1 11 1.4 3.8 3.8 0 0 1-.6 7.5Z" />,
  database: <><ellipse cx="12" cy="5.8" rx="7.2" ry="2.8" /><path d="M4.8 5.8v12.4c0 1.5 3.2 2.8 7.2 2.8s7.2-1.3 7.2-2.8V5.8M4.8 12c0 1.5 3.2 2.8 7.2 2.8s7.2-1.3 7.2-2.8" /></>,
  refresh: <><path d="M20 12a8 8 0 0 1-13.9 5.4M4 12a8 8 0 0 1 13.9-5.4" /><path d="M18.4 3.2v4.2h-4.2M5.6 20.8v-4.2h4.2" /></>,
  mail: <><rect x="2.8" y="5" width="18.4" height="14" rx="4" /><path d="m4.4 7.8 7.6 5.4 7.6-5.4" /></>,
  shield: <><path d="M12 3.2 5 5.8v5.6c0 4.4 2.8 7.7 7 9.4 4.2-1.7 7-5 7-9.4V5.8Z" /><path d="m9 12 2.2 2.2L15.5 10" /></>,
  lock: <><rect x="4.8" y="10.5" width="14.4" height="10" rx="3.4" /><path d="M8.2 10.5V8a3.8 3.8 0 0 1 7.6 0v2.5" /></>,
  trash: <path d="M4.5 6.8h15M9.5 6.8V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v1.8M6.5 6.8l.8 11.6a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9l.8-11.6M10 11v5M14 11v5" />,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z" /></>,
  layout: <><rect x="3.5" y="3.5" width="7.5" height="7.5" rx="2.6" /><rect x="13" y="3.5" width="7.5" height="7.5" rx="2.6" /><rect x="3.5" y="13" width="7.5" height="7.5" rx="2.6" /><rect x="13" y="13" width="7.5" height="7.5" rx="2.6" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="15.5" rx="4" /><path d="M8 3v3.6M16 3v3.6M3.5 10h17" /></>,
  coin: <><circle cx="12" cy="12" r="9" /><path d="M9.5 8.5h4a2 2 0 0 1 0 4h-4m0-4v8m0-4h4.5" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.6 9.6a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1.1 1-1.1 1.7M12 17h.01" /></>,
  face: <><path d="M4 8.5V7a3 3 0 0 1 3-3h1.5M15.5 4H17a3 3 0 0 1 3 3v1.5M20 15.5V17a3 3 0 0 1-3 3h-1.5M8.5 20H7a3 3 0 0 1-3-3v-1.5" /><path d="M9 10v1M15 10v1M12 10v3h-1M9.5 15.5c1.4 1 3.6 1 5 0" /></>,
  sliders: <><path d="M4 8h5M15 8h5M4 16h9M19 16h1" /><circle cx="12" cy="8" r="2.6" /><circle cx="16" cy="16" r="2.6" /></>,
  chart: <><rect x="4.4" y="11" width="3.6" height="8.6" rx="1.5" /><rect x="10.2" y="4.4" width="3.6" height="15.2" rx="1.5" /><rect x="16" y="8" width="3.6" height="11.6" rx="1.5" /></>,
  cart: <><path d="M3 4.2h2.2a1 1 0 0 1 1 .8l1.6 8.6a1.8 1.8 0 0 0 1.8 1.5h7.2a1.8 1.8 0 0 0 1.8-1.4l1.2-5.3H7" /><circle cx="9.6" cy="19" r="1.4" /><circle cx="17" cy="19" r="1.4" /></>,
  briefcase: <><rect x="3" y="7.5" width="18" height="12.5" rx="3.6" /><path d="M9 7.5V6.2A2.2 2.2 0 0 1 11.2 4h1.6A2.2 2.2 0 0 1 15 6.2v1.3M3 13h18" /></>,
  gift: <><rect x="3.5" y="9" width="17" height="11" rx="3" /><path d="M12 9v11M3 13.2h18M12 9c-1-3.4-5-3.9-5-1.4 0 1.4 2 1.4 5 1.4Zm0 0c1-3.4 5-3.9 5-1.4 0 1.4-2 1.4-5 1.4Z" /></>,
  doc: <><path d="M6.5 3h7.2L18 7.3V18a3 3 0 0 1-3 3H8.5a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z" /><path d="M13.5 3.2V7a.6.6 0 0 0 .6.6H18M9 12.5h6M9 16.2h6" /></>,
  message: <path d="M20.5 11.5a7.5 7.5 0 0 1-7.5 7.5H6.8c-.4 0-.8.2-1 .5L4 21.4a.5.5 0 0 1-.9-.3V11.5a7.5 7.5 0 0 1 7.5-7.5H13a7.5 7.5 0 0 1 7.5 7.5Z" />,
  tag: <><path d="M3.5 12.2V6a2.5 2.5 0 0 1 2.5-2.5h6.2a2 2 0 0 1 1.4.6l7.2 7.2a2 2 0 0 1 0 2.8l-5.6 5.6a2 2 0 0 1-2.8 0l-7.2-7.2a2 2 0 0 1-.6-1.4Z" /><circle cx="8.4" cy="8.4" r="1.3" /></>,
  camera: <><path d="M4.6 8h2.7l1.2-2h7l1.2 2h2.7A1.6 1.6 0 0 1 21 9.6v8A2.4 2.4 0 0 1 18.6 20H5.4A2.4 2.4 0 0 1 3 17.6v-8A1.6 1.6 0 0 1 4.6 8Z" /><circle cx="12" cy="13.2" r="3.4" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.2 2" /></>,
  pin: <><path d="M12 21s7-6.2 7-11.5a7 7 0 0 0-14 0C5 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.6" /></>,
  star: <path d="m12 3.6 2.5 5.2 5.7.8-4.1 4 1 5.7L12 16.6l-5.1 2.7 1-5.7-4.1-4 5.7-.8z" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 7.8h.01" /></>,
  download: <path d="M12 3.8v11.4m-5-5 5 5 5-5M5 20h14" />,
  logout: <><path d="m10 16.5 4.5-4.5L10 7.5M14.5 12H3.5" /><path d="M12.5 3.5h5a2.5 2.5 0 0 1 2.5 2.5v12a2.5 2.5 0 0 1-2.5 2.5h-5" /></>,
  edit: <path d="M4 20h3.6L19 8.6a2.3 2.3 0 0 0-3.2-3.2L4.4 16.8zM14.5 7.2l3.3 3.3" />,
  phone: <><rect x="6.8" y="2.6" width="10.4" height="18.8" rx="3.2" /><path d="M11 18.4h2" /></>,
  mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" /></>,
  speaker: <><path d="M4 9.5h3l4.5-4v13L7 14.5H4z" /><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /></>,
  stop: <rect x="7" y="7" width="10" height="10" rx="2.5" />,
  scan: <><path d="M4 8V6.5A2.5 2.5 0 0 1 6.5 4H8M16 4h1.5A2.5 2.5 0 0 1 20 6.5V8M20 16v1.5a2.5 2.5 0 0 1-2.5 2.5H16M8 20H6.5A2.5 2.5 0 0 1 4 17.5V16M7.5 12h9" /></>,
  grid: <><rect x="4" y="4" width="7" height="7" rx="2" /><rect x="13" y="4" width="7" height="7" rx="2" /><rect x="4" y="13" width="7" height="7" rx="2" /><rect x="13" y="13" width="7" height="7" rx="2" /></>,
  rows: <><rect x="4" y="4.5" width="16" height="6" rx="2" /><rect x="4" y="13.5" width="16" height="6" rx="2" /></>,
  receipt: <><path d="M6 3.5h12v17l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4z" /><path d="M9 8h6M9 11.5h6M9 15h3.5" /></>,
  target: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" /></>,
  calc: <><path d="M5 7h5M7.5 4.5v5M14 7h5M5.5 15.5l4 4M9.5 15.5l-4 4M14 15.5h5M14 19h5" /></>,
  backspace: <><path d="M9 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6-7z" /><path d="m11.5 9.5 5 5M16.5 9.5l-5 5" /></>,
  link: <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>,
  sort: <path d="M7 4.5v15M3.5 16 7 19.5l3.5-3.5M17 19.5v-15M13.5 8 17 4.5 20.5 8" />,
  upload: <path d="M12 15.5V4M7 9l5-5 5 5M5 20h14" />,
  archive: <><rect x="3.5" y="4.5" width="17" height="4.5" rx="1.5" /><path d="M5 9v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9M10 13h4" /></>,
  food: <path d="M7 3v8M4.8 3v4.2a2.2 2.2 0 0 0 4.4 0V3M7 11.4V21M17 3c-2.2 1.3-3 4-3 7.5h3V21" />,
  grip: <><circle cx="9" cy="6" r="1.3" /><circle cx="15" cy="6" r="1.3" /><circle cx="9" cy="12" r="1.3" /><circle cx="15" cy="12" r="1.3" /><circle cx="9" cy="18" r="1.3" /><circle cx="15" cy="18" r="1.3" /></>,
  minus: <path d="M6 12h12" />,
  external: <path d="M14 4.5h5.5V10M19.5 4.5 11 13M18 14v3.5a2 2 0 0 1-2 2H6.5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2H10" />,
  diamond: <path d="M7 4h10l4 5.3a1 1 0 0 1 0 1.3l-8.4 9.8a1 1 0 0 1-1.2 0L2.6 10.6a1 1 0 0 1 0-1.3Z M2.8 9.8h18.4M9 4l-.8 5.8L12 20M15 4l.8 5.8L12 20" />,
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

/** NasrinAI mark: a 3D sphere of dots. Static by default; pass `state` to animate it. */
const SPHERE = (() => {
  const n = 64; const golden = Math.PI * (3 - Math.sqrt(5)); const out = [];
  for (let i = 0; i < n; i += 1) {
    const y = 1 - (i / (n - 1)) * 2; const r = Math.sqrt(1 - y * y); const t = golden * i;
    out.push({ x: Math.cos(t) * r, y, z: Math.sin(t) * r });
  }
  return out;
})();
const TILT = -0.38;
/* Per-state motion targets: spin speed (rad/s), scan band, ripple and contraction. */
const STATES = {
  idle: { speed: 0.3, scan: 0, ripple: 0, pull: 0 },
  reading: { speed: 0.7, scan: 1, ripple: 0, pull: 0 },
  thinking: { speed: 1.5, scan: 0, ripple: 1, pull: 0 },
  almost: { speed: 2.3, scan: 0, ripple: 0.35, pull: 1 },
};

function project(p, angle, time, m) {
  const ca = Math.cos(angle); const sa = Math.sin(angle);
  const x1 = p.x * ca + p.z * sa; const z1 = -p.x * sa + p.z * ca;
  const ct = Math.cos(TILT); const st = Math.sin(TILT);
  const y2 = p.y * ct - z1 * st; const z2 = p.y * st + z1 * ct;
  const depth = (z2 + 1) / 2;
  const scanY = Math.sin(time * 2.4) * 0.85;
  const lit = m.scan * Math.max(0, 1 - Math.abs(y2 - scanY) / 0.24);
  const scale = (1 + m.ripple * 0.07 * Math.sin(time * 4.2 + p.y * 5)) * (1 - m.pull * (0.1 + 0.04 * Math.sin(time * 7)));
  return {
    cx: 12 + x1 * 9.4 * scale, cy: 12 + y2 * 9.4 * scale,
    r: (0.45 + depth * 1.05) * (1 + lit * 0.45),
    o: Math.min(1, 0.16 + depth * 0.84 + lit * 0.6 + m.pull * 0.15),
  };
}
const STILL = SPHERE.map(p => project(p, 0.6, 0, STATES.idle));

export function NasrinMark({ size = 26, className = '', state }) {
  const ref = React.useRef(null);
  const target = STATES[state];
  const live = React.useRef({ ...STATES.idle, angle: 0.6, time: 0 });
  React.useEffect(() => {
    const svg = ref.current;
    if (!target || !svg || !canAnimate()) return undefined;
    const dots = svg.children; const m = live.current; let raf; let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const k = 1 - Math.exp(-dt * 4);
      ['speed', 'scan', 'ripple', 'pull'].forEach(key => { m[key] += (target[key] - m[key]) * k; });
      m.angle += m.speed * dt; m.time += dt;
      for (let i = 0; i < SPHERE.length; i += 1) {
        const d = project(SPHERE[i], m.angle, m.time, m);
        dots[i].setAttribute('cx', d.cx.toFixed(2)); dots[i].setAttribute('cy', d.cy.toFixed(2));
        dots[i].setAttribute('r', d.r.toFixed(2)); dots[i].setAttribute('opacity', d.o.toFixed(2));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return (
    <svg ref={ref} className={`nasrin-mark ${className}`.trim()} width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      {STILL.map((d, i) => <circle key={i} cx={d.cx.toFixed(2)} cy={d.cy.toFixed(2)} r={d.r.toFixed(2)} opacity={d.o.toFixed(2)} />)}
    </svg>
  );
}
