'use strict';

/**
 * MOVO iOS release contract — static, secret-free checks on source-controlled
 * packaging. These are necessary gates, not proof of Apple signing or approval.
 * Runs before both unsigned macOS CI and signed Codemagic archives.
 */
const fs = require('node:fs');
const path = require('node:path');

const BUNDLE_ID = 'com.nasrinai.movo';

function assert(condition, description) {
  if (!condition) throw new Error('ios_release_gate: ' + description);
}

function checkReleaseContract({ capacitor, project, info, icon, codemagic }) {
  assert(capacitor && typeof capacitor === 'object', 'Capacitor config missing');
  assert(capacitor.appId === BUNDLE_ID, 'Capacitor bundle ID changed');
  assert(capacitor.appName === 'MOVO', 'Capacitor app name changed');
  assert(capacitor.webDir === 'build', 'native bundled web directory changed');
  assert(!capacitor.server?.url, 'remote web server URL is forbidden in the release app');
  assert(capacitor.plugins?.NativePurchases?.autoFinishTransactions === false,
    'StoreKit transactions must be finished only after server verification');

  assert(typeof project === 'string' && typeof info === 'string', 'native project missing');
  const xcodeIds = [...project.matchAll(/PRODUCT_BUNDLE_IDENTIFIER\s*=\s*([^;\s]+)\s*;/g)].map(m => m[1]);
  assert(xcodeIds.length >= 2 && xcodeIds.every(id => id === BUNDLE_ID),
    'Xcode bundle IDs must be identical for Debug and Release');
  const versions = [...project.matchAll(/CURRENT_PROJECT_VERSION\s*=\s*(\d+)\s*;/g)].map(m => Number(m[1]));
  assert(versions.length >= 2 && versions.every(version => Number.isSafeInteger(version) && version > 0),
    'Xcode build number must be positive for both configurations');
  const marketing = [...project.matchAll(/MARKETING_VERSION\s*=\s*([\d.]+)\s*;/g)].map(m => m[1]);
  assert(marketing.length >= 2 && marketing.every(version => /^\d+(?:\.\d+){1,2}$/.test(version)),
    'Xcode marketing version must be a valid dotted version');
  assert(project.includes('TARGETED_DEVICE_FAMILY = 1;'), 'MOVO is an iPhone-only release');
  assert(project.includes('ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;'),
    'AppIcon asset is not selected in Xcode');

  for (const key of ['NSCameraUsageDescription', 'NSMicrophoneUsageDescription',
      'NSPhotoLibraryUsageDescription', 'NSFaceIDUsageDescription']) {
    assert(info.includes('<key>' + key + '</key>'), key + ' missing from Info.plist');
  }
  assert(info.includes('<string>MOVO</string>'), 'App display name is missing');
  assert(info.includes('<string>movo</string>'), 'Native callback URL scheme is missing');
  assert(icon && icon.images && icon.images.some(image => image.platform === 'ios'
    && image.size === '1024x1024' && image.filename),
  'Universal 1024×1024 App Store icon asset missing');

  assert(typeof codemagic === 'string' && codemagic.includes('ios_signing:')
    && codemagic.includes('distribution_type: app_store')
    && codemagic.includes('app_store_connect:')
    && codemagic.includes('submit_to_testflight: true')
    && codemagic.includes('xcode-project build-ipa')
    && codemagic.includes('npm ci'),
  'Signed TestFlight pipeline is missing or not reproducible');
  return true;
}

function checkRepository(root = path.resolve(__dirname, '..')) {
  const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
  checkReleaseContract({
    capacitor: JSON.parse(read('capacitor.config.json')),
    project: read('ios/App/App.xcodeproj/project.pbxproj'),
    info: read('ios/App/App/Info.plist'),
    icon: JSON.parse(read('ios/App/App/Assets.xcassets/AppIcon.appiconset/Contents.json')),
    codemagic: read('codemagic.yaml'),
  });
  const iconFiles = JSON.parse(read('ios/App/App/Assets.xcassets/AppIcon.appiconset/Contents.json')).images;
  for (const { filename } of iconFiles) {
    const iconPath = path.join(root, 'ios/App/App/Assets.xcassets/AppIcon.appiconset', filename || '');
    assert(filename && fs.existsSync(iconPath),
      'iOS App Store icon file is missing: ' + String(filename));
    const png = fs.readFileSync(iconPath);
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    assert(png.length >= 26 && png.subarray(0, 8).equals(signature)
      && png.readUInt32BE(16) === 1024 && png.readUInt32BE(20) === 1024
      && png[25] === 2, 'App Store icon must be an opaque 1024x1024 RGB PNG');
  }
  return true;
}

if (require.main === module) {
  try {
    checkRepository();
    process.stdout.write('MOVO iOS source release contract: PASS (signing, privacy disclosures and device QA still required)\n');
  } catch (error) {
    process.stderr.write(String(error.message) + '\n');
    process.exitCode = 1;
  }
}

module.exports = { BUNDLE_ID, checkReleaseContract, checkRepository };
