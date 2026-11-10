'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { checkReleaseContract, checkRepository } = require('./check-ios-release-readiness.cjs');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
function fixture() {
  return {
    capacitor: JSON.parse(read('capacitor.config.json')),
    project: read('ios/App/App.xcodeproj/project.pbxproj'),
    info: read('ios/App/App/Info.plist'),
    icon: JSON.parse(read('ios/App/App/Assets.xcassets/AppIcon.appiconset/Contents.json')),
    codemagic: read('codemagic.yaml'),
  };
}

test('current source-controlled native packaging contract is complete', () => {
  assert.equal(checkRepository(root), true);
});

test('rejects remote-web wrappers and accidental bundle ID changes', () => {
  const remote = fixture();
  remote.capacitor.server = { url: 'https://movo.nasrinai.com' };
  assert.throws(() => checkReleaseContract(remote), /remote web server/);
  const renamed = fixture();
  renamed.capacitor.appId = 'com.example.movo';
  assert.throws(() => checkReleaseContract(renamed), /Capacitor bundle ID/);
});

test('rejects a changed Xcode Release bundle ID or invalid version', () => {
  const changed = fixture();
  changed.project = changed.project.replace('PRODUCT_BUNDLE_IDENTIFIER = com.nasrinai.movo;',
    'PRODUCT_BUNDLE_IDENTIFIER = com.example.movo;');
  assert.throws(() => checkReleaseContract(changed), /Xcode bundle IDs/);
  const invalid = fixture();
  invalid.project = invalid.project.replace('CURRENT_PROJECT_VERSION = 1;', 'CURRENT_PROJECT_VERSION = 0;');
  assert.throws(() => checkReleaseContract(invalid), /build number/);
});

test('fails closed when a native permission or StoreKit finish gate disappears', () => {
  const missingPermission = fixture();
  missingPermission.info = missingPermission.info.replace('<key>NSFaceIDUsageDescription</key>', '');
  assert.throws(() => checkReleaseContract(missingPermission), /NSFaceIDUsageDescription/);
  const autoFinish = fixture();
  autoFinish.capacitor.plugins.NativePurchases.autoFinishTransactions = true;
  assert.throws(() => checkReleaseContract(autoFinish), /StoreKit transactions/);
});

test('requires a reproducible signed TestFlight pipeline', () => {
  const changed = fixture();
  changed.codemagic = changed.codemagic.replace('npm ci', 'npm install');
  assert.throws(() => checkReleaseContract(changed), /Signed TestFlight pipeline/);
});
