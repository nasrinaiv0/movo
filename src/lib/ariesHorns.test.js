import fs from 'fs';
import path from 'path';
import { ariesSVG, states } from './ariesArt';

test('Aries horns are a ridged ram curl drawn from finite coordinates in every state', () => {
  for (const { id } of states) {
    const svg = ariesSVG(id, { animated: false, idPrefix: id });
    const horns = svg.match(/<g class="aries-horn aries-horn-(left|right)"[^>]*>([\s\S]*?)<\/g>/g);
    expect(horns).toHaveLength(2);
    for (const horn of horns) {
      expect(horn).not.toMatch(/NaN|undefined|Infinity/);
      const ridges = horn.match(/stroke-opacity=".26"[^>]*/) && horn.match(/M[\d.\- ]+Q/g);
      expect(ridges.length).toBeGreaterThanOrEqual(12); // growth ridges across the horn
    }
  }
  // The right horn mirrors the left so the mascot stays symmetric.
  expect(ariesSVG('welcome', { idPrefix: 'w' })).toContain('aries-horn-right" transform="translate(360 0) scale(-1 1)"');
});

test('a half-folded phone keeps sheets and toasts on the lower half, off the hinge', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'App.css'), 'utf8');
  const block = css.slice(css.indexOf('@media (vertical-viewport-segments: 2)'));
  expect(block).toMatch(/\.layout-dual \.sheet-backdrop \{[^}]*env\(viewport-segment-top 0 1/);
  expect(block).toMatch(/\.layout-dual \.sheet \{[^}]*max-height: calc\(100vh - env\(viewport-segment-top 0 1/);
});
