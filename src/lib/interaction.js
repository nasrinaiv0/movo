/*
 * Responsiveness on phones (owner, 2026-11-12): decorative work (the 3D mascot) steps aside while the person is
 * touching, scrolling or looking at a sheet or dialog, so taps, scrolling and pop-ups get the whole frame budget.
 */
let busyUntil = 0;
let installed = false;
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/** Start listening once (passive listeners only; nothing is blocked). Also lets iOS Safari show :active at once. */
export function installInteractionTracking(win = typeof window === 'undefined' ? null : window) {
  if (installed || !win?.addEventListener) return;
  installed = true;
  const touch = () => { busyUntil = now() + 700; };
  const scroll = () => { busyUntil = Math.max(busyUntil, now() + 250); };
  win.addEventListener('touchstart', touch, { passive: true, capture: true });
  win.addEventListener('pointerdown', touch, { passive: true, capture: true });
  win.addEventListener('keydown', touch, { passive: true, capture: true });
  win.addEventListener('scroll', scroll, { passive: true, capture: true });
}

/** True for a short moment after a touch, click, key press or scroll. */
export const isInteracting = () => now() < busyUntil;

/** True while a sheet, dialog or other modal layer is open. */
export function modalOpen(doc = typeof document === 'undefined' ? null : document) {
  return !!doc?.querySelector?.('.sheet-backdrop, .confirm-layer, [aria-modal="true"]');
}

/** For tests. */
export function resetInteraction() { busyUntil = 0; }
export function markInteraction(ms = 700) { busyUntil = now() + ms; }
