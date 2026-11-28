import { memo, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import AriesMascot from './original/components/AriesMascot';
import { Garment } from './Garment';
import { garmentFor } from './garments';

const OriginalAries = memo(AriesMascot);
const SVG_NS = 'http://www.w3.org/2000/svg';

const ANCHORS = {
  body: ['.aries-figure', ['pants', 'shirt', 'jacket'], '.aries-arm-left'],
  leftArm: ['.aries-arm-left', ['shirt', 'jacket']],
  rightArm: ['.aries-arm-right', ['shirt', 'jacket']],
  head: ['.aries-head', ['cap']],
  neck: ['.aries-head', ['scarf'], 'path[fill$="-face)"]'],
  leftLeg: ['.aries-leg-left', ['pants', 'shoes']],
  rightLeg: ['.aries-leg-right', ['pants', 'shoes']],
};

function addMounts(svg) {
  return Object.fromEntries(Object.entries(ANCHORS).map(([part, [selector, before]]) => {
    const parent = svg.querySelector(selector);
    const mount = document.createElementNS(SVG_NS, 'g');
    mount.setAttribute('data-clothing-mount', part);
    mount.setAttribute('aria-hidden', 'true');
    // The torso sits behind the arms. The scarf follows the head and sits behind the face.
    parent.insertBefore(mount, before ? parent.querySelector(before) : null);
    return [part, mount];
  }));
}

export const DressedAries = memo(function DressedAries({
  outfit, previous, expression = 'welcome', animated = false, label, size = '100%',
}) {
  const host = useRef(null);
  const [mounts, setMounts] = useState(null);

  useLayoutEffect(() => {
    const container = host.current;
    let svg;
    let targets;
    const refresh = () => {
      const original = container.firstElementChild;
      if (!original) return;
      if (svg !== original) {
        svgObserver.disconnect();
        svg = original;
        // Original Aries replaces the SVG on expression changes and may replace its
        // contents on motion changes. Overlay updates never trigger either observer.
        svgObserver.observe(svg, { childList: true });
      }
      if (targets && svg.contains(targets.body)) return;
      targets = addMounts(svg);
      setMounts(targets);
    };
    const svgObserver = new MutationObserver(refresh);
    const hostObserver = new MutationObserver(refresh);
    hostObserver.observe(container, { childList: true });
    refresh();
    return () => {
      svgObserver.disconnect();
      hostObserver.disconnect();
    };
  }, []);

  return <span className="dressed-aries" ref={host}>
    <OriginalAries state={expression} size={size} animated={animated} label={label} />
    {mounts && Object.entries(mounts).map(([part, mount]) =>
      createPortal(ANCHORS[part][1].flatMap(category => {
        const current = outfit[category];
        const old = previous?.[category];
        const layers = old && old.id !== current?.id ? [old, current] : [current];
        return layers.filter(Boolean).map(choice => {
          const item = garmentFor(category, choice);
          return <g key={category + ':' + item.id}
            className={choice === current ? 'garment-layer' : 'garment-layer is-exiting'}
            data-garment={category} data-style={item.id}>
            <Garment item={item} category={category} choice={choice} part={part} />
          </g>;
        });
      }), mount, part)
    )}
  </span>;
});
