import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import AriesMascot from './AriesMascot';
import { ARIES_POSES, ariesSvg, ariesDocument } from '../lib/ariesArt';

global.IS_REACT_ACT_ENVIRONMENT = true;

test('every pose is complete, self-contained vector art with no outside images or scripts', () => {
  for (const pose of ARIES_POSES) {
    const svg = ariesSvg(pose, 'x');
    expect(svg).toContain('url(#xh)'); // horns
    expect(svg).toContain('url(#xs)'); // scarf
    expect(svg).not.toMatch(/<image|href=|<script|on[a-z]+=|NaN|undefined/);
  }
  // Poses differ where they should: closed eyes when happy, a calendar for bills, a receipt for the scan.
  expect(ariesSvg('happy')).not.toContain('rx="5.3"');
  expect(ariesSvg('alert')).toContain('rx="8"');
  expect(ariesSvg('scan')).not.toBe(ariesSvg('home'));
  expect(ariesSvg('unknown')).toBe(ariesSvg('home'));
  expect(ariesDocument('home', 120)).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 200 200" width="120"/);
});

test('renders decorative by default, named when given a label, with ids unique on the page', () => {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(<><AriesMascot pose="hello" size={80} /><AriesMascot pose="happy" label="Aries, the MOVO mascot, waving hello" /></>));
  const [plain, named] = host.querySelectorAll('svg');
  expect(plain.getAttribute('aria-hidden')).toBe('true');
  expect(plain.getAttribute('width')).toBe('80');
  expect(plain.getAttribute('class')).toBe('aries-mascot pose-hello');
  expect(named.getAttribute('role')).toBe('img');
  expect(named.getAttribute('aria-label')).toBe('Aries, the MOVO mascot, waving hello');
  const ids = [...host.querySelectorAll('[id]')].map(el => el.id);
  expect(new Set(ids).size).toBe(ids.length);
  act(() => root.unmount()); host.remove();
});
