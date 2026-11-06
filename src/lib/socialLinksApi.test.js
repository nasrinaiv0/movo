const handler = require('../../api/social-links');
const KEYS = ['MOVO_SOCIAL_INSTAGRAM_URL', 'MOVO_SOCIAL_FACEBOOK_URL', 'MOVO_SOCIAL_TWITTER_URL', 'MOVO_SOCIAL_X_URL', 'MOVO_SOCIAL_THREADS_URL', 'MOVO_SOCIAL_TIKTOK_URL'];
const previous = Object.fromEntries(KEYS.map(key => [key, process.env[key]]));
function response() { return { headers: {}, statusCode: 200, status(s) { this.statusCode = s; return this; }, setHeader(k,v) { this.headers[k] = v; }, end(s) { this.body = s; } }; }
afterEach(() => { for (const key of KEYS) { if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key]; } });
beforeEach(() => { for (const key of KEYS) delete process.env[key]; });

test('unconfigured accounts return no links and no fabricated profiles', () => {
  const res = response();
  handler({ method: 'GET' }, res);
  expect(res.statusCode).toBe(200);
  expect(JSON.parse(res.body)).toEqual({ links: [] });
  expect(res.headers['Cache-Control']).toContain('s-maxage=300');
});

test('validates all five Vercel environment URLs and preserves branded profile destinations', () => {
  process.env.MOVO_SOCIAL_INSTAGRAM_URL = 'https://www.instagram.com/movo.official/';
  process.env.MOVO_SOCIAL_FACEBOOK_URL = 'https://facebook.com/movo.app';
  process.env.MOVO_SOCIAL_TWITTER_URL = 'https://x.com/MOVO_app';
  process.env.MOVO_SOCIAL_THREADS_URL = 'https://www.threads.net/@movo.official';
  process.env.MOVO_SOCIAL_TIKTOK_URL = 'https://www.tiktok.com/@movo';
  const res = response();
  handler({ method: 'GET' }, res);
  const body = JSON.parse(res.body);
  expect(body.links).toHaveLength(5);
  expect(body.links.map(link => link.id)).toEqual(['instagram', 'facebook', 'twitter', 'threads', 'tiktok']);
  expect(body.links[4].url).toBe('https://www.tiktok.com/@movo');
});

test('rejects unsafe schemes, credentials, lookalikes, ports and generic homepages', () => {
  const safe = handler.safeProfileUrl;
  const hosts = ['instagram.com', 'www.instagram.com'];
  ['http://instagram.com/movo', 'javascript:alert(1)', 'https://instagram.com.evil.org/movo',
   'https://user:pass@instagram.com/movo', 'https://instagram.com:444/movo', 'https://instagram.com/',
   'https://evil.org/movo', ''].forEach(value => expect(safe(value, hosts)).toBeNull());
});

test('invalid environment URLs are omitted while valid links remain and X alias works', () => {
  process.env.MOVO_SOCIAL_INSTAGRAM_URL = 'javascript:alert(1)';
  process.env.MOVO_SOCIAL_X_URL = 'https://twitter.com/Movo';
  process.env.MOVO_SOCIAL_TIKTOK_URL = 'https://tiktok.com.evil.org/@fake';
  const res = response();
  handler({ method: 'GET' }, res);
  expect(JSON.parse(res.body).links).toEqual([{ id: 'twitter', url: 'https://twitter.com/Movo' }]);
});

test('non-GET methods cannot read or change social configuration', () => {
  const res = response();
  handler({ method: 'POST' }, res);
  expect(res.statusCode).toBe(405);
  expect(JSON.parse(res.body).error).toBe('method_not_allowed');
  expect(res.headers.Allow).toBe('GET');
});
