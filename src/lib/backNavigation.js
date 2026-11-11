/*
 * Device Back (Android back button and gesture, browser Back, iOS edge swipe in a browser) for an app that keeps its
 * screens in React state.
 *
 * MOVO keeps exactly one "guard" entry on top of the page's own history entry. Pressing Back pops the guard, which
 * fires `popstate`; the app then closes what is on top (a sheet), or returns to the previous screen, and the guard is
 * put back. With nothing left to go back to (Home, nothing open) the guard stays popped, so the next Back leaves:
 * the Android app closes to the home screen and the browser goes to the previous page, as people expect.
 *
 * The screen trail is a plain list of screen names. Going to the screen at the top of the trail (an on-screen back
 * arrow) counts as going back, so the trail never grows a loop.
 */
export function createScreenTrail(limit = 40) {
  let trail = [];
  return {
    /** Record a move from `from` to `to` made inside the app. */
    visit(from, to) {
      if (!from || from === to) return;
      if (trail[trail.length - 1] === to) { trail.pop(); return; }
      trail.push(from);
      if (trail.length > limit) trail = trail.slice(-limit);
    },
    /** The screen to return to, removed from the trail; undefined when there is none. */
    back() { return trail.pop(); },
    clear() { trail = []; },
    size() { return trail.length; },
  };
}

// Sheets and dialogs that are open, innermost last. Each entry closes its own layer.
const layers = [];
/** A sheet or dialog announces itself while it is open; Back closes the top one first. Returns the undo. */
export function pushBackLayer(close) {
  const layer = { close };
  layers.push(layer);
  return () => { const at = layers.indexOf(layer); if (at >= 0) layers.splice(at, 1); };
}
/** Close the top open layer. True when there was one. */
export function closeTopBackLayer() {
  const layer = layers[layers.length - 1];
  if (!layer) return false;
  layer.close();
  return true;
}

/** Put the guard entry on top of the current one. The address is not changed. */
export function armBackGuard(win = typeof window === 'undefined' ? null : window) {
  if (!win?.history?.pushState) return false;
  try { win.history.pushState({ ...(win.history.state || {}), movoBackGuard: true }, ''); return true; } catch { return false; }
}

/**
 * Listen for device Back. `onBack()` returns true when it handled the press (something closed or the screen
 * changed), false when there was nothing to go back to. Returns a function that stops listening.
 */
export function listenForDeviceBack(onBack, win = typeof window === 'undefined' ? null : window) {
  if (!win?.addEventListener || !win.history?.pushState) return () => {};
  armBackGuard(win);
  // Opening a link that only changes the part after "#" (a MOVO log link) also fires `popstate`, followed at once by
  // `hashchange`. That is a move forward, not Back: wait one tick, and if the address changed, only re-arm the guard.
  let timer = null; let linked = false;
  const onHash = () => { linked = true; };
  const handle = () => {
    linked = false;
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (linked) { armBackGuard(win); return; }
      if (onBack() === true) armBackGuard(win);
    }, 0);
  };
  win.addEventListener('popstate', handle);
  win.addEventListener('hashchange', onHash);
  return () => { clearTimeout(timer); win.removeEventListener('popstate', handle); win.removeEventListener('hashchange', onHash); };
}
