'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { prepare } = require('./prepare-app-store-assets.cjs');
const { checkBundle, submissionGaps } = require('./check-app-store-rights.cjs');

test('App Store packaging removes unreviewed build copies, preserves repository originals and notices, then rejects reinsertion', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'movo-rights-'));
  try {
    for (const dir of ['public/wallpapers', 'build/wallpapers', 'build/brands/offline', 'build/static/js', 'src/lib']) fs.mkdirSync(path.join(root, dir), { recursive: true });
    fs.writeFileSync(path.join(root, 'public/wallpapers/old.webp'), 'original repository bytes');
    fs.writeFileSync(path.join(root, 'build/wallpapers/old.webp'), 'unverified');
    fs.writeFileSync(path.join(root, 'build/brands/offline/bank.png'), 'unverified');
    fs.writeFileSync(path.join(root, 'build/asset-manifest.json'), '{}');
    fs.writeFileSync(path.join(root, 'build/third-party-notices.txt'), 'license\n'.repeat(200));
    fs.writeFileSync(path.join(root, 'src/lib/brandMarks.js'), 'export const BRAND_MARKS = {};');
    prepare(root);
    assert.equal(checkBundle(root), true);
    assert.equal(fs.readFileSync(path.join(root, 'public/wallpapers/old.webp'), 'utf8'), 'original repository bytes');
    fs.writeFileSync(path.join(root, 'build/unknown.webp'), 'unlisted artwork');
    assert.throws(() => checkBundle(root), /unlisted media/);
    fs.unlinkSync(path.join(root, 'build/unknown.webp'));
    fs.writeFileSync(path.join(root, 'build/brands/offline/reinserted.png'), 'not reviewed');
    assert.throws(() => checkBundle(root), /unreviewed assets remain/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('claiming review without evidence cannot authorize upload or rename the canonical bundle', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'movo-rights-'));
  try {
    const reviews = Object.fromEntries(['nameAndTrademark','originalAssetsAndLicenses','singleAppStoreRecord','storeMetadataAndScreenshots','signedDeviceAndLiveBackend'].map(key => [key, { status: 'reviewed', evidence: 'docs/app-store/evidence/missing.md' }]));
    assert.equal(submissionGaps(root, { bundleId: 'com.nasrinai.movo', reviews }).length, 5);
    assert.ok(submissionGaps(root, { bundleId: 'com.nasrinai.movo2', reviews }).includes('canonical bundle ID'));
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
