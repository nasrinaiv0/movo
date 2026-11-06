import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import Icon from './Icon';

global.IS_REACT_ACT_ENVIRONMENT = true;

test('Limits icon matches the supplied gauge silhouette and inherits theme color', () => {
  const target = document.createElement('div');
  document.body.appendChild(target);
  const root = createRoot(target);
  try {
    act(() => root.render(<Icon name="limits" size={18} className="qa-limits" />));
    const svg = target.querySelector('svg.qa-limits');
    const path = svg?.querySelector('path');
    expect(svg).not.toBeNull();
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(svg.getAttribute('width')).toBe('18');
    expect(svg.getAttribute('height')).toBe('18');
    expect(path).not.toBeNull();
    expect(path.getAttribute('fill')).toBe('currentColor');
    expect(path.getAttribute('fill-rule')).toBe('evenodd');
    expect(path.getAttribute('stroke')).toBe('none');
    // The gauge has an open arch, a separate lower-right segment,
    // a needle and a transparent pivot; the path carries four contours.
    expect((path.getAttribute('d').match(/\bM\d/g) || []).length).toBe(4);
    expect(path.getAttribute('d')).toContain('21.95 13.65');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
  } finally {
    act(() => root.unmount());
    target.remove();
  }
});

test('Limits and filter icons remain distinct', () => {
  const target = document.createElement('div');
  document.body.appendChild(target);
  const root = createRoot(target);
  try {
    act(() => root.render(<><Icon name="limits"/><Icon name="sliders"/></>));
    const [limits, filters] = [...target.querySelectorAll('svg')];
    expect(limits.querySelector('path[fill="currentColor"][fill-rule="evenodd"]')).not.toBeNull();
    expect(filters.querySelectorAll('circle')).toHaveLength(3);
    expect(filters.querySelector('path[fill-rule="evenodd"]')).toBeNull();
  } finally {
    act(() => root.unmount());
    target.remove();
  }
});
