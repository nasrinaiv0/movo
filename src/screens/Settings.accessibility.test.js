import React, { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemePicker, ThemeSheet } from './Settings';

global.IS_REACT_ACT_ENVIRONMENT = true;

function ThemeHarness({ view = 'picker', initialTheme = 'light', initialAccent = 'blue' }) {
  const [prefs, setPrefs] = useState({
    theme: initialTheme,
    accent: initialAccent,
    customColor: '#2f6bff',
  });
  const setPref = (key, value) => setPrefs((current) => ({ ...current, [key]: value }));
  const c = { prefs, setPref, setSheet: jest.fn() };
  return view === 'sheet' ? <ThemeSheet c={c} /> : <ThemePicker c={c} />;
}

describe('theme control accessibility', () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  test('appearance and accent choices use native pressed-state button semantics', () => {
    act(() => root.render(<ThemeHarness />));

    const appearance = container.querySelector('[aria-label="App appearance"]');
    expect(appearance.getAttribute('role')).toBe('group');
    expect(appearance.querySelector('[role="radio"]')).toBeNull();

    const light = Array.from(appearance.querySelectorAll('button')).find((button) => button.textContent.includes('Light'));
    const custom = Array.from(appearance.querySelectorAll('button')).find((button) => button.textContent.includes('Custom'));
    expect(light.getAttribute('aria-pressed')).toBe('true');
    expect(custom.getAttribute('aria-haspopup')).toBe('dialog');
    expect(custom.getAttribute('aria-pressed')).toBe('false');

    const accents = container.querySelector('[aria-label="Accent color"]');
    expect(accents.getAttribute('role')).toBe('group');
    expect(accents.querySelector('[role="radio"]')).toBeNull();
    expect(container.querySelector('[aria-label="blue accent"]').getAttribute('aria-pressed')).toBe('true');
  });

  test('choosing an accent updates the selected pressed state', () => {
    act(() => root.render(<ThemeHarness />));
    const purple = container.querySelector('[aria-label="purple accent"]');

    act(() => purple.dispatchEvent(new MouseEvent('click', { bubbles: true })));

    expect(purple.getAttribute('aria-pressed')).toBe('true');
    expect(container.querySelector('[aria-label="blue accent"]').getAttribute('aria-pressed')).toBe('false');
  });

  test('theme-sheet choices expose the selected state without an incomplete radio pattern', () => {
    act(() => root.render(<ThemeHarness view="sheet" initialTheme="dark" />));

    const choices = container.querySelector('[aria-label="Choose a theme"]');
    expect(choices.getAttribute('role')).toBe('group');
    expect(choices.querySelector('[role="radio"]')).toBeNull();
    expect(Array.from(choices.querySelectorAll('button')).find((button) => button.textContent.includes('Dark')).getAttribute('aria-pressed')).toBe('true');
    expect(Array.from(choices.querySelectorAll('button')).find((button) => button.textContent.includes('Light')).getAttribute('aria-pressed')).toBe('false');
  });
});
