import React, { useEffect, useState } from 'react';
import { apiUrl } from '../lib/platform';
import { t as tr } from '../lib/i18n';

const NETWORKS = {
  instagram: { label: 'Instagram', hosts: ['instagram.com', 'www.instagram.com'] },
  facebook: { label: 'Facebook', hosts: ['facebook.com', 'www.facebook.com', 'm.facebook.com', 'fb.com'] },
  twitter: { label: 'X / Twitter', hosts: ['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com'] },
  threads: { label: 'Threads', hosts: ['threads.net', 'www.threads.net', 'threads.com', 'www.threads.com'] },
  tiktok: { label: 'TikTok', hosts: ['tiktok.com', 'www.tiktok.com', 'm.tiktok.com'] },
};

function SocialLogo({ id }) {
  const common = { viewBox: '0 0 24 24', width: 22, height: 22, fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
  if (id === 'instagram') return <svg {...common}><rect x="3" y="3" width="18" height="18" rx="5.2" /><circle cx="12" cy="12" r="4.1" /><circle cx="17.4" cy="6.7" r="1" fill="currentColor" stroke="none" /></svg>;
  if (id === 'facebook') return <svg {...common} fill="currentColor" stroke="none"><path d="M14.6 21v-7.8H17l.45-3.4h-2.85V7.65c0-.98.28-1.65 1.7-1.65h1.3V2.92a18.3 18.3 0 0 0-2.36-.14c-2.73 0-4.37 1.67-4.37 4.7v2.32H8.5v3.4h2.37V21h3.73Z" /></svg>;
  if (id === 'twitter') return <svg {...common} strokeWidth={2.1}><path d="M4 3.5 20 20.5M20 3.5 4 20.5" /><path d="M5 3.5h4.1l9.9 17H15Z" fill="currentColor" stroke="none" /></svg>;
  if (id === 'threads') return <svg {...common} strokeWidth={1.9}><path d="M18.5 8.7C17.8 5.4 15.4 3.6 12 3.6c-4.6 0-7.3 3.8-7.3 8.6 0 5.1 2.7 8.2 7.2 8.2 4.2 0 7.3-2.9 7.3-6.4 0-3-2.9-4.7-6.7-4.7-3.5 0-5.2 1.6-5.2 3.7 0 2.1 1.6 3.5 3.6 3.5 3.5 0 5.5-2.5 5.5-5.9 0-3.5-2-5.7-5-5.7-2.5 0-4 1.4-4.2 3.2" /></svg>;
  if (id === 'tiktok') return <svg {...common} fill="currentColor" stroke="none"><path d="M15.3 2.5h3c.25 2.6 1.68 4.06 4.2 4.35v3.2c-2.3.02-4.5-.88-6.1-2.4v7.22c0 4.05-2.75 6.6-6.5 6.6A6.25 6.25 0 0 1 3.5 15.3c0-3.85 3.15-6.46 7.23-6.1v3.36c-2.27-.3-3.78.94-3.78 2.7a2.85 2.85 0 0 0 2.9 2.8c1.91 0 2.96-1.24 2.96-3.4V2.5h2.49Z" /></svg>;
  return null;
}

/* Defense in depth: only render explicit HTTPS profile destinations returned
   by MOVO's server, never a javascript: or lookalike-domain URL. */
export function safeSocialLinks(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value.filter(entry => {
    if (!entry || !Object.prototype.hasOwnProperty.call(NETWORKS, entry.id) || typeof entry.url !== 'string') return false;
    try {
      const target = new URL(entry.url);
      if (target.protocol !== 'https:' || target.username || target.password || target.port) return false;
      if (!NETWORKS[entry.id].hosts.includes(target.hostname.toLowerCase()) || seen.has(entry.id)) return false;
      seen.add(entry.id);
      return true;
    } catch { return false; }
  }).map(({ id, url }) => ({ id, url, label: NETWORKS[id].label }));
}

export default function SocialLinks() {
  const [links, setLinks] = useState([]);
  useEffect(() => {
    if (typeof fetch !== 'function') return undefined;
    const controller = new AbortController();
    Promise.resolve().then(() => fetch(apiUrl('/api/social-links'), { signal: controller.signal }))
      .then(r => r && r.ok ? r.json() : { links: [] })
      .then(body => { if (!controller.signal.aborted) setLinks(safeSocialLinks(body.links)); })
      .catch(() => { if (!controller.signal.aborted) setLinks([]); });
    return () => controller.abort();
  }, []);

  if (!links.length) return null;
  return <footer className="movo-social-footer" aria-label={tr('Follow MOVO')}>
    <span className="movo-social-caption">{tr('Follow MOVO')}</span>
    <nav className="movo-social-icons" aria-label={tr('Follow MOVO')}>
      {links.map(link => <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer"
        aria-label={link.label} title={link.label} className="movo-social-link">
        <SocialLogo id={link.id} />
      </a>)}
    </nav>
  </footer>;
}
