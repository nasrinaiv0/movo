'use strict';
// Renders MOVO's badge app icons (1024×1024) for the iOS alternate icon sets.
// Usage: node scripts/app-icons/render.cjs && python3 scripts/app-icons/opaque.py
// The mark, proportions and tones match src/components/MovoLogo.js and src/lib/appIcons.js.
const { chromium } = require('playwright');
const path = require('path');
const PATHS = {
  body: 'M26 10H94Q116 10 116 32V78Q116 100 94 100H26Q4 100 4 78V32Q4 10 26 10Z',
  flapLeft: 'M4 32Q4 10 26 10H34L60 46V56H10Q4 56 4 50Z',
  flapRight: 'M60 46L86 10H94Q116 10 116 32V50Q116 56 110 56H60Z',
  clasp: 'M92 64H108Q120 64 120 76Q120 88 108 88H92Q80 88 80 76Q80 64 92 64Z',
};
const ICONS = {
  Bronze: { bg: '#121213', glow: 'rgba(205,138,82,.20)', t: { light: '#efbd8f', mid: '#cd8a52', dark: '#8f5729' } },
  Silver: { bg: '#121213', glow: 'rgba(188,196,206,.18)', t: { light: '#f2f4f7', mid: '#bcc4ce', dark: '#7f8996' } },
  Gold: { bg: '#121213', glow: 'rgba(227,176,74,.22)', t: { light: '#f8dc8c', mid: '#e3b04a', dark: '#a87618' } },
  Platinum: { bg: '#121213', glow: 'rgba(220,217,239,.20)', t: { light: '#ffffff', mid: '#dcd9ef', dark: '#9d97c4' } },
};
const svg = t => `<svg width="620" height="537" viewBox="0 0 120 104" xmlns="http://www.w3.org/2000/svg">
  <path d="${PATHS.body}" fill="${t.dark}"/><path d="${PATHS.flapLeft}" fill="${t.light}"/>
  <path d="${PATHS.flapRight}" fill="${t.mid}"/><path d="${PATHS.clasp}" fill="${t.mid}"/>
  <circle cx="94" cy="76" r="5" fill="${t.light}"/></svg>`;
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1024, height: 1024 }, deviceScaleFactor: 1 });
  for (const [name, icon] of Object.entries(ICONS)) {
    await page.setContent(`<html><body style="margin:0;width:1024px;height:1024px;display:grid;place-items:center;
      background:radial-gradient(70% 70% at 50% 42%, ${icon.glow}, transparent 70%), ${icon.bg}">${svg(icon.t)}</body></html>`);
    const out = path.join(__dirname, '../../ios/App/App/Assets.xcassets', `AppIcon-${name}.appiconset`, `AppIcon-${name}.png`);
    require('fs').mkdirSync(path.dirname(out), { recursive: true });
    await page.screenshot({ path: out, omitBackground: false });
    require('fs').writeFileSync(path.join(path.dirname(out), 'Contents.json'), JSON.stringify({
      images: [{ filename: `AppIcon-${name}.png`, idiom: 'universal', platform: 'ios', size: '1024x1024' }],
      info: { author: 'xcode', version: 1 },
    }, null, 2) + '\n');
    console.log('rendered', out);
  }
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
