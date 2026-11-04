import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import BrandLogo from './BrandLogo';

global.IS_REACT_ACT_ENVIRONMENT = true;

test('shows the MOVO mark when there is no logo or it cannot be fetched, unless a fallback is given', () => {
  const el = document.createElement('div'); const root = createRoot(el);
  act(() => root.render(<BrandLogo src="" className="tile tile-logo" size={44} />));
  expect(el.querySelector('.brand-fallback.tile svg.movo-mark')).not.toBeNull();
  act(() => root.render(<BrandLogo src="https://example.test/logo.png" size={44} />));
  expect(el.querySelector('img')).not.toBeNull();
  act(() => el.querySelector('img').dispatchEvent(new Event('error')));
  expect(el.querySelector('img')).toBeNull();
  expect(el.querySelector('.brand-fallback svg.movo-mark')).not.toBeNull();
  act(() => root.render(<BrandLogo src="" fallback={<b>custom</b>} />));
  expect(el.textContent).toBe('custom');
  act(() => root.unmount());
});


test('tries curated favicon fallbacks in order before showing the fallback', () => {
  const el = document.createElement('div'); const root = createRoot(el);
  act(() => root.render(<BrandLogo src="https://www.google.com/s2/favicons?domain=example.com" fallbackSrcs={["https://example.com/favicon.ico"]} size={32} />));
  expect(el.querySelector('img').getAttribute('src')).toContain('google.com/s2/favicons');
  act(() => el.querySelector('img').dispatchEvent(new Event('error')));
  expect(el.querySelector('img').getAttribute('src')).toBe('https://example.com/favicon.ico');
  act(() => el.querySelector('img').dispatchEvent(new Event('error')));
  expect(el.querySelector('.brand-fallback')).not.toBeNull();
  act(() => root.unmount());
});
