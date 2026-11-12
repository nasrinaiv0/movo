import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import CloudPlanNotice from './CloudPlanNotice';

global.IS_REACT_ACT_ENVIRONMENT = true;
let host, root;
beforeEach(() => { host = document.createElement('div'); document.body.append(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); });

const button = (name) => [...document.querySelectorAll('button')].find(b => b.textContent === name);

test('Cloud Sync paused panel explains records are safe and offers plans', () => {
  const onPlans = jest.fn(); const onClose = jest.fn();
  act(() => root.render(<CloudPlanNotice onPlans={onPlans} onClose={onClose} />));
  expect(document.querySelector('.cpn-title').textContent).toBe('Cloud Sync is paused');
  expect(document.body.textContent).toContain('Nothing is deleted');
  expect(document.body.textContent).not.toMatch(/requires verified active access/);
  act(() => button('View plans').click());
  expect(onPlans).toHaveBeenCalledTimes(1);
  act(() => button('Not now').click());
  expect(onClose).toHaveBeenCalledTimes(1);
});
