import { startEdgeSwipeBack, EDGE_PX, FINISH_MS } from './edgeSwipeBack';

const W = 400;
let stop, surface, onBack, canGoBack;
const touch = (type, x, y = 300, target = document.body) => {
  const e = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(e, 'touches', { value: type === 'touchend' || type === 'touchcancel' ? [] : [{ clientX: x, clientY: y }] });
  target.dispatchEvent(e);
  return e;
};
const swipe = (points, target) => { touch('touchstart', points[0][0], points[0][1], target); const moves = points.slice(1).map(([x, y]) => touch('touchmove', x, y, target)); touch('touchend', 0, 0, target); return moves; };

beforeEach(() => {
  jest.useFakeTimers();
  Object.defineProperty(window, 'innerWidth', { value: W, configurable: true });
  surface = document.createElement('main'); document.body.append(surface);
  onBack = jest.fn(() => true); canGoBack = jest.fn(() => true);
  stop = startEdgeSwipeBack({ onBack, canGoBack, surface: () => surface, animate: true });
});
afterEach(() => { stop(); surface.remove(); jest.useRealTimers(); });

test('a swipe in from the left edge past a third of the width goes back; the screen followed the finger', () => {
  touch('touchstart', 6);
  const move = touch('touchmove', 60);
  expect(move.defaultPrevented).toBe(true);
  expect(surface.style.transform).toMatch(/translate3d\(5\d\.\d+px/);
  expect(document.documentElement.classList.contains('movo-edge-swiping')).toBe(true);
  touch('touchmove', 200);
  touch('touchend', 0);
  // The screen finishes sliding out first, then Back runs and everything is reset.
  expect(onBack).not.toHaveBeenCalled();
  expect(surface.style.transform).toBe(`translate3d(${W}px,0,0)`);
  expect(document.documentElement.classList.contains('movo-edge-swiping')).toBe(true);
  touch('touchstart', 6); touch('touchmove', 200); // no second swipe while finishing
  jest.advanceTimersByTime(FINISH_MS + 50);
  expect(onBack).toHaveBeenCalledTimes(1);
  expect(onBack).toHaveBeenCalledWith({ swiped: true });
  expect(surface.style.transform).toBe('');
  expect(document.documentElement.classList.contains('movo-edge-swiping')).toBe(false);
});

test('a swipe in from the right edge (moving left) also goes back, sliding the screen left', () => {
  touch('touchstart', W - 4);
  touch('touchmove', W - 60);
  expect(surface.style.transform).toMatch(/translate3d\(-/);
  touch('touchmove', W - 220);
  touch('touchend', 0);
  jest.advanceTimersByTime(FINISH_MS + 50);
  expect(onBack).toHaveBeenCalledTimes(1);
});

test('a short, slow swipe eases the screen back and does not go back', () => {
  const now = jest.spyOn(Date, 'now');
  now.mockReturnValue(1000); touch('touchstart', 5);
  now.mockReturnValue(1400); touch('touchmove', 40);
  now.mockReturnValue(1800); touch('touchmove', 90);
  touch('touchend', 0);
  now.mockRestore();
  expect(onBack).not.toHaveBeenCalled();
  expect(surface.style.transform).toBe('');
  expect(surface.style.transition).toMatch(/transform/);
  jest.advanceTimersByTime(300);
  expect(surface.style.transition).toBe('');
});

test('a quick flick goes back even before a third of the width', () => {
  const now = jest.spyOn(Date, 'now');
  now.mockReturnValue(1000); touch('touchstart', 5);
  now.mockReturnValue(1040); touch('touchmove', 40);
  now.mockReturnValue(1100); touch('touchmove', 90);
  touch('touchend', 0);
  now.mockRestore();
  jest.advanceTimersByTime(FINISH_MS + 50);
  expect(onBack).toHaveBeenCalledTimes(1);
});

test('only swipes that start at an edge count; mid-screen drags and vertical scrolls are left alone', () => {
  const moves = swipe([[EDGE_PX + 30, 300], [EDGE_PX + 200, 300], [EDGE_PX + 300, 300]]);
  expect(moves.some(m => m.defaultPrevented)).toBe(false);
  const vertical = swipe([[4, 300], [10, 360], [12, 500]]);
  expect(vertical.some(m => m.defaultPrevented)).toBe(false);
  expect(onBack).not.toHaveBeenCalled();
  expect(surface.style.transform).toBe('');
});

test('nothing happens with nothing to go back to, or when the swipe starts in a text field', () => {
  canGoBack.mockReturnValue(false);
  swipe([[4, 300], [100, 300], [250, 300]]);
  canGoBack.mockReturnValue(true);
  const input = document.createElement('input'); document.body.append(input);
  swipe([[4, 300], [100, 300], [250, 300]], input);
  input.remove();
  expect(onBack).not.toHaveBeenCalled();
});

test('with a sheet open the screen stays put and the release still closes the sheet', () => {
  stop();
  stop = startEdgeSwipeBack({ onBack, canGoBack, surface: () => null, animate: true });
  swipe([[4, 300], [100, 300], [250, 300]]);
  expect(onBack).toHaveBeenCalledTimes(1);
  expect(surface.style.transform).toBe('');
});

test('with reduced motion nothing moves, but the swipe still goes back', () => {
  stop();
  stop = startEdgeSwipeBack({ onBack, canGoBack, surface: () => surface, animate: false });
  touch('touchstart', 4); touch('touchmove', 120);
  expect(surface.style.transform).toBe('');
  touch('touchmove', 250); touch('touchend', 0);
  expect(onBack).toHaveBeenCalledTimes(1);
});

describe('previous page preview', () => {
  const snapshot = () => { const node = document.createElement('main'); node.innerHTML = '<h1 id="t">Wallet</h1><button>Pay</button>'; return { node, className: 'screen is-scrolled', scroll: 120 }; };
  const layer = () => document.querySelector('.movo-edge-preview');
  beforeEach(() => {
    stop();
    const host = document.createElement('div'); host.className = 'app-shell'; document.body.append(host); host.append(surface);
    stop = startEdgeSwipeBack({ onBack, canGoBack, surface: () => surface, preview: snapshot, animate: true });
  });
  afterEach(() => { document.querySelectorAll('.app-shell').forEach(n => n.remove()); });

  test('a blurred, dimmed copy of the previous page sits under the screen and clears as the swipe goes on', () => {
    touch('touchstart', 4); touch('touchmove', 40);
    const l = layer();
    expect(l).not.toBeNull();
    expect(l.nextElementSibling).toBe(surface); // directly under the sliding screen
    expect(l.getAttribute('aria-hidden')).toBe('true');
    const page = l.querySelector('.edge-preview-screen');
    expect(page.className).toBe('screen is-scrolled edge-preview-screen');
    expect(page.textContent).toBe('WalletPay');
    expect(page.style.transform).toBe('translate3d(0,-120px,0)'); // where the page was left
    const blurAt = () => parseFloat(/blur\(([\d.]+)px\)/.exec(page.style.filter)[1]);
    const shadeAt = () => parseFloat(l.querySelector('.movo-edge-shade').style.opacity);
    const parallaxAt = () => parseFloat(/translate3d\((-?[\d.]+)px/.exec(l.style.transform)[1]);
    const [b1, s1, p1] = [blurAt(), shadeAt(), parallaxAt()];
    expect(b1).toBeGreaterThan(4); expect(s1).toBeGreaterThan(0.35); expect(p1).toBeLessThan(-80);
    touch('touchmove', 300);
    expect(blurAt()).toBeLessThan(b1); expect(shadeAt()).toBeLessThan(s1); expect(parallaxAt()).toBeGreaterThan(p1);
    touch('touchend', 0);
    expect(blurAt()).toBe(0); expect(shadeAt()).toBe(0); // fully in view while the screen slides out
    jest.advanceTimersByTime(FINISH_MS + 50);
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(layer()).toBeNull();
  });

  test('a cancelled swipe slides the preview back out and removes it', () => {
    const now = jest.spyOn(Date, 'now');
    now.mockReturnValue(1000); touch('touchstart', 4);
    now.mockReturnValue(1500); touch('touchmove', 40);
    now.mockReturnValue(2000); touch('touchmove', 80);
    touch('touchend', 0); now.mockRestore();
    expect(layer()).not.toBeNull();
    jest.advanceTimersByTime(260);
    expect(layer()).toBeNull();
    expect(onBack).not.toHaveBeenCalled();
    expect(document.documentElement.classList.contains('movo-edge-swiping')).toBe(false);
  });

  test('no preview with a sheet open or with reduced motion', () => {
    stop(); stop = startEdgeSwipeBack({ onBack, canGoBack, surface: () => null, preview: snapshot, animate: true });
    touch('touchstart', 4); touch('touchmove', 60);
    expect(layer()).toBeNull(); touch('touchend', 0);
    stop(); stop = startEdgeSwipeBack({ onBack, canGoBack, surface: () => surface, preview: snapshot, animate: false });
    touch('touchstart', 4); touch('touchmove', 60);
    expect(layer()).toBeNull(); touch('touchend', 0);
  });
});
