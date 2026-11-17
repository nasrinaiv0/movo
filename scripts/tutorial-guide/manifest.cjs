// Joins the highlight rectangles (capture.cjs) and clip lengths (narrate.py) into src/lib/tourManifest.json.
// Usage: node manifest.cjs <rects.json> <durations.json>
const fs = require('fs'); const path = require('path');
const { STEPS } = require('./steps.cjs');
const { size, rects } = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const durations = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const steps = {};
for (const step of STEPS) {
  if (!rects[step.id] || !durations[step.id]) throw new Error('missing capture or narration for ' + step.id);
  const [x, y, w, h] = rects[step.id];
  // Fractions of the screenshot, so the app can place the highlight at any size.
  steps[step.id] = { image: step.image, rect: [x / size[0], y / size[1], w / size[0], h / size[1]].map(v => Math.round(v * 10000) / 10000), ms: durations[step.id] };
}
const out = path.join(__dirname, '..', '..', 'src', 'lib', 'tourManifest.json');
fs.writeFileSync(out, JSON.stringify({ size, steps }, null, 2) + '\n');
console.log('wrote', out, Object.keys(steps).length, 'steps');
