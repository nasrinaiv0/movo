import React, { useId, useMemo } from 'react';
import { ariesSvg } from '../lib/ariesArt';
import { t as tr } from '../lib/i18n';

/*
 * MOVO Aries, the welcoming mascot (owner, 2026-11-16). Original vector art from lib/ariesArt.js; it greets people on
 * the first-run welcome, guides the MOVO guide and heads the Help Center. The Home 3D ram (RamMascot) is separate and
 * unchanged. Decorative by default (`label` gives it a name for screen readers). The markup is built only from fixed
 * numbers in ariesArt.js, never from user text.
 */
export default function AriesMascot({ pose = 'home', size = 64, label = '', className = '' }) {
  const raw = useId();
  const id = 'aries' + raw.replace(/[^a-zA-Z0-9]/g, '');
  const markup = useMemo(() => ({ __html: ariesSvg(pose, id) }), [pose, id]);
  const named = label ? { role: 'img', 'aria-label': tr(label) } : { 'aria-hidden': 'true', focusable: 'false' };
  return <svg className={`aries-mascot pose-${pose}${className ? ' ' + className : ''}`} viewBox="0 0 200 200" width={size} height={size}
    {...named} dangerouslySetInnerHTML={markup} />;
}
