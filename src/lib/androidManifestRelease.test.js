/** @jest-environment node */
'use strict';
const { readFileSync } = require('fs');
const path = require('path');

const manifest = readFileSync(path.resolve(__dirname, '../../android/app/src/main/AndroidManifest.xml'), 'utf8');
const filters = Array.from(manifest.matchAll(/<intent-filter>([\s\S]*?)<\/intent-filter>/g), match => match[1]);

describe('Android release deep-link routing', () => {
  test.each(['auth-callback', 'log'])('registers an exported, browser-resolvable movo://%s link', host => {
    const matched = filters.filter(filter => filter.includes('android:scheme="movo"') && filter.includes('android:host="' + host + '"'));
    expect(matched).toHaveLength(1);
    expect(matched[0]).toContain('android.intent.action.VIEW');
    expect(matched[0]).toContain('android.intent.category.DEFAULT');
    expect(matched[0]).toContain('android.intent.category.BROWSABLE');
  });

  test('does not register catch-all MOVO links or auth secrets in the manifest', () => {
    expect(manifest).toContain('android:exported="true"');
    expect(filters.filter(filter => filter.includes('android:scheme="movo"'))).toHaveLength(2);
    expect(manifest).not.toMatch(/android:scheme="movo"\s*\/>/);
    expect(manifest).not.toMatch(/access_token|refresh_token|client_secret/i);
  });

  test('disables cloud backups and device transfer of locally stored financial data', () => {
    expect(manifest).toContain('android:allowBackup="false"');
    expect(manifest).toContain('android:dataExtractionRules="@xml/data_extraction_rules"');
    const extraction = readFileSync(path.resolve(__dirname, '../../android/app/src/main/res/xml/data_extraction_rules.xml'), 'utf8');
    const domains = ['root', 'file', 'database', 'sharedpref', 'external', 'device_root', 'device_file', 'device_database', 'device_sharedpref'];
    for (const section of ['cloud-backup', 'device-transfer']) {
      const rules = extraction.split('<' + section + '>')[1].split('</' + section + '>')[0];
      for (const domain of domains) expect(rules).toContain('<exclude domain="' + domain + '" path="." />');
    }
  });
});
