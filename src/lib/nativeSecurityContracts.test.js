const fs = require('fs');
const path = require('path');
const fromRoot = p => fs.readFileSync(path.join(process.cwd(), p), 'utf8');

test('native startup does not restore Supabase auth keys into localStorage', () => {
  const js = fromRoot('src/lib/native.js');
  expect(js).toMatch(/const KEEP = \/\^movo/);
  expect(js).not.toMatch(/const KEEP = \/\^\(movo\\\.\|sb-/);
});
test('Supabase uses a native Keychain/Keystore storage adapter on native platforms', () => {
  const js = fromRoot('src/lib/supabaseClient.js');
  expect(js).toContain('storage: nativeSecureAuthStorage');
  expect(js).toContain("flowType: 'pkce'");
});
test('iOS Keychain and Android Keystore protect refresh tokens at rest', () => {
  expect(fromRoot('ios/App/App/MovoNativePlugin.swift')).toContain('kSecAttrAccessibleWhenUnlockedThisDeviceOnly');
  const android = fromRoot('android/app/src/main/java/com/nasrinai/movo/MovoNativePlugin.java');
  expect(android).toContain('AndroidKeyStore');
  expect(android).toContain('AES/GCM/NoPadding');
  expect(android).not.toContain('MODE_WORLD_READABLE');
});
test('native app switcher previews and Android device backups are protected', () => {
  expect(fromRoot('ios/App/App/SceneDelegate.swift')).toContain('sceneWillResignActive');
  // Screenshots are allowed while MOVO is in use (owner, 2026-11-12); the recent-apps preview stays covered.
  const activity = fromRoot('android/app/src/main/java/com/nasrinai/movo/MainActivity.java');
  expect(activity).toContain('setRecentsScreenshotEnabled(false)');
  expect(activity).toMatch(/onPause\(\) \{[\s\S]*?addFlags\(WindowManager\.LayoutParams\.FLAG_SECURE\)[\s\S]*?super\.onPause\(\)/);
  expect(activity).toMatch(/onResume\(\) \{[\s\S]*?clearFlags\(WindowManager\.LayoutParams\.FLAG_SECURE\)/);
  const onCreate = activity.slice(activity.indexOf('onCreate('), activity.indexOf('onPause('));
  expect(onCreate).not.toMatch(/addFlags\(WindowManager\.LayoutParams\.FLAG_SECURE\)/);
  expect(fromRoot('android/app/src/main/AndroidManifest.xml')).toContain('android:allowBackup="false"');
  expect(fromRoot('android/app/src/main/res/xml/data_extraction_rules.xml')).toContain('<device-transfer>');
});
test('vulnerability disclosure has a publicly deployable security.txt', () => {
  const txt = fromRoot('public/.well-known/security.txt');
  expect(txt).toContain('mailto:support@nasrinai.com');
  expect(txt).toContain('Expires:');
  expect(txt).toContain('Canonical: https://movo.nasrinai.com/.well-known/security.txt');
});

test('phone-automation device keys cannot be mirrored into native preferences', () => {
  const source = fromRoot('src/App.js');
  expect(source).toContain('JSON.stringify(sanitizeNativePreferenceCache(prefs))');
  expect(source).toContain('saveNativeAutomationKey');
  const vault = fromRoot('src/lib/nativeAutomationKey.js');
  expect(vault).toContain('delete clone.autoLogKey');
  expect(vault).toContain("MovoNative.secureSet({ key: VAULT_KEY, value: activeKey })");
  expect(fromRoot('ios/App/App/MovoNativePlugin.swift')).toContain('movo-autolog-key');
  expect(fromRoot('android/app/src/main/java/com/nasrinai/movo/MovoNativePlugin.java')).toContain('movo-autolog-key');
});

test('financial list cache ciphertext is never restored into native Preferences and keys have narrow vault allowlists', () => {
  const native = fromRoot('src/lib/native.js');
  expect(native).toContain('readCache\\.v1:');
  const java = fromRoot('android/app/src/main/java/com/nasrinai/movo/MovoNativePlugin.java');
  const swift = fromRoot('ios/App/App/MovoNativePlugin.swift');
  expect(java).toContain('key.equals("movo-finance-cache-key-v1")');
  expect(swift).toContain('key == "movo-finance-cache-key-v1"');
  expect(fromRoot('src/lib/offlineReadCache.js')).toContain('encryptFinancialCache');
  expect(fromRoot('src/lib/financeCacheCrypto.js')).toContain("name: 'AES-GCM'");
});
