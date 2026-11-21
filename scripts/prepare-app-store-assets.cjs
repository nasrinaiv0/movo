'use strict';
const fs = require('node:fs');
const path = require('node:path');
const EXCLUDED = ['brands', 'wallpapers', 'mascot', 'tutorial'];
function prepare(root) {
  const build = path.join(root, 'build');
  if (!fs.existsSync(path.join(build, 'asset-manifest.json'))) throw Error('app_store_assets: completed build required');
  // Remove generated build copies only. Keep original repository assets and every user's stored selection.
  for (const folder of EXCLUDED) fs.rmSync(path.join(build, folder), { recursive: true, force: true });
  fs.mkdirSync(path.join(build, 'brands/offline'), { recursive: true }); // existing worker accepts an empty list
  const notices = path.join(build, 'third-party-notices.txt');
  if (!fs.existsSync(notices) || fs.statSync(notices).size < 1000) throw Error('app_store_assets: third-party notices missing');
  fs.writeFileSync(path.join(build, 'app-store-assets.json'), JSON.stringify({ policy: 'original-only', excluded: EXCLUDED, approvedByApple: false }, null, 2) + '\n');
}
module.exports = { prepare, EXCLUDED };
