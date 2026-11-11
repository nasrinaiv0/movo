'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { validateAndroidAuthConfig } = require('./validate-android-auth-config.cjs');

const valid = {
  REACT_APP_SUPABASE_URL: 'https://example.supabase.co',
  REACT_APP_SUPABASE_ANON_KEY: 'sb_publishable_' + 'a'.repeat(40),
};

test('a valid HTTPS project URL and public publishable key permit native auth builds', () => {
  assert.deepEqual(validateAndroidAuthConfig(valid), []);
});

test('missing build-time variables block signed Android builds', () => {
  assert.equal(validateAndroidAuthConfig({}).length, 2);
  assert.notDeepEqual(validateAndroidAuthConfig({ ...valid, REACT_APP_SUPABASE_ANON_KEY: '' }), []);
  assert.notDeepEqual(validateAndroidAuthConfig({ ...valid, REACT_APP_SUPABASE_URL: '' }), []);
});

test('non-HTTPS and non-root auth origins are blocked', () => {
  for (const url of ['http://example.supabase.co', 'https://example.supabase.co/auth/v1', 'https://example.supabase.co?key=1']) {
    assert.notDeepEqual(validateAndroidAuthConfig({ ...valid, REACT_APP_SUPABASE_URL: url }), []);
  }
});

test('service-role and secret keys cannot be embedded in the mobile bundle', () => {
  assert.notDeepEqual(validateAndroidAuthConfig({ ...valid, REACT_APP_SUPABASE_ANON_KEY: 'sb_secret_' + 'b'.repeat(40) }), []);
  const payload = Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url');
  assert.notDeepEqual(validateAndroidAuthConfig({ ...valid, REACT_APP_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiJ9.' + payload + '.signature' }), []);
});

test('Google Play signed workflow explicitly validates and embeds public auth settings', () => {
  const yaml = fs.readFileSync(path.resolve(__dirname, '../.github/workflows/google-play-release.yml'), 'utf8');
  const anchor = yaml.indexOf('- name: Validate Android sign-in configuration and build MOVO web assets');
  assert.ok(anchor > 0, 'signed release guard must be present');
  const signedBuild = yaml.slice(anchor, yaml.indexOf('- name: Synchronize Android native assets', anchor));
  assert.match(signedBuild, /vars\.REACT_APP_SUPABASE_URL/);
  assert.match(signedBuild, /secrets\.REACT_APP_SUPABASE_ANON_KEY/);
  assert.match(signedBuild, /node scripts\/validate-android-auth-config\.cjs/);
  assert.match(signedBuild, /CI=true npm run build/);
});
