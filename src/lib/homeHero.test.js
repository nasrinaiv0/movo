import { DEFAULT_SCENERY, GLOWS, ZODIAC, isPremiumHero, resolveHero, zodiacSvg } from './homeHero';
import { SCENERIES } from './scenery';
import { PRO_FEATURES } from './planAccess';

test('all twelve zodiac constellations, each a well-formed figure', () => {
  expect(ZODIAC.map(z => z.id)).toEqual(['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces']);
  ZODIAC.forEach(z => {
    expect(z.stars.length).toBeGreaterThanOrEqual(4);
    z.stars.forEach(([x, y]) => { expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThanOrEqual(1); expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThanOrEqual(1); });
    z.lines.forEach(([a, b]) => { expect(z.stars[a]).toBeDefined(); expect(z.stars[b]).toBeDefined(); });
    const svg = zodiacSvg(z);
    expect(svg.startsWith('<svg')).toBe(true);
    expect((svg.match(/<line /g) || []).length).toBe(z.lines.length + 36 + 12); // figure + wheel ticks and spokes
    expect(svg).not.toMatch(/<script|href=/); // generated art only: nothing executable, nothing fetched
  });
  expect(zodiacSvg(ZODIAC[0])).toBe(zodiacSvg(ZODIAC[0])); // same stars every time
  expect(GLOWS.length).toBeGreaterThanOrEqual(7);
  // The celestial glow is the same restrained night-sky artwork with a single star in the wheel.
  const celestial = resolveHero('glow:celestial', { premium: true });
  expect(celestial.kind).toBe('glow');
  expect(celestial.background).toMatch(/^url\("data:image\/svg\+xml,/);
  expect(decodeURIComponent(celestial.background)).not.toMatch(/<script|href=/);
});

test('the default is a scenery; plain shows none; scenery choices resolve to their picture', () => {
  expect(resolveHero('auto')).toMatchObject({ kind: 'scenery', id: `scenery:${DEFAULT_SCENERY}` });
  expect(resolveHero(undefined).kind).toBe('scenery');
  expect(resolveHero('plain')).toBeNull();
  const sc = SCENERIES[3];
  expect(resolveHero(`scenery:${sc.id}`).background).toContain(sc.src);
  expect(resolveHero('scenery:nope').id).toBe(`scenery:${DEFAULT_SCENERY}`);
});

test('zodiac and glow need Pro or Pro+; without it the header falls back to the default scenery', () => {
  expect(PRO_FEATURES).toContain('headerThemes');
  expect(isPremiumHero('zodiac:leo')).toBe(true);
  expect(isPremiumHero('glow:aurora')).toBe(true);
  expect(isPremiumHero('scenery:wp-w001')).toBe(false);
  expect(resolveHero('zodiac:leo', { premium: false }).kind).toBe('scenery');
  expect(resolveHero('glow:aurora', { premium: false }).kind).toBe('scenery');
  const leo = resolveHero('zodiac:leo', { premium: true });
  expect(leo.kind).toBe('zodiac');
  expect(leo.background).toMatch(/^url\("data:image\/svg\+xml,/);
  expect(resolveHero('glow:aurora', { premium: true })).toMatchObject({ kind: 'glow' });
  expect(resolveHero('zodiac:unknown', { premium: true }).kind).toBe('scenery');
});

test('zodiac headers follow the owner reference: indigo sky, all twelve symbols with the sign on top, a light ribbon', () => {
  const { GLYPHS } = require('./homeHero');
  expect(Object.keys(GLYPHS).sort()).toEqual(ZODIAC.map(z => z.id).sort());
  Object.values(GLYPHS).forEach(d => expect(d).toMatch(/^M[\d.\sMCLHVAZ-]+$/));
  const svg = zodiacSvg(ZODIAC.find(z => z.id === 'leo'));
  expect(svg).toContain('stop-color="#07061a"'); // same night sky for every sign
  expect((svg.match(/scale\(/g) || []).length).toBe(12); // twelve symbols on the ring
  expect(svg.indexOf(GLYPHS.leo)).toBeLessThan(svg.indexOf(GLYPHS.virgo)); // the person's sign is drawn first, at the top
  expect(svg).toContain('url(#ribbon)');
  expect(svg).not.toMatch(/<script|<text|href=|on\w+=/i); // drawn paths only: no scripts, links or typed glyphs
  expect(resolveHero('zodiac:leo', { premium: true }).glow).toBe('#c4b5fd');
});
