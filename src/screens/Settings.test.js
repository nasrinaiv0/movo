jest.mock('@capacitor/browser', () => ({ Browser: { open: jest.fn().mockResolvedValue(undefined) } }));
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Settings, { Appearance } from './Settings';
import { setAIConsent, readAIConsent } from '../lib/aiConsent';

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

test('signed-in users can delete the account with Cloud Sync off; guests cannot', () => {
  const container = document.createElement('div'); document.body.appendChild(container);
  const root = createRoot(container);
  const context = { ...makeContext(false), session: { user: { id: 'sync-off-owner' } } };
  act(() => root.render(<Settings c={context} />));
  const deletion = Array.from(container.querySelectorAll('button')).find(x => x.textContent.includes('Delete Account'));
  expect(deletion).toBeTruthy();
  act(() => deletion.click());
  expect(context.setSheet).toHaveBeenCalledWith({ name: 'deleteAccount', ownerId: 'sync-off-owner' });
  act(() => root.render(<Settings c={makeContext(false)} />));
  expect(container.textContent).not.toContain('Delete Account');
  act(() => root.unmount()); container.remove();
});

test('AI sharing can be withdrawn in Settings; enabling it opens chat consent without granting it', () => {
  const container = document.createElement('div'); document.body.appendChild(container);
  const root = createRoot(container); const context = makeContext(true);
  setAIConsent('user-1', true);
  act(() => root.render(<Settings c={context} />));
  const row = Array.from(container.querySelectorAll('.menu-row')).find(x => x.textContent.includes('AI data sharing'));
  const toggle = row.querySelector('[role="switch"]');
  expect(toggle.getAttribute('aria-checked')).toBe('true');
  act(() => toggle.click());
  expect(readAIConsent('user-1')).toBe(false);
  expect(toggle.getAttribute('aria-checked')).toBe('false');
  act(() => toggle.click());
  expect(context.go).toHaveBeenCalledWith('NasrinAI');
  expect(readAIConsent('user-1')).toBe(false);
  act(() => root.unmount()); container.remove();
});


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

test('all main Settings rows show only feature names, including search results', () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const c = makeContext();
  try {
    act(() => root.render(<Settings c={c} />));
    const rows = Array.from(container.querySelectorAll('.menu-row'));
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      const title = row.querySelector('.menu-main > strong');
      const description = row.querySelector('.menu-main > small');
      expect(title.textContent).toBeTruthy();
      expect(description.classList.contains('sr-only')).toBe(true);
      const action = row.matches('button') ? row : row.querySelector('[role="switch"]');
      if (action) {
        expect(action.getAttribute('aria-label')).toBe(title.textContent);
        expect(action.getAttribute('aria-describedby')).toBe(description.id);
      }
    }

    act(() => root.render(<Settings c={{ ...c, query: 'financial backup' }} />));
    const results = container.querySelectorAll('.menu-row');
    expect(results).toHaveLength(1);
    expect(results[0].querySelector('strong').textContent).toBe('Import & Export');
    expect(results[0].querySelector('small.sr-only')).toBeTruthy();
  } finally {
    act(() => root.unmount());
    container.remove();
  }
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
    expect(row.textContent).toContain('Cloud Sync is on');
    expect(row.textContent).toContain('appearance remain available offline');
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
    context.deviceCopyAccess = true;
    root = createRoot(container);
    act(() => root.render(<Settings c={context} />));

    const row = findCloudSyncRow(container);
    expect(row.textContent).toContain('verified plan features are available offline');
    expect(row.textContent).toContain('Sync and purchases need a connection');
    const toggle = row.querySelector('[role="switch"]');
    expect(toggle).toBeTruthy();
    expect(toggle.getAttribute('aria-checked')).toBe('false');

    act(() => toggle.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(context.setCloudSyncEnabled).toHaveBeenCalledWith(true);
  });
});


test('account deletion is available to the signed-in owner with sync disabled, and hidden for guests', () => {
  const container = document.createElement('div'); document.body.appendChild(container);
  const root = createRoot(container);
  const c = makeContext(false);
  const findDeletion = () => container.querySelector('button[aria-label="Delete Account"]');
  try {
    act(() => root.render(<Settings c={c} />));
    expect(findDeletion()).toBe(null);

    act(() => root.render(<Settings c={{ ...c, session: { user: { id: 'user-1' } } }} />));
    expect(findDeletion()).toBeTruthy();
    act(() => findDeletion().click());
    expect(c.setSheet).toHaveBeenCalledWith({ name: 'deleteAccount', ownerId: 'user-1' });
  } finally {
    act(() => root.unmount());
    container.remove();
  }
});

test('Security & Privacy guide opens the public, transparent data-security explanation', async () => {
  const { Browser } = require('@capacitor/browser');
  // Jest resets mock implementations between tests; restore this resolved Promise for the click.
  Browser.open.mockReset();
  Browser.open.mockImplementation(() => Promise.resolve());
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

describe('Colour-coded icons switch', () => {
  test('is on by default and turning it off saves iconColors: false', () => {
    const container = document.createElement('div'); document.body.appendChild(container);
    const root = createRoot(container);
    const c = makeContext();
    act(() => root.render(<Appearance c={c} />));
    const toggle = container.querySelector('[role="switch"][aria-label="Colour-coded icons"]');
    expect(toggle).toBeTruthy();
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    act(() => toggle.click());
    expect(c.setPref).toHaveBeenCalledWith('iconColors', false);
    act(() => root.unmount()); container.remove();
  });
});
