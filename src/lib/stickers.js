import { useEffect, useState } from 'react';
import { WALLPAPERS } from './wallpapers';
import { t as tr } from './i18n';

/*
 * Card sticker library.
 * Every sticker is generated as vector SVG (viewBox 856x540, the ISO card ratio), so it stays razor sharp on any
 * screen, at any size. 17 original anime-inspired motifs x 16 palettes = 272 sticker themes, all deterministic.
 * Safe zones are kept calm for the bank logo (top-left), chip (left), card number and name (bottom).
 */
export const W = 856;
export const H = 540;

export const PALETTES = [
  { id: 'crimson', n: 'Crimson', bg: ['#2a0a14', '#7a1230', '#e5484d'], c: '#ffd1c4', g: '#ff5a5f', ink: 'light' },
  { id: 'violet', n: 'Violet', bg: ['#130a33', '#4a1fb8', '#a56bff'], c: '#e9d8ff', g: '#b388ff', ink: 'light' },
  { id: 'golden', n: 'Golden', bg: ['#3a1a05', '#d9780f', '#ffd25a'], c: '#fff4c2', g: '#ffb020', ink: 'dark' },
  { id: 'midnight', n: 'Midnight', bg: ['#02040c', '#0b1a3d', '#1d3f8f'], c: '#bcd4ff', g: '#4f8dff', ink: 'light' },
  { id: 'mint', n: 'Mint', bg: ['#052a2a', '#0f8f7f', '#9af2d0'], c: '#eafff6', g: '#38e0b0', ink: 'dark' },
  { id: 'ocean', n: 'Ocean', bg: ['#021a33', '#0a5aa8', '#4cc9f0'], c: '#e0f7ff', g: '#35b8ff', ink: 'light' },
  { id: 'rose', n: 'Rose', bg: ['#4a1230', '#d6458a', '#ffc2dd'], c: '#fff0f7', g: '#ff7ab8', ink: 'dark' },
  { id: 'ember', n: 'Ember', bg: ['#1a0600', '#a8300a', '#ff8a3d'], c: '#ffe2b8', g: '#ff6a1a', ink: 'light' },
  { id: 'aurora', n: 'Aurora', bg: ['#06122e', '#0f7a6d', '#7b5cff'], c: '#d8fff0', g: '#6bffc8', ink: 'light' },
  { id: 'sunburst', n: 'Sunburst', bg: ['#5b1a6e', '#ff5d73', '#ffcf5a'], c: '#fff6d6', g: '#ffb347', ink: 'dark' },
  { id: 'manga', n: 'Manga', bg: ['#ffffff', '#f1f1f1', '#d9d9d9'], c: '#111111', g: '#000000', ink: 'dark', mono: true },
  { id: 'neon', n: 'Neon', bg: ['#10001f', '#4b0082', '#ff2bd6'], c: '#ffd6f7', g: '#ff3df0', ink: 'light' },
  { id: 'emerald', n: 'Emerald', bg: ['#03170f', '#0b6b3f', '#43d98a'], c: '#d8ffe9', g: '#2ee68a', ink: 'light' },
  { id: 'steel', n: 'Steel', bg: ['#10141c', '#3a4558', '#a7b4c9'], c: '#f2f6fc', g: '#8fb4ff', ink: 'light' },
  { id: 'candy', n: 'Candy', bg: ['#7b5cff', '#ff7ac8', '#ffe27a'], c: '#ffffff', g: '#ffffff', ink: 'dark' },
  { id: 'sapphire', n: 'Sapphire', bg: ['#050a3d', '#1b3bd8', '#5aa2ff'], c: '#dfeaff', g: '#6aa0ff', ink: 'light' },
];

export const GENRES = ['Shonen', 'Ninja & Samurai', 'Fantasy', 'Sci-fi', 'Night', 'Manga'];

/* ---------- deterministic randomness ---------- */
function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i += 1) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const f = (n) => Math.round(n * 10) / 10;

/* ---------- motif drawing functions: (rnd, palette, uid) => svg nodes ---------- */
const h = (tag, props, ...kids) => ({ tag, props, kids });

function bolt(rnd, x, y, ang, len, depth, out) {
  let d = `M${f(x)} ${f(y)}`; let cx = x; let cy = y; let a = ang; const steps = Math.ceil(len / 26);
  for (let i = 0; i < steps; i += 1) {
    a += (rnd() - 0.5) * 0.95; cx += Math.cos(a) * 26; cy += Math.sin(a) * 26; d += `L${f(cx)} ${f(cy)}`;
    if (depth < 2 && rnd() < 0.2) bolt(rnd, cx, cy, a + (rnd() - 0.5) * 1.7, len * 0.4, depth + 1, out);
  }
  out.push({ d, depth });
}
const thunder = (r, p) => {
  const out = []; [[800, 40, 2.5, 640], [840, 330, 3.3, 560], [560, -10, 1.9, 600]].forEach(([x, y, a, l]) => bolt(r, x, y, a, l, 0, out));
  return [h('g', { filter: 'url(#blur6)', opacity: 0.9 }, ...out.map(o => h('path', { d: o.d, stroke: p.g, strokeWidth: 9 - o.depth * 3, fill: 'none', strokeLinecap: 'round' }))),
    h('g', null, ...out.map(o => h('path', { d: o.d, stroke: '#fff', strokeWidth: 3.2 - o.depth, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' })))];
};
const petal = 'M0 -16C10 -16 16 -6 12 6C8 14 2 12 0 8C-2 12-8 14-12 6C-16 -6-10 -16 0 -16Z';
const sakura = (r, p) => {
  const nodes = [h('path', { d: 'M900 40C760 90 700 70 600 150S470 250 400 230', stroke: p.mono ? '#222' : 'rgba(0,0,0,.35)', strokeWidth: 9, fill: 'none', strokeLinecap: 'round' })];
  for (let i = 0; i < 46; i += 1) {
    const x = 330 + r() * 560; const y = -10 + r() * 560; const s = 0.5 + r() * 1.7;
    nodes.push(h('path', { d: petal, transform: `translate(${f(x)} ${f(y)}) rotate(${f(r() * 360)}) scale(${f(s)})`, fill: i % 3 ? p.c : p.g, opacity: f(0.35 + r() * 0.6) }));
  }
  return nodes;
};
const moon = (r, p, u) => {
  const nodes = [h('circle', { cx: 650, cy: 175, r: 190, fill: p.g, opacity: 0.18, filter: 'url(#blur24)' }), h('circle', { cx: 650, cy: 175, r: 112, fill: `url(#${u}m)` })];
  [[620, 150, 18], [690, 205, 26], [660, 120, 10]].forEach(([x, y, rr]) => nodes.push(h('circle', { cx: x, cy: y, r: rr, fill: 'rgba(0,0,0,.08)' })));
  for (let i = 0; i < 4; i += 1) nodes.push(h('ellipse', { cx: 520 + i * 110, cy: 330 + i * 46, rx: 330, ry: 28, fill: p.c, opacity: 0.1 + i * 0.05 }));
  for (let i = 0; i < 50; i += 1) nodes.push(h('circle', { cx: f(r() * W), cy: f(r() * 300), r: f(0.8 + r() * 2), fill: '#fff', opacity: f(0.3 + r() * 0.6) }));
  return nodes;
};
const waves = (r, p, u) => {
  const nodes = []; const R = 62;
  for (let row = 0; row < 11; row += 1) for (let col = -1; col < 15; col += 1) {
    const x = col * R * 1.2 + (row % 2 ? R * 0.6 : 0); const y = 120 + row * R * 0.5;
    nodes.push(h('g', { key: `${row}-${col}` }, h('circle', { cx: f(x), cy: f(y), r: R, fill: p.bg[1], stroke: p.c, strokeWidth: 2.4 }), h('circle', { cx: f(x), cy: f(y), r: R * 0.7, fill: 'none', stroke: p.c, strokeWidth: 2.2 }), h('circle', { cx: f(x), cy: f(y), r: R * 0.4, fill: 'none', stroke: p.c, strokeWidth: 2 })));
  }
  return [h('g', { mask: `url(#${u}fade)`, opacity: 0.8 }, ...nodes), h('circle', { cx: 660, cy: 150, r: 84, fill: p.g, opacity: 0.85 })];
};
const speed = (r, p) => {
  const nodes = [h('circle', { cx: 610, cy: 210, r: 150, fill: p.g, opacity: 0.4, filter: 'url(#blur24)' })];
  for (let i = 0; i < 110; i += 1) {
    const a = r() * Math.PI * 2; const r1 = 70 + r() * 150; const r2 = 460 + r() * 400;
    nodes.push(h('line', { x1: f(610 + Math.cos(a) * r1), y1: f(210 + Math.sin(a) * r1), x2: f(610 + Math.cos(a) * r2), y2: f(210 + Math.sin(a) * r2), stroke: i % 5 ? p.c : '#fff', strokeWidth: f(0.6 + r() * 3), opacity: f(0.15 + r() * 0.5), strokeLinecap: 'round' }));
  }
  return nodes;
};
const halftone = (r, p) => {
  const nodes = [];
  for (let y = 10; y < H; y += 24) for (let x = ((y / 24) % 2) * 12; x < W; x += 24) {
    const d = Math.hypot(x - 700, y - 120) / 620; const rr = Math.max(0, 11 * (1 - d) * (0.55 + 0.45 * Math.sin(x / 90 + y / 70)));
    if (rr > 0.8) nodes.push(h('circle', { cx: x, cy: y, r: f(rr), fill: p.mono ? '#111' : p.c, opacity: p.mono ? 0.9 : 0.6 }));
  }
  nodes.push(h('path', { d: 'M520 560C560 360 700 250 900 190L900 -20C760 40 600 160 520 300Z', fill: p.mono ? '#111' : p.g, opacity: p.mono ? 1 : 0.85 }));
  return nodes;
};
const slash = (r, p) => {
  const nodes = [];
  [[-24, 0.95, 1], [-36, 0.7, 0.8], [-12, 0.5, 0.6]].forEach(([rot, op, sc], i) => {
    nodes.push(h('g', { key: i, transform: `translate(${470 + i * 110} ${260 + i * 6}) rotate(${rot}) scale(${sc})`, opacity: op },
      h('path', { d: 'M-330 90Q-10 -230 330 -110Q20 -150 -330 90Z', fill: p.g, filter: 'url(#blur6)' }),
      h('path', { d: 'M-330 90Q-10 -230 330 -110Q20 -150 -330 90Z', fill: '#fff' })));
  });
  return nodes;
};
const flames = (r, p, u) => {
  const nodes = [];
  for (let i = 0; i < 16; i += 1) {
    const x = 330 + r() * 540; const s = 0.6 + r() * 1.1; const sway = (r() - 0.5) * 110;
    nodes.push(h('path', { d: `M${f(x)} 560C${f(x - 70 * s)} 450 ${f(x + sway)} 380 ${f(x + sway * 0.4)} ${f(230 - r() * 70)}C${f(x + 40 * s)} 380 ${f(x + 70 * s + sway)} 450 ${f(x)} 560Z`, fill: `url(#${u}fl)`, opacity: f(0.35 + r() * 0.5) }));
  }
  for (let i = 0; i < 26; i += 1) nodes.push(h('circle', { cx: f(300 + r() * 560), cy: f(r() * 400), r: f(1 + r() * 3), fill: p.c, opacity: f(0.3 + r() * 0.6) }));
  return nodes;
};
const cosmic = (r, p) => {
  const nodes = [[640, 140, 190], [760, 400, 150], [480, 330, 120]].map(([x, y, rr], i) => h('circle', { key: i, cx: x, cy: y, r: rr, fill: i % 2 ? p.c : p.g, opacity: 0.22, filter: 'url(#blur24)' }));
  for (let i = 0; i < 170; i += 1) nodes.push(h('circle', { cx: f(r() * W), cy: f(r() * H), r: f(0.5 + r() * 1.9), fill: '#fff', opacity: f(0.25 + r() * 0.75) }));
  nodes.push(h('circle', { cx: 690, cy: 160, r: 78, fill: p.bg[2] }), h('circle', { cx: 668, cy: 140, r: 78, fill: 'rgba(255,255,255,.22)', clipPath: 'none' }));
  nodes.push(h('ellipse', { cx: 690, cy: 160, rx: 150, ry: 28, fill: 'none', stroke: p.c, strokeWidth: 6, opacity: 0.8, transform: 'rotate(-18 690 160)' }));
  return nodes;
};
const bubbles = (r, p, u) => {
  const nodes = [h('path', { d: 'M640 90C720 190 760 250 760 310A120 120 0 0 1 520 310C520 250 560 190 640 90Z', fill: p.c, opacity: 0.35 }), h('path', { d: 'M640 90C720 190 760 250 760 310A120 120 0 0 1 520 310C520 250 560 190 640 90Z', fill: 'none', stroke: '#fff', strokeWidth: 4, opacity: 0.8 }), h('ellipse', { cx: 590, cy: 290, rx: 18, ry: 40, fill: '#fff', opacity: 0.7, transform: 'rotate(18 590 290)' })];
  for (let i = 0; i < 26; i += 1) { const rr = 8 + r() * 42; const x = 320 + r() * 540; const y = r() * H; nodes.push(h('g', { key: i, opacity: f(0.45 + r() * 0.5) }, h('circle', { cx: f(x), cy: f(y), r: f(rr), fill: `url(#${u}b)`, stroke: '#fff', strokeWidth: 1.6 }), h('circle', { cx: f(x - rr * 0.35), cy: f(y - rr * 0.35), r: f(rr * 0.18), fill: '#fff' }))); }
  return nodes;
};
const crystals = (r, p) => {
  const nodes = []; const base = [[620, 540], [740, 540], [520, 540], [830, 540]];
  base.forEach(([x, y], i) => { const hh = 190 + r() * 200; const w = 60 + r() * 50; nodes.push(h('g', { key: i, opacity: 0.92 }, h('polygon', { points: `${x - w},${y} ${x},${y - hh} ${x + w * 0.1},${y}`, fill: p.c, opacity: 0.55 }), h('polygon', { points: `${x},${y - hh} ${x + w},${y} ${x + w * 0.1},${y}`, fill: p.g, opacity: 0.75 }), h('polygon', { points: `${x},${y - hh} ${x - w * 0.3},${y - hh * 0.4} ${x + w * 0.4},${y - hh * 0.5}`, fill: '#fff', opacity: 0.35 }))); });
  for (let i = 0; i < 24; i += 1) { const x = 380 + r() * 480; const y = r() * 300; const s = 6 + r() * 14; nodes.push(h('polygon', { points: `${f(x)},${f(y - s)} ${f(x + s * 0.6)},${f(y)} ${f(x)},${f(y + s)} ${f(x - s * 0.6)},${f(y)}`, fill: '#fff', opacity: f(0.3 + r() * 0.6) })); }
  return nodes;
};
const magic = (r, p) => {
  const cx = 640; const cy = 270; const nodes = [h('circle', { cx, cy, r: 220, fill: p.g, opacity: 0.16, filter: 'url(#blur24)' })];
  [200, 160, 112].forEach((rr, i) => nodes.push(h('circle', { key: rr, cx, cy, r: rr, fill: 'none', stroke: p.c, strokeWidth: i === 1 ? 2 : 3.4, strokeDasharray: i === 1 ? '3 11' : undefined, opacity: 0.85 })));
  for (let i = 0; i < 36; i += 1) { const a = (i / 36) * Math.PI * 2; nodes.push(h('line', { x1: f(cx + Math.cos(a) * 200), y1: f(cy + Math.sin(a) * 200), x2: f(cx + Math.cos(a) * (i % 3 ? 212 : 228)), y2: f(cy + Math.sin(a) * (i % 3 ? 212 : 228)), stroke: p.c, strokeWidth: 2.4, opacity: 0.8 })); }
  const tri = (rot) => { const pts = [0, 1, 2].map(k => { const a = rot + (k / 3) * Math.PI * 2; return `${f(cx + Math.cos(a) * 160)},${f(cy + Math.sin(a) * 160)}`; }).join(' '); return h('polygon', { key: rot, points: pts, fill: 'none', stroke: '#fff', strokeWidth: 3, opacity: 0.9 }); };
  nodes.push(tri(-Math.PI / 2), tri(Math.PI / 2), h('circle', { cx, cy, r: 22, fill: '#fff', opacity: 0.9 }));
  return nodes;
};
const sky = (r, p) => {
  const nodes = [h('circle', { cx: 640, cy: 170, r: 96, fill: p.g, opacity: 0.9 }), h('circle', { cx: 640, cy: 170, r: 150, fill: p.g, opacity: 0.25, filter: 'url(#blur24)' })];
  for (let row = 0; row < 6; row += 1) for (let i = 0; i < 7; i += 1) { const x = i * 150 - 40 + (row % 2) * 70 + r() * 40; const y = 250 + row * 52; const s = 40 + r() * 36; nodes.push(h('g', { key: `${row}-${i}`, opacity: f(0.18 + row * 0.1) }, h('circle', { cx: f(x), cy: f(y), r: f(s), fill: '#fff' }), h('circle', { cx: f(x + s * 0.9), cy: f(y + 8), r: f(s * 0.8), fill: '#fff' }), h('circle', { cx: f(x - s * 0.9), cy: f(y + 12), r: f(s * 0.7), fill: '#fff' }))); }
  return nodes;
};
const city = (r, p) => {
  const nodes = [h('circle', { cx: 650, cy: 140, r: 74, fill: p.g, opacity: 0.85 })]; let x = 300;
  while (x < W) { const w = 40 + r() * 70; const hh = 130 + r() * 230; nodes.push(h('rect', { x, y: H - hh, width: w, height: hh, fill: 'rgba(0,0,0,.55)' })); for (let k = 0; k < 14; k += 1) if (r() > 0.45) nodes.push(h('rect', { x: f(x + 6 + (k % 3) * (w / 3.4)), y: f(H - hh + 12 + Math.floor(k / 3) * 28), width: 6, height: 10, fill: r() > 0.5 ? p.c : p.g, opacity: 0.9 })); x += w + 6; }
  for (let y = 0; y < H; y += 6) nodes.push(h('line', { x1: 0, y1: y, x2: W, y2: y, stroke: '#000', opacity: 0.06 }));
  return nodes;
};
const peaks = (r, p) => {
  const nodes = [h('circle', { cx: 640, cy: 210, r: 108, fill: p.g, opacity: 0.9 })];
  [[300, 0.35, 'rgba(255,255,255,.18)'], [380, 0.55, 'rgba(0,0,0,.22)'], [450, 0.8, 'rgba(0,0,0,.38)']].forEach(([base, , fill], k) => {
    let d = `M0 ${H}L0 ${base}`; for (let x = 0; x <= W + 80; x += 70) d += `L${x} ${f(base - 20 - r() * (130 - k * 22))}L${x + 35} ${f(base + 10 + r() * 30)}`; d += `L${W} ${H}Z`; nodes.push(h('path', { d, fill })); });
  return nodes;
};
const ink = (r, p) => {
  const nodes = [h('circle', { cx: 650, cy: 250, r: 150, fill: 'none', stroke: p.mono ? '#111' : p.c, strokeWidth: 30, strokeLinecap: 'round', strokeDasharray: '780 160', transform: 'rotate(-70 650 250)', opacity: 0.9 })];
  [[330, 470, 880, 120, 26], [400, 120, 860, 330, 12]].forEach(([x1, y1, x2, y2, w], i) => nodes.push(h('path', { key: i, d: `M${x1} ${y1}C${x1 + 160} ${y1 - 180} ${x2 - 200} ${y2 + 160} ${x2} ${y2}`, stroke: p.mono ? '#111' : p.g, strokeWidth: w, strokeLinecap: 'round', fill: 'none', opacity: 0.85 })));
  for (let i = 0; i < 34; i += 1) nodes.push(h('circle', { cx: f(380 + r() * 480), cy: f(r() * H), r: f(1 + r() * 7), fill: p.mono ? '#111' : p.c, opacity: f(0.3 + r() * 0.6) }));
  return nodes;
};
const tech = (r, p) => {
  const nodes = []; const s = 46;
  for (let row = -1; row < 13; row += 1) for (let col = 5; col < 20; col += 1) {
    const x = col * s * 1.5; const y = row * s * 1.732 + (col % 2 ? s * 0.866 : 0);
    const pts = [0, 1, 2, 3, 4, 5].map(k => { const a = (k / 6) * Math.PI * 2; return `${f(x + Math.cos(a) * s * 0.92)},${f(y + Math.sin(a) * s * 0.92)}`; }).join(' ');
    const lit = r() > 0.82; nodes.push(h('polygon', { key: `${row}-${col}`, points: pts, fill: lit ? p.g : 'none', fillOpacity: lit ? 0.5 : 0, stroke: p.c, strokeWidth: 1.6, opacity: lit ? 0.95 : 0.4 }));
  }
  nodes.push(h('path', { d: 'M360 470H520L560 430H700L740 470H860', stroke: p.g, strokeWidth: 3, fill: 'none', opacity: 0.9 }), h('circle', { cx: 560, cy: 430, r: 6, fill: '#fff' }), h('circle', { cx: 740, cy: 470, r: 6, fill: '#fff' }));
  return nodes;
};

export const MOTIFS = [
  { id: 'thunder', n: 'Thunder', genre: 'Shonen', draw: thunder }, { id: 'speed', n: 'Burst', genre: 'Shonen', draw: speed },
  { id: 'slash', n: 'Slash', genre: 'Shonen', draw: slash }, { id: 'flames', n: 'Spirit Flame', genre: 'Shonen', draw: flames },
  { id: 'sakura', n: 'Blossom', genre: 'Ninja & Samurai', draw: sakura }, { id: 'waves', n: 'Tide', genre: 'Ninja & Samurai', draw: waves },
  { id: 'ink', n: 'Ink Circle', genre: 'Ninja & Samurai', draw: ink }, { id: 'peaks', n: 'Summit', genre: 'Ninja & Samurai', draw: peaks },
  { id: 'bubbles', n: 'Droplets', genre: 'Fantasy', draw: bubbles }, { id: 'crystals', n: 'Crystals', genre: 'Fantasy', draw: crystals },
  { id: 'magic', n: 'Rune Circle', genre: 'Fantasy', draw: magic }, { id: 'sky', n: 'Cloud Realm', genre: 'Fantasy', draw: sky },
  { id: 'cosmic', n: 'Cosmos', genre: 'Sci-fi', draw: cosmic }, { id: 'city', n: 'Neon City', genre: 'Sci-fi', draw: city },
  { id: 'tech', n: 'Hex Grid', genre: 'Sci-fi', draw: tech }, { id: 'moon', n: 'Moonrise', genre: 'Night', draw: moon },
  { id: 'halftone', n: 'Halftone', genre: 'Manga', draw: halftone },
];

export const THEMES = MOTIFS.flatMap(m => PALETTES.map(p => ({ id: `${m.id}-${p.id}`, name: `${p.n} ${m.n}`, genre: p.mono ? 'Manga' : m.genre, motif: m, palette: p, ink: p.ink })));
/* ---------- wallpaper stickers: raster art served from /public/wallpapers, sorted by category ---------- */
const counts = {};
export const WALLPAPER_THEMES = WALLPAPERS.map(([key, genre, ink, title]) => {
  const live = key.startsWith('l'); const dir = live ? 'live' : 'img';
  counts[genre] = (counts[genre] || 0) + 1;
  return {
    id: `wp-${key}`, name: title || `${genre} ${String(counts[genre]).padStart(2, '0')}`, genre: live ? 'Live' : genre, ink, wallpaper: true,
    src: `/wallpapers/${dir}/${key}.webp`, thumb: `/wallpapers/${dir}/${key}-t.webp`, video: live ? `/wallpapers/${dir}/${key}.mp4` : undefined,
  };
});
export const WALLPAPER_GENRES = [...new Set(WALLPAPER_THEMES.map(t => t.genre))].sort((a, b) => (a === 'Live' ? -1 : b === 'Live' ? 1 : 0));

export const defaultThemeFor = (id) => THEMES[hash(String(id || 'x')) % THEMES.length];

/* ---------- custom stickers (user's own artwork, kept on the device) ---------- */
const CUSTOM_KEY = 'movo.customStickers.v1';
const MAX_CUSTOM_STICKER_BYTES = 10 * 1024 * 1024;
const MAX_CUSTOM_STICKER_PIXELS = 24_000_000;
const ALLOWED_CUSTOM_STICKER_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);
let customList = [];
try { customList = JSON.parse(localStorage.getItem(CUSTOM_KEY)) || []; } catch { customList = []; }
const listeners = new Set();
const saveCustom = () => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    window.localStorage.setItem(CUSTOM_KEY, JSON.stringify(customList));
    listeners.forEach(fn => fn(customList));
    return true;
  } catch { return false; }
};
export function useCustomStickers() {
  const [list, setList] = useState(customList);
  useEffect(() => { listeners.add(setList); setList(customList); return () => listeners.delete(setList); }, []);
  return list;
}
export const removeCustomSticker = (id) => {
  const previous = customList;
  const next = previous.filter(s => s.id !== id);
  if (next.length === previous.length) return true;
  customList = next;
  if (!saveCustom()) {
    customList = previous;
    return false;
  }
  return true;
};

export const clearCustomStickers = () => {
  const previous = customList;
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    window.localStorage.removeItem(CUSTOM_KEY);
    customList = [];
    listeners.forEach(fn => fn(customList));
    return true;
  } catch {
    customList = previous;
    return false;
  }
};

/* Crop to the card ratio at 2x (1712x1080), while bounding input size and decoded pixels. */
export function addCustomSticker(file) {
  return new Promise((resolve, reject) => {
    if (!file) { reject(new Error(tr('Choose an image file.'))); return; }
    if (!ALLOWED_CUSTOM_STICKER_TYPES.has(String(file.type || '').toLowerCase())) {
      reject(new Error(tr('Choose a PNG, JPEG, WebP, GIF, or AVIF image. SVG and other formats are not supported.')));
      return;
    }
    if (!Number.isFinite(file.size) || file.size <= 0) {
      reject(new Error(tr('The selected image is empty or unreadable.')));
      return;
    }
    if (file.size > MAX_CUSTOM_STICKER_BYTES) {
      reject(new Error(tr('Images must be 10 MB or smaller.')));
      return;
    }

    let url;
    try { url = URL.createObjectURL(file); } catch {
      reject(new Error(tr('This browser could not open the selected image.')));
      return;
    }
    const img = new Image();
    img.onload = () => {
      try {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        if (!width || !height || width * height > MAX_CUSTOM_STICKER_PIXELS) {
          throw new Error(tr('Image dimensions are too large. Choose an image under 24 megapixels.'));
        }
        const cw = W * 2; const ch = H * 2;
        const canvas = document.createElement('canvas'); canvas.width = cw; canvas.height = ch;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error(tr('This browser could not process the image. Try a different image format.'));
        const scale = Math.max(cw / width, ch / height);
        const dw = width * scale; const dh = height * scale;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
        const px = ctx.getImageData(0, Math.round(ch * 0.62), cw, Math.round(ch * 0.38)).data;
        let lum = 0; let n = 0;
        for (let i = 0; i < px.length; i += 64) { lum += 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]; n += 1; }
        const baseName = String(file.name || '').replace(/[\u0000-\u001f\u007f]/g, '').replace(/\.[^.]+$/, '').trim();
        const sticker = { id: `custom-${Date.now()}`, name: baseName.slice(0, 24) || 'My sticker', src: canvas.toDataURL('image/jpeg', 0.92), ink: n && lum / n > 150 ? 'dark' : 'light', custom: true };
        const previous = customList;
        customList = [sticker, ...previous].slice(0, 8);
        if (!saveCustom()) {
          customList = previous;
          throw new Error(tr('The sticker could not be saved on this device. Browser storage may be full or unavailable; remove a large sticker or free storage, then try again.'));
        }
        resolve(sticker);
      } catch (err) {
        reject(err instanceof Error ? err : new Error(tr('Could not process that image. Try another file.')));
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(tr('Could not read that image. Choose a supported PNG, JPEG, WebP, GIF, or AVIF file.'))); };
    try { img.src = url; } catch {
      URL.revokeObjectURL(url);
      reject(new Error(tr('This browser could not open the selected image.')));
    }
  });
}
export const findSticker = (id, list = customList) => (id ? (list.find(s => s.id === id) || THEMES.find(t => t.id === id) || WALLPAPER_THEMES.find(t => t.id === id) || null) : null);
export { rng, hash };
