import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { canAnimate } from '../lib/motion';
import { ariesInner, states, POSE_STATES } from '../lib/ariesArt';
import { t as tr } from '../lib/i18n';
import './AriesMascot.css';

export const ARIES_STATES = states;

/**
 * MOVO's default Aries: lightweight original vectors, with no model, network or WebGL dependency.
 * A label exposes one accessible image; otherwise the mascot is decorative. React's stable ID
 * keeps gradients separate even when many expressions appear on the same page or during SSR.
 */
export default function AriesMascot({ state, pose = 'home', size = 120, className = '', label, animated = true, walking = false }) {
  const host = useRef(null);
  const id = useId();
  const [motion, setMotion] = useState(() => animated && canAnimate());
  const [active, setActive] = useState(() => typeof document === 'undefined' || document.visibilityState !== 'hidden');
  const selectedState = state || POSE_STATES[pose] || 'welcome';
  const resolvedState = states.some(item => item.id === selectedState) ? selectedState : 'welcome';

  useEffect(() => {
    let media;
    try { media = window.matchMedia('(prefers-reduced-motion: reduce)'); } catch { /* Older webviews use canAnimate's fallback. */ }
    const update = () => setMotion(animated && canAnimate() && !media?.matches);
    update();
    if (media?.addEventListener) media.addEventListener('change', update);
    else media?.addListener?.(update);
    return () => {
      if (media?.removeEventListener) media.removeEventListener('change', update);
      else media?.removeListener?.(update);
    };
  }, [animated]);

  useEffect(() => {
    let visible = true;
    const update = () => setActive(visible && document.visibilityState !== 'hidden');
    const observer = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(entries => {
      visible = entries[0]?.isIntersecting !== false;
      update();
    }) : null;
    if (host.current) observer?.observe(host.current);
    document.addEventListener('visibilitychange', update);
    update();
    return () => { observer?.disconnect(); document.removeEventListener('visibilitychange', update); };
    // The SVG remounts per expression (key), so observe the new node each time.
  }, [resolvedState]);

  const markup = useMemo(() => ({ __html: ariesInner(resolvedState, {
    idPrefix: id, animated: motion, decorative: true, pose,
  }) }), [resolvedState, id, motion, pose]);
  const classes = ['aries-mascot', `pose-${pose}`, 'aries', `aries--${resolvedState}`, motion ? 'is-animated' : '',
    walking ? 'aries--walking' : '', active ? '' : 'is-paused', className].filter(Boolean).join(' ');

  // Keyed on the expression so each change replays the short settle-in motion.
  return <svg key={resolvedState} ref={host} className={classes} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 360" fill="none"
    width={size} height={size} style={{ width: size, height: 'auto' }} data-state={resolvedState} data-motion={motion ? 'animated' : 'still'}
    role={label ? 'img' : undefined} aria-label={label ? tr(label) : undefined} aria-hidden={label ? undefined : true}
    focusable="false" dangerouslySetInnerHTML={markup} />;
}
