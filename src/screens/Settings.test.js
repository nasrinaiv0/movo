import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Settings from './Settings';

global.IS_REACT_ACT_ENVIRONMENT = true;

function makeContext(cloudMode = false) {
  return {
    prefs: {
      theme: 'system', accent: 'blue', customColor: '#2f6bff', glass: true, clarity: 55,
      compact: false, categoryColors: true, notifications: true, push: true, email: true,
      inapp: true, biometrics: true, localStorage: false, autocat: true, cloudSync: true,
      catTransactions: true, catAccount: true, catAi: true, catPromo: false, catReports: true,
    },
    setPref: jest.fn(),
    go: jest.fn(),
    query: '',
    setQuery: jest.fn(),
    cloudMode,
    openLegal: jest.fn(),
    setSheet: jest.fn(),
  };
}

function findCloudSyncRow(container) {
  return Array.from(container.querySelectorAll('.menu-row'))
    .find(row => row.querySelector('strong')?.textContent === 'Cloud Sync');
}

describe('Cloud Sync setting semantics', () => {
  let container;
  let root;
  let context;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    container.remove();
    root = null;
  });

  test('local-only mode exposes a working sign-in action instead of a fake switch', () => {
    context = makeContext(false);
    root = createRoot(container);
    act(() => root.render(<Settings c={context} />));

    const row = findCloudSyncRow(container);
    expect(row).toBeTruthy();
    expect(row.tagName).toBe('BUTTON');
    expect(row.textContent).toContain('Sign in to enable secure cloud sync.');
    expect(row.textContent).toContain('Sign in required');
    expect(row.querySelector('[role="switch"]')).toBeNull();

    act(() => row.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(context.go).toHaveBeenCalledWith('Sign in');
    expect(context.setPref).not.toHaveBeenCalledWith('cloudSync', expect.anything());
  });

  test('signed-in cloud mode reports active sync without rendering a misleading switch', () => {
    context = makeContext(true);
    root = createRoot(container);
    act(() => root.render(<Settings c={context} />));

    const row = findCloudSyncRow(container);
    expect(row).toBeTruthy();
    expect(row.tagName).toBe('DIV');
    expect(row.textContent).toContain('Cloud sync is active for your signed-in account.');
    expect(row.querySelector('[role="switch"]')).toBeNull();
    expect(row.getAttribute('aria-disabled')).toBeNull();
    expect(context.go).not.toHaveBeenCalled();
    expect(context.setPref).not.toHaveBeenCalledWith('cloudSync', expect.anything());
  });
});
