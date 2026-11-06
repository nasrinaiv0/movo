import fs from 'fs';
import path from 'path';
import { contrastTextForAccent } from './App';

const css = fs.readFileSync(path.join(__dirname, 'App.css'), 'utf8');

const luminosity = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
  .map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  .reduce((sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i], 0);

describe('accent-filled financial summary cards', () => {
  test.each(['#efa1f3', '#f9c5ff', '#f4e542', '#086b3a', '#1c1c1e', '#334155', '#2f6bff'])(
    'uses black/white foreground with WCAG AA contrast for %s', accent => {
      const ink = contrastTextForAccent(accent);
      const light = Math.max(luminosity(accent), luminosity(ink));
      const dark = Math.min(luminosity(accent), luminosity(ink));
      expect((light + .05) / (dark + .05)).toBeGreaterThanOrEqual(4.5);
    }
  );

  test('five financial hero surfaces inherit the same accent-aware ink and graphs', () => {
    expect(css).toMatch(/--summary-card-ink:\s*var\(--on-accent/);
    expect(css).toMatch(/--summary-card-chart-soft:\s*color-mix\(in srgb, var\(--summary-card-ink\)/);
    expect(css).toMatch(/\.sub-hero\.card\s*\{[^}]*color:\s*var\(--on-accent/);
    expect(css).toMatch(/\.sub-hero\s*>\s*small[^}]*color:\s*var\(--on-accent/);
    expect(css).toMatch(/\.sub-hero-row\s*\{[^}]*var\(--on-accent/);
    expect(css).toMatch(/\.balance-art \.mini-bars rect[^}]*fill:\s*var\(--summary-card-ink/);
    expect(css).toMatch(/\.balance-art \.sparkline path\[fill\][^}]*fill:\s*var\(--summary-card-ink/);
    expect(css).toMatch(/\.billing-cycle-chart-column\.selected \.billing-cycle-chart-bar[^}]*background:\s*var\(--summary-card-ink/);
    expect(css).toMatch(/\.billing-cycle-chart-bar[^}]*background:\s*var\(--summary-card-chart-soft/);
    expect(css).not.toMatch(/--summary-card-ink:\s*#fff\s*;/);
  });

  test('screen wiring keeps all existing summary cards connected', () => {
    const paths = ['screens/Home.js', 'screens/Transactions.js', 'screens/FinancialPlanning.js', 'screens/Subscriptions.js', 'screens/Cashback.js'];
    const contents = paths.map(file => fs.readFileSync(path.join(__dirname, file), 'utf8'));
    expect(contents[0]).toContain('balance-card notched');
    expect(contents[1]).toContain('billing-cycle-summary');
    expect(contents[2]).toContain('sub-hero fp-hero');
    expect(contents[3]).toContain('sub-hero');
    expect(contents[4]).toContain('cashback-total');
  });
});
