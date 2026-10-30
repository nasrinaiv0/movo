/*
 * Picks the best logo a website declares for itself in its HTML <head>, for scripts/fetch-brand-logos.js.
 * Order: apple-touch-icon (square, ≥180px app tile) → largest PNG/SVG icon → any icon → /favicon.ico.
 * Pure string work so it can be unit-tested without network access.
 */
const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return m ? (m[2] ?? m[3] ?? m[4] ?? '').trim() : '';
};
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&#x2F;/gi, '/').replace(/&#47;/g, '/');

export function iconCandidates(html, pageUrl) {
  const head = String(html || '').slice(0, 400000);
  const out = [];
  (head.match(/<link\b[^>]*>/gi) || []).forEach(tag => {
    const rel = attr(tag, 'rel').toLowerCase().split(/\s+/);
    const href = decode(attr(tag, 'href'));
    if (!href || href.startsWith('data:')) return;
    const apple = rel.includes('apple-touch-icon') || rel.includes('apple-touch-icon-precomposed');
    if (!apple && !rel.includes('icon')) return;
    let url;
    try { url = new URL(href, pageUrl); } catch { return; }
    if (url.protocol !== 'https:') return;
    const sizes = attr(tag, 'sizes').toLowerCase();
    const size = sizes === 'any' ? 512 : Math.max(0, ...sizes.split(/\s+/).map(s => parseInt(s, 10) || 0));
    const type = attr(tag, 'type').toLowerCase();
    const svg = type.includes('svg') || /\.svg(\?|$)/i.test(url.pathname);
    const score = (apple ? 4000 : 0) + (svg ? 2000 : 0) + Math.min(size || (apple ? 180 : 32), 1024);
    out.push({ url: url.href, apple, svg, size, score });
  });
  try { out.push({ url: new URL('/favicon.ico', pageUrl).href, apple: false, svg: false, size: 32, score: 1 }); } catch { /* invalid page URL */ }
  const seen = new Set();
  return out.sort((a, b) => b.score - a.score).filter(c => (seen.has(c.url) ? false : seen.add(c.url)));
}

/** Allowed image types and the file extension each is saved with. */
export const IMAGE_TYPES = { 'image/png': 'png', 'image/svg+xml': 'svg', 'image/x-icon': 'ico', 'image/vnd.microsoft.icon': 'ico', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
