/*
 * Unique geometric patterns for membership and rewards cards (owner request, 2026-11-09): every card gets its own
 * arrangement from one of six families (hexagons, triangles, diamonds, discs, chevrons, low-poly shards), seeded by
 * the card so it looks the same on every device and in the wallet and the details sheet. Shapes sit in three depth
 * layers; the card face draws deeper shadows on the front layers. Everything stays in the right half of the
 * 856 x 540 card so the text on the left is never covered. Pure functions: no randomness at render time.
 */
export const PATTERN_WIDTH = 856;
export const PATTERN_HEIGHT = 540;
export const PATTERN_MIN_X = 575;
export const PATTERN_FAMILIES = ['hexagons', 'triangles', 'diamonds', 'discs', 'chevrons', 'shards'];
const MIN_X = PATTERN_MIN_X; // shapes start right of the text column (text is at most 66% of the card)
// Back layer faint, front layer strong: with the shadows this reads as depth.
const OPACITY = [0.14, 0.28, 0.46];

/** FNV-1a: a stable 32-bit number for any text. */
export function hashSeed(text) {
  let h = 0x811c9dc5;
  for (const ch of String(text || '')) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}

/** mulberry32: small deterministic generator, 0 <= n < 1. */
function generator(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round = n => Math.round(n * 10) / 10;
const pointsOf = list => list.map(([x, y]) => `${round(x)},${round(y)}`).join(' ');
const regular = (cx, cy, r, sides, turn) => Array.from({ length: sides }, (_, i) => {
  const a = turn + (i * 2 * Math.PI) / sides;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
});

function hexagons(rand) {
  const r = 30 + rand() * 18; const w = Math.sqrt(3) * r; const cx = 715 + rand() * 60; const cy = 130 + rand() * 280;
  const shapes = [];
  for (let q = -2; q <= 2; q += 1) for (let s = -2; s <= 2; s += 1) {
    if (Math.abs(q + s) > 2 || rand() < 0.42) continue;
    const x = cx + w * (q + s / 2); const y = cy + 1.5 * r * s;
    const depth = Math.abs(q) + Math.abs(s) + Math.abs(q + s) <= 2 ? 2 : rand() < 0.5 ? 1 : 0;
    shapes.push({ kind: 'polygon', points: pointsOf(regular(x, y, r * 0.94, 6, Math.PI / 6)), depth });
  }
  return shapes;
}

function triangles(rand) {
  const side = 56 + rand() * 34; const h = (side * Math.sqrt(3)) / 2; const ox = 600 + rand() * 50; const oy = 30 + rand() * 60;
  const shapes = [];
  for (let row = 0; row < Math.ceil(460 / h); row += 1) for (let col = 0; col < 8; col += 1) {
    if (rand() < 0.55) continue;
    const x = ox + (col * side) / 2 - (row % 2) * (side / 2); const y = oy + row * h; const up = (col + row) % 2 === 0;
    const pts = up ? [[x, y + h], [x + side / 2, y], [x + side, y + h]] : [[x, y], [x + side, y], [x + side / 2, y + h]];
    shapes.push({ kind: 'polygon', points: pointsOf(pts), depth: Math.floor(rand() * 3) });
  }
  return shapes;
}

function diamonds(rand) {
  const count = 7 + Math.floor(rand() * 5);
  return Array.from({ length: count }, (_, i) => {
    const size = 34 + rand() * 60; const x = 640 + rand() * 200; const y = 30 + rand() * 480;
    return { kind: 'polygon', points: pointsOf(regular(x, y, size, 4, 0)), depth: i < count / 3 ? 0 : i < (2 * count) / 3 ? 1 : 2 };
  });
}

function discs(rand) {
  const count = 6 + Math.floor(rand() * 5);
  return Array.from({ length: count }, (_, i) => ({
    kind: 'circle', cx: round(660 + rand() * 190), cy: round(20 + rand() * 500), r: round(22 + rand() * 62),
    depth: i < count / 3 ? 0 : i < (2 * count) / 3 ? 1 : 2,
  }));
}

function chevrons(rand) {
  const count = 4 + Math.floor(rand() * 3); const width = 140 + rand() * 80; const thick = 28 + rand() * 20;
  const x = 600 + rand() * 60; const y0 = 60 + rand() * 60; const gap = (420 - y0) / count;
  return Array.from({ length: count }, (_, i) => {
    const y = y0 + i * gap;
    const pts = [[x, y], [x + width / 2, y + width / 3], [x + width, y], [x + width, y + thick], [x + width / 2, y + width / 3 + thick], [x, y + thick]];
    return { kind: 'polygon', points: pointsOf(pts), depth: i % 3 };
  });
}

function shards(rand) {
  const cx = 720 + rand() * 70; const cy = 170 + rand() * 200; const n = 7 + Math.floor(rand() * 3);
  const ring = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * 2 * Math.PI + rand() * 0.5; const d = 100 + rand() * 150;
    return [cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.85];
  });
  return ring.map((p, i) => ({ kind: 'polygon', points: pointsOf([[cx, cy], p, ring[(i + 1) % n]]), depth: Math.floor(rand() * 3) }));
}

const BUILDERS = { hexagons, triangles, diamonds, discs, chevrons, shards };

/** The pattern for one card: same seed, same pattern. Each shape gets a palette colour and an opacity by depth. */
export function cardPattern(seedText, palette = {}) {
  const seed = hashSeed(seedText);
  const rand = generator(seed);
  const family = PATTERN_FAMILIES[seed % PATTERN_FAMILIES.length];
  const colours = [palette.trim, palette.ink, palette.accent].filter(Boolean);
  const shapes = BUILDERS[family](rand)
    // Keep the text column clear even when a shape is wide.
    .filter(shape => (shape.kind === 'circle' ? shape.cx - shape.r >= MIN_X : pointsMin(shape.points) >= MIN_X))
    .map(shape => ({ ...shape, fill: colours[Math.floor(rand() * colours.length)] || '#ffffff', opacity: Math.round((OPACITY[shape.depth] + rand() * 0.06) * 100) / 100 }))
    .sort((a, b) => a.depth - b.depth);
  return { family, seed, shapes };
}

function pointsMin(points) {
  return Math.min(...points.split(' ').map(pair => Number(pair.split(',')[0])));
}
