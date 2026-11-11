import { startEdgeSwipeBack, EDGE_PX } from './edgeSwipeBack';

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
  expect(onBack).toHaveBeenCalledTimes(1);
  expect(surface.style.transform).toBe('');
  expect(document.documentElement.classList.contains('movo-edge-swiping')).toBe(false);
});

test('a swipe in from the right edge (moving left) also goes back, sliding the screen left', () => {
  touch('touchstart', W - 4);
  touch('touchmove', W - 60);
  expect(surface.style.transform).toMatch(/translate3d\(-/);
  touch('touchmove', W - 220);
  touch('touchend', 0);
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
