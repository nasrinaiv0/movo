import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..', '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('iOS asks StoreKit for Apple\'s own rating dialog and adds no custom prompt', () => {
  const swift = read('ios/App/App/MovoNativePlugin.swift');
  expect(swift).toContain('import StoreKit');
  expect(swift).toContain('CAPPluginMethod(name: "requestReview"');
  expect(swift).toMatch(/AppStore\.requestReview\(in: scene\)/);
  expect(swift).toMatch(/SKStoreReviewController\.requestReview\(in: scene\)/);
  expect(swift).not.toMatch(/apps\.apple\.com|itms-apps|UIAlertController/);
});

test('Android uses Google Play In-App Review and adds no custom prompt', () => {
  const java = read('android/app/src/main/java/com/nasrinai/movo/MovoNativePlugin.java');
  expect(java).toContain('ReviewManagerFactory.create(activity)');
  expect(java).toMatch(/requestReviewFlow\(\)[\s\S]*launchReviewFlow\(activity, info\)/);
  expect(java).not.toMatch(/play\.google\.com|market:\/\/|AlertDialog/);
  expect(read('android/app/build.gradle')).toMatch(/implementation "com\.google\.android\.play:review:\d+\.\d+\.\d+"/);
});
