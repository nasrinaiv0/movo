const fs = require('fs');
const path = require('path');
describe('public app-store legal documents', () => {
  for (const [route, date] of [['terms', 'November 20, 2026'], ['privacy', 'November 20, 2026']]) {
    test(route + ' is a standalone HTML legal page rather than the SPA shell', () => {
      const html = fs.readFileSync(path.join(process.cwd(), 'public', route + '.html'), 'utf8');
      expect(html).toMatch(/<!doctype html>/i);
      expect(html).toContain('MOVO');
      expect(html).toContain(date);
      expect(html).toContain('support@nasrinai.com');
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
const { synchronizePages, buildStaticPolicy, renderCore, CORE_BLOCKS } = require('../../scripts/update-legal-pages.cjs');
const legalCore = require('./legalCore.json');
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

test('critical corrected disclosures are canonical, noncontradictory and idempotently generated', () => {
  for (const kind of ['terms', 'privacy']) {
    const html = fs.readFileSync(path.join(process.cwd(), 'public', kind + '.html'), 'utf8');
    expect(buildStaticPolicy(kind, html)).toBe(html);
    for (const [key] of CORE_BLOCKS[kind]) expect(html).toContain(renderCore(key));
    expect(html).toContain('movo-legal-revision');
    expect(html).not.toContain('MOVO does not encrypt browser storage itself');
    expect(html).not.toContain('It is not sent to MOVO&#39;s cloud database');
    expect(html).toContain('product of NasrinAI');
  }
  expect(legalCore.privacyLocal.join(' ')).toContain('not all protected');
  expect(legalCore.privacyPurchase.join(' ')).toContain('encrypted copy');
  expect(legalCore.privacyRetention.join(' ')).toContain('not guaranteed on day 90');
});
