'use strict';
// Supabase Go html/template is stricter than a browser HTML parser. Keep OTP
// placeholders exclusively in visible text, never CSS, JS, or HTML attributes.
// The production Supabase Auth template must be published separately in the
// Supabase dashboard. Merely committing this file does not update Auth.
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'supabase', 'templates', 'otp-email.html');
function validateTemplate(html) {
  const errors = [];
  if (typeof html !== 'string' || !html.trim()) return ['Template is empty.'];
  if (!/<!doctype html>/i.test(html) || !/<\/html>\s*$/i.test(html)) errors.push('Expected a complete HTML document.');
  if (/<\/?(?:style|script)\b/i.test(html)) errors.push('Do not use style or script blocks in Supabase Auth templates.');
  if (/<(?:iframe|object|embed|form)\b/i.test(html)) errors.push('Interactive or embedded content is not allowed.');
  const placeholders = [...html.matchAll(/{{([\s\S]*?)}}/g)];
  if (placeholders.length !== 1 || placeholders[0][1].trim() !== '.Token') {
    errors.push('The only permitted variable is one visible {{ .Token }} placeholder.');
  }
  // Go html/template escapes attributes contextually. Keep all interpolation in
  // a plain text node to prevent CSS/HTML escaping failures at render time.
  const withoutComments = html.replace(/<!--[\s\S]*?-->/g, '');
  if (/<[^>]*{{[\s\S]*?}}[^>]*>/m.test(withoutComments)) {
    errors.push('Never place an Auth template variable inside an HTML tag or attribute.');
  }
  if (!/href="https:\/\/movo\.nasrinai\.com"/.test(html)) errors.push('Only the static canonical MOVO sign-in URL may be linked.');
  if (/{{\s*\.(?:ConfirmationURL|TokenHash|SiteURL|RedirectTo)/.test(html)) {
    errors.push('Owner sign-in uses a typed email OTP, not a confirmation link.');
  }
  return errors;
}
if (require.main === module) {
  const errors = validateTemplate(fs.readFileSync(FILE, 'utf8'));
  if (errors.length) { for (const error of errors) console.error(error); process.exitCode = 1; }
  else console.log('Supabase OTP email template static safety checks passed.');
}
module.exports = { validateTemplate, FILE };
