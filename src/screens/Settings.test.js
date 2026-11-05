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
    session: cloudMode ? { user: { id: 'user-1' } } : null,
    setCloudSyncEnabled: jest.fn(),
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

  test('local-only mode exposes a switch that directs unsigned users to sign in', () => {
    context = makeContext(false);
    root = createRoot(container);
    act(() => root.render(<Settings c={context} />));

    const row = findCloudSyncRow(container);
    expect(row).toBeTruthy();
    expect(row.tagName).toBe('DIV');
    expect(row.textContent).toContain('Sign in to enable secure cloud sync.');
    const toggle = row.querySelector('[role="switch"]');
    expect(toggle).toBeTruthy();
    expect(toggle.getAttribute('aria-checked')).toBe('false');

    act(() => toggle.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(context.go).toHaveBeenCalledWith('Sign in');
    expect(context.setCloudSyncEnabled).not.toHaveBeenCalled();
  });

  test('signed-in cloud mode can pause sync without signing out', () => {
    context = makeContext(true);
    root = createRoot(container);
    act(() => root.render(<Settings c={context} />));

    const row = findCloudSyncRow(container);
    expect(row).toBeTruthy();
    expect(row.textContent).toContain('Cloud sync is active for your signed-in account.');
    const toggle = row.querySelector('[role="switch"]');
    expect(toggle).toBeTruthy();
    expect(toggle.getAttribute('aria-checked')).toBe('true');

    act(() => toggle.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(context.setCloudSyncEnabled).toHaveBeenCalledWith(false);
    expect(context.go).not.toHaveBeenCalled();
  });

  test('a signed-in user can resume paused cloud sync', () => {
    context = makeContext(false);
    context.session = { user: { id: 'user-1' } };
    context.prefs.cloudSyncEnabled = false;
    root = createRoot(container);
    act(() => root.render(<Settings c={context} />));

    const row = findCloudSyncRow(container);
    expect(row.textContent).toContain('Cloud sync is paused on this device.');
    const toggle = row.querySelector('[role="switch"]');
    expect(toggle).toBeTruthy();
    expect(toggle.getAttribute('aria-checked')).toBe('false');

    act(() => toggle.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(context.setCloudSyncEnabled).toHaveBeenCalledWith(true);
  });
});
