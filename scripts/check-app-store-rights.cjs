'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { EXCLUDED } = require('./prepare-app-store-assets.cjs');
const REQUIRED = ['nameAndTrademark', 'originalAssetsAndLicenses', 'singleAppStoreRecord', 'storeMetadataAndScreenshots', 'signedDeviceAndLiveBackend'];
function checkBundle(root) {
  const build = path.join(root, 'build');
  const manifest = JSON.parse(fs.readFileSync(path.join(build, 'app-store-assets.json'), 'utf8'));
  if (manifest.policy !== 'original-only' || manifest.approvedByApple !== false) throw Error('app_store_rights: invalid production asset policy');
  for (const dir of EXCLUDED) {
    const folder = path.join(build, dir);
    const walk = current => fs.existsSync(current) && fs.readdirSync(current, { withFileTypes: true }).some(entry => entry.isDirectory() ? walk(path.join(current, entry.name)) : true);
    if (walk(folder)) throw Error('app_store_rights: unreviewed assets remain in ' + dir);
  }
  const ownRootMedia = new Set(['favicon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'email-mark.png']);
  const inspect = (folder, relative = '') => {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      const name = relative + entry.name;
      if (entry.isDirectory()) inspect(path.join(folder, entry.name), name + '/');
      else if (/\.(?:png|jpe?g|webp|svg|gif|mp[34]|woff2?|ttf)$/i.test(name) && !ownRootMedia.has(name) && !name.startsWith('static/') && !name.startsWith('ocr/')) throw Error('app_store_rights: unlisted media ' + name);
    }
  };
  inspect(build);
  if (fs.readFileSync(path.join(build, 'third-party-notices.txt'), 'utf8').length < 1000) throw Error('app_store_rights: license notices missing');
  // Ensure the compile-time branch really removed the inline trademark artwork chunk.
  const marks = fs.readFileSync(path.join(root, 'src/lib/brandMarks.js'), 'utf8');
  const sample = marks.match(/path: "([^"]{80,})"/)?.[1].slice(0, 80);
  if (sample) for (const file of fs.readdirSync(path.join(build, 'static/js')).filter(name => name.endsWith('.js'))) {
    if (fs.readFileSync(path.join(build, 'static/js', file), 'utf8').includes(sample)) throw Error('app_store_rights: inline trademark artwork remains bundled');
  }
  return true;
}
function submissionGaps(root, evidence) {
  const gaps = [];
  if (evidence.bundleId !== 'com.nasrinai.movo') gaps.push('canonical bundle ID');
  for (const key of REQUIRED) {
    const item = evidence.reviews?.[key];
    if (item?.status !== 'reviewed' || typeof item.evidence !== 'string' || !item.evidence.startsWith('docs/app-store/evidence/') || item.evidence.includes('..') || !fs.existsSync(path.join(root, item.evidence))) gaps.push(key);
  }
  return gaps;
}
if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  try {
    checkBundle(root);
    if (process.argv.includes('--submission') || process.argv.includes('--upload')) {
      const evidence = JSON.parse(fs.readFileSync(path.join(root, 'docs/app-store/submission-evidence.json'), 'utf8'));
      const gaps = submissionGaps(root, evidence).filter(key => !process.argv.includes('--upload') || key !== 'signedDeviceAndLiveBackend');
      if (gaps.length) throw Error('app_store_submission_held: owner/store evidence required: ' + gaps.join(', '));
    }
    console.log('MOVO App Store asset packaging: PASS; Apple approval is not established.');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { checkBundle, submissionGaps };
