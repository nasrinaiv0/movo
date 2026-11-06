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
  expect(fromRoot('android/app/src/main/java/com/nasrinai/movo/MainActivity.java')).toContain('FLAG_SECURE');
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
