import { armBackGuard, closeTopBackLayer, createScreenTrail, listenForDeviceBack, pushBackLayer } from './backNavigation';

test('the trail returns to the screens visited, most recent first', () => {
  const trail = createScreenTrail();
  trail.visit('Home', 'Menu'); trail.visit('Menu', 'Settings'); trail.visit('Settings', 'HelpCenter');
  expect(trail.back()).toBe('Settings');
  expect(trail.back()).toBe('Menu');
  expect(trail.back()).toBe('Home');
  expect(trail.back()).toBeUndefined();
});

test('an on-screen back arrow counts as going back, so the trail does not loop', () => {
  const trail = createScreenTrail();
  trail.visit('Home', 'Notifications'); trail.visit('Notifications', 'NotificationDetail');
  trail.visit('NotificationDetail', 'Notifications'); // the arrow in the header
  expect(trail.size()).toBe(1);
  expect(trail.back()).toBe('Home');
});

test('staying on the same screen records nothing, and the trail is bounded', () => {
  const trail = createScreenTrail(3);
  trail.visit('Home', 'Home');
  expect(trail.size()).toBe(0);
  ['A', 'B', 'C', 'D', 'E'].reduce((from, to) => { trail.visit(from, to); return to; }, 'Home');
  expect(trail.size()).toBe(3);
  expect(trail.back()).toBe('D');
});

test('device Back is handed to the app and the guard is put back only while there is somewhere to go', () => {
  jest.useFakeTimers();
  try {
    const pushed = []; const listeners = {};
    const win = { history: { state: null, pushState: (state) => { pushed.push(state); } }, addEventListener: (name, fn) => { listeners[name] = fn; }, removeEventListener: (name) => { delete listeners[name]; } };
    const answers = [true, false]; let asked = 0;
    const stop = listenForDeviceBack(() => { asked += 1; return answers.shift(); }, win);
    expect(pushed).toHaveLength(1);                 // armed on start
    expect(pushed[0]).toEqual({ movoBackGuard: true });
    listeners.popstate(); jest.runAllTimers();      // handled: armed again
    expect(pushed).toHaveLength(2);
    listeners.popstate(); jest.runAllTimers();      // nothing to go back to: left popped so the next Back leaves
    expect(pushed).toHaveLength(2);
    expect(asked).toBe(2);
    // A link that only changes the "#" part is a move forward: the app is not asked to go back, the guard returns.
    listeners.popstate(); listeners.hashchange(); jest.runAllTimers();
    expect(asked).toBe(2);
    expect(pushed).toHaveLength(3);
    stop();
    expect(listeners.popstate).toBeUndefined();
    expect(listeners.hashchange).toBeUndefined();
    expect(armBackGuard(null)).toBe(false);
  } finally { jest.useRealTimers(); }
});

test('open sheets close innermost first, and a closed sheet no longer answers Back', () => {
  const closed = [];
  const leaveOuter = pushBackLayer(() => closed.push('outer'));
  const leaveInner = pushBackLayer(() => closed.push('inner'));
  expect(closeTopBackLayer()).toBe(true);
  expect(closed).toEqual(['inner']);
  leaveInner();
  expect(closeTopBackLayer()).toBe(true);
  expect(closed).toEqual(['inner', 'outer']);
  leaveOuter();
  expect(closeTopBackLayer()).toBe(false);
});
