// Records each chapter of the MOVO video guide from the real build as JPEG frames (CDP screencast), then encodes
// each segment at 30 fps. Usage: node record.cjs [segmentName...]
const fs = require('fs'); const path = require('path'); const { execFileSync } = require('child_process');
const { chromium, reset, openApp } = require('./rec-lib.cjs');
const OUT = path.join(__dirname, 'segments'); fs.mkdirSync(OUT, { recursive: true });
const PAD = 0.4; // extra seconds for the crossfade into the next segment
const sleep = ms => new Promise(r => setTimeout(r, ms));
const glide = (page, to, ms, sel) => page.evaluate(({ to, ms, sel }) => new Promise(done => {
  const el = sel ? document.querySelector(sel) : document.scrollingElement; const from = el.scrollTop; const start = performance.now();
  const target = typeof to === 'number' ? to : from + to.by;
  const step = now => { const k = Math.min(1, (now - start) / ms); const e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; el.scrollTop = from + (target - from) * e; if (k < 1) requestAnimationFrame(step); else done(); };
  requestAnimationFrame(step);
}), { to, ms, sel });
const centerOf = async (page, locator) => { const box = await locator.boundingBox(); const y = await page.evaluate(() => document.scrollingElement.scrollTop); return Math.max(0, y + box.y + box.height / 2 - 932 * 0.42); };

async function record(page, name, seconds, timeline) {
  const dir = path.join(OUT, name); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
  const cdp = await page.context().newCDPSession(page); const frames = [];
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => { frames.push({ t: metadata.timestamp, data }); cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {}); });
  // Nudge one repaint so the first frame arrives at once.
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 860, maxHeight: 1864, everyNthFrame: 1 });
  const t0 = Date.now() / 1000; await page.evaluate(() => { document.body.style.outline = '0 solid transparent'; });
  for (const [ms, fn] of timeline) { const wait = t0 * 1000 + ms - Date.now(); if (wait > 0) await sleep(wait); await fn(); }
  const total = seconds + PAD; const left = t0 * 1000 + total * 1000 - Date.now(); if (left > 0) await sleep(left + 120);
  await cdp.send('Page.stopScreencast'); await cdp.detach();
  if (!frames.length) throw new Error('no frames for ' + name);
  const list = [];
  frames.forEach((f, i) => { const file = `f${String(i).padStart(5, '0')}.jpg`; fs.writeFileSync(path.join(dir, file), Buffer.from(f.data, 'base64'));
    const start = Math.max(t0, f.t); const end = Math.min(t0 + total, i + 1 < frames.length ? Math.max(t0, frames[i + 1].t) : t0 + total);
    if (end - start > 0.0005) list.push(`file '${file}'\nduration ${(end - start).toFixed(4)}`); else if (i === 0) list.push(`file '${file}'\nduration 0.001`); });
  list.push(`file 'f${String(frames.length - 1).padStart(5, '0')}.jpg'`);
  fs.writeFileSync(path.join(dir, 'list.txt'), 'ffconcat version 1.0\n' + list.join('\n') + '\n');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(dir, 'list.txt'), '-vf', 'fps=30,scale=720:1560:flags=lanczos,format=yuv420p', '-t', String(total), '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', path.join(OUT, name + '.mp4')]);
  console.log(name, frames.length, 'frames', total.toFixed(2) + 's');
}
const nav = (page, label) => page.click(`.bottom-nav [aria-label="${label}"]`);
const SEGMENTS = {
  s1: { d: 5.9, prep: async (page) => {}, tl: page => [[1500, () => glide(page, 420, 3400)]] },
  s2: { d: 9.4, prep: async () => {}, tl: page => [[600, () => nav(page, 'Wallet')], [3200, async () => glide(page, await centerOf(page, page.getByText('My Cards', { exact: true })) + 150, 3600)]] },
  s3: { d: 8.5, prep: async (page) => { await nav(page, 'NasrinAI'); await sleep(1500); }, tl: page => [[700, () => page.click('[placeholder*="Ask NasrinAI"]')], [1000, () => page.keyboard.type('Grab 250', { delay: 120 })], [2700, () => page.click('[aria-label="Send message"]')]] },
  s4: { d: 5.8, prep: async () => {}, tl: page => [[500, () => nav(page, 'Transactions')], [2700, () => glide(page, 430, 2600)]] },
  s5: { d: 5.9, prep: async (page) => { await nav(page, 'Menu'); await sleep(1200); }, tl: page => [[700, () => page.getByText('Subscriptions', { exact: true }).first().click()], [3300, () => glide(page, 260, 2200)]] },
  s6: { d: 7.7, prep: async (page) => { await page.click('main [aria-label="Settings"]'); await sleep(1300); },
    tl: page => [[700, async () => glide(page, await centerOf(page, page.getByText('Delete Account', { exact: true })), 2800)], [4700, () => page.getByText('Delete Account', { exact: true }).click()]] },
  s7a: { d: 4.7, prep: async (page) => { await nav(page, 'Wallet'); await sleep(1200); }, tl: page => [[300, () => page.click('[aria-label="New account"]')], [1700, () => page.getByText('Bank account', { exact: true }).click()]] },
  s7b: { d: 4.7, prep: async (page) => { await page.click('main [aria-label="Settings"]'); await sleep(1200); const t = page.getByText('Terms of Service', { exact: true }).first(); await t.scrollIntoViewIfNeeded(); await t.click(); await sleep(1400);
      const h = page.getByText('16. Third-party content and support'); await page.evaluate(y => { document.scrollingElement.scrollTop = y; }, Math.max(0, (await centerOf(page, h)) - 120)); await sleep(500); },
    tl: page => [[1300, () => glide(page, { by: 300 }, 3000)]] },
  s8a: { d: 3.6, prefs: { planWelcomeSeen: false }, entitlement: { tier: 'free', active: false, trialEligible: true }, prep: async (page) => { await page.addStyleTag({ content: '.app-alert{display:none!important}' }); }, tl: () => [] },
  s8b: { d: 6.0, last: true, prefs: { legalAccepted: '', legalAcceptedAt: '' }, prep: async () => {},
    tl: page => [[2600, () => page.click('.setup-agreement-check input')], [4000, () => page.click('.setup-agreement-accept')]] },
};
(async () => {
  const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(SEGMENTS);
  const browser = await chromium.launch();
  for (const name of names) {
    const seg = SEGMENTS[name]; await reset();
    const { page, context, errors } = await openApp(browser, { prefs: seg.prefs || {}, entitlement: seg.entitlement });
    await page.evaluate(() => document.scrollingElement.scrollTo(0, 0)); await seg.prep(page); await sleep(400);
    await record(page, name, seg.d + (seg.last ? -PAD : 0), seg.tl(page));
    if (errors.filter(e => !/ERR_TUNNEL|404|er-api/.test(e)).length) console.log(name, 'errors:', errors.filter(e => !/ERR_TUNNEL|404|er-api/.test(e)).slice(0, 3));
    await context.close();
  }
  await browser.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
