import fs from 'fs';
import path from 'path';

const fromRoot = name => fs.readFileSync(path.join(process.cwd(), name), 'utf8');

test('Movo public security page is available through the real Vercel rewrite', () => {
  const vercel = JSON.parse(fromRoot('vercel.json'));
  expect(vercel.rewrites).toContainEqual({ source: '/security', destination: '/security.html' });
  const headers = vercel.headers.find(item => item.source === '/(.*)').headers;
  const get = name => headers.find(header => header.key === name)?.value;
  expect(get('Strict-Transport-Security')).toContain('max-age=');
  expect(get('Content-Security-Policy')).toContain("default-src 'self'");
  expect(get('Content-Security-Policy')).toContain("frame-ancestors 'none'");
  expect(get('X-Content-Type-Options')).toBe('nosniff');
  expect(get('X-Frame-Options')).toBe('DENY');
  expect(get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
});

test('user-facing claims disclose limits, local-version differences and rights', () => {
  const page = fromRoot('public/security.html');
  const privacy = fromRoot('public/privacy.html');
  const terms = fromRoot('public/terms.html');
  expect(page).toContain('No app can guarantee perfect security.');
  expect(page).toContain('Dependent on app version');
  expect(page).toContain('not an independent audit');
  expect(page).toContain('support@nasrinai.com');
  expect(privacy).toContain('Older versions');
  expect(privacy).toContain('application-level encryption');
  expect(terms).toContain('Supported updated app versions');
  expect(privacy).toContain('href="/security"');
  expect(terms).toContain('href="/security"');
  expect(fromRoot('docs/security/MOVO_USER_DATA_SECURITY_ASSURANCE_2026-11-13.md')).toContain('not yet included in the production app');
});

test('finance vault migrates data before the customer app begins rendering', () => {
  const entry = fromRoot('src/index.tsx');
  const ready = entry.indexOf('await initialiseFinanceVault()');
  const local = entry.indexOf('await migrateFinanceLocalStorage()');
  const journal = entry.indexOf('await migrateHybridFinanceEncryption()');
  const qr = entry.indexOf('await migrateLocalAccountQrEncryption()');
  const render = entry.indexOf('    render();\n    if (!ownerRoute)');
  expect(ready).toBeGreaterThan(0);
  expect(local).toBeGreaterThan(ready);
  expect(journal).toBeGreaterThan(local);
  expect(qr).toBeGreaterThan(journal);
  expect(render).toBeGreaterThan(qr);
});

test('native secure storage and mobile backup guards remain in place', () => {
  const manifest = fromRoot('android/app/src/main/AndroidManifest.xml');
  const native = fromRoot('src/lib/native.js');
  const auth = fromRoot('src/lib/nativeSecureAuthStorage.js');
  expect(manifest).toContain('android:allowBackup="false"');
  expect(manifest).toContain('android:exported="false"');
  expect(native).toContain('const RESTORE =');
  expect(native).toContain('offline\\.workspace\\.v2\\.');
  expect(auth).toContain('secure_auth_legacy_cleanup_failed');
  expect(auth).toContain('REVOKED');
});

test('QR, local finance and outbox cannot silently downgrade to plaintext', () => {
  const qr = fromRoot('src/lib/accountQrLocalStore.js');
  const vault = fromRoot('src/lib/financeVault.js');
  const journal = fromRoot('src/lib/hybridFinanceEncryption.js');
  expect(qr).toContain('sealFinance(dataUrl, scope(id))');
  expect(qr).toContain('cursor.update({ ...safe, sealedData: encrypted })');
  expect(qr).toContain('tx.abort()');
  expect(qr).toContain('account_qr_envelope_corrupt');
  expect(vault).toContain('financial_encryption_envelope_corrupt');
  expect(vault).toContain('saveFinanceJson');
  expect(journal).toContain("db.transaction(storeNames, 'readwrite')");
  expect(journal).toContain('transaction.abort()');
});
