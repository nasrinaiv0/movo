import { notchPath, notchMask } from './notch';

test('cuts the notch from the top-right with smooth corners', () => {
  const d = notchPath(400, 132, 180, 46, { R: 22, f: 14, rn: 26 });
  expect(d.startsWith('M22 0 H206 A14 14 0 0 1 220 14')).toBe(true);
  expect(d).toContain('V20 A26 26 0 0 0 246 46');
  expect(d).toContain('H386 A14 14 0 0 1 400 60');
  expect(d.endsWith('Z')).toBe(true);
});

test('clamps radii so tiny boxes still give a valid outline', () => {
  expect(notchPath(60, 40, 50, 30)).not.toMatch(/NaN|-\d/);
});

test('mask is an inline SVG data URL', () => {
  expect(notchMask(10, 10, 4, 4)).toMatch(/^url\("data:image\/svg\+xml,/);
});
