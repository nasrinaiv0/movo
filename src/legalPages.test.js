const fs = require('fs');
const path = require('path');

describe('MOVO public legal pages', () => {
  const readPublicPage = (name) => fs.readFileSync(path.join(process.cwd(), 'public', name), 'utf8');

  test('Terms of Service is present, linked to privacy, and explains AI limitations', () => {
    const html = readPublicPage('terms.html');
    expect(html).toContain('<title>Terms of Service · MOVO</title>');
    expect(html).toContain('href="/privacy.html"');
    expect(html).toContain('AI outputs can be incomplete');
    expect(html).toContain('not legal advice');
  });

  test('Privacy Policy is present, linked to terms, and describes local storage and AI consent', () => {
    const html = readPublicPage('privacy.html');
    expect(html).toContain('<title>Privacy Policy · MOVO</title>');
    expect(html).toContain('href="/terms.html"');
    expect(html).toContain('Browser local storage is not encrypted');
    expect(html).toContain('explicitly choose to send that context to NasrinAI');
    expect(html).toContain('access, correction, export, or deletion');
  });

  test('legal pages are responsive and do not claim to be an authorization boundary', () => {
    for (const name of ['terms.html', 'privacy.html']) {
      const html = readPublicPage(name);
      expect(html).toContain('name="viewport"');
      expect(html).toContain('name="robots" content="noindex,nofollow,noarchive"');
    }
  });
});
