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
    expect((svg.match(/<line /g) || []).length).toBe(z.lines.length);
    expect(svg).not.toMatch(/<script|href=/); // generated art only: nothing executable, nothing fetched
  });
  expect(zodiacSvg(ZODIAC[0])).toBe(zodiacSvg(ZODIAC[0])); // same stars every time
  expect(GLOWS.length).toBeGreaterThanOrEqual(6);
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
