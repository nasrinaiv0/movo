/**
 * Contract for MOVO's public data-security guide.
 * Keep user-facing claims aligned with *production* behavior, not unmerged PRs.
 * This is an editorial/structural check, not a security penetration test.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

test('security guide exists, is navigable and does not require third-party scripts', () => {
  const page = read('public/security.html');
  const routes = JSON.parse(read('vercel.json')).rewrites;
  expect(routes).toEqual(expect.arrayContaining([{ source: '/security', destination: '/security.html' }]));
  expect(page).toContain('<html lang="en">');
  expect(page).toContain('name="viewport"');
  expect(page).toContain('prefers-reduced-motion');
  expect(page).toContain('Security &amp; Data Guide');
  expect(page).toContain('support@nasrinai.com');
  expect(page).toContain('href="/privacy"');
  expect(page).toContain('href="/terms"');
  expect(page).not.toMatch(/<script\b/i);
  expect(page).not.toMatch(/(?:linear|radial)-gradient\(/i);
});

test('production encryption copy is honest and distinguishes pending PRs', () => {
  const page = read('public/security.html');
  const guide = read('docs/security/MOVO_USER_DATA_SECURITY_GUIDE.md');
  const terms = read('public/terms.html');
  const privacy = read('public/privacy.html');
  expect(page).toMatch(/production MOVO app does\s*<strong>not<\/strong> yet encrypt all local financial records/i);
  expect(page).toContain('PRs #289 and #290');
  expect(page).toContain('still in review');
  expect(terms).toContain('Browser storage is not encrypted by MOVO itself.');
  expect(privacy).toContain('MOVO does not encrypt browser storage itself;');
  expect(guide).toContain('not yet live');
  expect(guide).toContain('not a bank');
  expect(guide).toContain('does **not**');
});

test('existing privacy, terms and Settings link to the new guide without implying it is a separate policy', () => {
  expect(read('public/privacy.html')).toContain('<a href="/security">Security &amp; Data Guide</a>');
  expect(read('public/terms.html')).toContain('<a href="/security">Security &amp; Data Guide</a>');
  const settings = read('src/screens/Settings.js');
  expect(settings).toContain("Browser.open({ url: 'https://movo.nasrinai.com/security' })");
  const page = read('public/security.html');
  expect(page).toContain('not a certification');
  expect(page).toContain('Privacy Policy');
  expect(page).toContain('Terms of Service');
});

test('guide explicitly covers relevant customer protections, limits, and actions', () => {
  const page = read('public/security.html');
  for (const anchor of ['features','protection','storage','choices','questions']) {
    expect(page).toContain('id="' + anchor + '"');
  }
  for (const term of ['Row-Level Security','Apple Keychain','Keystore','app lock',
    'Financial', 'AI', 'account-deletion.html', 'unsynced', 'CVV', 'not',
    'manually', 'cloud mode']) {
    expect(page.toLowerCase()).toContain(term.toLowerCase());
  }
});
