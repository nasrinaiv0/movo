jest.mock('@capacitor/browser', () => ({ Browser: { open: jest.fn().mockResolvedValue(undefined) } }));
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


describe('Settings header icon treatment', () => {
  test('renders the back control as a circular header action using the accent theme', () => {
    const container = document.createElement('div'); document.body.appendChild(container);
    const root = createRoot(container);
    act(() => root.render(<Settings c={makeContext()} />));
    const back = container.querySelector('.screen-header.sub .back-button');
    expect(back).toBeTruthy();
    expect(back.classList.contains('back-button')).toBe(true);
    expect(back.querySelector('.movo-icon')).toBeTruthy();
    expect(back.getAttribute('aria-label')).toBeTruthy();
    act(() => root.unmount()); container.remove();
  });
});

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
    expect(row.textContent).toContain('Turning it off pauses paid features');
    expect(row.textContent).toContain('cloud-only records are not copied automatically');
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
    expect(row.textContent).toContain('paid features paused');
    expect(row.textContent).toContain('cloud records remain stored in your account');
    const toggle = row.querySelector('[role="switch"]');
    expect(toggle).toBeTruthy();
    expect(toggle.getAttribute('aria-checked')).toBe('false');

    act(() => toggle.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(context.setCloudSyncEnabled).toHaveBeenCalledWith(true);
  });
});


test('Security & Privacy guide opens the public, transparent data-security explanation', async () => {
  const { Browser } = require('@capacitor/browser');
  Browser.open.mockClear();
  const container = document.createElement('div'); document.body.appendChild(container);
  const root = createRoot(container);
  try {
    act(() => root.render(<Settings c={makeContext()} />));
    const row = Array.from(container.querySelectorAll('.menu-row'))
      .find(node => node.querySelector('strong')?.textContent === 'Security & Privacy');
    expect(row).toBeTruthy();
    await act(async () => row.click());
    expect(Browser.open).toHaveBeenCalledWith({ url: 'https://movo.nasrinai.com/security' });
  } finally {
    act(() => root.unmount());
    container.remove();
  }
});
