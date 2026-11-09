'use strict';
const fs = require('fs');
const { validateTemplate, FILE } = require('../../scripts/validate-supabase-email-template.cjs');
test('owner OTP HTML is safe for Supabase Go template text replacement', () => {
  const html = fs.readFileSync(FILE, 'utf8');
  expect(validateTemplate(html)).toEqual([]);
  expect(html).toContain('Your sign-in code');
  expect(html).toContain('width="100%"');
  expect(html).toContain('max-width:440px');
  expect(html).toContain('Never share it');
});
test('rejects contextual CSS and malicious token interpolation', () => {
  const html = fs.readFileSync(FILE, 'utf8');
  expect(validateTemplate(html.replace('</head>', '<style>p::before {content:"</style></head>'))).toContain(
    'Do not use style or script blocks in Supabase Auth templates.'
  );
  expect(validateTemplate(html.replace('href="https://movo.nasrinai.com"', 'href="{{ .ConfirmationURL }}"')))
    .toContain('Never place an Auth template variable inside an HTML tag or attribute.');
  expect(validateTemplate(html.replace('{{ .Token }}', ''))).toContain(
    'The only permitted variable is one visible {{ .Token }} placeholder.'
  );
});
