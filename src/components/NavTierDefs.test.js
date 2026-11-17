import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import NavTierDefs, { NAV_TIER_PAINTS } from './NavTierDefs';

global.IS_REACT_ACT_ENVIRONMENT = true;

test('each plan paint is a blended pattern of colour clouds, not a striped multi-stop gradient', async () => {
  const el = document.createElement('div'); document.body.appendChild(el);
  const root = createRoot(el);
  await act(async () => root.render(<NavTierDefs />));
  for (const id of Object.keys(NAV_TIER_PAINTS)) {
    const paint = el.querySelector(`#movo-nav-${id}`);
    expect(paint.tagName.toLowerCase()).toBe('pattern'); // the id the nav CSS fills with
    expect(paint.querySelectorAll('circle')).toHaveLength(4);
    for (let i = 0; i < 4; i++) {
      const stops = [...el.querySelectorAll(`#movo-nav-${id}-c${i} stop`)].map(s => s.getAttribute('stop-opacity'));
      expect(stops.at(-1)).toBe('0'); // every cloud fades out, so the colours blend instead of meeting in bands
    }
  }
  // Tests run with motion off (canAnimate), as with Reduce Motion: the paint is still, nothing loops.
  expect(el.querySelector('animateTransform, animate')).toBeNull();
  act(() => root.unmount()); el.remove();
});
