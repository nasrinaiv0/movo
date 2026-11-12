import fs from 'fs';
import path from 'path';

// The ram stands on the Total balance box (owner, 2026-11-12): its body never lifts off its feet line.
test('the ram rig stays on its feet line in every mood', () => {
  const src = fs.readFileSync(path.join(__dirname, 'ramScene.js'), 'utf8');
  expect(src).toMatch(/export const FEET_Y = -0\.93;/);
  expect(src).toMatch(/rig\.position\.y = FEET_Y;/);
  expect(src).not.toMatch(/rig\.position\.y\s*=\s*[^;]*bodyY/);
  // The happy hop no longer lifts both legs together.
  expect(src).not.toMatch(/0\.035 \* hop/);
});
