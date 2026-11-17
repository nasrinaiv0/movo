'use strict';
const fs = require('fs');
const path = require('path');
const supplement = require('../src/lib/legalSupplement.json');

const escapeHtml = value => String(value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function renderSupplement(kind) {
  const sections = supplement[kind];
  if (!Array.isArray(sections)) throw new Error('Unknown legal section kind: ' + kind);
  return '<div data-legal-supplement="' + kind + '" lang="en">\n'
    + sections.map(section => '<section class="legal-section">\n'
      + '<h2>' + escapeHtml(section.heading) + '</h2>\n'
      + section.paragraphs.map(p => '<p>' + escapeHtml(p) + '</p>').join('\n') + '\n'
      + ((section.links || []).length ? '<p class="legal-supplement-links">' + section.links.map(link => {
        if (!/^https:\/\//.test(link.url)) throw new Error('Only HTTPS policy links are supported.');
        return '<a href="' + escapeHtml(link.url) + '" rel="noopener noreferrer">' + escapeHtml(link.label) + '</a>';
      }).join(' · ') + '</p>\n' : '')
      + '</section>').join('\n') + '\n</div><!-- MOVO_LEGAL_SUPPLEMENT_END -->';
}
function buildStaticPolicy(kind, html) {
  if (!['terms', 'privacy'].includes(kind)) throw new Error('Invalid legal page');
  let result = html.replace(/<div data-legal-supplement="(?:terms|privacy)"[^>]*>[\s\S]*?<\/div><!-- MOVO_LEGAL_SUPPLEMENT_END -->/g, '');
  // The effective dates come from src/lib/legalVersion.js, so the static pages always match the in-app version.
  const version = fs.readFileSync(path.join(__dirname, '..', 'src', 'lib', 'legalVersion.js'), 'utf8');
  const iso = (version.match(new RegExp(kind.toUpperCase() + "_EFFECTIVE_DATE = '([0-9-]+)T")) || [])[1];
  if (!iso) throw new Error('Missing ' + kind + ' effective date in legalVersion.js');
  const [y, m, d] = iso.split('-').map(Number);
  const label = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  result = result.replace(/Effective date: [A-Z][a-z]+ [0-9]+, [0-9]{4}/, 'Effective date: ' + label);
  result = result.replace(/\n<\/article>/, '</article>');
  if (!result.includes('</article>')) throw new Error('Legal page is missing article container');
  return result.replace('</article>', renderSupplement(kind) + '\n</article>');
}
function synchronizePages({ check = false } = {}) {
  const results = [];
  for (const kind of ['terms', 'privacy']) {
    const filename = path.join(__dirname, '..', 'public', kind + '.html');
    const old = fs.readFileSync(filename, 'utf8');
    const next = buildStaticPolicy(kind, old);
    if (check && old !== next) throw new Error(filename + ' differs from the canonical legal supplement');
    if (!check) fs.writeFileSync(filename, next);
    results.push({kind, bytes:Buffer.byteLength(next,'utf8'), current: old === next});
  }
  return results;
}
if (require.main === module) console.log(synchronizePages({ check: process.argv.includes('--check') }));
module.exports = { renderSupplement, buildStaticPolicy, synchronizePages };

