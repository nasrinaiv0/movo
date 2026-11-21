'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
const out = ['MOVO — Third-party software notices', '', 'Collected upstream license texts and provenance declarations for third-party software. Unresolved evidence is identified in its entry. This does not grant rights to MOVO branding or company trademarks.', 'Generated from package-lock.json; preserve upstream notices when distributing.'];
const missing = [];
for (const [name, meta] of Object.entries(lock.packages || {}).sort(([a], [b]) => a.localeCompare(b))) {
  if (!name || meta.dev || meta.optional && !fs.existsSync(path.join(root, name))) continue;
  const folder = path.join(root, name);
  if (!fs.existsSync(folder)) { missing.push(name); continue; }
  const pkg = JSON.parse(fs.readFileSync(path.join(folder, 'package.json'), 'utf8'));
  const files = fs.readdirSync(folder).filter(file => /^(licen[cs]e|copying|notice|copyright)(\.|$|-)/i.test(file) && fs.statSync(path.join(folder, file)).isFile());
  if (!files.length) {
    const fallback = pkg.name.startsWith('@napi-rs/canvas-') ? 'napi-rs-canvas-0.1.100.txt' : pkg.name.replace(/[@/]/g, '') + '-' + pkg.version + '.txt';
    const notice = path.join(root, 'docs/legal/upstream', fallback);
    if (fs.existsSync(notice)) {
      out.push('', '='.repeat(72), pkg.name + '@' + pkg.version, fs.readFileSync(notice, 'utf8'));
      continue;
    }
    missing.push(pkg.name + '@' + pkg.version); continue;
  }
  out.push('', '='.repeat(72), pkg.name + '@' + pkg.version, 'Source package: ' + (meta.resolved || 'See upstream package repository'), 'Declared license: ' + (typeof pkg.license === 'string' ? pkg.license : JSON.stringify(pkg.license || pkg.licenses || 'See upstream notice')));
  for (const file of files) out.push('', '[' + file + ']', fs.readFileSync(path.join(folder, file), 'utf8'));
}
// Rebundled OCR/PDF files also retain their upstream full licenses independently of webpack.
for (const file of ['node_modules/pdfjs-dist/standard_fonts/LICENSE_FOXIT', 'node_modules/pdfjs-dist/standard_fonts/LICENSE_LIBERATION', 'node_modules/pdfjs-dist/cmaps/LICENSE']) {
  out.push('', '='.repeat(72), file.replace('node_modules/', ''), fs.readFileSync(path.join(root, file), 'utf8'));
}
for (const file of fs.readdirSync(path.join(root, 'docs/legal/upstream')).filter(name => name.startsWith('font-') && name.endsWith('.txt'))) {
  out.push('', '='.repeat(72), file, fs.readFileSync(path.join(root, 'docs/legal/upstream', file), 'utf8'));
}
fs.writeFileSync(path.join(root, 'public/third-party-notices.txt'), out.join('\n') + '\n');
console.log('Notices written; entries without collected notice/provenance:', missing.length);
if (missing.length) { console.error(missing.join('\n')); process.exitCode = 1; }
