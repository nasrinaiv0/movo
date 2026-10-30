import { iconCandidates } from './brandIconParse';

test('prefers the apple-touch-icon, then large SVG/PNG icons, then /favicon.ico', () => {
  const html = `<head>
    <link rel="icon" href="/favicon-32.png" sizes="32x32">
    <link rel='apple-touch-icon' sizes='180x180' href='https://cdn.example.com/a/touch.png?v=2&amp;x=1'>
    <link rel="icon" type="image/svg+xml" href="/brand.svg">
    <link rel="stylesheet" href="/site.css">
  </head>`;
  const list = iconCandidates(html, 'https://www.example.com/home');
  expect(list.map(c => c.url)).toEqual([
    'https://cdn.example.com/a/touch.png?v=2&x=1',
    'https://www.example.com/brand.svg',
    'https://www.example.com/favicon-32.png',
    'https://www.example.com/favicon.ico',
  ]);
});

test('ignores insecure, data: and malformed links', () => {
  const html = '<link rel="icon" href="http://example.com/a.png"><link rel="icon" href="data:image/png;base64,AAAA"><link rel="icon" href="javascript:alert(1)">';
  expect(iconCandidates(html, 'https://example.com/').map(c => c.url)).toEqual(['https://example.com/favicon.ico']);
});
