/*
 * Edge swipe to go back (owner, 2026-11-12), for the iPhone app: the iOS web view has no back swipe of its own here,
 * because MOVO keeps its screens in app state. A swipe that starts at the left edge and moves right, or at the right
 * edge and moves left (as on Android), does what device Back does: close the open sheet, else return to the previous
 * screen. The screen follows the finger and either finishes the move or eases back; with reduced motion it does not
 * move, and only the release decides.
 *
 * Android phones use the system back gesture and button instead (lib/native.js listenForAndroidBack), and browsers
 * have their own swipe that arrives as history Back (lib/backNavigation.js), so this runs only in the iOS app.
 */
export const EDGE_PX = 24;        // where a swipe may start, from either side
const LOCK_PX = 12;               // movement before deciding horizontal (ours) or vertical (scrolling)
const COMMIT_SHARE = 0.32;        // released past a third of the width: go back
const FLICK_PX = 64;              // or a quick flick of at least this far
const FLICK_SPEED = 0.45;         // px per ms over the last moves

const editable = (el) => !!el?.closest?.('input, textarea, select, [contenteditable="true"], [data-no-edge-swipe]');

/**
 * Start listening. `canGoBack()` says whether Back has anything to do; `onBack()` does it; `surface()` returns the
 * element to slide (the current screen) or null when a sheet is open; `animate` false skips the follow-the-finger
 * motion. Returns a function that stops listening.
 */
export function startEdgeSwipeBack({ canGoBack, onBack, surface = () => null, animate = true, win = typeof window === 'undefined' ? null : window }) {
  if (!win?.addEventListener) return () => {};
  let g = null; // the gesture in progress
  const width = () => Math.max(1, win.innerWidth || 1);
  const place = (el, x, transition) => {
    if (!el) return;
    el.style.transition = transition || 'none';
    el.style.transform = x ? `translate3d(${x}px,0,0)` : '';
    el.style.willChange = x ? 'transform' : '';
  };
  const settle = (el) => {
    if (!el) return;
    place(el, 0, 'transform 220ms cubic-bezier(.2,.8,.2,1)');
    win.setTimeout(() => { el.style.transition = ''; el.style.willChange = ''; }, 240);
  };
  const end = () => { win.document?.documentElement?.classList?.remove('movo-edge-swiping'); g = null; };

  const onStart = (e) => {
    g = null;
    if (e.touches?.length !== 1) return;
    const t = e.touches[0]; const w = width();
    const side = t.clientX <= EDGE_PX ? 1 : t.clientX >= w - EDGE_PX ? -1 : 0; // 1: from the left, -1: from the right
    if (!side || editable(e.target) || !canGoBack()) return;
    g = { side, x0: t.clientX, y0: t.clientY, dx: 0, locked: false, el: null, samples: [[t.clientX, Date.now()]] };
  };
  const onMove = (e) => {
    if (!g) return;
    const t = e.touches?.[0]; if (!t) return;
    const dx = (t.clientX - g.x0) * g.side; const dy = Math.abs(t.clientY - g.y0);
    if (!g.locked) {
      if (dy > LOCK_PX && dy > Math.abs(dx)) { g = null; return; }           // a vertical scroll: let it be
      if (dx < -LOCK_PX) { g = null; return; }                               // moving towards the edge: not Back
      if (dx < LOCK_PX || dx < dy * 1.2) return;
      g.locked = true; g.el = animate ? surface() : null;
      win.document?.documentElement?.classList?.add('movo-edge-swiping');
    }
    if (e.cancelable) e.preventDefault();
    g.dx = Math.max(0, dx);
    g.samples.push([t.clientX, Date.now()]); if (g.samples.length > 5) g.samples.shift();
    place(g.el, g.dx * g.side * 0.94);
  };
  const onEnd = () => {
    if (!g?.locked) { g = null; return; }
    const { el, dx, samples } = g;
    const [[xa, ta], [xb, tb]] = [samples[0], samples[samples.length - 1]];
    const speed = Math.abs(xb - xa) / Math.max(1, tb - ta);
    const commit = dx > width() * COMMIT_SHARE || (dx > FLICK_PX && speed > FLICK_SPEED);
    end();
    if (commit) {
      // The next screen plays its own "back" entrance; the old one is cleared so a closed sheet leaves no offset.
      onBack();
      if (el) { el.style.transition = ''; el.style.transform = ''; el.style.willChange = ''; }
    } else settle(el);
  };
  const onCancel = () => { if (g?.locked) settle(g.el); end(); };

  win.addEventListener('touchstart', onStart, { passive: true });
  win.addEventListener('touchmove', onMove, { passive: false });
  win.addEventListener('touchend', onEnd, { passive: true });
  win.addEventListener('touchcancel', onCancel, { passive: true });
  return () => {
    win.removeEventListener('touchstart', onStart); win.removeEventListener('touchmove', onMove);
    win.removeEventListener('touchend', onEnd); win.removeEventListener('touchcancel', onCancel);
    end();
  };
}
