/*
 * Font style and text size (Settings → Appearance → Text).
 *
 * Text size: every pixel `font-size` in MOVO's stylesheets is rewritten once, at runtime, to
 * `calc(Npx * var(--font-scale))`, so text grows or shrinks everywhere while boxes, icons and spacing keep their
 * layout. Form fields never go below 16px, which keeps iOS from zooming in when one is focused. Rules added later
 * (new CSS blocks) are covered automatically because the rewrite reads the live stylesheets.
 *
 * Font style: system stacks need no download; Google-hosted families load only when chosen.
 */
export const FONT_SIZES = [
  { key: 'small', scale: 0.9, label: 'Small' },
  { key: 'default', scale: 1, label: 'Default' },
  { key: 'large', scale: 1.1, label: 'Large' },
  { key: 'larger', scale: 1.2, label: 'Larger' },
  { key: 'largest', scale: 1.3, label: 'Largest' },
];

const INTER = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
export const FONT_STYLES = [
  { key: 'default', label: 'Default', stack: INTER },
  { key: 'system', label: 'System', stack: "-apple-system, BlinkMacSystemFont, system-ui, 'Segoe UI', Roboto, sans-serif" },
  { key: 'rounded', label: 'Rounded', stack: "ui-rounded, 'SF Pro Rounded', 'Nunito', system-ui, sans-serif", google: 'Nunito:wght@400;500;600;700;800' },
  { key: 'serif', label: 'Serif', stack: "ui-serif, 'New York', 'Lora', Georgia, serif", google: 'Lora:wght@400;500;600;700' },
  { key: 'readable', label: 'Readable', stack: "'Atkinson Hyperlegible', " + INTER, google: 'Atkinson+Hyperlegible:wght@400;700' },
];

export const fontScaleOf = (key) => (FONT_SIZES.find(s => s.key === key) || FONT_SIZES[1]).scale;
export const fontStyleOf = (key) => FONT_STYLES.find(s => s.key === key) || FONT_STYLES[0];

const PX = /^(\d*\.?\d+)px$/;
const FIELD = /\b(input|textarea|select)\b|composer|prompt-input/;

/** The scaled value for one rule's font-size, or null when it is not a plain pixel size. */
export function scaledFontSize(value, selector = '') {
  const m = PX.exec(String(value || '').trim());
  if (!m) return null;
  const px = Number(m[1]);
  const calc = `calc(${px}px * var(--font-scale, 1))`;
  return px >= 16 && FIELD.test(selector) ? `max(${px}px, ${calc})` : calc;
}

/** Rewrites pixel font sizes in a list of CSS rules (recursing into @media/@supports/@container). Returns the count. */
export function scaleRules(rules) {
  let n = 0;
  for (const rule of Array.from(rules || [])) {
    if (rule.cssRules && !rule.style) { n += scaleRules(rule.cssRules); continue; }
    const style = rule.style;
    if (!style) continue;
    const next = scaledFontSize(style.fontSize || style.getPropertyValue?.('font-size'), rule.selectorText);
    if (!next) continue;
    style.setProperty('font-size', next, style.getPropertyPriority?.('font-size') || '');
    n += 1;
  }
  return n;
}

const done = typeof WeakSet === 'function' ? new WeakSet() : new Set();
/** Makes every same-origin stylesheet follow --font-scale. Safe to call repeatedly. */
export function enableFontScaling(doc = typeof document === 'undefined' ? null : document) {
  if (!doc?.styleSheets) return 0;
  let n = 0;
  for (const sheet of Array.from(doc.styleSheets)) {
    if (done.has(sheet)) continue;
    let rules;
    try { rules = sheet.cssRules; } catch { continue; } // cross-origin (Google Fonts) cannot be read
    if (!rules) continue;
    n += scaleRules(rules);
    done.add(sheet);
  }
  return n;
}

/** Loads a Google-hosted family once, only when the person picks it. */
export function loadFontStyle(key, doc = typeof document === 'undefined' ? null : document) {
  const font = fontStyleOf(key);
  if (!font.google || !doc?.head) return;
  const id = `movo-font-${font.key}`;
  if (doc.getElementById(id)) return;
  const link = doc.createElement('link');
  link.id = id; link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${font.google}&display=swap`;
  doc.head.appendChild(link);
}
