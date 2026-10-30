import { money, smoothPath } from './format';

describe('financial formatting guards', () => {
  test('does not render invalid monetary values as zero', () => {
    expect(money(NaN)).toBe('—');
    expect(money('not-a-number')).toBe('—');
    expect(money(undefined)).toBe('—');
  });

  test('an empty trend series renders no invalid SVG path', () => {
    expect(smoothPath([], 120, 40)).toBe('');
  });
});
