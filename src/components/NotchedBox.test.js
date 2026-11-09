import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import NotchedBox from './NotchedBox';

global.IS_REACT_ACT_ENVIRONMENT = true;

describe('NotchedBox', () => {
  let container; let root; let width; let height;
  const size = (el) => (el.classList.contains('pill') ? [120, 40] : el.tagName === 'SECTION' ? [354, 132] : [0, 0]);
  beforeEach(() => {
    width = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');
    height = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, get() { return size(this.firstElementChild?.classList.contains('pill') ? this.firstElementChild : this)[0]; } });
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get() { return size(this.firstElementChild?.classList.contains('pill') ? this.firstElementChild : this)[1]; } });
    container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount()); container.remove();
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', width);
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', height);
  });

  test('cuts the corner and publishes the width of the cut so the content can stop short of it', () => {
    act(() => root.render(<NotchedBox className="card" label="Total balance" corner={<button type="button" className="pill">November 2026</button>}><p>Total Balance</p></NotchedBox>));
    const wrap = container.querySelector('.notched-box');
    expect(wrap.classList.contains('is-cut')).toBe(true);
    // Pill width plus the 6px gap around it.
    expect(wrap.style.getPropertyValue('--notch-w')).toBe('126px');
    const box = wrap.querySelector('section');
    expect(box.getAttribute('aria-label')).toBe('Total balance');
    expect(box.textContent).toBe('Total Balance');
    expect(wrap.querySelector('.notch-slot .pill')).not.toBeNull();
  });

  test('an unmeasured box (no layout yet) is left uncut and sets no width', () => {
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, get() { return 0; } });
    act(() => root.render(<NotchedBox className="card" corner={<button type="button" className="pill">Nov 2026</button>}><p>Total Balance</p></NotchedBox>));
    const wrap = container.querySelector('.notched-box');
    expect(wrap.classList.contains('is-cut')).toBe(false);
    expect(wrap.style.getPropertyValue('--notch-w')).toBe('');
  });
});
