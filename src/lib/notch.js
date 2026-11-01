/*
 * Outline of a box with a smooth notch cut out of its top-right corner (for a pill to sit in).
 *   w, h: box size · nw, nh: notch size · R: box corner radius · f: fillet where the notch meets the edges
 *   rn: radius of the notch's inner corner (pill radius + gap, so the cut follows the pill).
 * Returns an SVG path in box pixels. Radii are clamped so the outline stays valid at any size.
 */
export function notchPath(w, h, nw, nh, { R = 22, f = 14, rn = 26 } = {}) {
  const r = Math.max(0, Math.min(R, h / 2, (w - nw) / 2));
  const fi = Math.max(0, Math.min(f, nh / 2, (w - nw) / 3));
  const n = Math.max(0, Math.min(rn, nh - fi, nw - fi));
  const x = w - nw;
  const p = (v) => Math.round(v * 100) / 100;
  return [
    `M${p(r)} 0`, `H${p(x - fi)}`, `A${p(fi)} ${p(fi)} 0 0 1 ${p(x)} ${p(fi)}`,
    `V${p(nh - n)}`, `A${p(n)} ${p(n)} 0 0 0 ${p(x + n)} ${p(nh)}`,
    `H${p(w - fi)}`, `A${p(fi)} ${p(fi)} 0 0 1 ${p(w)} ${p(nh + fi)}`,
    `V${p(h - r)}`, `A${p(r)} ${p(r)} 0 0 1 ${p(w - r)} ${p(h)}`,
    `H${p(r)}`, `A${p(r)} ${p(r)} 0 0 1 0 ${p(h - r)}`,
    `V${p(r)}`, `A${p(r)} ${p(r)} 0 0 1 ${p(r)} 0`, 'Z',
  ].join(' ');
}

/** CSS mask value (an inline SVG) that shows the box everywhere except the notch. */
export const notchMask = (w, h, nw, nh, opts) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><path d="${notchPath(w, h, nw, nh, opts)}"/></svg>`)}")`;
