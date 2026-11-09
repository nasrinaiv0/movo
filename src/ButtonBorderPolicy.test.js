
import fs from 'fs';
import path from 'path';

/* Regression coverage: enforce the final global button-border policy
   that must win over screen-specific styles and pseudo hairlines. */
const css = fs.readFileSync(path.join(__dirname, 'App.css'), 'utf8');
// The policy block runs from its header to the next block's header; later blocks (motion timing, dialogs) may style
// sheets and cards, but the borderless policy itself must not.
const policy = css.split('/* MOVO borderless control policy — 2026-11-07.')[1].split('/* MOVO header button interior and child navigation')[0];

describe('MOVO borderless interactive controls', () => {
  test('last stylesheet block targets buttons, tabs, interactive roles and link buttons', () => {
    expect(policy).toBeTruthy();
    // Five roots were required in Chromium to outrank legacy !important hairlines.
    expect(policy).toContain('.movo-app.movo-app.movo-app.movo-app.movo-app.movo-app :is(');
    for (const selector of ['button', '[role="button"]', '[role="tab"]', '[role="switch"]',
      'input[type="button"]', 'input[type="submit"]', 'a[class*="button"]', 'a[class*="btn"]']) {
      expect(policy).toContain(selector);
    }
    expect(policy).toMatch(/border:\s*0\s*!important/);
    expect(policy).toMatch(/border-style:\s*none\s*!important/);
    expect(policy).toMatch(/box-shadow:\s*none\s*!important/);
    expect(policy).toMatch(/outline:\s*0\s*!important/);
  });
  test('removes faux hairline border on button pseudo-elements without modifying panel styling', () => {
    expect(policy).toMatch(/\)::before,[\s\S]*\)::after\s*\{[\s\S]*?box-shadow:\s*none\s*!important/);
    const pseudo = policy.match(/\)::after\s*\{([^}]*)\}/);
    expect(pseudo).not.toBeNull();
    expect(pseudo[1]).not.toMatch(/border:\s*0\s*!important/); // real icon strokes survive

    expect(policy).not.toMatch(/\.card\s*\{|\.sheet\s*\{|\.sub-calendar\s*\{/);
    expect(policy).toContain('.sub-cal-day');
    expect(policy).toContain('.search-row');
  });
  test('global structural hairlines exclude controls and their pseudo-elements', () => {
    expect(css).not.toMatch(/\*::before,\s*\*::after\s*\{\s*border-width:/);
    expect(css).toMatch(/:not\(:is\(button, \[role=\"button\"\]/);
  });
  test('preserves keyboard focus visibility', () => {
    expect(policy).toMatch(/:focus-visible\s*\{\s*outline:\s*2px solid/);
  });
});
