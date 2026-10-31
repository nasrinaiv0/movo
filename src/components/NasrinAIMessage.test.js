import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import NasrinAIMessage from './NasrinAIMessage';

function renderChart(spec) {
  return renderToStaticMarkup(
    <NasrinAIMessage content={'```chart\n' + JSON.stringify(spec) + '\n```'} />
  );
}

describe('NasrinAI chart rendering', () => {
  test('renders a safe note instead of throwing on malformed chart rows', () => {
    const html = renderChart({
      chartType: 'bar',
      xKey: 'month',
      series: [{ dataKey: 'amount', label: 'Expenses' }],
      data: [{ month: 'Jan', amount: 100 }, null]
    });

    expect(html).toContain('Chart data is invalid. Use a table instead.');
    expect(html).not.toContain('<rect');
  });

  test('preserves the series currency prefix on axis ticks and data tooltips', () => {
    const html = renderChart({
      chartType: 'bar',
      xKey: 'month',
      series: [{ dataKey: 'amount', label: 'Expenses', valuePrefix: '₱', valueFormat: 'standard' }],
      data: [{ month: 'Jan', amount: 1000 }, { month: 'Feb', amount: 2000 }]
    });

    expect(html).toContain('₱2,000');
    expect(html).toContain('₱1,000');
  });

  test('does not turn missing chart values into zero-height data points', () => {
    const html = renderChart({
      chartType: 'bar',
      xKey: 'month',
      series: [{ dataKey: 'amount', label: 'Expenses', valuePrefix: '₱' }],
      data: [{ month: 'Jan', amount: 1000 }, { month: 'Feb', amount: null }]
    });

    expect(html).toContain('Chart data is incomplete or invalid. Use a table instead.');
    expect(html).not.toContain('<rect');
  });

  test('rejects chart series that use different units or value formats', () => {
    const html = renderChart({
      chartType: 'line',
      xKey: 'month',
      series: [
        { dataKey: 'php', label: 'PHP', valuePrefix: '₱' },
        { dataKey: 'usd', label: 'USD', valuePrefix: '$' }
      ],
      data: [{ month: 'Jan', php: 100, usd: 2 }, { month: 'Feb', php: 200, usd: 4 }]
    });

    expect(html).toContain('Chart series use inconsistent units or value formats. Use separate charts instead.');
    expect(html).not.toContain('<polyline');
  });

  test('shows pie chart amounts with the supplied currency prefix', () => {
    const html = renderChart({
      chartType: 'pie',
      nameKey: 'category',
      valueKey: 'amount',
      series: [{ dataKey: 'amount', label: 'Expenses', valuePrefix: '₱' }],
      data: [{ category: 'Food', amount: 1000 }, { category: 'Bills', amount: 500 }]
    });

    expect(html).toContain('Food');
    expect(html).toContain('₱1,000');
    expect(html).toContain('₱500');
  });

  test('groups pie categories beyond the first seven into Other', () => {
    const data = Array.from({ length: 9 }, (_, index) => ({
      category: 'Category ' + (index + 1),
      amount: (index + 1) * 100
    }));
    const html = renderChart({
      chartType: 'pie',
      nameKey: 'category',
      valueKey: 'amount',
      series: [{ dataKey: 'amount', label: 'Expenses', valuePrefix: '₱' }],
      data
    });

    expect(html).toContain('Other');
    expect(html).toContain('₱1,700');
  });
});

describe('NasrinAI rich replies in MOVO', () => {
  const render = (content) => renderToStaticMarkup(<NasrinAIMessage content={content} />);

  test('highlights money in and out, and signed percentages', () => {
    const html = render('You earned +₱50,000.00 and spent -₱918 this week, up +12% from last week but food was -4.5%.');
    expect(html).toContain('<span class="movo-ai-amount is-in">+₱50,000.00</span>');
    expect(html).toContain('<span class="movo-ai-amount is-out">-₱918</span>');
    expect(html).toContain('<span class="movo-ai-delta is-up">+12%</span>');
    expect(html).toContain('<span class="movo-ai-delta is-down">-4.5%</span>');
  });

  test('renders callouts, multi-line quotes, dividers, task lists and numbered lists that keep their start', () => {
    const html = render('> [!WARNING]\n> Your Food budget is over.\n\n---\n\n- [x] Pay rent\n- [ ] Cancel unused app\n\n3. Third\n4. Fourth\n\n> one\n> two');
    expect(html).toContain('class="movo-ai-callout is-warning"');
    expect(html).toContain('Your Food budget is over.');
    expect(html).toContain('<hr class="movo-ai-divider"/>');
    expect(html).toContain('movo-ai-task is-done');
    expect(html).toContain('<ol class="movo-ai-rich-list" start="3">');
    expect(html).toMatch(/<blockquote class="movo-ai-quote">one<br\/>two<\/blockquote>/);
  });

  test('right-aligns numbers in tables and marks the total row', () => {
    const html = render('| Category | Amount |\n|---|---|\n| Food | ₱500 |\n| **Total** | ₱918 |');
    expect(html).toContain('<td class="is-num">');
    expect(html).toContain('<tr class="is-total">');
  });

  test('bare links open safely; other text stays text', () => {
    const html = render('See https://movo.nasrinai.com/help for details. <script>alert(1)</script>');
    expect(html).toContain('href="https://movo.nasrinai.com/help" target="_blank" rel="noopener noreferrer"');
    expect(html).not.toContain('<script>');
  });
});
