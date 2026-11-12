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

// Element palettes: night sky, glow and accent.
const ELEMENTS = {
  fire: { sky: ['#1a0710', '#3a0d16'], glow: '#ff7a3d', glow2: '#ffb347' },
  earth: { sky: ['#06140f', '#0f2a1d'], glow: '#4fd18b', glow2: '#e7c46a' },
  air: { sky: ['#0b0a24', '#1d1748'], glow: '#9d8bff', glow2: '#62d6ff' },
  water: { sky: ['#03111f', '#082a40'], glow: '#38c6ff', glow2: '#5eead4' },
};

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

const CELESTIAL = { sky: ['#03140d', '#0b3020'], glow: '#3fd27f', glow2: '#f2c86a' };
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
 * Night-sky artwork in the spirit of the owner's reference (2026-11-12), kept restrained: a seeded starfield, a faint
 * Milky Way, a thin golden zodiac wheel (rings, ticks and twelve markers, no glyphs, which phones may draw as emoji)
 * framing the sign's constellation, a few four-point sparkles and low hills with a golden rim of light. Drawn at
 * 860×600 for the pinned block (header + Total balance); the header alone shows its top part.
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
  const hills = `<path d="M0 226 C120 186 210 180 300 202 C390 224 470 214 560 186 C650 160 760 170 860 198 L860 600 L0 600 Z" fill="url(#hill)"/>`
    + `<path d="M0 226 C120 186 210 180 300 202 C390 224 470 214 560 186 C650 160 760 170 860 198" fill="none" stroke="url(#rim)" stroke-width="2.2"/>`
    + `<path d="M0 262 C140 236 260 244 380 256 C500 268 620 244 860 232 L860 600 L0 600 Z" fill="${el.sky[0]}" opacity=".55"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMin slice">`
    + `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${el.sky[0]}"/><stop offset=".55" stop-color="${el.sky[1]}"/><stop offset="1" stop-color="${el.sky[0]}"/></linearGradient>`
    + `<radialGradient id="g1" cx="${cx / width}" cy="${cy / height}" r="0.45"><stop offset="0" stop-color="${el.glow}" stop-opacity=".42"/><stop offset="1" stop-color="${el.glow}" stop-opacity="0"/></radialGradient>`
    + `<radialGradient id="g2" cx="0.12" cy="0.62" r="0.5"><stop offset="0" stop-color="${el.glow2}" stop-opacity=".18"/><stop offset="1" stop-color="${el.glow2}" stop-opacity="0"/></radialGradient>`
    + `<linearGradient id="milky" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".09"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`
    + `<linearGradient id="hill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${el.sky[1]}"/><stop offset="1" stop-color="${el.sky[0]}"/></linearGradient>`
    + `<linearGradient id="rim" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${el.glow2}" stop-opacity=".15"/><stop offset=".45" stop-color="${el.glow2}" stop-opacity=".85"/><stop offset=".75" stop-color="${el.glow2}" stop-opacity=".5"/><stop offset="1" stop-color="${el.glow2}" stop-opacity=".1"/></linearGradient>`
    + `<radialGradient id="halo"><stop offset="0" stop-color="${el.glow2}" stop-opacity=".9"/><stop offset=".35" stop-color="${el.glow}" stop-opacity=".35"/><stop offset="1" stop-color="${el.glow}" stop-opacity="0"/></radialGradient></defs>`
    + `<rect width="${width}" height="${height}" fill="url(#sky)"/><rect width="${width}" height="${height}" fill="url(#g1)"/><rect width="${width}" height="${height}" fill="url(#g2)"/>`
    + `<path d="M520 -20 L900 -20 L900 60 L600 260 Z" fill="url(#milky)"/>`
    + `<g>${field}</g>`
    + `<g fill="none" stroke="${el.glow2}" stroke-linecap="round"><circle cx="${cx}" cy="${cy}" r="${R}" stroke-opacity=".5" stroke-width="1.4"/><circle cx="${cx}" cy="${cy}" r="${r}" stroke-opacity=".38" stroke-width="1"/><circle cx="${cx}" cy="${cy}" r="${R + 14}" stroke-opacity=".14" stroke-width="5"/><g stroke-opacity=".38" stroke-width="1">${ticks}</g><g stroke-opacity=".14" stroke-width="1">${spokes}</g></g>${marks}`
    + `${figure}${sparkles}${hills}</svg>`;
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
  if (id.startsWith('zodiac:')) { const sign = ZODIAC.find(z => `zodiac:${z.id}` === id); if (sign) return { kind: 'zodiac', id, background: `${zodiacBackground(sign)} center top / cover no-repeat`, glow: ELEMENTS[sign.element].glow }; }
  if (id.startsWith('glow:')) { const glow = GLOWS.find(g => `glow:${g.id}` === id); if (glow) return { kind: 'glow', id, background: glowBackground(glow), glow: glow.art ? CELESTIAL.glow : undefined }; }
  const sceneryId = id.startsWith('scenery:') ? id.slice(8) : DEFAULT_SCENERY;
  const scenery = SCENERIES.find(s => s.id === sceneryId) || SCENERIES.find(s => s.id === DEFAULT_SCENERY) || SCENERIES[0];
  return scenery ? { kind: 'scenery', id: `scenery:${scenery.id}`, background: `url("${scenery.src}") center / cover no-repeat` } : null;
}
