import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { useLayout } from './layout';

global.IS_REACT_ACT_ENVIRONMENT = true;

function probe(queries) {
  window.matchMedia = (q) => ({ matches: queries.some(x => q.includes(x)), addEventListener() {}, removeEventListener() {} });
  let seen; const Probe = () => { seen = useLayout(); return null; };
  const el = document.createElement('div'); const root = createRoot(el);
  act(() => root.render(<Probe />)); act(() => root.unmount());
  return seen;
}

afterEach(() => { delete window.matchMedia; });

test('phone by default, tablet and desktop by width, dual on two-segment screens', () => {
  expect(probe([])).toEqual({ mode: 'phone', dual: false });
  expect(probe(['min-width: 768px'])).toEqual({ mode: 'tablet', dual: false });
  expect(probe(['min-width: 768px', 'min-width: 1100px'])).toEqual({ mode: 'desktop', dual: false });
  expect(probe(['horizontal-viewport-segments: 2'])).toEqual({ mode: 'tablet', dual: true });
  expect(probe(['vertical-viewport-segments: 2'])).toEqual({ mode: 'phone', dual: true });
});
