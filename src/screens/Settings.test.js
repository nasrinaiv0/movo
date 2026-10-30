import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Settings, { ThemePicker, ThemeSheet } from './Settings';

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


describe('Keyboard-accessible appearance controls', () => {
  let container;
  let root;
  let context;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    context = makeContext(false);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    container.remove();
    root = null;
  });

  test('accent color radio group uses roving focus and arrow-key selection', () => {
    act(() => root.render(<ThemePicker c={context} />));
    const blue = container.querySelector('[data-radio-key="blue"]');
    const purple = container.querySelector('[data-radio-key="purple"]');
    expect(blue.tabIndex).toBe(0);
    expect(purple.tabIndex).toBe(-1);

    act(() => blue.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })));

    expect(context.setPref).toHaveBeenCalledWith('accent', 'purple');
    expect(document.activeElement).toBe(purple);
  });

  test('theme sheet radio group supports arrow navigation and Home/End', () => {
    context.prefs.theme = 'system';
    act(() => root.render(<ThemeSheet c={context} />));
    const system = container.querySelector('[data-radio-key="system"]');
    const light = container.querySelector('[data-radio-key="light"]');
    const orange = container.querySelector('[data-radio-key="orange"]');
    expect(system.tabIndex).toBe(0);
    expect(light.tabIndex).toBe(-1);

    act(() => system.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })));
    expect(context.setPref).toHaveBeenCalledWith('theme', 'light');
    expect(document.activeElement).toBe(light);

    act(() => light.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true })));
    expect(context.setPref).toHaveBeenCalledWith('theme', 'orange');
    expect(document.activeElement).toBe(orange);
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


describe('Currency settings copy', () => {
  let container;
  let root;
  const context = makeContext(false);

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(<Settings c={context} />));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  test('does not claim PHP is the only available currency', () => {
    expect(container.textContent).not.toContain('Philippine peso is the only available currency.');
  });
});


describe('Legal navigation from Settings', () => {
  let container;
  let root;
  let context;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    context = makeContext(false);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    container.remove();
    root = null;
  });

  test('Terms of Service and Privacy Policy rows open their respective pages', () => {
    act(() => root.render(<Settings c={context} />));
    const terms = Array.from(container.querySelectorAll('button')).find(button => button.textContent.includes('Terms of Service'));
    const privacy = Array.from(container.querySelectorAll('button')).find(button => button.textContent.includes('Privacy Policy'));
    expect(terms).toBeTruthy();
    expect(privacy).toBeTruthy();

    act(() => { terms.click(); privacy.click(); });

    expect(context.openLegal).toHaveBeenNthCalledWith(1, 'TermsOfService');
    expect(context.openLegal).toHaveBeenNthCalledWith(2, 'PrivacyPolicy');
  });
});
