import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { originalArtwork, originalOnlyAssets } from './assetRights';
import BrandLogo from '../components/BrandLogo';
import { SubIcon } from '../screens/Subscriptions';
import { institutionLogoCandidates, cardNetworkLogoUrl } from './institutions';
import { merchantLogoUrl } from './merchantFavicons';
import { getInstitutionFaviconUrl } from './institutionFavicons';
import FeatureTour, { tourImage } from '../components/FeatureTour';

global.IS_REACT_ACT_ENVIRONMENT = true;
const saved = process.env.REACT_APP_ASSET_POLICY;
afterEach(() => { if (saved === undefined) delete process.env.REACT_APP_ASSET_POLICY; else process.env.REACT_APP_ASSET_POLICY = saved; jest.restoreAllMocks(); });

test('the actual iOS runtime enforces original assets independently of build flags', () => {
  delete process.env.REACT_APP_ASSET_POLICY;
  jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
  jest.spyOn(Capacitor, 'getPlatform').mockReturnValue('ios');
  expect(originalOnlyAssets()).toBe(true);
  expect(institutionLogoCandidates('BPI')).toEqual([]);
  expect(getInstitutionFaviconUrl('BPI')).toBeNull();
  expect(merchantLogoUrl('Starbucks')).toBeNull();
  expect(cardNetworkLogoUrl('Mastercard')).toBe('');
});

test('App Store UI cannot request foreign, bundled or inline subscription trademarks through fallbacks', () => {
  process.env.REACT_APP_ASSET_POLICY = 'original-only';
  const el = document.createElement('div'), root = createRoot(el);
  act(() => root.render(<><BrandLogo src="https://www.google.com/s2/favicons?domain=bpi.com.ph" fallbackSrcs={['https://bpi.com.ph/favicon.ico']} /><SubIcon sub={{ name: 'Netflix' }} /></>));
  expect(el.querySelectorAll('img')).toHaveLength(0);
  expect(el.querySelector('.brand-fallback svg.movo-mark')).not.toBeNull();
  expect(el.querySelector('.sub-icon').textContent).toBe('N');
  act(() => root.unmount());
});

test('original geometry is deterministic, does not include attacker markup, and guide images use no old media', () => {
  process.env.REACT_APP_ASSET_POLICY = 'original-only';
  const image = originalArtwork('saved-selection');
  expect(image).toBe(originalArtwork('saved-selection'));
  expect(image).not.toBe(originalArtwork('another-selection'));
  const svg = decodeURIComponent(originalArtwork('<script>foreign</script>').split(',')[1]);
  expect(svg).not.toContain('<script>');
  expect(svg).not.toContain('href=');
  expect(tourImage('wallet-cards', false)).toMatch(/^data:image\/svg/);
});

test('every existing wallpaper ID remains available with generated art and no unreviewed video', () => {
  process.env.REACT_APP_ASSET_POLICY = 'original-only';
  jest.isolateModules(() => {
    const { WALLPAPERS } = require('./wallpapers');
    const { WALLPAPER_THEMES } = require('./stickers');
    expect(WALLPAPER_THEMES.map(item => item.id)).toEqual(WALLPAPERS.map(([key]) => 'wp-' + key));
    expect(WALLPAPER_THEMES.every(item => item.src.startsWith('data:image/svg') && !item.video)).toBe(true);
    expect(WALLPAPER_THEMES.some(item => /witcher/i.test(item.name))).toBe(false);
  });
});

test('the original-only guide keeps navigation without offering unavailable audio or highlighting fictional UI', () => {
  process.env.REACT_APP_ASSET_POLICY = 'original-only';
  const play = jest.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());
  const el = document.createElement('div'), root = createRoot(el);
  act(() => root.render(<FeatureTour onDone={jest.fn()} />));
  expect(el.querySelector('.ft-sound')).toBeNull();
  expect(el.querySelector('.ft-sheet').className).toContain('is-whole');
  const next = [...el.querySelectorAll('.ft-actions button')].find(button => button.textContent === 'Next');
  act(() => next.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  expect(el.querySelector('h2').textContent).toBe('Your balance at a glance');
  expect(el.querySelector('.ft-sheet').className).toContain('is-whole');
  expect(el.querySelector('audio').getAttribute('src')).toBeNull();
  expect(play).not.toHaveBeenCalled();
  act(() => root.unmount());
});
