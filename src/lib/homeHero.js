import { SCENERIES } from './scenery';

/*
 * Home header backgrounds (owner, 2026-11-12). The Home header stays pinned at the top with rounded lower corners
 * and a background:
 *   - Scenery (everyone): the app's scenery pictures, under a dark scrim so the greeting stays readable.
 *   - Zodiac (Pro and Pro+): the twelve constellations as glowing star patterns on a night sky tinted by element.
 *   - Glow (Pro and Pro+): animated, softly glowing colour fields.
 * All premium art is original and generated here (no image files, no third-party artwork). The choice is the
 * preference `homeHero`: 'auto' (the scenery default), 'plain', 'scenery:<id>', 'zodiac:<sign>' or 'glow:<id>'.
 */
export const HERO_FEATURE = 'headerThemes';
export const DEFAULT_SCENERY = 'wp-w116'; // mountains at dusk: calm, no figures, readable under white text

// Zodiac palette (owner's reference video, 2026-11-12): the same indigo-purple night for every sign, a gold wheel
// and a purple light ribbon whose far end takes a soft tint from the sign's element.
const NIGHT = { sky: ['#07061a', '#1b1342'], glow: '#8b5cf6', glow2: '#f2c46d', ribbon: '#8b5cf6' };
const ELEMENTS = {
  fire: { ...NIGHT, tint: '#f0abfc' },
  earth: { ...NIGHT, tint: '#99f6e4' },
  air: { ...NIGHT, tint: '#bfdbfe' },
  water: { ...NIGHT, tint: '#7dd3fc' },
};
// The drifting light over zodiac headers (App.css hero-drift) is lavender for every sign.
const ZODIAC_DRIFT = '#c4b5fd';

/*
 * The twelve constellations: star positions (0..1 within the art box, roughly following each figure's brightest
 * stars) and the lines joining them, as index pairs.
 */
export const ZODIAC = [
  { id: 'aries', name: 'Aries', element: 'fire', stars: [[0.08, 0.62], [0.38, 0.42], [0.66, 0.36], [0.82, 0.5]], lines: [[0, 1], [1, 2], [2, 3]] },
  { id: 'taurus', name: 'Taurus', element: 'earth', stars: [[0.1, 0.58], [0.26, 0.7], [0.4, 0.6], [0.3, 0.44], [0.86, 0.2], [0.9, 0.82], [0.62, 0.66]], lines: [[5, 6], [6, 2], [2, 1], [1, 0], [0, 3], [3, 4]] },
  { id: 'gemini', name: 'Gemini', element: 'air', stars: [[0.2, 0.16], [0.42, 0.12], [0.3, 0.5], [0.52, 0.46], [0.36, 0.86], [0.64, 0.82], [0.12, 0.6], [0.74, 0.56]], lines: [[0, 1], [0, 2], [2, 4], [1, 3], [3, 5], [2, 6], [3, 7]] },
  { id: 'cancer', name: 'Cancer', element: 'water', stars: [[0.5, 0.48], [0.44, 0.14], [0.18, 0.8], [0.8, 0.84], [0.5, 0.62]], lines: [[1, 0], [0, 4], [4, 2], [4, 3]] },
  { id: 'leo', name: 'Leo', element: 'fire', stars: [[0.1, 0.32], [0.18, 0.16], [0.32, 0.12], [0.4, 0.28], [0.36, 0.46], [0.42, 0.68], [0.72, 0.52], [0.9, 0.66], [0.66, 0.74]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 5]] },
  { id: 'virgo', name: 'Virgo', element: 'earth', stars: [[0.04, 0.36], [0.2, 0.44], [0.34, 0.32], [0.46, 0.5], [0.62, 0.4], [0.72, 0.64], [0.9, 0.56], [0.42, 0.86]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [3, 7]] },
  { id: 'libra', name: 'Libra', element: 'air', stars: [[0.22, 0.66], [0.4, 0.18], [0.66, 0.26], [0.62, 0.7], [0.86, 0.6], [0.14, 0.86]], lines: [[0, 1], [1, 2], [2, 3], [3, 0], [2, 4], [0, 5]] },
  { id: 'scorpio', name: 'Scorpio', element: 'water', stars: [[0.06, 0.16], [0.1, 0.32], [0.06, 0.48], [0.24, 0.5], [0.38, 0.56], [0.5, 0.66], [0.6, 0.8], [0.74, 0.78], [0.84, 0.64], [0.78, 0.5]], lines: [[0, 1], [1, 2], [1, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9]] },
  { id: 'sagittarius', name: 'Sagittarius', element: 'fire', stars: [[0.24, 0.62], [0.42, 0.54], [0.48, 0.74], [0.3, 0.82], [0.1, 0.46], [0.66, 0.44], [0.74, 0.66], [0.44, 0.3]], lines: [[0, 1], [1, 2], [2, 3], [3, 0], [0, 4], [1, 7], [1, 5], [5, 6], [6, 2]] },
  { id: 'capricorn', name: 'Capricorn', element: 'earth', stars: [[0.06, 0.24], [0.28, 0.76], [0.6, 0.72], [0.92, 0.38], [0.62, 0.48], [0.34, 0.36]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]] },
  { id: 'aquarius', name: 'Aquarius', element: 'air', stars: [[0.06, 0.28], [0.24, 0.36], [0.42, 0.22], [0.5, 0.42], [0.64, 0.5], [0.76, 0.72], [0.58, 0.86], [0.36, 0.66]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [3, 7]] },
  { id: 'pisces', name: 'Pisces', element: 'water', stars: [[0.1, 0.2], [0.04, 0.08], [0.16, 0.04], [0.22, 0.3], [0.4, 0.52], [0.54, 0.72], [0.66, 0.6], [0.8, 0.52], [0.9, 0.42], [0.94, 0.58], [0.84, 0.64]], lines: [[1, 2], [2, 0], [0, 1], [0, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10], [10, 7]] },
];

/*
 * The twelve astrological symbols as stroked paths in a 20×20 box. They are drawn, not typed, because phones may
 * render the Unicode zodiac characters as colour emoji.
 */
export const GLYPHS = {
  aries: 'M3 8C3 3 9 3 10 9V18M17 8C17 3 11 3 10 9',
  taurus: 'M3 3C5 8 15 8 17 3M15 13A5 5 0 1 1 5 13A5 5 0 1 1 15 13Z',
  gemini: 'M4 3C8 5 12 5 16 3M4 17C8 15 12 15 16 17M7 4.6V15.4M13 4.6V15.4',
  cancer: 'M17 6C15 3 9 2.5 6 4.5M8.5 7A2.5 2.5 0 1 1 3.5 7A2.5 2.5 0 1 1 8.5 7ZM3 14C5 17 11 17.5 14 15.5M16.5 13A2.5 2.5 0 1 1 11.5 13A2.5 2.5 0 1 1 16.5 13Z',
  leo: 'M9 13A3 3 0 1 1 3 13A3 3 0 1 1 9 13ZM8.6 11.6C7 7 9 3 12.5 3C16 3 16.5 7.5 14 10.5C12 13 12 17 15 17C16.4 17 17 16 17 15',
  virgo: 'M3 5V15M3 7C3 4 7 4 7 7V15M7 7C7 4 11 4 11 7V15C11 17.5 15 17.5 15 14C15 11 12 11 11 13',
  libra: 'M3 17H17M3 13.5H7.2C5.5 7 14.5 7 12.8 13.5H17',
  scorpio: 'M3 5V15M3 7C3 4 7 4 7 7V15M7 7C7 4 11 4 11 7V14.5C11 16.5 13 16.8 16 15M14 13L16 15L14 17',
  sagittarius: 'M4 16L16 4M10 4H16V10M6 10L10 14',
  capricorn: 'M3 5L6 14L9 5V12.5C9 17 14.5 17 14.5 13.5C14.5 10.5 10.5 10.5 10.5 13.5C10.5 15.5 8.5 17 6.5 17',
  aquarius: 'M3 8L6 5.6L9 8L12 5.6L15 8L17 6.6M3 14.4L6 12L9 14.4L12 12L15 14.4L17 13',
  pisces: 'M4.5 3C9 7 9 13 4.5 17M15.5 3C11 7 11 13 15.5 17M5 10H15',
};

const CELESTIAL = { sky: ['#03140d', '#0b3020'], glow: '#3fd27f', glow2: '#f2c86a', ribbon: '#3fd27f', tint: '#f2c86a' };
export const GLOWS = [
  { id: 'celestial', name: 'Celestial', art: true },
  { id: 'aurora', name: 'Aurora', bg: 'radial-gradient(120% 90% at 8% 0%, rgba(52,211,153,.75), transparent 58%), radial-gradient(90% 80% at 92% 18%, rgba(34,211,238,.65), transparent 60%), radial-gradient(80% 90% at 55% 110%, rgba(167,139,250,.6), transparent 62%), #071322' },
  { id: 'nebula', name: 'Nebula', bg: 'radial-gradient(100% 90% at 85% 10%, rgba(236,72,153,.7), transparent 58%), radial-gradient(110% 90% at 10% 90%, rgba(124,58,237,.75), transparent 60%), radial-gradient(60% 60% at 50% 40%, rgba(96,165,250,.35), transparent 70%), #12091f' },
  { id: 'platinum', name: 'Platinum', bg: 'radial-gradient(90% 80% at 15% 10%, rgba(226,232,240,.55), transparent 60%), radial-gradient(80% 70% at 85% 30%, rgba(203,213,225,.45), transparent 62%), radial-gradient(70% 80% at 60% 100%, rgba(186,230,253,.35), transparent 60%), linear-gradient(140deg, #23262d, #121418)' },
  { id: 'gold', name: 'Gold halo', bg: 'radial-gradient(90% 90% at 80% 15%, rgba(251,191,36,.75), transparent 58%), radial-gradient(90% 80% at 10% 100%, rgba(217,119,6,.6), transparent 60%), #1a1206' },
  { id: 'ocean', name: 'Ocean glow', bg: 'radial-gradient(110% 90% at 0% 0%, rgba(14,165,233,.7), transparent 58%), radial-gradient(90% 90% at 100% 100%, rgba(45,212,191,.6), transparent 60%), #04121f' },
  { id: 'rose', name: 'Rose dusk', bg: 'radial-gradient(100% 90% at 90% 0%, rgba(251,113,133,.7), transparent 58%), radial-gradient(100% 90% at 0% 100%, rgba(244,114,182,.5), transparent 60%), radial-gradient(70% 70% at 40% 40%, rgba(251,191,36,.25), transparent 70%), #1c0a12' },
];

// A small seeded generator so each sign always gets the same background stars.
const rng = (seed) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const f = (n) => n.toFixed(1);

/*
 * Night-sky artwork after the owner's reference video (2026-11-12), at a softer opacity: an indigo-purple sky with a
 * faint nebula, a seeded starfield, a thin gold zodiac wheel with the twelve symbols (the person's sign at the top,
 * brightest) framing the sign's constellation, a few four-point sparkles, and a flowing purple ribbon of light
 * across the lower part. Drawn at 860×600 for the pinned block (header + Total balance); the header alone shows its
 * top part. App.css drifts a soft lavender light across it (transform only, paused for reduced motion).
 */
export function zodiacSvg(sign, { palette, seed } = {}) {
  const width = 860; const height = 600;
  const el = palette || ELEMENTS[sign.element];
  const rand = rng((seed ?? ZODIAC.indexOf(sign)) * 977 + 31);
  const field = Array.from({ length: 90 }, () => {
    const x = rand() * width; const y = rand() * height * 0.62; const r = 0.5 + rand() * 1.2; const o = 0.2 + rand() * 0.55;
    return `<circle cx="${f(x)}" cy="${f(y)}" r="${r.toFixed(2)}" fill="#fff" opacity="${o.toFixed(2)}"/>`;
  }).join('');
  const sparkle = (x, y, s, o) => `<path d="M${f(x)} ${f(y - s)}Q${f(x + s * 0.12)} ${f(y - s * 0.12)} ${f(x + s)} ${f(y)}Q${f(x + s * 0.12)} ${f(y + s * 0.12)} ${f(x)} ${f(y + s)}Q${f(x - s * 0.12)} ${f(y + s * 0.12)} ${f(x - s)} ${f(y)}Q${f(x - s * 0.12)} ${f(y - s * 0.12)} ${f(x)} ${f(y - s)}Z" fill="#fff" opacity="${o}"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(s * 0.9)}" fill="url(#halo)" opacity="${o}"/>`;
  const sparkles = [[96, 58, 11, 0.9], [300, 30, 7, 0.7], [790, 70, 9, 0.8], [690, 232, 6, 0.6], [180, 196, 5, 0.55], [840, 190, 6, 0.6]].map(a => sparkle(...a)).join('');
  // The wheel, right of the greeting.
  const cx = 560; const cy = 150; const R = 128; const r = 98;
  const ticks = Array.from({ length: 36 }, (_, i) => { const a = (i / 36) * Math.PI * 2; const long = i % 3 === 0; const r1 = R - (long ? 9 : 5); return `<line x1="${f(cx + Math.cos(a) * r1)}" y1="${f(cy + Math.sin(a) * r1)}" x2="${f(cx + Math.cos(a) * R)}" y2="${f(cy + Math.sin(a) * R)}"/>`; }).join('');
  const marks = Array.from({ length: 12 }, (_, i) => { const a = ((i + 0.5) / 12) * Math.PI * 2; const mr = (R + r) / 2; return `<circle cx="${f(cx + Math.cos(a) * mr)}" cy="${f(cy + Math.sin(a) * mr)}" r="2.6" fill="${el.glow2}" opacity=".85"/>`; }).join('');
  const spokes = Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return `<line x1="${f(cx + Math.cos(a) * 42)}" y1="${f(cy + Math.sin(a) * 42)}" x2="${f(cx + Math.cos(a) * r)}" y2="${f(cy + Math.sin(a) * r)}"/>`; }).join('');
  // The sign's constellation, inside the wheel (or a single bright star for the plain celestial sky).
  let figure = sparkle(cx, cy, 20, 0.95);
  if (sign) {
    const box = 120; const at = ([x, y]) => [cx - box / 2 + x * box, cy - box / 2 + y * box];
    const lines = sign.lines.map(([a, b]) => { const [x1, y1] = at(sign.stars[a]); const [x2, y2] = at(sign.stars[b]); return `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"/>`; }).join('');
    const stars = sign.stars.map((pt, i) => { const [x, y] = at(pt); const sr = i === 0 ? 3.6 : 2.6; return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(sr * 3.4)}" fill="url(#halo)"/><circle cx="${f(x)}" cy="${f(y)}" r="${sr}" fill="#fff"/>`; }).join('');
    figure = `<g stroke="#fff" stroke-opacity=".55" stroke-width="1.4" stroke-linecap="round">${lines}</g>${stars}`;
  }
  // Twelve symbols on the ring, the person's sign at the top (as in the reference); none for the plain celestial sky.
  const ring = (R + r) / 2;
  const order = sign ? [...ZODIAC.slice(ZODIAC.indexOf(sign)), ...ZODIAC.slice(0, ZODIAC.indexOf(sign))] : [];
  const glyphs = order.map((z, i) => {
    const a = -Math.PI / 2 + (i / 12) * Math.PI * 2; const own = i === 0; const size = own ? 26 : 17;
    const gx = cx + Math.cos(a) * ring; const gy = cy + Math.sin(a) * ring;
    return `<path transform="translate(${f(gx - size / 2)} ${f(gy - size / 2)}) scale(${(size / 20).toFixed(3)})" d="${GLYPHS[z.id]}" stroke-opacity="${own ? '.95' : '.6'}" stroke-width="${own ? '1.7' : '1.9'}"/>`;
  }).join('');
  // The ribbon: a few flowing strands of light (brightest at the centre), over a soft glow; the sky below darkens
  // so the balance card sits on a calm ground.
  const strand = (dy, amp, w, o) => `<path d="M-20 ${f(232 + dy)} C150 ${f(176 + dy - amp)} 300 ${f(214 + dy + amp)} 470 ${f(206 + dy)} C620 ${f(198 + dy - amp)} 740 ${f(162 + dy)} 880 ${f(150 + dy + amp * 0.4)}" fill="none" stroke="url(#ribbon)" stroke-width="${w}" stroke-opacity="${o}" stroke-linecap="round"/>`;
  const ribbon = `<path d="M-20 300 C150 220 300 250 470 238 C620 228 740 196 880 180 L880 600 L-20 600 Z" fill="url(#ground)"/>`
    + `<g filter="url(#soft)">${strand(0, 10, 16, 0.32)}</g>`
    + strand(-6, 12, 1.6, 0.75) + strand(3, 8, 1.1, 0.5) + strand(10, 14, 0.8, 0.35) + strand(-14, 6, 0.7, 0.28)
    + `<ellipse cx="470" cy="206" rx="120" ry="16" fill="url(#core)"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMin slice">`
    + `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${el.sky[0]}"/><stop offset=".55" stop-color="${el.sky[1]}"/><stop offset="1" stop-color="${el.sky[0]}"/></linearGradient>`
    + `<radialGradient id="g1" cx="${cx / width}" cy="${cy / height}" r="0.45"><stop offset="0" stop-color="${el.glow}" stop-opacity=".42"/><stop offset="1" stop-color="${el.glow}" stop-opacity="0"/></radialGradient>`
    + `<radialGradient id="g2" cx="0.12" cy="0.62" r="0.5"><stop offset="0" stop-color="${el.glow2}" stop-opacity=".18"/><stop offset="1" stop-color="${el.glow2}" stop-opacity="0"/></radialGradient>`
    + `<linearGradient id="milky" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".09"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`
    + `<linearGradient id="ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${el.sky[0]}" stop-opacity="0"/><stop offset=".35" stop-color="${el.sky[0]}" stop-opacity=".7"/><stop offset="1" stop-color="${el.sky[0]}"/></linearGradient>`
    + `<linearGradient id="ribbon" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${el.ribbon}" stop-opacity=".2"/><stop offset=".45" stop-color="${el.ribbon}"/><stop offset=".55" stop-color="#fff"/><stop offset=".75" stop-color="${el.tint}"/><stop offset="1" stop-color="${el.tint}" stop-opacity=".25"/></linearGradient>`
    + `<radialGradient id="core"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".4" stop-color="${el.ribbon}" stop-opacity=".25"/><stop offset="1" stop-color="${el.ribbon}" stop-opacity="0"/></radialGradient>`
    + `<radialGradient id="neb" cx=".18" cy=".38" r=".5"><stop offset="0" stop-color="${el.ribbon}" stop-opacity=".22"/><stop offset="1" stop-color="${el.ribbon}" stop-opacity="0"/></radialGradient>`
    + `<filter id="soft" x="-5%" y="-50%" width="110%" height="200%"><feGaussianBlur stdDeviation="7"/></filter>`
    + `<radialGradient id="halo"><stop offset="0" stop-color="${el.glow2}" stop-opacity=".9"/><stop offset=".35" stop-color="${el.glow}" stop-opacity=".35"/><stop offset="1" stop-color="${el.glow}" stop-opacity="0"/></radialGradient></defs>`
    + `<rect width="${width}" height="${height}" fill="url(#sky)"/><rect width="${width}" height="${height}" fill="url(#g1)"/><rect width="${width}" height="${height}" fill="url(#g2)"/><rect width="${width}" height="${height}" fill="url(#neb)"/>`
    + `<path d="M520 -20 L900 -20 L900 60 L600 260 Z" fill="url(#milky)"/>`
    + `<g>${field}</g>`
    + `<g fill="none" stroke="${el.glow2}" stroke-linecap="round"><circle cx="${cx}" cy="${cy}" r="${R}" stroke-opacity=".5" stroke-width="1.4"/><circle cx="${cx}" cy="${cy}" r="${r}" stroke-opacity=".38" stroke-width="1"/><circle cx="${cx}" cy="${cy}" r="${R + 14}" stroke-opacity=".14" stroke-width="5"/><g stroke-opacity=".38" stroke-width="1">${ticks}</g><g stroke-opacity=".14" stroke-width="1">${spokes}</g></g>${sign ? '' : marks}<g fill="none" stroke="${el.glow2}" stroke-linecap="round" stroke-linejoin="round">${glyphs}</g>`
    + `${figure}${sparkles}${ribbon}</svg>`;
}
const svgUrl = (svg) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
const zodiacCache = new Map();
export const zodiacBackground = (sign) => {
  if (!zodiacCache.has(sign.id)) zodiacCache.set(sign.id, svgUrl(zodiacSvg(sign)));
  return zodiacCache.get(sign.id);
};

let celestialUrl = '';
/** CSS background for a glow: the celestial sky is artwork, the others are layered gradients. */
export const glowBackground = (glow) => {
  if (!glow.art) return glow.bg;
  if (!celestialUrl) celestialUrl = svgUrl(zodiacSvg(null, { palette: CELESTIAL, seed: 99 }));
  return `${celestialUrl} center top / cover no-repeat`;
};

/** True for choices that need Pro or Pro+. */
export const isPremiumHero = (id) => /^(zodiac|glow):/.test(String(id || ''));

/**
 * What to paint for a saved choice. Premium choices fall back to the default scenery when the plan does not allow
 * them (for example after a subscription ends); unknown values do too.
 */
export function resolveHero(choice, { premium = false } = {}) {
  const id = String(choice || 'auto');
  if (id === 'plain') return null;
  if (isPremiumHero(id) && !premium) return resolveHero('auto');
  if (id.startsWith('zodiac:')) { const sign = ZODIAC.find(z => `zodiac:${z.id}` === id); if (sign) return { kind: 'zodiac', id, background: `${zodiacBackground(sign)} center top / cover no-repeat`, glow: ZODIAC_DRIFT }; }
  if (id.startsWith('glow:')) { const glow = GLOWS.find(g => `glow:${g.id}` === id); if (glow) return { kind: 'glow', id, background: glowBackground(glow), glow: glow.art ? CELESTIAL.glow : undefined }; }
  const sceneryId = id.startsWith('scenery:') ? id.slice(8) : DEFAULT_SCENERY;
  const scenery = SCENERIES.find(s => s.id === sceneryId) || SCENERIES.find(s => s.id === DEFAULT_SCENERY) || SCENERIES[0];
  return scenery ? { kind: 'scenery', id: `scenery:${scenery.id}`, background: `url("${scenery.src}") center / cover no-repeat` } : null;
}
