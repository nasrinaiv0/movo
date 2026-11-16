/*
 * MOVO Aries, the welcoming mascot (owner's character, 2026-11-16): a small cream ram with grey spiral horns and a
 * dark-green scarf. Original vector art, drawn here from numbers so every pose shares one body; no image files.
 * `ariesSvg(pose)` returns the inner markup of a 200×200 SVG. Poses:
 *   hello  smiles and waves (welcome screens)             home   stands calmly
 *   happy  eyes closed, a green tick (goal reached, done)   alert  looks at a calendar (bill due)
 *   scan   holds up a receipt (AI receipt scan)             auto   a small bolt (automatic logging)
 *   point  looks up at what is being explained (tour steps)
 * Colours are fixed (the character keeps its look in every theme); a soft outline keeps it readable on white.
 */
export const ARIES_POSES = ['hello', 'home', 'happy', 'alert', 'scan', 'auto', 'point'];

const n1 = v => Math.round(v * 10) / 10;
const rad = d => (d * Math.PI) / 180;
const smooth = t => t * t * (3 - 2 * t);

/* The horn is a spiral ribbon: thick where it leaves the head, thinner as it curls in on itself. */
function hornSpine(t) {
  const a = rad(-30 - 420 * t);
  const r = 30 - 24 * (0.5 * t + 0.5 * smooth(t));
  const w = 4 + 18 * Math.pow(1 - t, 0.85);
  return { x: 35 + r * Math.cos(a), y: 89 + r * Math.sin(a), w };
}
function hornGeometry() {
  const N = 64; const left = []; const right = []; const pts = [];
  for (let i = 0; i <= N; i += 1) pts.push(hornSpine(i / N));
  for (let i = 0; i <= N; i += 1) {
    const a = pts[Math.max(0, i - 1)]; const b = pts[Math.min(N, i + 1)];
    const dx = b.x - a.x; const dy = b.y - a.y; const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len; const ny = dx / len; const p = pts[i];
    left.push([p.x + nx * p.w / 2, p.y + ny * p.w / 2]); right.push([p.x - nx * p.w / 2, p.y - ny * p.w / 2]);
  }
  const line = list => list.map(([x, y]) => `${n1(x)} ${n1(y)}`).join(' L ');
  const tip = pts[N];
  const outline = `M ${line(left)} A ${n1(tip.w / 2)} ${n1(tip.w / 2)} 0 0 1 ${n1(right[N][0])} ${n1(right[N][1])} L ${line([...right].reverse())} Z`;
  // A lighter band along the outside edge, and fine growth rings across the horn.
  const sheen = `M ${line(left.slice(2, 40).map(([x, y], i) => { const p = pts[i + 2]; return [x + (p.x - x) * 0.3, y + (p.y - y) * 0.3]; }))}`;
  const rings = [];
  for (let i = 6; i < N - 10; i += 6) rings.push(`M ${n1(left[i][0])} ${n1(left[i][1])} Q ${n1(pts[i + 1].x)} ${n1(pts[i + 1].y)} ${n1(right[i][0])} ${n1(right[i][1])}`);
  return { outline, sheen, rings: rings.join(' ') };
}
const HORN = hornGeometry();

const C = { wool: '#fdf8ee', woolShade: '#efe5d2', woolDeep: '#e3d6bd', line: '#cdbfa3', horn: '#b7b3ad', hornDark: '#8b8782', hornLight: '#d9d6d1', scarf: '#1f6040', scarfDark: '#164a30', scarfLight: '#2f7d55', ink: '#232326', hoof: '#2b2b2e', blush: '#f4a9a0', earIn: '#f6d9cb', green: '#2fa866' };

const horn = (id) => `<g><path d="${HORN.outline}" fill="url(#${id}h)" stroke="${C.hornDark}" stroke-opacity=".35" stroke-width=".8" stroke-linejoin="round"/>`
  + `<path d="${HORN.rings}" fill="none" stroke="${C.hornDark}" stroke-opacity=".2" stroke-width=".9" stroke-linecap="round"/>`
  + `<path d="${HORN.sheen}" fill="none" stroke="${C.hornLight}" stroke-opacity=".75" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></g>`;

const EYES = {
  open: (x, look = 0) => `<g transform="translate(${x + look} 97)"><ellipse rx="5.3" ry="6.6" fill="${C.ink}"/><circle cx="${-1.5 + look * 0.6}" cy="-2.4" r="2" fill="#fff"/><circle cx="${1.7 + look * 0.4}" cy="2.3" r=".9" fill="#fff" opacity=".8"/></g>`,
  closed: (x) => `<path d="M ${x - 6} 98.5 Q ${x} 90.5 ${x + 6} 98.5" fill="none" stroke="${C.ink}" stroke-width="2.8" stroke-linecap="round"/>`,
};
const leg = (x, shade) => `<g><path d="M ${x - 8} 158 L ${x - 7.6} 177 Q ${x - 7.6} 187 ${x} 187 Q ${x + 7.6} 187 ${x + 7.6} 177 L ${x + 8} 158 Z" fill="${shade}" stroke="${C.line}" stroke-opacity=".6" stroke-width=".8"/>`
  + `<path d="M ${x - 7.8} 177 Q ${x} 179.5 ${x + 7.8} 177 L ${x + 7.8} 178.5 Q ${x + 7.8} 187.4 ${x} 187.4 Q ${x - 7.8} 187.4 ${x - 7.8} 178.5 Z" fill="${C.hoof}"/></g>`;

const PROPS = {
  hello: `<g fill="none" stroke="${C.green}" stroke-width="2.6" stroke-linecap="round"><path d="M 166 112 Q 172 117 173 125"/><path d="M 172 104 Q 181 111 182 123"/></g>`,
  happy: `<g><circle cx="164" cy="56" r="15" fill="${C.green}"/><path d="M 157 56.5 L 162 61.5 L 171.5 51" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>`
    + `<g fill="${C.green}" opacity=".85"><path d="M 30 44 l 2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 z"/><path d="M 178 92 l 1.4 3.4 3.4 1.4 -3.4 1.4 -1.4 3.4 -1.4 -3.4 -3.4 -1.4 3.4 -1.4 z"/></g></g>`,
  alert: `<g><rect x="146" y="118" width="40" height="40" rx="8" fill="#fffdf7" stroke="${C.line}" stroke-width="1"/><path d="M 146 130 L 186 130" stroke="${C.line}" stroke-width="1"/>`
    + `<path d="M 154 118 a 8 8 0 0 1 24 0" fill="none"/><g stroke="${C.ink}" stroke-width="2.6" stroke-linecap="round"><path d="M 156 114 L 156 121"/><path d="M 176 114 L 176 121"/></g>`
    + `<g fill="${C.ink}">${[0, 1, 2].map(i => `<rect x="${152.5 + i * 10}" y="135" width="6.5" height="6.5" rx="1.6"/>`).join('')}${[0, 1].map(i => `<rect x="${152.5 + i * 10}" y="146" width="6.5" height="6.5" rx="1.6"/>`).join('')}</g>`
    + `<rect x="172.5" y="146" width="6.5" height="6.5" rx="1.6" fill="${C.green}"/>`
    + `<g fill="none" stroke="${C.wool}" stroke-width="2.4" stroke-linecap="round"><path d="M 170 98 L 173 106"/><path d="M 181 101 L 177 108"/></g></g>`,
  scan: `<g transform="rotate(8 164 128)"><path d="M 148 98 L 180 98 L 180 156 l -4 -3 -4 3 -4 -3 -4 3 -4 -3 -4 3 -4 -3 -4 3 Z" fill="#fffdf7" stroke="${C.line}" stroke-width="1" stroke-linejoin="round"/>`
    + `<g stroke="${C.woolDeep}" stroke-width="2.4" stroke-linecap="round"><path d="M 154 108 L 174 108"/><path d="M 154 116 L 168 116"/><path d="M 154 124 L 174 124"/><path d="M 154 132 L 164 132"/></g>`
    + `<path d="M 154 142 L 174 142" stroke="${C.ink}" stroke-width="2.8" stroke-linecap="round"/><path d="M 143 120 L 185 120" stroke="${C.green}" stroke-width="2.4" stroke-linecap="round"/></g>`
    + `<g fill="${C.green}"><path d="M 150 76 l 2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 z"/><path d="M 176 68 l 1.4 3.4 3.4 1.4 -3.4 1.4 -1.4 3.4 -1.4 -3.4 -3.4 -1.4 3.4 -1.4 z" opacity=".8"/></g>`,
  auto: `<g><circle cx="164" cy="128" r="19" fill="${C.green}"/><path d="M 167 114 L 155 131 L 163 131 L 160 143 L 173 125 L 165 125 Z" fill="#fff" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/>`
    + `<g fill="none" stroke="${C.green}" stroke-width="2.4" stroke-linecap="round" opacity=".7"><path d="M 150 100 Q 164 92 178 100"/><path d="M 156 90 Q 164 86 172 90" opacity=".7"/></g></g>`,
};

/**
 * The inner SVG markup for a pose. `id` prefixes the gradient ids so several mascots can share a page.
 */
export function ariesSvg(pose = 'home', id = 'ar') {
  const p = ARIES_POSES.includes(pose) ? pose : 'home';
  const tilt = { hello: -4, happy: -5, alert: 5, scan: 4, auto: 3, point: -6 }[p] || 0;
  const look = { alert: 1.6, scan: 1.6, auto: 1.4, point: 0 }[p] || 0;
  const closed = p === 'happy';
  const eyes = closed ? EYES.closed(85) + EYES.closed(115) : EYES.open(85, look) + EYES.open(115, look);
  const brow = p === 'alert' ? `<g fill="none" stroke="${C.ink}" stroke-opacity=".55" stroke-width="1.8" stroke-linecap="round"><path d="M 79 86 Q 84 83 90 85"/><path d="M 110 85 Q 116 83 121 86"/></g>` : '';
  const mouth = (p === 'hello' || p === 'happy')
    ? `<path d="M 92 111.5 Q 96 116.5 100 112 Q 104 116.5 108 111.5" fill="none" stroke="${C.ink}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M 95.5 115 Q 100 122.5 104.5 115 Q 100 113.2 95.5 115 Z" fill="#d9716c"/>`
    : `<path d="M 93 111.5 Q 96.5 115.8 100 112 Q 103.5 115.8 107 111.5" fill="none" stroke="${C.ink}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;
  const defs = `<defs>`
    + `<radialGradient id="${id}w" cx=".42" cy=".3" r=".85"><stop offset="0" stop-color="#fffdf8"/><stop offset=".62" stop-color="${C.wool}"/><stop offset="1" stop-color="${C.woolShade}"/></radialGradient>`
    + `<linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.wool}"/><stop offset="1" stop-color="${C.woolShade}"/></linearGradient>`
    + `<linearGradient id="${id}h" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.hornLight}"/><stop offset=".45" stop-color="${C.horn}"/><stop offset="1" stop-color="${C.hornDark}"/></linearGradient>`
    + `<linearGradient id="${id}s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.scarfLight}"/><stop offset=".5" stop-color="${C.scarf}"/><stop offset="1" stop-color="${C.scarfDark}"/></linearGradient>`
    + `<radialGradient id="${id}g" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000" stop-opacity=".22"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>`
    + `</defs>`;
  const wool = `fill="url(#${id}w)" stroke="${C.line}" stroke-opacity=".7" stroke-width=".9" stroke-linejoin="round"`;
  const body = `<ellipse cx="94" cy="189" rx="52" ry="5.5" fill="url(#${id}g)"/>`
    + leg(86, C.woolShade) + leg(123, C.woolShade) + leg(68, C.wool) + leg(106, C.wool)
    + `<path d="M 52 146 Q 40 142 42 131 Q 52 130 58 140 Z" ${wool}/>`
    + `<path d="M 52 150 Q 50 128 78 126 L 112 126 Q 136 128 134 152 Q 132 170 110 170 L 74 170 Q 54 170 52 150 Z" fill="url(#${id}b)" stroke="${C.line}" stroke-opacity=".7" stroke-width=".9"/>`
    + `<path d="M 74 165 Q 92 172 112 165" fill="none" stroke="${C.woolDeep}" stroke-opacity=".7" stroke-width="1.2" stroke-linecap="round"/>`;
  const scarf = `<path d="M 124 126 Q 138 128 140 142 L 142 160 Q 142 164 138 163 L 126 160 Q 123 159 123 156 L 121 130 Z" fill="url(#${id}s)"/>`
    + `<path d="M 128 150 L 139 153" stroke="${C.scarfDark}" stroke-opacity=".6" stroke-width="1.4" stroke-linecap="round"/>`
    + `<path d="M 70 118 Q 100 136 132 118 Q 137 126 132 133 Q 100 150 70 133 Q 64 126 70 118 Z" fill="url(#${id}s)"/>`
    + `<path d="M 76 124 Q 100 138 126 124" fill="none" stroke="${C.scarfLight}" stroke-opacity=".55" stroke-width="1.6" stroke-linecap="round"/>`;
  const ear = `<path d="M 64 97 Q 50 94 42 104 Q 51 113 64 107 Z" ${wool}/><path d="M 60 99.5 Q 51 98 46.5 104 Q 52 109 60 105 Z" fill="${C.earIn}"/>`;
  const head = `<g transform="rotate(${tilt} 100 122)">`
    + horn(id) + `<g transform="translate(200 0) scale(-1 1)">${horn(id)}</g>`
    + `<path d="M 100 53 C 126 53 143 69 143 92 C 143 114 127 128 100 128 C 73 128 57 114 57 92 C 57 69 74 53 100 53 Z" ${wool}/>`
    + `<path d="M 88 56 Q 90 44 101 43 Q 99 49 106 47 Q 113 46 113 56 Q 100 62 88 56 Z" ${wool}/>`
    + ear + `<g transform="translate(200 0) scale(-1 1)">${ear}</g>`
    + `<ellipse cx="73" cy="109" rx="7.5" ry="4.6" fill="${C.blush}" opacity=".55"/><ellipse cx="127" cy="109" rx="7.5" ry="4.6" fill="${C.blush}" opacity=".55"/>`
    + brow + eyes
    + `<path d="M 95.6 103.6 Q 100 101.8 104.4 103.6 Q 104 108.6 100 109.2 Q 96 108.6 95.6 103.6 Z" fill="${C.ink}"/><path d="M 100 109 L 100 112" stroke="${C.ink}" stroke-width="2" stroke-linecap="round"/>`
    + mouth + `</g>`;
  return defs + body + scarf + head + (PROPS[p] || '');
}

/** A complete standalone SVG document for a pose (used for previews and static exports). */
export const ariesDocument = (pose, size = 200) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="${size}" height="${size}">${ariesSvg(pose)}</svg>`;
