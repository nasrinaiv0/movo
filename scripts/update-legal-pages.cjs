'use strict';
const fs = require('fs');
const path = require('path');
const supplement = require('../src/lib/legalSupplement.json');
const core = require('../src/lib/legalCore.json');

const escapeHtml = value => String(value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const CORE_BLOCKS = {
  terms: [['product', '1.', 'prepend'], ['eligibility', '2.', 'all'], ['termsLocal', '3.', 0]],
  privacy: [['privacyOwner', '1.', 'all'], ['privacyPurchase', 'Store purchase information:', 0],
    ['privacyLocal', '3.', 0], ['privacyArtwork', '3.', 1], ['privacyAISharing', '5.', 1],
    ['privacyRetention', '6.', 'all'], ['privacySecurity', '7.', 'all'], ['privacyChildren', '9.', 0]]
};
function renderCore(key) {
  if (!Array.isArray(core[key])) throw new Error('Unknown core legal block: ' + key);
  return '<div data-legal-core="' + key + '" lang="en">' + core[key].map(text => '<p>' + escapeHtml(text)
    .replace(/(dpo|support)@nasrinai\.com/g, email => '<a href="mailto:' + email + '">' + email + '</a>') + '</p>').join('') + '</div>';
}
function synchronizeCore(kind, html) {
  let result = html;
  for (const [key, heading, index] of CORE_BLOCKS[kind]) {
    const marked = new RegExp('<div data-legal-core="' + key + '" lang="en">[\\s\\S]*?</div>');
    if (marked.test(result)) { result = result.replace(marked, renderCore(key)); continue; }
    let changed = false;
    result = result.replace(/<section(?: class="[^"]*")?>\s*<h2>([^<]+)<\/h2>([\s\S]*?)<\/section>/g, (section, title, body) => {
      if (!title.startsWith(heading)) return section;
      changed = true;
      if (index === 'prepend') return section.replace('</h2>', '</h2>' + renderCore(key));
      let paragraph = 0;
      return section.replace(/<div data-legal-core="[^"]+" lang="en">[\s\S]*?<\/div>|<p(?: [^>]*)?>[\s\S]*?<\/p>/g, original => {
        const position = paragraph++;
        if (index === 'all') return position === 0 ? renderCore(key) : '';
        return position === index ? renderCore(key) : original;
      });
    });
    if (!changed) throw new Error('Cannot find legal core heading: ' + kind + ' ' + heading);
  }
  const artwork = /<li><strong>Preferences and artwork:<\/strong>[\s\S]*?<\/li>/;
  if (kind === 'privacy') result = result.replace(artwork, '<li><strong>Preferences and artwork:</strong>' + renderCore('privacyArtworkBullet') + '</li>');
  return result;
}

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
  result = synchronizeCore(kind, result);
  const versionSource = fs.readFileSync(path.join(__dirname, '../src/lib/legalVersion.js'), 'utf8');
  const dateName = kind === 'terms' ? 'TERMS_EFFECTIVE_DATE' : 'PRIVACY_EFFECTIVE_DATE';
  const effective = versionSource.match(new RegExp(dateName + " = '([^']+)'"))?.[1];
  const revision = versionSource.match(/LEGAL_VERSION = '([^']+)'/)?.[1];
  if (!effective || !revision) throw new Error('Missing legal date/revision');
  const date = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(effective));
  result = result.replace(/Effective date: [^<]+/, 'Effective date: ' + date);
  result = result.replace(/<meta name="movo-legal-revision"[^>]*>/g, '');
  result = result.replace('</head>', '<meta name="movo-legal-revision" content="' + revision + '"></head>');
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
module.exports = { renderCore, synchronizeCore, CORE_BLOCKS, renderSupplement, buildStaticPolicy, synchronizePages };

