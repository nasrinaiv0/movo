import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import AriesExpressions from './AriesExpressions';
import { ARIES_STATES } from './AriesMascot';

global.IS_REACT_ACT_ENVIRONMENT = true;

test('exploring every expression updates only the preview and leaves thumbnails still', () => {
  const host = document.createElement('div'); const root = createRoot(host);
  const save = jest.spyOn(Storage.prototype, 'setItem');
  act(() => root.render(<AriesExpressions />));
  const options = [...host.querySelectorAll('.aries-expression-option')];
  expect(options).toHaveLength(14);
  for (const [index, item] of ARIES_STATES.entries()) {
    act(() => options[index].click());
    expect(host.querySelector('.aries-expression-preview .aries-mascot').getAttribute('data-state')).toBe(item.id);
    expect(host.querySelector('figcaption').textContent).toBe(item.label);
    expect(options.filter(button => button.getAttribute('aria-pressed') === 'true')).toEqual([options[index]]);
  }
  expect([...host.querySelectorAll('.aries-expression-grid .aries-mascot')].every(node => node.getAttribute('data-motion') === 'still')).toBe(true);
  expect(save).not.toHaveBeenCalled();
  act(() => host.querySelector('.aries-animation-toggle').click());
  expect(host.querySelector('.aries-animation-toggle').getAttribute('aria-pressed')).toBe('true');
  expect(host.querySelector('.aries-animation-toggle').textContent).toBe('Play animation');
  expect(host.querySelector('.aries-expression-preview .aries-mascot').getAttribute('data-motion')).toBe('still');
  act(() => root.unmount()); save.mockRestore();
});
