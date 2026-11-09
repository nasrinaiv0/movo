import React, { Component, Suspense, lazy } from 'react';
import { Skeleton } from '../components/ui';
import { t as tr } from './i18n';

/*
 * Screens and sheets that nobody needs on the first screen load on demand (performance phase 7). Each one renders
 * inside its own boundary: a placeholder while its code arrives, and a calm message with Try again if the download
 * fails, instead of a blank app. Once loaded, it renders in the same pass with no placeholder. After the first screen
 * is up, App preloads every split screen while the device is idle, so moving between pages later (also offline, once
 * the session started online) never waits.
 *
 *   const FinancialPlanning = lazyScreen(() => import('../screens/FinancialPlanning'));
 *   const TermsOfService = lazyScreen(() => import('../screens/Legal'), { pick: 'TermsOfService' });
 *   const ScannerSheet = lazyScreen(() => import('../components/ScannerSheet'), { placeholder: null });
 */
const starters = [];

class ScreenBoundary extends Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return <div className="card pad lazy-failed" role="alert">
      <p>{tr('This page could not be opened. Check your connection and try again.')}</p>
      <button type="button" className="secondary-button" onClick={() => window.location.reload()}>{tr('Try again')}</button>
    </div>;
  }
}

export function lazyScreen(load, { pick = 'default', placeholder } = {}) {
  let Loaded = null;
  let pending = null;
  const start = () => {
    if (!pending) pending = load().then(module => { Loaded = module[pick]; return { default: Loaded }; });
    return pending;
  };
  // When the code is already here, hand React a thenable that resolves at once, so the screen renders in the same
  // pass with no placeholder. The tree is always Boundary > Suspense > screen, so it never remounts.
  const Lazy = lazy(() => (Loaded ? { then: resolve => resolve({ default: Loaded }) } : start()));
  const fallback = placeholder === undefined ? <Skeleton lines={5} /> : placeholder;
  function LazyScreen(props) {
    return <ScreenBoundary><Suspense fallback={fallback}><Lazy {...props} /></Suspense></ScreenBoundary>;
  }
  LazyScreen.preload = () => start().catch(() => { pending = null; });
  starters.push(LazyScreen.preload);
  // Tests render synchronously: load at once there so no test waits on a placeholder.
  if (process.env.NODE_ENV === 'test') LazyScreen.preload();
  return LazyScreen;
}

/** Fetch every split screen in the background; failures are ignored here and retried when the screen opens. */
export function preloadScreens() { return Promise.all(starters.map(preload => preload())); }
