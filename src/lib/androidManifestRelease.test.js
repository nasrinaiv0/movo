/** @jest-environment node */
'use strict';
const { readFileSync } = require('fs');
const path = require('path');

const manifest = readFileSync(path.resolve(__dirname, '../../android/app/src/main/AndroidManifest.xml'), 'utf8');
const gradle = readFileSync(path.resolve(__dirname, '../../android/app/build.gradle'), 'utf8');
const filters = Array.from(manifest.matchAll(/<intent-filter>([\s\S]*?)<\/intent-filter>/g), match => match[1]);

describe('Android release deep-link routing', () => {
  test('OAuth host uses a strict build-specific scheme, not a catch-all', () => {
    const auth = filters.filter(filter => filter.includes('android:host="auth-callback"'));
    expect(auth).toHaveLength(1);
    expect(auth[0]).toContain('android:scheme="${movoAuthScheme}"');
    expect(auth[0]).toContain('android.intent.action.VIEW');
    expect(auth[0]).toContain('android.intent.category.DEFAULT');
    expect(auth[0]).toContain('android.intent.category.BROWSABLE');
    // The merged production and test manifests are inspected separately in Android native CI.
    expect(gradle).toContain('manifestPlaceholders = [movoAuthScheme: "movo"]');
    expect(gradle).toContain('manifestPlaceholders = [movoAuthScheme: "movo-authcheck"]');
    expect(gradle).toContain('applicationIdSuffix ".authcheck"');
  });

  test('quick-log deep link stays unchanged for existing installs', () => {
    const logs = filters.filter(filter => filter.includes('android:scheme="movo"') && filter.includes('android:host="log"'));
    expect(logs).toHaveLength(1);
    expect(logs[0]).toContain('android.intent.action.VIEW');
    expect(logs[0]).toContain('android.intent.category.DEFAULT');
    expect(logs[0]).toContain('android.intent.category.BROWSABLE');
  });

  test('friend invitations use a strict build-specific host and scheme', () => {
    const friends = filters.filter(filter => filter.includes('android:host="friend"'));
    expect(friends).toHaveLength(1);
    expect(friends[0]).toContain('android:scheme="${movoAuthScheme}"');
    expect(friends[0]).toContain('android.intent.action.VIEW');
    expect(friends[0]).toContain('android.intent.category.DEFAULT');
    expect(friends[0]).toContain('android.intent.category.BROWSABLE');
  });

  test('Wear links use only the MOVO scheme and open the phone form', () => {
    const wear = filters.filter(filter => filter.includes('android:host="wear-log"'));
    expect(wear).toHaveLength(1);
    expect(wear[0]).toContain('android:scheme="movo"');
    expect(wear[0]).toContain('android.intent.action.VIEW');
    expect(wear[0]).toContain('android.intent.category.DEFAULT');
    expect(wear[0]).toContain('android.intent.category.BROWSABLE');
  });

  test('neither source manifest nor Gradle declares a permissive or credential-bearing callback', () => {
    expect(manifest).toContain('android:exported="true"');
    expect(filters).toHaveLength(5); // launcher, OAuth, quick-log, friends and Wear
    expect(filters.flatMap(filter => [...filter.matchAll(/android:host="([^"]+)"/g)].map(match => match[1])).sort())
      .toEqual(['auth-callback', 'friend', 'log', 'wear-log']);
    expect(manifest).not.toMatch(/<data\s+android:scheme="movo"\s*\/>/);
    expect(manifest).not.toMatch(/access_token|refresh_token|client_secret/i);
    expect(gradle).not.toMatch(/movoAuthScheme:\s*".*\*/);
  });

  test('disables cloud backups and device transfer of locally stored financial data', () => {
    expect(manifest).toContain('android:allowBackup="false"');
    expect(manifest).toContain('android:dataExtractionRules="@xml/data_extraction_rules"');
    const extraction = readFileSync(path.resolve(__dirname, '../../android/app/src/main/res/xml/data_extraction_rules.xml'), 'utf8');
    expect(extraction).toMatch(/<cloud-backup>\s*<exclude domain="root" path="\."\s*\/>\s*<\/cloud-backup>/);
    expect(extraction).toMatch(/<device-transfer>\s*<exclude domain="root" path="\."\s*\/>\s*<\/device-transfer>/);
  });
});
