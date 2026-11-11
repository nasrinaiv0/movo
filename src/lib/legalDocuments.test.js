const fs = require('fs');
const path = require('path');
describe('public app-store legal documents', () => {
  for (const route of ['terms', 'privacy']) {
    test(route + ' is a standalone HTML legal page rather than the SPA shell', () => {
      const html = fs.readFileSync(path.join(process.cwd(), 'public', route + '.html'), 'utf8');
      expect(html).toMatch(/<!doctype html>/i);
      expect(html).toContain('MOVO');
      expect(html).toContain('November 11, 2026');
      expect(html).toContain('support@nasrinai.com');
      expect(html).toContain('dpo@nasrinai.com');
      expect(html).toContain('Nasrin Abubakar');
      expect(html).toContain('142 Pag-asa Village');
      expect(html).toMatch(/<h2>/);
      expect(html).not.toContain('<div id="root"></div>');
    });
  }
  test('direct legal URLs point to standalone documents', () => {
    const config = require('../../vercel.json');
    expect(config.rewrites).toEqual(expect.arrayContaining([
      { source: '/privacy', destination: '/privacy.html' },
      { source: '/terms', destination: '/terms.html' },
    ]));
  });
});

const legalSupplement = require('./legalSupplement.json');
const { synchronizePages } = require('../../scripts/update-legal-pages.cjs');
test('public and in-app legal disclosures use the same canonical English supplements', () => {
  expect(() => synchronizePages({ check: true })).not.toThrow();
  expect(legalSupplement.terms.length).toBeGreaterThanOrEqual(5);
  expect(legalSupplement.privacy.length).toBeGreaterThanOrEqual(8);
  for (const kind of ['terms','privacy']) {
    const html = fs.readFileSync(path.join(process.cwd(), 'public', kind + '.html'), 'utf8');
    for (const section of legalSupplement[kind]) expect(html).toContain(section.heading);
    expect(html).toContain('data-legal-supplement=');
  }
});


test('external account deletion and in-app legal notices identify the DPO', () => {
  const page = fs.readFileSync(path.join(process.cwd(), 'public/account-deletion.html'), 'utf8');
  const app = fs.readFileSync(path.join(process.cwd(), 'src/screens/Legal.js'), 'utf8');
  for (const source of [page, app]) {
    expect(source).toContain('Nasrin Abubakar');
    expect(source).toContain('dpo@nasrinai.com');
  }
  expect(page).toContain('mailto:support@nasrinai.com');
});
