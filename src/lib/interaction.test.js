import { installInteractionTracking, isInteracting, markInteraction, modalOpen, resetInteraction } from './interaction';

afterEach(() => { resetInteraction(); document.body.innerHTML = ''; });

test('a touch or scroll marks a short busy moment, then it passes', () => {
  installInteractionTracking(window);
  const now = jest.spyOn(performance, 'now');
  now.mockReturnValue(1000);
  expect(isInteracting()).toBe(false);
  window.dispatchEvent(new Event('touchstart'));
  now.mockReturnValue(1500); expect(isInteracting()).toBe(true);
  now.mockReturnValue(1800); expect(isInteracting()).toBe(false);
  window.dispatchEvent(new Event('scroll'));
  now.mockReturnValue(1900); expect(isInteracting()).toBe(true);
  now.mockReturnValue(2100); expect(isInteracting()).toBe(false);
  now.mockRestore();
});

test('an open sheet or dialog counts as modal', () => {
  expect(modalOpen()).toBe(false);
  document.body.innerHTML = '<div class="sheet-backdrop"><div class="sheet"></div></div>';
  expect(modalOpen()).toBe(true);
  document.body.innerHTML = '<div role="dialog" aria-modal="true"></div>';
  expect(modalOpen()).toBe(true);
  markInteraction(50);
  expect(isInteracting()).toBe(true);
});
