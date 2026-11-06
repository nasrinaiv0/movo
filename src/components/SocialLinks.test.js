import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import SocialLinks, { safeSocialLinks } from './SocialLinks';
import { TermsOfService, PrivacyPolicy } from '../screens/Legal';
import HelpCenter from '../screens/HelpCenter';

global.IS_REACT_ACT_ENVIRONMENT = true;
jest.mock('../lib/platform', () => ({ apiUrl: path => path }));

let initialFetch;
beforeEach(() => { initialFetch = global.fetch; });
afterEach(() => { global.fetch = initialFetch; jest.restoreAllMocks(); });

test('client rejects malicious or duplicate social URLs before they reach an anchor', () => {
  const links = safeSocialLinks([
    { id: 'instagram', url: 'javascript:alert(1)' },
    { id: 'facebook', url: 'https://facebook.com.malware.example/movo' },
    { id: 'tiktok', url: 'https://www.tiktok.com/@movo' },
    { id: 'tiktok', url: 'https://www.tiktok.com/@fake' },
    { id: 'twitter', url: 'https://x.com/movo' },
    { id: 'unknown', url: 'https://example.com/' },
  ]);
  expect(links.map(l => l.id)).toEqual(['tiktok', 'twitter']);
});

test('unconfigured social accounts render no footer, icons or fake profiles', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ links: [] }) });
  const target = document.createElement('div');
  const root = createRoot(target);
  await act(async () => { root.render(<SocialLinks />); });
  expect(target.querySelector('.movo-social-footer')).toBeNull();
  expect(global.fetch).toHaveBeenCalledWith('/api/social-links', expect.objectContaining({ signal: expect.any(Object) }));
  act(() => root.unmount());
});

test('the three help/policy pages show the same safe, accessible logo footer after their content', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true, json: async () => ({ links: [
      { id: 'instagram', url: 'https://www.instagram.com/movo' },
      { id: 'facebook', url: 'https://www.facebook.com/movo' },
      { id: 'twitter', url: 'https://x.com/movo' },
      { id: 'threads', url: 'https://threads.net/@movo' },
      { id: 'tiktok', url: 'https://www.tiktok.com/@movo' },
    ] }),
  });
  const controller = { go: jest.fn(), openLegal: jest.fn() };
  for (const Page of [TermsOfService, PrivacyPolicy, HelpCenter]) {
    const target = document.createElement('div');
    const root = createRoot(target);
    await act(async () => { root.render(<Page c={controller} />); });
    const body = target.querySelector('article.legal-page');
    expect(body).not.toBeNull();
    expect(body.lastElementChild.classList.contains('movo-social-footer')).toBe(true);
    const anchors = Array.from(body.querySelectorAll('.movo-social-link'));
    expect(anchors).toHaveLength(5);
    anchors.forEach(anchor => {
      expect(anchor.querySelector('svg')).not.toBeNull();
      expect(anchor.getAttribute('href')).toMatch(/^https:\/\//);
      expect(anchor.getAttribute('target')).toBe('_blank');
      expect(anchor.getAttribute('rel')).toContain('noopener');
      expect(anchor.getAttribute('aria-label')).toBeTruthy();
    });
    act(() => root.unmount());
  }
});


test('unavailable browser fetch is ignored without breaking the policy screen', async () => {
  delete global.fetch;
  const target = document.createElement('div');
  const root = createRoot(target);
  await act(async () => { root.render(<SocialLinks />); });
  expect(target.querySelector('.movo-social-footer')).toBeNull();
  act(() => root.unmount());
});
