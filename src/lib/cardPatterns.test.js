import { PATTERN_FAMILIES, PATTERN_MIN_X, PATTERN_WIDTH, cardPattern, hashSeed } from './cardPatterns';
import { loyaltyCardStyle } from './loyaltyBranding';
import { LOYALTY_PROVIDERS } from './loyaltyCards';

const palette = { ink: '#ffffff', trim: '#e7c35a', accent: '#1d58c4' };
const leftEdge = shape => (shape.kind === 'circle' ? shape.cx - shape.r : Math.min(...shape.points.split(' ').map(p => Number(p.split(',')[0]))));
const signature = pattern => `${pattern.family}:${pattern.shapes.map(s => s.points || `${s.cx},${s.cy},${s.r}`).join('|')}`;

test('the same card always gets the same pattern, on every device', () => {
  expect(cardPattern('card-1|Starbucks', palette)).toEqual(cardPattern('card-1|Starbucks', palette));
  expect(hashSeed('M78038')).toBe(hashSeed('M78038'));
});

test('every card gets its own pattern, across all merchants and for two cards of one merchant', () => {
  const names = LOYALTY_PROVIDERS.filter(n => n !== 'Other');
  const all = names.map((name, i) => signature(cardPattern(`${i}|${name}`, loyaltyCardStyle(name))));
  expect(new Set(all).size).toBe(all.length);
  expect(signature(cardPattern('a|Jollibee', palette))).not.toBe(signature(cardPattern('b|Jollibee', palette)));
});

test('all six geometric families are used', () => {
  const seen = new Set(Array.from({ length: 120 }, (_, i) => cardPattern(`seed-${i}`, palette).family));
  expect([...seen].sort()).toEqual([...PATTERN_FAMILIES].sort());
});

test('shapes stay right of the text column, in three depth layers drawn back to front, in the card colours', () => {
  for (let i = 0; i < 300; i += 1) {
    const { shapes } = cardPattern(`seed-${i}`, palette);
    expect(shapes.length).toBeGreaterThan(0);
    shapes.forEach(shape => {
      expect(leftEdge(shape)).toBeGreaterThanOrEqual(PATTERN_MIN_X);
      expect([0, 1, 2]).toContain(shape.depth);
      expect([palette.ink, palette.trim, palette.accent]).toContain(shape.fill);
      expect(shape.opacity).toBeGreaterThan(0.1);
      expect(shape.opacity).toBeLessThan(0.6);
    });
    expect(shapes.map(s => s.depth)).toEqual([...shapes.map(s => s.depth)].sort((a, b) => a - b));
  }
  expect(PATTERN_MIN_X / PATTERN_WIDTH).toBeGreaterThan(0.66);
});
