/** Aries, MOVO's default mascot. Original resolution-independent artwork. */
export const states = [
  { id: 'welcome', label: 'Welcome', description: 'A little hello, a fresh start.' },
  { id: 'happy', label: 'Happy', description: 'The little things add up.' },
  { id: 'thinking', label: 'Thinking', description: 'Let’s figure it out together.' },
  { id: 'celebrate', label: 'Celebrating', description: 'You did it. Happy little hooves!' },
  { id: 'reminder', label: 'Gentle reminder', description: 'A friendly nudge for what’s next.' },
  { id: 'sleeping', label: 'Sleepy', description: 'Rest easy. You’re doing just fine.' },
  { id: 'shy', label: 'Shy', description: 'Small steps count, too.' },
  { id: 'love', label: 'Loved', description: 'A little love for your progress.' },
  { id: 'focused', label: 'Focused', description: 'One goal. A little determination.' },
  { id: 'surprised', label: 'Surprised', description: 'Oh! A lovely little surprise.' },
  { id: 'cheering', label: 'Cheering', description: 'Your biggest, fluffiest supporter.' },
  { id: 'waving', label: 'Waving', description: 'Always happy to see you.' },
  { id: 'sad', label: 'Concerned', description: 'A little care when a limit is near.' },
  { id: 'angry', label: 'Determined', description: 'Let’s get back on track together.' },
];
let instance = 0;
// Ram-horn geometry: a tapering spiral tube from the root (tucked under the wool) curling out and back in.
const f = n => Math.round(n * 10) / 10;
function hornGeometry({ cx = 84, cy = 136, r0 = 50, r1 = 11, a0 = -38, sweep = 470, w0 = 30, w1 = 7, steps = 72, ridges = 15 } = {}) {
  const pts = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps, e = 1 - Math.pow(1 - t, 1.35);
    const a = (a0 - sweep * t) * Math.PI / 180, r = r0 + (r1 - r0) * e;
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), w: w0 + (w1 - w0) * Math.pow(t, .85), t });
  }
  const side = pts.map((p, i) => {
    const q = pts[Math.min(i + 1, steps)], o = pts[Math.max(i - 1, 0)];
    const dx = q.x - o.x, dy = q.y - o.y, l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l, ny = dx / l;
    return { ...p, ox: p.x + nx * p.w / 2, oy: p.y + ny * p.w / 2, ix: p.x - nx * p.w / 2, iy: p.y - ny * p.w / 2, nx, ny };
  });
  const tip = side[steps];
  const outline = `M${side.map(p => `${f(p.ox)} ${f(p.oy)}`).join('L')}Q${f(tip.x + (tip.x - side[steps - 2].x) * 1.4)} ${f(tip.y + (tip.y - side[steps - 2].y) * 1.4)} ${f(tip.ix)} ${f(tip.iy)}L${side.slice().reverse().map(p => `${f(p.ix)} ${f(p.iy)}`).join('L')}Z`;
  const ridgeLines = [];
  for (let k = 1; k <= ridges; k += 1) {
    const p = side[Math.round(steps * (k / (ridges + 1)) ** .9)];
    const bow = p.w * .18;
    ridgeLines.push(`M${f(p.ox)} ${f(p.oy)}Q${f(p.x + (p.ox - p.ix) * 0 - p.ny * -bow)} ${f(p.y + p.nx * -bow)} ${f(p.ix)} ${f(p.iy)}`);
  }
  const edge = side.slice(2, Math.round(steps * .62)).map(p => `${f(p.x + (p.ox - p.x) * .62)} ${f(p.y + (p.oy - p.y) * .62)}`);
  const inner = side.slice(Math.round(steps * .08), steps - 3).map(p => `${f(p.x + (p.ix - p.x) * .7)} ${f(p.y + (p.iy - p.y) * .7)}`);
  return { outline, ridges: ridgeLines.join(''), highlight: `M${edge.join('L')}`, shade: `M${inner.join('L')}` };
}

// Computed once: the same horn for every state, mirrored for the right side.
const HORN = hornGeometry({ cx: 90, cy: 138, a0: -16, r0: 50, sweep: 480 });
const safe = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function ariesSVG(state = 'welcome', options = {}) {
  if (!states.some(item => item.id === state)) state = 'welcome';
  const {className = '', decorative = true, animated = true} = options;
  const p = options.idPrefix ? `aries-${String(options.idPrefix).replace(/[^a-zA-Z0-9_-]/g, '')}` : `aries-${++instance}`;
  const url = name => `url(#${p}-${name})`;
  const closed = ['happy', 'celebrate', 'cheering', 'sleeping'].includes(state);
  const brow = state === 'sad' ? '<path d="m149 150 15-5m32 0 15 5" stroke="#b2a58e" stroke-width="3.6" stroke-linecap="round"/>' : state === 'angry' ? '<path d="m150 146 15 6m31 0 15-6" stroke="#978c76" stroke-width="3.6" stroke-linecap="round"/>' : state === 'focused' ? '<path d="m151 149 14 3m29 0 14-3" stroke="#87785f" stroke-width="3.4" stroke-linecap="round"/>' : state === 'surprised' ? '<path d="M151 146q8-8 15-2m30 0q8-6 15 2" stroke="#b8a98f" stroke-width="3.8" stroke-linecap="round" fill="none"/>' : '<path d="M151 147q6-5 12-1m35 0q6-4 12 1" stroke="#c5b89f" stroke-width="3.5" stroke-linecap="round" fill="none"/>';
  const eye = (x, mirrored = false) => {
    if (state === 'cheering') return `<path d="m${x} 157 3 5 6 1-4 4 1 6-6-3-6 3 1-6-4-4 6-1Z" fill="#55583e"/>`;
    if (state === 'love') return `<path d="M${x} 164c-9-12-20 0 0 12 20-12 9-24 0-12" fill="#65453f"/>`;
    if (closed) return `<path d="M${x-8} 168q8 ${state === 'sleeping' ? '7' : '-12'} 16 0" fill="none" stroke="#383a32" stroke-width="4.8" stroke-linecap="round"/>`;
    if (state === 'waving' && mirrored) return `<path d="M${x-8} 168q8-12 16 0" fill="none" stroke="#383a32" stroke-width="4.8" stroke-linecap="round"/>`;
    if (state === 'reminder' && mirrored) return `<path d="m${x-7} 165 7 5 7-5" fill="none" stroke="#383a32" stroke-width="4.4" stroke-linecap="round"/>`;
    const shift = state === 'shy' ? -3 : state === 'thinking' ? 3 : 0;
    return `<g class="aries-eye"><ellipse cx="${x+shift}" cy="166" rx="${state==='surprised'?8:6.5}" ry="${state==='surprised'?11:10}" fill="#35382f"/><ellipse cx="${x+shift-1.6}" cy="162.5" rx="2.1" ry="2.7" fill="#fffaf0" opacity=".92"/><circle cx="${x+shift+2}" cy="170" r="1" fill="#fffaf0" opacity=".4"/></g>`;
  };
  let mouth = '<path d="M180 186v7m0 0c-6 9-15 2-13-3m13 3c6 9 15 2 13-3" fill="none" stroke="#414237" stroke-width="3.2" stroke-linecap="round"/>';
  if (['celebrate', 'cheering','happy'].includes(state)) mouth = '<path d="M168 191q12 7 24 0c-1 20-23 20-24 0Z" fill="#4d443a"/><path d="M173 201q7-7 14 0c-3 6-11 6-14 0Z" fill="#dfa39a"/>';
  if (state === 'surprised') mouth = '<ellipse cx="180" cy="197" rx="6" ry="8" fill="#4d443a"/><ellipse cx="178" cy="198" rx="2" ry="3" fill="#dba79c" opacity=".65"/>';
  if (state === 'sleeping') mouth = '<path d="M174 195q6 4 12 0" fill="none" stroke="#414237" stroke-width="3" stroke-linecap="round"/>';
  if (state === 'thinking') mouth = '<path d="M178 197q8-5 13-1" fill="none" stroke="#414237" stroke-width="3" stroke-linecap="round"/>';
  if (state === 'sad') mouth = '<path d="M173 198q7-7 14 0" fill="none" stroke="#414237" stroke-width="3" stroke-linecap="round"/>';
  if (state === 'angry') mouth = '<path d="M173 196q7-3 14 0" fill="none" stroke="#414237" stroke-width="3" stroke-linecap="round"/>';
  if (state === 'focused') mouth = '<path d="M174 196q6 3 12 0" fill="none" stroke="#414237" stroke-width="3" stroke-linecap="round"/>';
  if (state === 'shy') mouth = '<path d="M175 196q5 6 10 0" fill="none" stroke="#414237" stroke-width="3" stroke-linecap="round"/>';
  let props = '';
  if (state === 'thinking') props = '<g class="aries-thought"><circle cx="267" cy="95" r="19" fill="#e8ecd8"/><text x="267" y="103" text-anchor="middle" fill="#638166" font-size="26" font-weight="600" font-family="Georgia,serif">?</text><circle cx="246" cy="119" r="4" fill="#e8ecd8"/><circle cx="238" cy="129" r="2.5" fill="#e8ecd8"/></g>';
  if (state === 'celebrate' || state === 'cheering') props = '<g class="aries-confetti"><path d="m70 79 5-12m214 44 11-5m-41-54 5 10m-202 119-8 2" stroke="#be9659" stroke-width="5" stroke-linecap="round"/><path d="m89 48 4 7m215 104 4 7M54 115l8 2m216-76 7-5" stroke="#81a484" stroke-width="5" stroke-linecap="round"/><path d="m273 72 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" fill="#d1aa60"/><circle cx="67" cy="153" r="3" fill="#81a484"/><circle cx="274" cy="204" r="3" fill="#be9659"/></g>';
  if (state === 'love') props = '<g class="aries-hearts" fill="#d7a193"><path d="M76 112c-12-17-30 1 0 19 30-18 12-36 0-19Z"/><path d="M275 79c-9-12-22 1 0 14 22-13 9-27 0-14Z"/><path d="M286 178c-6-8-15 0 0 9 15-9 6-17 0-9Z"/></g>';
  if (state === 'sleeping') props = '<g class="aries-zzz" fill="#88a18b" font-family="Georgia,serif" font-weight="600"><text x="251" y="108" font-size="18">z</text><text x="271" y="88" font-size="23">z</text><text x="294" y="61" font-size="30">z</text></g>';
  if (state === 'surprised') props = '<g stroke="#d0ad6c" stroke-width="4" stroke-linecap="round"><path d="m262 82 3-12m12 21 9-8"/><circle cx="266" cy="102" r="1"/></g>';
  if (state === 'waving' || state === 'welcome') props = '<g class="aries-greeting" fill="none" stroke="#99ad8c" stroke-width="3" stroke-linecap="round"><path d="m275 224 7-6m-7-5 2-8"/></g>';
  if (options.pose === 'scan') props += '<g data-prop="receipt" transform="translate(253 226) rotate(7)"><path d="M0 0h44v60l-5-4-6 4-5-4-6 4-6-4-5 4-6-4-5 4Z" fill="#fff9ed" stroke="#d9d0bb" stroke-width="1.5"/><path d="M9 12h26M9 22h20M9 32h26M9 44h16" stroke="#c9c8b0" stroke-width="3" stroke-linecap="round"/><path d="M-5 27h54" stroke="#698e6c" stroke-width="3" stroke-linecap="round"/></g>';
  if (options.pose === 'auto') props += '<g data-prop="automatic"><circle cx="277" cy="251" r="23" fill="#547f5b"/><path d="m282 233-17 22h12l-4 15 18-23h-12Z" fill="#fff9ed" stroke-linejoin="round"/></g>';
  if (options.pose === 'happy') props += '<g data-prop="goal"><circle cx="282" cy="82" r="18" fill="#698e6c"/><path d="m273 82 6 6 12-13" stroke="#fff9ed" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></g>';
  const calendar = state === 'reminder' ? '<g class="aries-calendar" transform="translate(255 231) rotate(7)"><rect width="48" height="48" rx="9" fill="#e9e1ce"/><rect x="1" y="1" width="46" height="45" rx="8" fill="#fff9ed"/><path d="M0 15h48" stroke="#d9d0bb" stroke-width="2"/><path d="M12-3v9M36-3v9" stroke="#7d8770" stroke-width="4" stroke-linecap="round"/><g fill="#c9c8b0"><rect x="10" y="23" width="7" height="7" rx="2"/><rect x="22" y="23" width="7" height="7" rx="2"/><rect x="34" y="23" width="7" height="7" rx="2"/><rect x="10" y="35" width="7" height="7" rx="2"/><rect x="22" y="35" width="7" height="7" rx="2"/></g><rect x="34" y="35" width="7" height="7" rx="2" fill="#698e6c"/></g>' : '';
  const glasses = state === 'focused' ? '<g fill="none" stroke="#506552" stroke-width="2.5"><rect x="145" y="155" width="28" height="24" rx="9"/><rect x="188" y="155" width="28" height="24" rx="9"/><path d="M173 163q7-5 15 0m-43-1-7-3m78 3 7-3"/></g>' : '';
  return `<svg class="aries aries--${state}${animated ? ' is-animated' : ''} ${safe(className)}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 360" fill="none" ${decorative ? 'aria-hidden="true"' : `role="img" aria-labelledby="${p}-title"`}>
  ${decorative?'':`<title id="${p}-title">Aries, MOVO’s ${safe(states.find(s=>s.id===state).label.toLowerCase())} ram mascot</title>`}
  <defs>
    <linearGradient id="${p}-wool" x1="123" y1="218" x2="234" y2="318" gradientUnits="userSpaceOnUse"><stop stop-color="#fff9ea"/><stop offset=".56" stop-color="#f6eddc"/><stop offset="1" stop-color="#e6d9c0"/></linearGradient>
    <radialGradient id="${p}-face" cx="0" cy="0" r="1" gradientTransform="translate(166 147) rotate(64) scale(100 90)" gradientUnits="userSpaceOnUse"><stop stop-color="#fffaf0"/><stop offset=".65" stop-color="#fbf1df"/><stop offset="1" stop-color="#eadcc1"/></radialGradient>
    <linearGradient id="${p}-horn" x1="132" y1="88" x2="58" y2="196" gradientUnits="userSpaceOnUse"><stop stop-color="#f6eedd"/><stop offset=".42" stop-color="#ddcaa8"/><stop offset="1" stop-color="#a88f69"/></linearGradient>
    <linearGradient id="${p}-horn-inner" x1="60" y1="96" x2="104" y2="180" gradientUnits="userSpaceOnUse"><stop stop-color="#8a7556"/><stop offset="1" stop-color="#6f5c42"/></linearGradient>
    <linearGradient id="${p}-scarf" x1="142" y1="211" x2="219" y2="248" gradientUnits="userSpaceOnUse"><stop stop-color="#3f7050"/><stop offset="1" stop-color="#1c4935"/></linearGradient>
    <linearGradient id="${p}-scarf-tail" x1="207" y1="230" x2="237" y2="277" gradientUnits="userSpaceOnUse"><stop stop-color="#346746"/><stop offset="1" stop-color="#204832"/></linearGradient>
    <linearGradient id="${p}-hoof" x1="152" y1="300" x2="160" y2="323" gradientUnits="userSpaceOnUse"><stop stop-color="#616451"/><stop offset="1" stop-color="#3e4438"/></linearGradient>
    <radialGradient id="${p}-blush"><stop stop-color="#e9b49c" stop-opacity=".72"/><stop offset="1" stop-color="#e9b49c" stop-opacity="0"/></radialGradient>
    <radialGradient id="${p}-shadow"><stop stop-color="#1c1d17" stop-opacity=".3"/><stop offset=".55" stop-color="#1c1d17" stop-opacity=".12"/><stop offset="1" stop-color="#1c1d17" stop-opacity="0"/></radialGradient>
    <radialGradient id="${p}-contact"><stop stop-color="#11120e" stop-opacity=".62"/><stop offset=".6" stop-color="#11120e" stop-opacity=".22"/><stop offset="1" stop-color="#11120e" stop-opacity="0"/></radialGradient>
    <filter id="${p}-soft-shadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="#615c41" flood-opacity=".09"/></filter>
  </defs>
  <g class="aries-shadow" aria-hidden="true"><ellipse cx="182" cy="326" rx="94" ry="15" fill="${url('shadow')}"/><ellipse cx="154" cy="321" rx="22" ry="5" fill="${url('contact')}"/><ellipse cx="208" cy="321" rx="22" ry="5" fill="${url('contact')}"/><ellipse cx="181" cy="322" rx="56" ry="6.5" fill="${url('contact')}" opacity=".55"/></g>
  <g class="aries-figure">
    <g class="aries-leg aries-leg-left"><path d="M143 286c-8 6-10 22-5 30 6 7 22 7 29 1l3-29Z" fill="${url('wool')}"/><path d="M137 307q16 6 32 0l-1 10c-4 9-26 10-30 0Z" fill="${url('hoof')}"/><path d="m153 312 1 9" stroke="#93917b" stroke-opacity=".5" stroke-width="1.5"/></g>
    <g class="aries-leg aries-leg-right"><path d="M192 288c-4 9-2 25 3 30 7 6 24 4 28-3 4-9 0-24-5-29Z" fill="${url('wool')}"/><path d="M191 308q15 6 32-2l1 9c-2 9-24 11-29 3Z" fill="${url('hoof')}"/><path d="m208 313 1 8" stroke="#93917b" stroke-opacity=".5" stroke-width="1.5"/></g>
    <g class="aries-body">
      <path d="M125 251c-13-5-21 4-19 14 2 9 15 12 21 5" fill="${url('wool')}"/>
      <path d="M143 218c-7 1-12 8-12 15-10 2-16 11-14 21-6 10-2 22 5 27-1 12 8 22 19 22 10 8 21 8 30 3 12 7 26 6 35 0 12 4 25-2 28-13 12-5 14-18 10-27 4-12-2-22-11-26 0-12-9-20-20-20Z" fill="${url('wool')}" filter="${url('soft-shadow')}"/>
      <path d="M144 249c-11 7-13 27-3 35 10 9 45 12 63 2 11-6 16-25 9-35" fill="#fff9ed" opacity=".42"/>
      <path d="M124 261q-4-7 2-13m11 40q-8 0-9-6m81 13q8 2 12-4" stroke="#d8cbb0" stroke-opacity=".48" stroke-width="2" stroke-linecap="round"/>
      <path d="M151 250q7-4 12 0m24 23q6 4 12 0m-52 7q5 4 10 0" stroke="#fffdf4" stroke-opacity=".8" stroke-width="2.4" stroke-linecap="round"/>
    </g>
    <g class="aries-arm aries-arm-left"><path d="M132 238c-12-3-21 8-22 19-1 9 5 13 11 10 7-4 12-14 15-23Z" fill="${url('wool')}"/><path d="M110 257q5 6 13 4c-3 10-11 10-13 3Z" fill="#555e49"/><path d="M116 242q5-5 10-4" stroke="#fffdf4" stroke-width="3" stroke-linecap="round"/></g>
    <g class="aries-arm aries-arm-right"><path d="M229 236c12-3 21 8 22 19 1 9-5 13-11 10-7-4-12-14-15-23Z" fill="${url('wool')}"/><path d="M251 255q-5 6-13 4c3 10 11 10 13 3Z" fill="#555e49"/><path d="M245 240q-5-5-10-4" stroke="#fffdf4" stroke-width="3" stroke-linecap="round"/></g>
    <g class="aries-head">
      <g class="aries-horn aries-horn-left">
        <path d="${HORN.outline}" fill="${url('horn')}" stroke="#9a8462" stroke-opacity=".3" stroke-width="1.1" stroke-linejoin="round"/>
        <path d="${HORN.shade}" stroke="${url('horn-inner')}" stroke-opacity=".16" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="${HORN.ridges}" stroke="#8c7553" stroke-opacity=".26" stroke-width="1.3" stroke-linecap="round"/>
        <path d="${HORN.highlight}" stroke="#fffaf0" stroke-opacity=".72" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
      <g class="aries-horn aries-horn-right" transform="translate(360 0) scale(-1 1)">
        <path d="${HORN.outline}" fill="${url('horn')}" stroke="#9a8462" stroke-opacity=".3" stroke-width="1.1" stroke-linejoin="round"/>
        <path d="${HORN.shade}" stroke="${url('horn-inner')}" stroke-opacity=".16" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="${HORN.ridges}" stroke="#8c7553" stroke-opacity=".26" stroke-width="1.3" stroke-linecap="round"/>
        <path d="${HORN.highlight}" stroke="#fffaf0" stroke-opacity=".72" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
      <path d="M128 150c-18-14-34-10-37-4 2 14 13 23 28 19m114-15c18-14 34-10 37-4-2 14-13 23-28 19" fill="#f6eddc"/>
      <path d="M119 153c-8-6-15-6-20-5 4 8 10 11 19 9m124-4c8-6 15-6 20-5-4 8-10 11-19 9" fill="#d8c7ac" opacity=".65"/>
      <path d="M211 225c11 4 16 20 17 29l10 16c-1 6-9 9-16 5l-14-22-4-19Z" fill="${url('scarf-tail')}"/>
      <path d="M206 226c5 12 5 27 5 43-5 5-13 5-17 0l1-34Z" fill="#2a573c"/>
      <path d="M130 207c-7 5-10 17-2 22 19 14 74 15 99 2 7-4 7-15 1-21Z" fill="${url('scarf')}"/>
      <path d="M131 216q48 17 95 1" stroke="#78966c" stroke-opacity=".2" stroke-width="3" stroke-linecap="round"/>
      <path d="M116 151c-4-17 4-32 17-37 0-14 14-22 26-19 6-15 27-17 38-7 14-3 29 6 30 19 17 2 27 15 25 29 14 8 17 23 10 35 6 16-2 29-15 33-5 14-18 20-32 17-10 10-25 13-38 8-15 6-30 0-37-8-15 2-28-9-29-21-13-9-14-26-7-38Z" fill="${url('face')}" filter="${url('soft-shadow')}"/>
      <path d="M128 131q5-12 19-12m13-16q5-5 12-2m26-2q8 0 10 7" stroke="#fffdf7" stroke-width="4" stroke-linecap="round" opacity=".78"/>
      <path d="M163 111c0-12 14-19 22-14-8-1-12 6-10 11 7-6 17-4 21 4-12-5-19 2-21 8-6 0-11-4-12-9Z" fill="#f9efdb"/>
      ${brow}
      ${eye(157)}${eye(204,true)}
      <ellipse cx="140" cy="185" rx="16" ry="10" fill="${url('blush')}"/><ellipse cx="220" cy="185" rx="16" ry="10" fill="${url('blush')}"/>
      ${state==='shy'?'<path d="m134 182 1 5m5-5 1 5m74-5 1 5m5-5 1 5" stroke="#d4a88d" stroke-width="1.5" stroke-linecap="round" opacity=".7"/>':''}
      <path d="M173 180c3-3 12-3 15 0 2 3-3 8-7 8-4 0-10-5-8-8Z" fill="#44463a"/><path d="M176 180q5-1 9 0" stroke="#777863" stroke-width="1.3" stroke-linecap="round"/>
      ${mouth}${glasses}
      <path d="M137 209q4 5 10 4m65 1q5-1 8-5" stroke="#e1d1b4" stroke-opacity=".4" stroke-width="2" stroke-linecap="round"/>
    </g>
    ${calendar}
  </g>${props}
</svg>`;
}

/** Legacy guide-pose API, kept for the existing guide and standalone exports. */
export const ARIES_POSES = ['hello', 'home', 'happy', 'alert', 'scan', 'auto', 'point'];
export const POSE_STATES = { hello: 'waving', home: 'welcome', happy: 'happy', alert: 'reminder', scan: 'focused', auto: 'cheering', point: 'thinking' };
export function ariesInner(state, options = {}) {
  return ariesSVG(state, options).replace(/^<svg\b[^>]*>/, '').replace(/<\/svg>$/, '');
}
export function ariesSvg(pose = 'home', id = 'ar') {
  const selected = ARIES_POSES.includes(pose) ? pose : 'home';
  return `<g fill="none" transform="scale(0.555555556)">${ariesInner(POSE_STATES[selected], { idPrefix: id, animated: false, pose: selected })}</g>`;
}
export const ariesDocument = (pose, size = 200) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="${size}" height="${size}" fill="none">${ariesSvg(pose)}</svg>`;
