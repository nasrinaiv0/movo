'use strict';

// .env.production gives every production build (website, iPhone, Android) MOVO's PUBLIC cloud connection, so an app
// built outside the release pipeline can still sign in (owner, 2026-11-12). It must never hold anything secret.
const fs = require('fs');
const path = require('path');
const { validateAndroidAuthConfig } = require('../../scripts/validate-android-auth-config.cjs');

const file = path.join(__dirname, '..', '..', '.env.production');
const text = fs.readFileSync(file, 'utf8');
const entries = text.split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#'))
  .map(line => { const at = line.indexOf('='); return [line.slice(0, at), line.slice(at + 1)]; });

test('holds exactly the two public browser values', () => {
  expect(entries.map(([name]) => name).sort()).toEqual(['REACT_APP_SUPABASE_ANON_KEY', 'REACT_APP_SUPABASE_URL']);
});

test('points at the MOVO project with a public key (the Android release validator agrees)', () => {
  expect(validateAndroidAuthConfig(Object.fromEntries(entries))).toEqual([]);
  const key = Object.fromEntries(entries).REACT_APP_SUPABASE_ANON_KEY;
  expect(key).toMatch(/^sb_publishable_[A-Za-z0-9_-]{20,}$/);
});

test('contains no secret of any kind', () => {
  const values = entries.map(([, value]) => value).join('\n');
  expect(values).not.toMatch(/sb_secret_|service_role|sk-or-|nsr_|PRIVATE KEY/i);
  // No server-only names, even as comments turned into values.
  ['SUPABASE_SERVICE_ROLE_KEY', 'NASRINAI_API_KEY', 'OPENROUTER_API_KEY', 'CRON_SECRET', 'GOOGLE_PLAY_SERVICE_ACCOUNT_JSON', 'APPLE_IAP_SIGNING_KEY']
    .forEach(name => expect(entries.some(([n]) => n === name)).toBe(false));
});
