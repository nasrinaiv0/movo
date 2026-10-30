import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import EditableBoxes, { arrange, sizeOf, styleOf } from './EditableBoxes';

global.IS_REACT_ACT_ENVIRONMENT = true;
let container; let root;
beforeEach(() => { container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container); });
afterEach(() => { act(() => root.unmount()); container.remove(); jest.useRealTimers(); });
const mount = (el) => act(() => root.render(el));
/* jsdom has no PointerEvent, so send MouseEvents with the pointer fields React reads. */
const pointer = (el, type, x = 0, y = 0) => act(() => { const e = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }); Object.defineProperty(e, 'pointerType', { value: 'touch' }); el.dispatchEvent(e); });
const byText = (text) => [...container.querySelectorAll('p')].find(p => p.textContent === text);
const byLabel = (label) => container.querySelector(`[aria-label="${label}"]`);

const boxes = [
  { id: 'a', label: 'Alpha', node: ({ size }) => <p>Alpha {size}</p> },
  { id: 'b', label: 'Beta', styles: [['bars', 'Bars'], ['lines', 'Lines']], node: ({ style }) => <p>Beta {style}</p> },
  { id: 'c', label: 'Gamma', sizes: ['M'], node: <p>Gamma</p> },
];

test('layout helpers fall back safely for unknown saved values', () => {
  expect(arrange(boxes, { order: ['c', 'a'] }).map(b => b.id)).toEqual(['c', 'a', 'b']);
  expect(sizeOf(boxes[0], {})).toBe('M');
  expect(sizeOf(boxes[0], { sizes: { a: 'L' } })).toBe('L');
  expect(sizeOf(boxes[0], { sizes: { a: 'XL' } })).toBe('M');
  expect(styleOf(boxes[1], {})).toBe('bars');
  expect(styleOf(boxes[1], { styles: { b: 'pie' } })).toBe('bars');
  expect(styleOf(boxes[0], {})).toBeUndefined();
});

test('holding a box opens Customize, a short tap does not', () => {
  jest.useFakeTimers();
  const onEdit = jest.fn();
  mount(<EditableBoxes boxes={boxes} layout={{}} editing={false} onEdit={onEdit} onChange={() => {}} onDone={() => {}} title="Home" />);
  const slot = byText('Alpha M').parentElement;
  pointer(slot, 'pointerdown', 10, 10);
  act(() => { jest.advanceTimersByTime(200); });
  pointer(slot, 'pointerup', 10, 10);
  act(() => { jest.advanceTimersByTime(600); });
  expect(onEdit).not.toHaveBeenCalled();
  pointer(slot, 'pointerdown', 10, 10);
  pointer(slot, 'pointermove', 10, 40);
  act(() => { jest.advanceTimersByTime(600); });
  expect(onEdit).not.toHaveBeenCalled(); // moving (scrolling) cancels the hold
  pointer(slot, 'pointerdown', 10, 10);
  act(() => { jest.advanceTimersByTime(600); });
  expect(onEdit).toHaveBeenCalledTimes(1);
});

test('tapping the corner handle steps the size, and chart arrows change the style', () => {
  const onChange = jest.fn();
  mount(<EditableBoxes boxes={boxes} layout={{ sizes: { a: 'L' } }} editing onChange={onChange} onDone={() => {}} title="Home" />);
  const handle = byLabel('Resize Alpha: Large');
  pointer(handle, 'pointerdown');
  pointer(handle, 'pointerup');
  expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ sizes: { a: 'S' } }));
  expect(container.querySelector('[aria-label^="Resize Gamma"]')).toBeNull();
  act(() => byLabel('Next chart style').dispatchEvent(new MouseEvent('click', { bubbles: true })));
  expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ styles: { b: 'lines' }, sizes: { a: 'L' } }));
});
