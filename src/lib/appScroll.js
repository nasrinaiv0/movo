/** A separating fold uses one independently scrollable pane; ordinary windows retain document scrolling. */
const paneScroller = () => typeof document === 'undefined' ? null : document.querySelector('.movo-app.layout-pane > .app-shell');
export const appScrollTop = () => paneScroller()?.scrollTop ?? (typeof window === 'undefined' ? 0 : window.scrollY || 0);
export function scrollAppTo(top) {
  const pane = paneScroller();
  if (pane) pane.scrollTop = top;
  else { try { window.scrollTo?.(0, top); } catch { /* no scrolling in a non-visual renderer */ } }
}
