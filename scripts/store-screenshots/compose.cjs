// Composes the MOVO store screenshots from real captures of the app.
// Usage: node scripts/store-screenshots/compose.cjs <ios|android> [slideNumber...]
const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright');
const { WORK } = require('./lib.cjs');
const REPO = path.join(__dirname, '..', '..');
const PLATFORM = process.argv[2] || 'ios';
const ONLY = process.argv.slice(3).map(Number);
const IOS = PLATFORM === 'ios';
const CAP = path.join(WORK, IOS ? 'cap' : 'cap-android');
const OUT = path.join(REPO, 'store', 'screenshots', PLATFORM); fs.mkdirSync(OUT, { recursive: true });
const W = IOS ? 1320 : 1440, H = IOS ? 2868 : 2560;
const SCREEN = IOS ? { w: 430, h: 932, top: 59 } : { w: 412, h: 915, top: 40 };
const u = W / 100; // layout unit

// ---------- palette ----------
const T = {
  ivory: { bg: '#F2F0EA', bg2: '#E9E6DC', ink: '#0F1C15', sub: '#56645B', eb: '#13784A', accent: '#13844F', shadow: '16,38,27' },
  mint: { bg: '#E7EFE8', bg2: '#D9E6DB', ink: '#0F1C15', sub: '#52645A', eb: '#13784A', accent: '#13844F', shadow: '16,44,30' },
  forest: { bg: '#0C3B28', bg2: '#062417', ink: '#F4F1E8', sub: 'rgba(236,240,232,.72)', eb: '#86E3B4', accent: '#8BE7B8', shadow: '0,10,5' },
  night: { bg: '#0B0D0C', bg2: '#030404', ink: '#F4F1E8', sub: 'rgba(236,240,232,.66)', eb: '#86E3B4', accent: '#8BE7B8', shadow: '0,0,0' },
};
const img = f => 'data:image/png;base64,' + fs.readFileSync(path.join(CAP, f + '.png')).toString('base64');

// ---------- status bars ----------
function statusBar(dark) {
  const c = dark ? '#fff' : '#0b0b0c';
  if (IOS) return `<div class="sb ios" style="color:${c}">
    <span class="sb-time">9:41</span>
    <span class="sb-right">
      <svg width="18" height="12" viewBox="0 0 18 12"><rect x="0" y="7.5" width="3" height="4.5" rx="1" fill="${c}"/><rect x="5" y="5" width="3" height="7" rx="1" fill="${c}"/><rect x="10" y="2.5" width="3" height="9.5" rx="1" fill="${c}"/><rect x="15" y="0" width="3" height="12" rx="1" fill="${c}"/></svg>
      <svg width="16" height="12" viewBox="0 0 16 12"><path d="M8 2.2c2.4 0 4.6.9 6.2 2.5l1.1-1.1A10.3 10.3 0 0 0 8 .6 10.3 10.3 0 0 0 .7 3.6l1.1 1.1A8.7 8.7 0 0 1 8 2.2Z" fill="${c}"/><path d="M8 5.4c1.6 0 3 .6 4.1 1.6l1.1-1.1A7.4 7.4 0 0 0 8 3.8c-2 0-3.8.8-5.2 2.1L3.9 7A5.8 5.8 0 0 1 8 5.4Z" fill="${c}"/><path d="M8 8.6c.8 0 1.5.3 2 .8L8 11.5 6 9.4c.5-.5 1.2-.8 2-.8Z" fill="${c}"/></svg>
      <svg width="27" height="13" viewBox="0 0 27 13"><rect x=".5" y=".5" width="23" height="12" rx="3.6" fill="none" stroke="${c}" stroke-opacity=".38"/><rect x="2" y="2" width="20" height="9" rx="2.2" fill="${c}"/><path d="M25 4.4v4.2c.8-.3 1.4-1.1 1.4-2.1S25.8 4.7 25 4.4Z" fill="${c}" fill-opacity=".45"/></svg>
    </span></div>`;
  return `<div class="sb and" style="color:${c}">
    <span class="sb-time">9:41</span>
    <span class="sb-right">
      <svg width="16" height="16" viewBox="0 0 16 16"><path d="M8 13.6 15.3 4.8A11.6 11.6 0 0 0 8 2.2C5.2 2.2 2.7 3.2.7 4.8L8 13.6Z" fill="${c}"/></svg>
      <svg width="15" height="15" viewBox="0 0 15 15"><path d="M14 1v13H1L14 1Z" fill="${c}"/></svg>
      <svg width="10" height="16" viewBox="0 0 10 16"><rect x="3" y="0" width="4" height="2" rx=".6" fill="${c}"/><rect x="0" y="1.6" width="10" height="14.4" rx="2" fill="${c}"/></svg>
    </span></div>`;
}

// ---------- device ----------
// w = rendered screen width in px. Returns { html, w, h } for the whole device.
function device({ shot, w, x, y, dark = false, z = 2, extraClass = '' }) {
  const s = w / SCREEN.w; const sh = SCREEN.h * s;
  const bez = (IOS ? 9.5 : 7.5) * s, rim = (IOS ? 3.2 : 2.6) * s;
  const rScreen = (IOS ? 55 : 34) * s;
  const ow = w + 2 * (bez + rim), oh = sh + 2 * (bez + rim);
  const buttons = IOS
    ? [['l', 118, 30], ['l', 172, 62], ['l', 246, 62], ['r', 196, 98], ['r', 404, 54]]
    : [['r', 168, 54], ['r', 262, 104]];
  const btn = buttons.map(([side, top, len]) => `<i class="btn ${side}" style="top:${top * s}px;height:${len * s}px;width:${3.2 * s}px;${side === 'l' ? 'left' : 'right'}:${-2.4 * s}px;border-radius:${2 * s}px"></i>`).join('');
  const island = IOS
    ? `<i class="island" style="width:${125 * s}px;height:${37 * s}px;top:${11 * s}px;border-radius:${19 * s}px"></i>`
    : `<i class="punch" style="width:${11.5 * s}px;height:${11.5 * s}px;top:${15 * s}px"></i>`;
  const bar = `<div class="sbwrap" style="transform:scale(${s});width:${SCREEN.w}px;height:${SCREEN.top}px">${statusBar(dark)}</div>`;
  const home = IOS
    ? `<i class="homebar" style="width:${139 * s}px;height:${5 * s}px;bottom:${8 * s}px;border-radius:${3 * s}px;background:${dark ? 'rgba(255,255,255,.92)' : 'rgba(0,0,0,.86)'}"></i>`
    : `<i class="homebar" style="width:${108 * s}px;height:${4.2 * s}px;bottom:${7 * s}px;border-radius:${3 * s}px;background:${dark ? 'rgba(255,255,255,.85)' : 'rgba(0,0,0,.72)'}"></i>`;
  const html = `<div class="device ${IOS ? 'ios' : 'and'} ${extraClass}" style="left:${x}px;top:${y}px;width:${ow}px;height:${oh}px;border-radius:${rScreen + bez + rim}px;padding:${rim}px;z-index:${z}">
    ${btn}
    <div class="bezel" style="border-radius:${rScreen + bez}px;padding:${bez}px">
      <div class="screen" style="width:${w}px;height:${sh}px;border-radius:${rScreen}px">
        <img src="${img(shot)}" style="width:${w}px;height:${sh}px">${bar}${island}${home}
      </div>
    </div></div>`;
  return { html, w: ow, h: oh, s, x, y, off: bez + rim };
}

// Lifted UI crop. width in px; radius in screen points (scaled with the crop).
function lift({ src, w, x, y, r = 22, z = 5, tilt = 0, inset = 1 }) {
  const natural = fs.readFileSync(path.join(CAP, src + '.png')).readUInt32BE(16) / 3; // crop width in points
  const k = w / natural; const rad = r * k;
  return `<div class="lift" style="left:${x}px;top:${y}px;width:${w}px;border-radius:${rad}px;z-index:${z};${tilt ? `transform:rotate(${tilt}deg)` : ''}"><img src="${img(src)}" style="width:${w}px;clip-path:inset(${inset}px round ${rad}px)"></div>`;
}

function chip({ icon, text, x, y, z = 6, theme }) {
  return `<div class="chip ${theme}" style="left:${x}px;top:${y}px;z-index:${z}">${ICONS[icon]}<span>${text}</span></div>`;
}
const MARK = fs.readFileSync(path.join(REPO, 'public', 'favicon.svg'), 'utf8').replace('<svg ', '<svg class="mark" ');
const ICONS = {
  bank: '<svg viewBox="0 0 24 24"><path d="M3 9.5 12 4l9 5.5M5 10v8M9.7 10v8M14.3 10v8M19 10v8M3.5 20.5h17"/><path d="M4 4l16 16" class="slash"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><rect x="4.5" y="10.5" width="15" height="10" rx="3"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5M12 14.5v2"/></svg>',
  export: '<svg viewBox="0 0 24 24"><path d="M12 3.5v11M7.5 10 12 14.5 16.5 10M5 15.5v2a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-2"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4.5 7h15M9.5 7V5.2c0-.7.5-1.2 1.2-1.2h2.6c.7 0 1.2.5 1.2 1.2V7M6.5 7l.8 11.3a2 2 0 0 0 2 1.7h5.4a2 2 0 0 0 2-1.7L17.5 7M10.3 11v5M13.7 11v5"/></svg>',
  device: '<svg viewBox="0 0 24 24"><rect x="6.5" y="2.5" width="11" height="19" rx="3"/><path d="M10.5 18.5h3"/></svg>',
};

// ---------- slides ----------
// Positions use the canvas unit u (1% of width). ph() gives a device height for a screen width.
const ph = w => { const s = w / SCREEN.w; return SCREEN.h * s + 2 * ((IOS ? 9.5 : 7.5) + (IOS ? 3.2 : 2.6)) * s; };
const A = !IOS; // Android canvas is shorter: lift devices less, crop more.
const HEAD = IOS ? 47 : 44; // where the stage starts (u)

const PW = (IOS ? 84 : 76) * u; // default phone screen width
// A lift placed over its own spot on the phone, enlarged by k around its centre (reads as a zoom, not a copy).
const zoom = (d, src, rect, k, opts = {}) => { const w = rect.w * d.s * k, h = rect.h * d.s * k;
  const cx = d.x + d.off + (rect.x + rect.w / 2) * d.s, cy = d.y + d.off + (rect.y + rect.h / 2) * d.s;
  return lift({ src, w, x: cx - w / 2, y: cy - h / 2, ...opts }); };
const COFFEE = IOS ? { x: 18, y: 225.6, w: 360, h: 106 } : { x: 18, y: 206.6, w: 360, h: 106 };
const faces = (x, y, w, theme) => [['x-face-daily-wallet', -14, 0, 0], ['x-face-travel-card', -3, .5, .03], ['x-face-everyday-card', 8, 1, .07]]
  .map(([src, tilt, k, dy], i) => lift({ src, w, x: x + k * w * .62, y: y + dy * w * 1.58 + (i === 1 ? -w * .1 : 0), r: 15, inset: 4, tilt, z: 5 + i })).join('');
const SLIDES = [
  { n: 1, name: 'overview', theme: 'ivory', eb: 'MOVO', title: 'Your money,<br>in one <em>calm place.</em>', sub: 'Balances, budgets and bills, together in one private home for your money.',
    build: () => { const x = (100 * u - PW) / 2 - 1.4 * u, y = (HEAD + 3) * u; const d = device({ shot: 'home', w: PW, x, y });
      return d.html + lift({ src: 'x-flow', w: 88 * u, x: 6 * u, y: y + d.h * (A ? .5 : .6) }); } },
  { n: 2, name: 'wallet', theme: 'forest', eb: 'Wallet', title: 'Every account.<br><em>One wallet.</em>', sub: 'Banks, cards, e‑wallets and cash side by side. You add them, MOVO keeps count.',
    build: () => { const x = 30 * u, y = (HEAD + 2) * u; const d = device({ shot: 'wallet', w: PW, x, y });
      return d.html + faces(6 * u, y + d.h * (A ? .42 : .5), 36 * u); } },
  { n: 3, name: 'quick-log', theme: 'ivory', eb: 'Quick log', title: 'Type “Coffee 180”.<br><em>It’s logged.</em>', sub: 'Write it the way you’d say it. MOVO reads it on your phone and files it in a second.',
    build: () => { const x = 9 * u, y = (HEAD + 3) * u; const d = device({ shot: 'chat', w: PW, x, y });
      return d.html + zoom(d, 'x-chat-coffee', COFFEE, 1.24, { r: 20, inset: 2 }); } },
  { n: 4, name: 'insights', theme: 'mint', eb: 'Insights', title: 'See where every<br><em>peso goes.</em>', sub: 'Money Flow and spending breakdowns turn everyday records into a clear picture.',
    build: () => { const x = -10 * u, y = (HEAD + 2) * u; const d = device({ shot: 'transactions', w: PW, x, y });
      return d.html + lift({ src: 'x-spending', w: 76 * u, x: 21 * u, y: y + d.h * (A ? .4 : .47) }); } },
  { n: 5, name: 'budgets', theme: 'forest', eb: 'Budgets & goals', title: 'Stay on budget.<br><em>Reach your goals.</em>', sub: 'Monthly limits per category and savings goals that show exactly what’s left.',
    build: () => { const x = 22 * u, y = (HEAD + 2) * u; const d = device({ shot: 'budgets-sheet', w: PW, x, y });
      return d.html + lift({ src: 'x-goal-1', w: 80 * u, x: 4 * u, y: y + d.h * (A ? .6 : .74), r: 13, inset: 2 })
        + lift({ src: 'x-goal-2', w: 80 * u, x: 11 * u, y: y + d.h * (A ? .6 : .74) + 14 * u, r: 13, inset: 2, z: 6 }); } },
  { n: 6, name: 'subscriptions', theme: 'ivory', eb: 'Subscriptions', title: 'Never miss<br><em>a renewal.</em>', sub: 'Every subscription on one calendar: what it costs, what it adds up to, and what’s due next.',
    build: () => { const x = 19 * u, y = (HEAD + 3) * u; const d = device({ shot: 'subs-calendar', w: PW, x, y });
      return d.html + lift({ src: 'x-renewals', w: 80 * u, x: 4 * u, y: y + d.h * (A ? .67 : .72) }); } },
  { n: 7, name: 'themes', theme: 'night', eb: 'Make it yours', title: 'Light or dark.<br><em>Always yours.</em>', sub: 'Liquid Glass themes, accent colours and card styles that look the way you like.',
    build: () => { const w = (IOS ? 74 : 68) * u; const back = device({ shot: 'home', w, x: -7 * u, y: (HEAD + 1) * u, z: 1, extraClass: 'back' });
      const front = device({ shot: 'home-dark', w, x: 35 * u, y: (HEAD + (A ? 8 : 12)) * u, dark: true, z: 3 });
      return back.html + front.html; } },
  { n: 8, name: 'privacy', theme: 'forest', eb: 'Private by design', title: 'Your records.<br><em>Not your bank login.</em>', sub: 'MOVO never connects to your bank. Lock the app, export your data or delete it any time.',
    build: () => { const x = 34 * u, y = (HEAD + 3) * u; const d = device({ shot: 'settings', w: PW, x, y });
      const cy = y + d.h * (A ? .14 : .19), gap = (A ? 12.5 : 14.5) * u;
      return d.html + [['bank', 'No bank connection'], ['lock', 'App Lock'], ['export', 'Export any time'], ['trash', 'Delete any time']]
        .map(([icon, text], i) => chip({ icon, text, x: (i % 2 ? 10 : 4) * u, y: cy + i * gap, theme: 'on-forest' })).join(''); } },
];

function page(slide) {
  const t = T[slide.theme];
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{width:${W}px;height:${H}px;overflow:hidden}
  body{position:relative;background:${t.bg};font-family:'Inter',sans-serif;-webkit-font-smoothing:antialiased;color:${t.ink}}
  .bg{position:absolute;inset:0;z-index:0;background:
    radial-gradient(${90 * u}px ${70 * u}px at 88% 4%, ${slide.theme === 'forest' ? 'rgba(46,170,108,.30)' : slide.theme === 'night' ? 'rgba(30,140,90,.22)' : 'rgba(255,255,255,.85)'} , transparent 70%),
    radial-gradient(${110 * u}px ${90 * u}px at 0% 100%, ${slide.theme === 'forest' ? 'rgba(0,0,0,.35)' : slide.theme === 'night' ? 'rgba(20,90,60,.25)' : 'rgba(19,132,79,.08)'}, transparent 70%),
    linear-gradient(180deg, ${t.bg} 0%, ${t.bg2} 100%)}
  .grain{position:absolute;inset:0;z-index:1;opacity:${slide.theme === 'ivory' || slide.theme === 'mint' ? .05 : .07};mix-blend-mode:${slide.theme === 'ivory' || slide.theme === 'mint' ? 'multiply' : 'screen'};
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  0 0 0 1 0'/></filter><rect width='300' height='300' filter='url(%23n)'/></svg>")}
  .head{position:absolute;z-index:4;left:${8 * u}px;right:${7 * u}px;top:${(IOS ? 9.5 : 7.5) * u}px}
  .eb{display:flex;align-items:center;gap:${1.6 * u}px;font-weight:700;font-size:${2.15 * u}px;letter-spacing:.16em;text-transform:uppercase;color:${t.eb}}
  .eb .mark{width:${5.4 * u}px;height:${5.4 * u}px;margin:-${1 * u}px -${.4 * u}px -${1 * u}px -${.6 * u}px}
  .eb i{display:block;width:${4.2 * u}px;height:${.32 * u}px;border-radius:9px;background:currentColor}
  h1{margin-top:${2.4 * u}px;font-family:'Inter Display','Inter',sans-serif;font-weight:700;font-size:${(IOS ? 9.3 : 8.6) * u}px;line-height:1.02;letter-spacing:-.042em;color:${t.ink}}
  h1 em{font-style:normal;color:${t.accent}}
  p.sub{margin-top:${2.3 * u}px;max-width:${80 * u}px;font-size:${(IOS ? 3.25 : 3.0) * u}px;line-height:1.36;letter-spacing:-.012em;font-weight:450;color:${t.sub};text-wrap:pretty}
  .device{position:absolute;background:linear-gradient(140deg,#efece6 0%,#b4b0a8 18%,#f6f4ef 38%,#8f8b84 62%,#d9d5ce 82%,#a7a39b 100%);
    box-shadow:0 ${.3 * u}px ${.6 * u}px rgba(${t.shadow},.18),0 ${4 * u}px ${8 * u}px -${1 * u}px rgba(${t.shadow},.30),0 ${12 * u}px ${20 * u}px -${6 * u}px rgba(${t.shadow},.42)}
  .device.and{background:linear-gradient(140deg,#4b4e54 0%,#24262a 30%,#55585e 52%,#1c1e21 78%,#3b3e43 100%)}
  .device.back{filter:saturate(.96)}
  .device .btn{position:absolute;display:block;background:inherit;box-shadow:inset 0 0 0 .5px rgba(0,0,0,.25)}
  .bezel{position:relative;width:100%;height:100%;background:#050506;box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)}
  .screen{position:relative;overflow:hidden;background:#000;isolation:isolate}
  .screen img{display:block}
  .sbwrap{position:absolute;left:0;top:0;transform-origin:0 0;z-index:3}
  .sb{position:relative;height:100%;font-family:'Inter',sans-serif}
  .sb.ios .sb-time{position:absolute;left:0;width:${(430 - 125) / 2}px;text-align:center;top:${IOS ? 18 : 0}px;font-weight:650;font-size:17px;letter-spacing:-.01em;padding-left:14px}
  .sb.ios .sb-right{position:absolute;right:0;width:${(430 - 125) / 2}px;top:${IOS ? 22 : 0}px;display:flex;align-items:center;justify-content:center;gap:6px;padding-right:10px}
  .sb.and .sb-time{position:absolute;left:26px;top:11px;font-weight:550;font-size:14.5px;letter-spacing:.01em}
  .sb.and .sb-right{position:absolute;right:22px;top:11px;display:flex;align-items:center;gap:7px}
  .island{position:absolute;left:50%;transform:translateX(-50%);display:block;background:#000;z-index:4}
  .punch{position:absolute;left:50%;transform:translateX(-50%);display:block;border-radius:50%;background:radial-gradient(circle at 38% 35%,#2a2f3a 0 18%,#07080a 40%);box-shadow:0 0 0 1.5px #000;z-index:4}
  .homebar{position:absolute;left:50%;transform:translateX(-50%);display:block;z-index:4}
  .lift{position:absolute;overflow:visible;
    box-shadow:0 0 0 1px rgba(${t.shadow},.05),0 ${.4 * u}px ${1 * u}px rgba(${t.shadow},.12),0 ${3.5 * u}px ${7 * u}px -${.8 * u}px rgba(${t.shadow},.26),0 ${9 * u}px ${16 * u}px -${5 * u}px rgba(${t.shadow},.34)}
  .lift img{display:block}
  .chip{position:absolute;display:flex;align-items:center;gap:${2 * u}px;padding:${2 * u}px ${3.6 * u}px ${2 * u}px ${2.1 * u}px;border-radius:999px;
    font-weight:620;font-size:${3.4 * u}px;letter-spacing:-.015em;white-space:nowrap}
  .chip.on-forest{background:rgba(250,248,242,.97);color:#0F1C15;box-shadow:0 ${2.5 * u}px ${6 * u}px -${1 * u}px rgba(0,10,5,.5),0 0 0 1px rgba(255,255,255,.6) inset}
  .chip svg{width:${6.2 * u}px;height:${6.2 * u}px;padding:${1.25 * u}px;border-radius:50%;background:#E3F3EA;fill:none;stroke:#13784A;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
  .chip svg .slash{stroke:#C2413B}
  </style></head><body>
  <div class="bg"></div><div class="grain"></div>
  <div class="head"><div class="eb">${slide.n === 1 ? MARK : '<i></i>'}${slide.eb}</div><h1>${slide.title}</h1><p class="sub">${slide.sub}</p></div>
  ${slide.build(t)}
  </body></html>`;
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const pg = await ctx.newPage();
  for (const slide of SLIDES) {
    if (ONLY.length && !ONLY.includes(slide.n)) continue;
    await pg.setContent(page(slide), { waitUntil: 'load' });
    await pg.evaluate(() => document.fonts.ready);
    const file = path.join(OUT, `${String(slide.n).padStart(2, '0')}-${slide.name}.png`);
    await pg.screenshot({ path: file, omitBackground: false });
    console.log(file);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
